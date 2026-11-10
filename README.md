# Segurança Defensiva de APIs & Gestão de Configurações

## Hardening de Borda

O Hardening de Borda é o processo de fortificar os dispositivos que ficam no limite entre a sua rede interna e a internet pública (como roteadores de borda, firewalls e gateways). O principal objetivo é reduzir a superfície de ataque, eliminando serviços desnecessários e aplicando configurações estritas para evitar invasões, abusos ou indisponibilidade da rede.

Na Clean Architecture, a camada de Borda (Edge Layer ou Camada de Entrada) é o primeiro ponto de contato entre a internet aberta e o núcleo do sistema. Hardening de Borda consiste em eliminar vetores de ataque comuns antes que a requisição gaste ciclos de CPU do domínio ou toque no banco de dados.

O OWASP API Security Top 10 é o projeto da OWASP Foundation que cataloga as vulnerabilidades e os riscos mais críticos de segurança em Interfaces de Programação de Aplicações (APIs).

```txt

      REQUISIÇÃO EXTERNA (Hostil / Neutra / Amigável)
                           │
                           ▼
 ┌───────────────────────────────────────────────────┐
 │  1. Helmet (Headers)    -> Camuflagem & Transporte│
 │  2. CORS                -> Isolamento de Origem   │  BARREIRAS
 │  3. Rate Limiting       -> Controle de Frequência │  DE BORDA
 │  4. Input Sanitization  -> Assepsia de Payload    │
 └─────────────────────────┬─────────────────────────┘
                           │  Requisição Legítima e Filtrada
                           ▼
                  Controller & Use Case

```

### 1. Camuflagem e Transporte Seguro: Helmet

O Express, por padrão, expõe cabeçalhos informativos como X-Powered-By: Express. Para um atacante, isso informa a tecnologia exata, permitindo buscar vulnerabilidades específicas conhecidas (CVEs) para aquela versão.

O Helmet atua injetando um conjunto de cabeçalhos de resposta HTTP defensivos:

- HSTS (Strict-Transport-Security): Força o navegador a se comunicar exclusivamente via HTTPS, impedindo ataques de interceptação Man-in-the-Middle (MitM) e downgrade de protocolo (SSL Stripping).

- X-Content-Type-Options: nosniff: Impede que navegadores tentem adivinhar (MIME sniffing) o tipo de arquivo de uma resposta. Se a API responde com JSON, o cliente é obrigado a tratá-lo como JSON, bloqueando a execução de scripts embutidos disfarçados de texto.

- X-Frame-Options: SAMEORIGIN / DENY: Previne ataques de Clickjacking, proibindo que a sua aplicação ou documentação seja incorporada dentro de `<frame>`, `<iframe>` ou `<embed>` em sites de terceiros.

Obs: O clickjacking (ou sequestro de cliques) é uma técnica de ataque cibernético na qual a vítima é induzida a clicar em um botão, link ou elemento oculto ou transparente sobreposto em uma página legítima.

### 2. Controle de Acesso por Origem: CORS (Cross-Origin Resource Sharing)

CORS não é uma ferramenta para proteger a API de ferramentas de linha de comando como curl ou Postman (que não respeitam regras de navegador); CORS é uma instrução para o navegador do usuário.

- O Risco: Sem CORS restritivo (Access-Control-Allow-Origin: *), um site malicioso visitado pelo usuário pode emitir chamadas assíncronas via fetch contra a sua API utilizando a sessão/cookies legítimos do navegador.

- A Solução: Whitelist explícita de domínios confiáveis. Apenas as origens listadas no servidor recebem autorização do navegador para ler as respostas de requisições de origem cruzada.

Obs: Podemos usar em conjunto ferramentas de Geolocalização ou CDNs para liberar o acesso para uma determinada região, por exemplo.

### 3. Mitigação de Força Bruta e DoS: Rate Limiting (OWASP API4:2023 - Unrestricted Resource Consumption)

APIs sem limitação de frequência tornam-se alvos triviais para:

