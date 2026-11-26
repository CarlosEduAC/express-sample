# Atividades

Este roteiro consolida todas as atividades práticas para preparar a **PokéManager API** para produção utilizando **Multi-Stage Build** no Docker, resolução de aliases compilados, execução como usuário não-root, **Graceful Shutdown** e simulação local de produção com Docker Compose.

## Etapa 1: Preparação do Build de Produção (`tsc-alias`)

* [ ] **1.1. Instalar o pacote `tsc-alias` como dependência de desenvolvimento**
  * Em produção, a aplicação executa o JavaScript compilado em `dist/` via Node puro (sem `tsconfig-paths`). O `tsc-alias` reescreve os imports virtuais (`@domain/*`, `@application/*`, `@infrastructure/*`) para caminhos relativos válidos:

    ```bash
    npm install -D tsc-alias
    ```

* [ ] **1.2. Atualizar o script `"build"` no `package.json`**
  * Garanta que o compilador TypeScript seja seguido imediatamente pelo resolvedor de aliases:

    ```json
    {
      "scripts": {
        "build": "tsc && tsc-alias"
      }
    }
    ```

* [ ] **1.3. Validar a compilação localmente**
  * Execute `npm run build` e verifique se a pasta `dist/` foi gerada e se `node dist/main/server.js` consegue resolver todos os módulos sem erros de importação.

## Etapa 2: Ciclo de Vida Seguro (*Graceful Shutdown*)

* [ ] **2.1. Implementar tratamento de sinais `SIGTERM` e `SIGINT` no `src/main/server.ts`**
  * Garante que, ao reiniciar ou encerrar o contêiner em nuvem, o servidor pare de aceitar novas requisições, conclua as ativas e feche o pool de conexões do PostgreSQL com segurança:

    ```typescript
    import { app } from './app';
    import { env } from '@infrastructure/config/env';
    import { prisma } from '@infrastructure/database/prisma/prisma-client';

    const server = app.listen(env.PORT, () => {
      console.warn(`🚀 PokéManager API rodando em modo [${env.NODE_ENV}] na porta ${env.PORT}`);
    });

    async function gracefulShutdown(signal: string): Promise<void> {
      console.warn(`\n⚠️ Sinal ${signal} recebido. Encerrando servidor HTTP e conexões...`);

      server.close(async () => {
        await prisma.$disconnect();
        console.warn('✅ Conexões encerradas com segurança. Processo finalizado.');
        process.exit(0);
      });

      setTimeout(() => {
        console.error('❌ Tempo limite de encerramento excedido. Forçando saída.');
        process.exit(1);
      }, 10000);
    }

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    ```

## Etapa 3: Otimização de Contexto e `Dockerfile` Multi-Stage

* [ ] **3.1. Criar o arquivo `.dockerignore` na raiz do projeto**
  * Evita que arquivos pesados, testes e segredos locais sejam copiados para dentro do contexto de build do Docker:

    ```text
    node_modules
    dist
    coverage
    .git
    .github
    .env
    .env.*
    !.env.example
    tests
    *.md
    ```

* [ ] **3.2. Criar o `Dockerfile` Multi-Stage em 3 estágios na raiz do projeto**
  * Separa a instalação de dependências de produção (`deps`), a compilação TypeScript + Prisma (`builder`) e a imagem enxuta de execução com usuário `node` não-root (`runner`):

    ```dockerfile
    # ESTÁGIO 1: Dependências de Produção (deps)
    FROM node:20-alpine AS deps
    WORKDIR /app
    RUN apk add --no-cache openssl
    COPY package.json package-lock.json ./
    RUN npm ci --omit=dev

    # ESTÁGIO 2: Compilação e Geração de Artefatos (builder)
    FROM node:20-alpine AS builder
    WORKDIR /app
    RUN apk add --no-cache openssl
    COPY package.json package-lock.json ./
    RUN npm ci
    COPY tsconfig.json ./
    COPY prisma ./prisma
    COPY src ./src
    RUN npx prisma generate
    RUN npm run build

    # ESTÁGIO 3: Imagem Final de Execução (runner)
    FROM node:20-alpine AS runner
    WORKDIR /app
    ENV NODE_ENV=production
    RUN apk add --no-cache openssl

    COPY --from=deps /app/node_modules ./node_modules
    COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
    COPY --from=builder /app/dist ./dist
    COPY --from=builder /app/prisma ./prisma
    COPY package.json ./

    RUN chown -R node:node /app
    USER node

    EXPOSE 3333

    CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main/server.js"]
    ```

