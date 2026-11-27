# Deploy em Nuvem (PaaS Render) & Observabilidade (Monitoramento e Logs)

## Fundamentação Teórica

### 1. Onde o Render se Encaixa na Nuvem? (IaaS vs. PaaS)

IaaS (AWS EC2, DigitalOcean Droplet): Você gerencia o sistema operacional, patches de segurança do Linux, firewall, proxy reverso (Nginx), certificados SSL e renovação HTTPS.

PaaS (Render, Railway, Fly.io): Você entrega apenas o código ou o Dockerfile. A plataforma abstrai a infraestrutura subjacente, gerencia balanceadores de carga, renova certificados TLS/HTTPS automaticamente e executa Zero-Downtime Deploys (só direciona o tráfego para o novo contêiner após o endpoint /health responder 200 OK).

### 2. Os 3 Pilares da Observabilidade em Produção

Quando uma API está rodando na nuvem, você não tem acesso visual ao terminal da sua máquina. A visibilidade depende de três pilares:

- Logs (Registros de Eventos): Registos textuais/JSON imutáveis com timestamp, nível de severidade (info, warn, error), contexto da requisição (requestId, rota, status HTTP, tempo de resposta) e stack traces.

- Métricas (Metrics): Indicadores numéricos agregados ao longo do tempo (uso de CPU, consumo de memória RAM, latência p95/p99, taxa de erros HTTP 5xx).

- Rastreamento (Traces): Acompanhamento do caminho de uma requisição através de múltiplos serviços e consultas ao banco.

### 3. Por que Abandonar o console.log em Produção?

- `console.log` tradicional gera texto solto não estruturado, dificultando filtros e buscas por nível de erro ou ID de usuário.

- Logs Estruturados (JSON): Ferramentas de nuvem (Render Logs, Datadog, CloudWatch) indexam automaticamente chaves JSON. Isso permite filtrar instantaneamente por level="error" ou statusCode=500.

- Regra de Segurança (LGPD / OWASP): Logs jamais podem registrar senhas (password), tokens JWT ou chaves de API. Utilizamos redaction automática no logger para ocultar campos sensíveis.

## Instrumentação da API (Healthcheck & Pino Logger)

### 1. Instalação do Logger de Alta Performance (pino)

```bash

npm install pino pino-http
npm install -D pino-pretty

```

### 2. Configuração do Logger Estruturado (src/infrastructure/observability/logger.ts)

```ts

// src/infrastructure/observability/logger.ts
import pino from 'pino';
import { env } from '@infrastructure/config/env';

export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  // Mascara automaticamente credenciais caso algum objeto seja logado
  redact: {
    paths: ['req.headers.authorization', 'body.password', 'body.token', 'body.refreshToken'],
    censor: '[REDACTED]',
  },
  // Em desenvolvimento formata colorido; em produção emite JSON puro para stdout
  transport:
    env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});

```

### 3. Middleware de Log HTTP (pino-http)

Adicione o registro automático de todas as requisições HTTP (método, rota, status e latência em milissegundos) no src/main/app.ts logo após o helmet:

```ts

// No src/main/app.ts
import pinoHttp from 'pino-http';
import { logger } from '@infrastructure/observability/logger';

app.use(
  pinoHttp({
    logger,
    // Não polui os logs com chamadas automáticas de healthcheck do Render
    autoLogging: {
      ignore: (req) => req.url === '/health',
    },
  }),
);

```

### 4. Rota de Healthcheck Profundo (src/infrastructure/http/routes/health-routes.ts)

O Render utiliza o Healthcheck para decidir se o deploy foi bem-sucedido e se o contêiner continua saudável. Uma rota /health profissional verifica não apenas se o Express responde, mas se a conexão com o PostgreSQL está operacional:

```ts

// src/infrastructure/http/routes/health-routes.ts
import { Router, Request, Response } from 'express';
import { prisma } from '@infrastructure/database/prisma/prisma-client';

const healthRoutes = Router();

healthRoutes.get('/health', async (_req: Request, res: Response) => {
  try {
    // Executa uma query mínima no PostgreSQL para validar o pool de conexões
    await prisma.$queryRaw`SELECT 1`;

    return res.status(200).json({
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch (error) {
    return res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
    });
  }
});

export { healthRoutes };

```

> (Registre app.use(healthRoutes) no src/main/app.ts antes do apiRateLimiter, garantindo que o monitoramento da nuvem nunca seja bloqueado por limite de taxa).

## Roteiro de Deploy no Render

### Etapa 1: Provisionar o Banco PostgreSQL

1. Acesse dashboard.render.com e clique em New + ➔ PostgreSQL.

2. Defina o nome (ex: pokemanager-db), selecione a região mais próxima (ex: Virginia (US East) ou Ohio) e o plano Free.

3. Após criar, copie a Internal Database URL (usada para comunicação privada de baixa latência dentro da rede do Render).

### Etapa 2: Criar o Web Service via Docker

1. Clique em New + ➔ Web Service e conecte seu repositório do GitHub (pokemanager-api).

2. Configure os parâmetros:

- Language / Environment: Docker (o Render detectará automaticamente o Dockerfile Multi-Stage da raiz).

- Branch: main.

- Instance Type: Free.

3. Em Advanced ➔ Health Check Path, preencha: /health.

### Etapa 3: Configurar as Variáveis de Ambiente (Environment Variables)

Adicione todas as variáveis exigidas pelo contrato de validação Zod (env.ts):

| Chave (Key)      | Valor (Value)                                                      | Observação                                              |
|------------------|--------------------------------------------------------------------|---------------------------------------------------------|
| NODE_ENV         | production                                                         | Ativa logs JSON e otimizações de runtime                |
| PORT             | 3333                                                               | O Render injeta PORT automaticamente, mantenha alinhado |
| DATABASE_URL     | (Cole a Internal Database URL)                                     | Conexão privada com o Postgres do Render                |
| JWT_SECRET       | (String aleatória >= 32 caracteres)                                | Segredo criptográfico exclusivo de produção             |
| JWT_EXPIRES_IN   | 15m                                                                | Tempo de expiração do Access Token                      |
| VIA_CEP_BASE_URL | [https://viacep.com.br/ws](https://viacep.com.br/ws)               | URL base do gateway externo                             |
| FRONTEND_URL     | [https://seu-frontend.vercel.app](https://seu-frontend.vercel.app) | Origem autorizada na whitelist do CORS                  |

1. Clique em Create Web Service e acompanhe o build da imagem Multi-Stage, a execução automática de npx prisma migrate deploy e a ativação da URL pública ([https://pokemanager-api.onrender.com](https://pokemanager-api.onrender.com)).

## Monitoramento & Auditoria em Produção

1. Aba Logs (Tempo Real):

- Observe a inicialização do servidor e a saída estruturada em JSON a cada chamada feita na API.

- Faça um POST /api/v1/auth/sessions pelo Swagger publicado em [https://pokemanager-api.onrender.com/api/docs](https://pokemanager-api.onrender.com/api/docs) e comprove nos logs do Render que o campo password aparece censurado como [REDACTED].

2. Aba Metrics:

- Monitore o consumo de memória RAM da imagem Alpine Multi-Stage (tipicamente estável entre 60 MB e 110 MB, bem abaixo do limite de 512 MB do plano gratuito).

3. Validação de Auto-Deploy (CI + CD Integrados):

- Com o GitHub Actions configurado e o Auto-Deploy do Render configurado para aguardar checks do CI ("After CI checks pass"), qualquer merge na main só vai para produção se passar pelo Lint, Build e Testes Automatizados.