- Ataques de Força Bruta / Credential Stuffing: Robôs testando milhares de combinações de senhas por segundo no endpoint /auth/sessions.

- Exaustão de Recursos (DoS): Requisições em massa sobrecarregando conexões de banco de dados e CPU.

A aplicação divide o controle de taxa em duas camadas:

1. Rate Limiting de Borda Ampla: Protege a API como um todo (ex: 100 requisições a cada 15 minutos por IP).

2. Rate Limiting de Alta Sensibilidade: Focado estritamente em rotas de autenticação, recuperação de senha e emissão de tokens (ex: 5 tentativas a cada 5 minutos por IP).

### 4. Assepsia de Entrada: Sanitização de Payloads (OWASP API8:2023 - Security Misconfiguration / Injections)

Enquanto a validação de esquema (Zod) valida a forma dos dados (tipo, tamanho e formato), a sanitização atua na assepsia semântica:

NoSQL / SQL Injection: Bibliotecas como express-mongo-sanitize removem operadores reservados (como $where, $ e .) que poderiam ser interpretados como comandos se passados acidentalmente para bancos de dados baseados em documentos ou queries dinâmicas.

XSS Refletido / Armazenado: Impede que strings enviadas em campos de texto livre contenham tags como `<script>` ou eventos como onload=alert(), evitando que scripts sejam persistidos e executados na interface de outro cliente.

### Configuração dos Middlewares de Segurança

**Dependências:**

Instalação dos pacotes de segurança e de validação de ambiente:

```bash

npm install helmet cors express-rate-limit express-mongo-sanitize dotenv
npm install -D @types/cors

```

1. Rate Limiting (src/infrastructure/http/middlewares/rate-limiter.ts)

Evita ataques de força bruta no login e mitiga negação de serviço (DoS/DDoS):

```ts

// src/infrastructure/http/middlewares/rate-limiter.ts
import rateLimit from 'express-rate-limit';

// Limitador global para rotas gerais da API
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Janela de 15 minutos
  max: 100, // Limite de 100 requisições por IP por janela
  standardHeaders: true, // Retorna headers 'RateLimit-*'
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Muitas requisições originadas deste IP. Tente novamente em 15 minutos.',
  },
});

// Limitador estrito para rotas sensíveis (Login / Autenticação)
export const authRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // Janela de 5 minutos
  max: 5, // Apenas 5 tentativas consecutivas antes de bloquear
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Muitas tentativas de autenticação. Tente novamente em 5 minutos.',
  },
});

```

2. Configuração de CORS Restritivo (src/infrastructure/http/config/cors-options.ts)

```ts

// src/infrastructure/http/config/cors-options.ts
import { CorsOptions } from 'cors';
import { env } from '@infrastructure/config/env';

const allowedOrigins = [
  env.FRONTEND_URL, // Origem autorizada (ex: http://localhost:3000)
];

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Permite chamadas sem origin (Swagger local, mobile, curl) ou presentes na whitelist
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origem não permitida pela política de CORS.'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

```

3. Configuração dos Headers de Segurança HTTP com Helmet (src/infrastructure/http/config/helmet-options.ts)

O Helmet por padrão já remove o header identificador X-Powered-By e ativa cabeçalhos como nosniff e HSTS. Contudo, em APIs que servem documentação interativa (como o Swagger UI), a diretiva padrão de Content Security Policy (CSP) bloqueia os scripts e estilos embutidos da interface gráfica.

Configuramos uma política sob medida com suporte ao Swagger e proteção contra clickjacking e MIME-sniffing:

