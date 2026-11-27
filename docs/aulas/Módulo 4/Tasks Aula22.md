# Atividades

Este guia orienta a instrumentação da **PokéManager API** com **Logs Estruturados (Pino)**, **Healthcheck Profundo** e a publicação da imagem Docker Multi-Stage no **Render** com banco de dados PostgreSQL gerenciado.

---

## Etapa 1: Instrumentação de Logs Estruturados (`Pino`)

* [ ] **1.1. Instalar dependências do logger de produção**
  * Execute no terminal:

    ```bash
    npm install pino pino-http
    npm install -D pino-pretty
    ```

* [ ] **1.2. Criar o módulo de configuração do Logger (`src/infrastructure/observability/logger.ts`)**
  * Configure logs em JSON puro para `NODE_ENV=production` e saída legível (`pino-pretty`) para desenvolvimento, além de ativar a censura automática (`redact`) de campos sensíveis:

    ```typescript
    import pino from 'pino';
    import { env } from '@infrastructure/config/env';

    export const logger = pino({
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      redact: {
        paths: ['req.headers.authorization', 'body.password', 'body.token', 'body.refreshToken'],
        censor: '[REDACTED]',
      },
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

* [ ] **1.3. Substituir `console.log` / `console.warn` no `src/main/server.ts` e `error-handler.ts`**
  * Utilizar `logger.info(...)` na inicialização do servidor e `logger.error(...)` na captura global de exceções.

---

## 🩺 Etapa 2: Rota de Healthcheck Profundo (`/health`)

* [ ] **2.1. Criar `src/infrastructure/http/routes/health-routes.ts`**
  * Validar a disponibilidade da API e do pool de conexões do PostgreSQL:

    ```typescript
    import { Router, Request, Response } from 'express';
    import { prisma } from '@infrastructure/database/prisma/prisma-client';

    const healthRoutes = Router();

    healthRoutes.get('/health', async (_req: Request, res: Response) => {
      try {
        await prisma.$queryRaw`SELECT 1`;

        return res.status(200).json({
          status: 'healthy',
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
          database: 'connected',
        });
      } catch {
        return res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          database: 'disconnected',
        });
      }
    });

    export { healthRoutes };
    ```

* [ ] **2.2. Registrar `pinoHttp` e `healthRoutes` no `src/main/app.ts`**
  * Adicionar `pinoHttp` ignorando logs repetitivos de `/health` e registrar `app.use(healthRoutes)` **antes** do `apiRateLimiter`:

    ```typescript
    import pinoHttp from 'pino-http';
    import { logger } from '@infrastructure/observability/logger';
    import { healthRoutes } from '@infrastructure/http/routes/health-routes';

    app.use(
      pinoHttp({
        logger,
        autoLogging: {
          ignore: (req) => req.url === '/health',
        },
      }),
    );

    app.use(healthRoutes);
    ```

* [ ] **2.3. Validar localmente e enviar para a branch `main`**
  * Executar `npm run lint`, `npm run typecheck` e `npm run build` para confirmar que tudo compila sem erros.
  * Fazer `git add .`, `git commit -m "feat(observability): add pino logger and healthcheck endpoint"` e realizar o merge na `main` via Pull Request.

---

## Etapa 3: Provisionamento do Banco PostgreSQL no Render

* [ ] **3.1. Criar instância PostgreSQL**
  * Acessar [dashboard.render.com](https://dashboard.render.com) e clicar em **New + ➔ PostgreSQL**.
  * Definir o nome: `pokemanager-db`.
  * Selecionar a região (ex: `Ohio` ou `Virginia`) e o plano **Free**.
  * Clicar em **Create Database**.

* [ ] **3.2. Copiar a URL de conexão interna**
  * Na tela de detalhes do banco criado, localizar e copiar a **Internal Database URL** (ex: `postgresql://poke_user:senha@dpg-xxxx-a/pokemanager_db`).

---

## Etapa 4: Deploy do Web Service via Docker no Render

* [ ] **4.1. Criar o Web Service conectado ao GitHub**
  * Clicar em **New + ➔ Web Service** e selecionar o repositório `pokemanager-api`.
  * Configurar:
    * **Name:** `pokemanager-api`
    * **Region:** Mesma região escolhida para o banco PostgreSQL
    * **Branch:** `main`
    * **Language / Runtime:** `Docker`
    * **Instance Type:** `Free`

* [ ] **4.2. Configurar o Health Check Path**
  * Expandir a seção **Advanced** e preencher **Health Check Path** com: `/health`.
  * Em **Auto-Deploy**, selecionar **After CI checks pass** (para que o deploy só ocorra após aprovação no GitHub Actions).

* [ ] **4.3. Injetar as Variáveis de Ambiente (`Environment Variables`)**
  * Adicionar todas as chaves validadas pelo Zod (`env.ts`):
    * `NODE_ENV` = `production`
    * `PORT` = `3333`
    * `DATABASE_URL` = *(Colar a Internal Database URL do passo 3.2)*
    * `JWT_SECRET` = *(Gerar uma string segura com no mínimo 32 caracteres)*
    * `JWT_EXPIRES_IN` = `15m`
    * `VIA_CEP_BASE_URL` = `https://viacep.com.br/ws`
    * `FRONTEND_URL` = `https://pokemanager-api.onrender.com` *(ou URL do frontend)*

* [ ] **4.4. Iniciar Deploy**
  * Clicar em **Create Web Service** e acompanhar na aba **Events / Logs** o build da imagem Multi-Stage, a execução de `npx prisma migrate deploy` e o status **Live**.

---

## Etapa 5: Auditoria em Produção e Monitoramento

* [ ] **5.1. Validar Healthcheck Público**
  * Acessar no navegador: `https://<sua-url>.onrender.com/health` e confirmar retorno `200 OK` com `"database": "connected"`.

* [ ] **5.2. Testar Endpoints no Swagger em Produção**
  * Acessar `https://<sua-url>.onrender.com/api/docs`.
  * Executar `POST /api/v1/users` (criar usuário) e `POST /api/v1/auth/sessions` (fazer login).

* [ ] **5.3. Auditar Logs Estruturados e Métricas**
  * Abrir a aba **Logs** no painel do Render e verificar:
    * Logs formatados em JSON com latência de resposta (`responseTime`) e status HTTP.
    * Ausência de vazamento de dados sensíveis (`password` mascarado como `[REDACTED]`).
  * Abrir a aba **Metrics** e conferir o consumo estável de memória RAM (~70–110 MB) e CPU da imagem Alpine Multi-Stage.