## Etapa 4: Build e Auditoria da Imagem Docker

* [ ] **4.1. Construir a imagem de produção localmente**
  * Execute no terminal:

    ```bash
    docker build -t pokemanager-api:prod .
    ```

* [ ] **4.2. Auditar o tamanho final da imagem**
  * Execute `docker images pokemanager-api:prod` e confirme que a imagem final está enxuta (na faixa de ~140 MB a ~180 MB), sem código-fonte `src/` ou `devDependencies`.

* [ ] **4.3. Auditar privilégios de usuário (Hardening)**
  * Execute um comando efêmero para verificar qual usuário está ativo dentro do contêiner:

    ```bash
    docker run --rm pokemanager-api:prod whoami
    ```

  * Confirme que a saída é **`node`** (e nunca `root`).

## Etapa 5: Orquestração Simulada de Produção (`docker-compose.prod.yml`)

* [ ] **5.1. Criar o arquivo `docker-compose.prod.yml` na raiz do projeto**
  * Orquestra o banco PostgreSQL com healthcheck e o contêiner compilado da API:

    ```yaml
    services:
      postgres:
        image: postgres:16-alpine
        container_name: pokemanager-db-prod
        restart: unless-stopped
        environment:
          POSTGRES_USER: ${POSTGRES_USER:-poke_admin}
          POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-poke_secret_prod}
          POSTGRES_DB: ${POSTGRES_DB:-pokemanager_prod}
        volumes:
          - pgdata_prod:/var/lib/postgresql/data
        healthcheck:
          test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER:-poke_admin} -d ${POSTGRES_DB:-pokemanager_prod}']
          interval: 10s
          timeout: 5s
          retries: 5

      api:
        build:
          context: .
          dockerfile: Dockerfile
        container_name: pokemanager-api-prod
        restart: unless-stopped
        depends_on:
          postgres:
            condition: service_healthy
        ports:
          - '3333:3333'
        environment:
          NODE_ENV: production
          PORT: 3333
          DATABASE_URL: postgresql://${POSTGRES_USER:-poke_admin}:${POSTGRES_PASSWORD:-poke_secret_prod}@postgres:5432/${POSTGRES_DB:-pokemanager_prod}?schema=public
          JWT_SECRET: ${JWT_SECRET:-chave_super_secreta_producao_minimo_32_caracteres}
          JWT_EXPIRES_IN: 15m
          VIA_CEP_BASE_URL: https://viacep.com.br/ws
          FRONTEND_URL: ${FRONTEND_URL:-http://localhost:3000}

    volumes:
      pgdata_prod:
    ```

* [ ] **5.2. Subir e validar o ambiente de produção**
  * Execute:

    ```bash
    docker compose -f docker-compose.prod.yml up --build -d
    ```

  * Acompanhe os logs com `docker compose -f docker-compose.prod.yml logs -f api` e valide a aplicação das migrations e o boot da API.
  * Acesse `http://localhost:3333/api/docs` para confirmar que a API está respondendo em modo `production`.

* [ ] **5.3. Testar o Graceful Shutdown e encerrar o ambiente**
  * Execute `docker compose -f docker-compose.prod.yml down` e observe nos logs a captura limpa do sinal `SIGTERM` encerrando as conexões antes da parada do contêiner.