```ts

// src/infrastructure/http/config/helmet-options.ts
import { HelmetOptions } from 'helmet';

export const helmetOptions: HelmetOptions = {
  // Oculta a tecnologia do servidor para evitar reconhecimento de exploits do Express
  hidePoweredBy: true,

  // Força HTTPS por 1 ano (incluindo subdomínios e lista de preload do navegador)
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },

  // Impede que a API seja incorporada em <iframe> de sites externos (anti-Clickjacking)
  frameguard: {
    action: 'deny',
  },

  // Força o navegador a respeitar o Content-Type (bloqueia sniffing de MIME types)
  noSniff: true,

  // Content Security Policy flexibilizado exclusivamente para permitir o Swagger UI inline
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Permite scripts de visualização do Swagger
      styleSrc: ["'self'", "'unsafe-inline'"],  // Permite estilos CSS do Swagger
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
};

```

4. Sanitização e Assepsia de Entrada (src/infrastructure/http/middlewares/sanitize-request.ts)

A sanitização atua desarmando payloads maliciosos em req.body, req.params e req.query antes que cheguem aos validadores de schema (Zod) e aos controllers.

Criamos um middleware unificado que combina:

Defesa contra NoSQL/Object Injection (express-mongo-sanitize): Remove operadores proibidos como chaves iniciadas por $ ou com `.`.

Defesa contra XSS (Cross-Site Scripting): Faz a assepsia recursiva de strings contra injeção de tags HTML (`<script>`, `<iframe>`) e manipuladores de eventos (onload=, onerror=).

```ts

// src/infrastructure/http/middlewares/sanitize-request.ts
import { Request, Response, NextFunction } from 'express';
import mongoSanitize from 'express-mongo-sanitize';

/**
 * Remove tags HTML e atributos inline maliciosos de strings.
 */
function sanitizeString(value: string): string {
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove blocos <script>
    .replace(/<[^>]+>/g, '') // Remove tags HTML remanescentes
    .replace(/javascript:/gi, '') // Remove esquemas de pseudo-protocolo
    .replace(/on\w+\s*=/gi, ''); // Remove eventos inline como onload=, onerror=
}

/**
 * Percorre recursivamente o objeto/array aplicando a assepsia de strings.
 */
function deepSanitize(target: unknown): unknown {
  if (typeof target === 'string') {
    return sanitizeString(target);
  }

  if (Array.isArray(target)) {
    return target.map(deepSanitize);
  }

  if (target !== null && typeof target === 'object') {
    const sanitizedObj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(target)) {
      sanitizedObj[key] = deepSanitize(value);
    }
    return sanitizedObj;
  }

  return target;
}

// 1. Instância do sanitizador NoSQL
const noSqlSanitizer = mongoSanitize({
  replaceWith: '_', // Substitui operadores suspeitos por '_' em vez de quebrar a requisição
});

/**
 * Middleware composto de sanitização profunda (NoSQL + XSS)
 */
export const sanitizeRequest = (req: Request, res: Response, next: NextFunction): void => {
  // Executa primeiro a remoção de operadores reservados de injeção NoSQL/Mongo
  noSqlSanitizer(req, res, () => {
    // Em seguida, aplica a assepsia de tags HTML/XSS nas entradas textuais
    if (req.body && typeof req.body === 'object') {
      req.body = deepSanitize(req.body);
    }

    if (req.query && typeof req.query === 'object') {
      req.query = deepSanitize(req.query) as typeof req.query;
    }

    if (req.params && typeof req.params === 'object') {
      req.params = deepSanitize(req.params) as typeof req.params;
    }

    next();
  });
};

```

Como plugar ambos no src/main/app.ts

