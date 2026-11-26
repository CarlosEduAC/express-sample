# Ambientes de Produção & Imagens Docker Multi-Stage para Deploy

## Fundamentação Teórica

### 1. O Problema das Imagens Ingênuas (Single-Stage)

Quando temos um Dockerfile tradicional que apenas copia a pasta do projeto, roda `npm install` e executa `npm run dev` carrega para a produção:

- Código-fonte TypeScript bruto (src/), arquivos de teste (tests/), documentação e histórico do Git.

- Centenas de megabytes de devDependencies (jest, ts-jest, eslint, prettier, compilador typescript).

- Risco de Segurança: Ferramentas de compilação e shells extras aumentam a superfície de ataque caso um invasor explore alguma vulnerabilidade na aplicação.

- Privilégio root: Por padrão, processos dentro do Docker rodam como root. Se a aplicação sofrer um ataque de Remote Code Execution (RCE), o atacante terá controle total sobre o sistema de arquivos do contêiner.

### 2. A Solução: Arquitetura Multi-Stage Build

O Multi-Stage Build permite definir múltiplos blocos FROM no mesmo Dockerfile. Cada estágio realiza uma tarefa isolada, e o estágio final copia apenas os artefatos compilados do estágio anterior, descartando todo o resto.

```txt

 ┌─────────────────────────────────────────────────────────────────────────┐
 │ ESTÁGIO 1: deps (Base: node:20-alpine)                                  │
 │ • Copia package.json e package-lock.json                                │
 │ • Executa npm ci --omit=dev (Apenas dependências de produção)           │
 └────────────────────────────────────┬────────────────────────────────────┘
                                      │ (Copia node_modules limpo)
 ┌────────────────────────────────────┼────────────────────────────────────┐
 │ ESTÁGIO 2: builder (Base: node:20-alpine)                               │
 │ • Instala todas as dependências (incluindo devDependencies)             │
 │ • Gera o Prisma Client (npx prisma generate)                            │
 │ • Compila TypeScript para JavaScript (npm run build -> dist/)           │
 └────────────────────────────────────┬────────────────────────────────────┘
                                      │ (Copia apenas dist/ e prisma/)
                                      ▼
 ┌─────────────────────────────────────────────────────────────────────────┐
 │ ESTÁGIO 3: runner — IMAGEM FINAL DE PRODUÇÃO (Base: node:20-alpine)     │
 │ • Recebe APENAS: dist/, node_modules (prod) e prisma/                   │
 │ • Roda como usuário sem privilégios (USER node)                         │
 │ • Tamanho reduzido (~150 MB) e zero ferramentas de build                │
 └─────────────────────────────────────────────────────────────────────────┘

```

### 3. Gestão de Ciclo de Vida: Graceful Shutdown e Sinais Linux

Em orquestradores (Docker, Kubernetes, ECS, Render), quando um contêiner é reiniciado ou escalado para baixo, o sistema operacional envia o sinal SIGTERM.

- Se o Node.js não escutar esse sinal, o processo é morto abruptamente (SIGKILL) após alguns segundos, cortando requisições HTTP em andamento e deixando conexões abertas no PostgreSQL.
- O Graceful Shutdown intercepta SIGTERM e SIGINT, para de aceitar novas conexões HTTP, aguarda as requisições ativas terminarem, encerra o pool de conexões do Prisma (prisma.$disconnect()) e finaliza o processo com código 0.

## Implementação Prática (Live Coding)

### 1. Otimizando o Contexto de Build (.dockerignore)

Impede que arquivos locais pesados ou sensíveis (como .env, .git e node_modules da máquina host) sejam enviados ao Docker Daemon:

```txt

# .dockerignore
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

### 2. O Dockerfile Multi-Stage de Produção

```Dockerfile

# ==============================================================================
# ESTÁGIO 1: Dependências de Produção (deps)
# ==============================================================================
FROM node:20-alpine AS deps
WORKDIR /app

# Instala OpenSSL necessário para o motor binário do Prisma no Alpine Linux
RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ==============================================================================
# ESTÁGIO 2: Compilação e Geração de Artefatos (builder)
# ==============================================================================
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

# Gera os tipos e o client do Prisma e compila TS -> JS (dist/)
RUN npx prisma generate
RUN npm run build

# ==============================================================================
# ESTÁGIO 3: Imagem Final de Execução (runner)
# ==============================================================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache openssl

# Copia apenas o estritamente necessário dos estágios anteriores
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package.json ./

# Ajusta permissões e muda para o usuário não-root nativo da imagem Node
RUN chown -R node:node /app
USER node

EXPOSE 3333

# Aplica migrations pendentes no banco de produção e inicia o servidor compilado
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main/server.js"]

```

Nota importante sobre Path Aliases: Caso o tsc padrão não resolva aliases @domain/* no dist/, adicionamos o pacote tsc-alias no script "build": "tsc && tsc-alias" do package.json para reescrever os imports relativos na compilação.

### 3. Implementando Graceful Shutdown e Healthcheck (src/main/server.ts)

```ts

// src/main/server.ts
import { app } from './app';
import { env } from '@infrastructure/config/env';
import { prisma } from '@infrastructure/database/prisma/prisma-client';

const server = app.listen(env.PORT, () => {
  console.warn(`🚀 PokéManager API rodando em modo [${env.NODE_ENV}] na porta ${env.PORT}`);
});

// Função de encerramento gracioso
async function gracefulShutdown(signal: string): Promise<void> {
  console.warn(`\n⚠️ Sinal ${signal} recebido. Encerrando servidor HTTP e conexões...`);

  server.close(async () => {
    await prisma.$disconnect();
    console.warn('✅ Conexões encerradas com segurança. Processo finalizado.');
    process.exit(0);
  });

  // Força encerramento após 10 segundos caso alguma conexão fique presa
  setTimeout(() => {
    console.error('❌ Tempo limite de encerramento excedido. Forçando saída.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

```

### 4. Orquestração Local Simulada de Produção (docker-compose.prod.yml)

Permite testar a imagem compilada exatamente como rodará em um servidor cloud:

```yaml

# docker-compose.prod.yml
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
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRES_IN: 15m
      VIA_CEP_BASE_URL: https://viacep.com.br/ws
      FRONTEND_URL: ${FRONTEND_URL:-http://localhost:3000}

volumes:
  pgdata_prod:

```