```ts

// src/main/app.ts
import 'express-async-errors';
import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';

// 1. Configurações dos 4 pilares de segurança de borda
import { helmetOptions } from '@infrastructure/http/config/helmet-options';
import { corsOptions } from '@infrastructure/http/config/cors-options';
import { apiRateLimiter, authRateLimiter } from '@infrastructure/http/middlewares/rate-limiter';
import { sanitizeRequest } from '@infrastructure/http/middlewares/sanitize-request';

// Rotas, documentação e tratamento de erros
import { routes } from '@infrastructure/http/routes';
import { errorHandler } from '@infrastructure/http/middlewares/error-handler';
import swaggerFile from '../infrastructure/http/docs/swagger-output.json';

const app: Express = express();

/* -------------------------------------------------------------------------- */
/* [PONTO 1] HEADERS DEFENSIVOS COM HELMET                                    */
/* -------------------------------------------------------------------------- */
// Aplica HSTS, No-Sniff, Frameguard (anti-clickjacking) e libera assets do Swagger
app.use(helmet(helmetOptions));

/* -------------------------------------------------------------------------- */
/* [PONTO 2] ISOLAMENTO DE ORIGEM (CORS RESTRICTIVO)                         */
/* -------------------------------------------------------------------------- */
// Limita o consumo do navegador à whitelist permitida (FRONTEND_URL)
app.use(cors(corsOptions));

/* -------------------------------------------------------------------------- */
/* [PONTO 3] RATE LIMITING GLOBAL (ANTI-DOS)                                  */
/* -------------------------------------------------------------------------- */
// Limita requisições por IP na borda antes de alocar memória com parse de body
app.use('/api', apiRateLimiter);

/* -------------------------------------------------------------------------- */
/* BODY PARSERS COM LIMITE DE CARGA                                           */
/* -------------------------------------------------------------------------- */
// Evita exaustão de buffer com payloads gigantescos
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

/* -------------------------------------------------------------------------- */
/* [PONTO 4] SANITIZAÇÃO DE ENTRADA (ANTI-XSS & ANTI-NOSQL INJECTION)         */
/* -------------------------------------------------------------------------- */
// Remove operadores de injeção ($ e .) e higieniza tags HTML em body, query e params
app.use(sanitizeRequest);

/* -------------------------------------------------------------------------- */
/* DOCUMENTAÇÃO DA API (SWAGGER UI)                                           */
/* -------------------------------------------------------------------------- */
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));

/* -------------------------------------------------------------------------- */
/* [PONTO 3.B] RATE LIMITING ESTRITO PARA ENDPOINTS SENSÍVEIS (ANTI-BRUTE)    */
/* -------------------------------------------------------------------------- */
// Limita tentativas consecutivas de autenticação a no máximo 5 requisições por janela
app.use('/api/v1/auth/sessions', authRateLimiter);
app.use('/api/v1/auth/refresh-token', authRateLimiter);

/* -------------------------------------------------------------------------- */
/* ROTEAMENTO PRINCIPAL                                                       */
/* -------------------------------------------------------------------------- */
app.use('/api/v1', routes);

/* -------------------------------------------------------------------------- */
/* TRATAMENTO GLOBAL DE EXCEÇÕES                                              */
/* -------------------------------------------------------------------------- */
app.use(errorHandler);

export { app };

```

Por que esta ordem é fundamental?

- helmet() no topo: Garante que até respostas rejeitadas nas camadas seguintes (como um 403 do CORS ou um 429 de Rate Limit) já saiam do servidor com os headers de segurança corretos e sem o cabeçalho X-Powered-By: Express.

- apiRateLimiter antes do express.json(): Se um atacante enviar milhares de requisições de 10 megabytes para derrubar o servidor, o rate limiter rejeitará a chamada no nível do IP com status 429 Too Many Requests antes que o Node.js gaste memória convertendo strings para objetos JSON.

- express.json({ limit: '10kb' }) com cota explícita: Evita ataques de exaustão de buffer por payloads intencionalmente gigantescos.

- mongoSanitize() logo após os parsers: A assepsia precisa ser aplicada assim que o req.body existir, para que qualquer middleware subsequente (como o validador Zod ou os Controllers) já receba dados desarmados.

- errorHandler no final absoluto: Qualquer erro lançado em middlewares anteriores ou dentro dos Controllers é capturado aqui, evitando vazamento de stack traces do servidor para o cliente final.

## Gestão de Segredos & Validação de Ambiente com Zod

Configurações e segredos de infraestrutura (chaves JWT, credenciais de banco, URLs de serviços terceiros) não devem ser embutidos no código-fonte. O princípio III do [The Twelve-Factor App](https://12factor.net/pt_br/) determina a separação rígida entre código e configuração.

```txt

 ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
 │   .env.example  │       │      .env       │       │    env.ts       │
 │   (Contrato)    │ ────► │ (Valores Reais) │ ────► │  (Parse Zod)    │
 │ (Versionado Git)│       │ (Git Ignored)   │       │ (Fail-Fast Boot)│
 └─────────────────┘       └─────────────────┘       └────────┬────────┘
                                                              │
                                      ┌───────────────────────┴───────────────────────┐
                                      │                                               │
                                      ▼                                               ▼
                                 [ Sucesso ]                                     [ Falha ]
                            Tipagem Segura (Autocomplete)              process.exit(1) com Relatório

```

### 1. O Risco de Falhas Silenciosas em Tempo de Execução (Runtime)

O Node.js expõe variáveis de ambiente através de process.env. No entanto, process.env apresenta três fragilidades graves:

1. Tipagem Fraca: Todas as variáveis em process.env são tratadas como string | undefined.

2. Falhas Tardiás (Late-Fails): Se a variável JWT_SECRET for esquecida no arquivo .env, o servidor sobe normalmente sem erros. A falha só ocorrerá horas depois, no primeiro login de um usuário, disparando um erro 500 em produção.

3. Conversões Manuais Inconsistentes: Variáveis como PORT=3333 chegam como texto ("3333"), exigindo conversões manuais espalhadas pelo código com risco de valores NaN.

### 2. O Princípio do Fail-Fast no Boot

O padrão Fail-Fast estabelece que, se o ambiente não possui as pré-condições necessárias para operar de forma segura e íntegra, o processo deve ser abortado imediatamente durante a inicialização, antes mesmo de abrir a porta HTTP ou escutar conexões.

Ao utilizar o Zod para validar o process.env:

- Validação Estrutural: O Zod verifica obrigatoriedade, tamanho mínimo (ex: JWT_SECRET com no mínimo 32 caracteres para impedir chaves fracas), URLs válidas e enums de ambiente (NODE_ENV).

- Coerção Segura: Tipos numéricos como PORT são convertidos de forma determinística via z.coerce.number().

- Imutabilidade e Previsibilidade: O objeto exportado env é congelado, validado e completamente tipado, eliminando acessos diretos e desprotegidos ao process.env no restante da aplicação.

### 3. Anatomia do .env.example

.env.example funciona como uma especificação contratual de infraestrutura. Ele:

- É obrigatoriamente versionado no repositório Git.

- Não contém senhas, chaves privadas ou credenciais reais de produção.

- Documenta todas as variáveis necessárias para que novos desenvolvedores e esteiras de CI/CD saibam exatamente quais parâmetros precisam ser fornecidos para instanciar a API.

Arquivo versionado no Git com todos os nomes de variáveis necessários (sem valores confidenciais):

```txt

# Configurações do Servidor
NODE_ENV=development
PORT=3333

# Banco de Dados
DATABASE_URL="postgresql://user:password@localhost:5432/manager_db?schema=public"

# Segurança e JWT
JWT_SECRET="chave_secreta_longa_com_no_minimo_32_caracteres_aleatorios"
JWT_EXPIRES_IN="15m"

# Integrações & Gateways
VIA_CEP_BASE_URL="https://viacep.com.br/ws"
FRONTEND_URL="http://localhost:3000"

```

### B. Validador de Schema com Zod (src/infrastructure/config/env.ts)

```ts

// src/infrastructure/config/env.ts
import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.string().url('DATABASE_URL deve ser uma URL válida de conexão'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter no mínimo 32 caracteres para segurança adequada'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  VIA_CEP_BASE_URL: z.string().url().default('https://viacep.com.br/ws'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
});

// Faz o parsing das variáveis do process.env
const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Variáveis de ambiente inválidas ou ausentes:');
  console.error(JSON.stringify(_env.error.format(), null, 2));

  // Encerra imediatamente o processo caso a configuração falhe (Fail-Fast)
  process.exit(1);
}

export const env = _env.data;

```
