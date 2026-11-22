# Automação de Workflows com CI/CD (GitHub Actions)

## Fundamentação Teórica

### 1. O Problema do "Na Minha Máquina Funciona"

Sem uma esteira automatizada de CI, a qualidade do repositório depende exclusivamente da disciplina individual de cada desenvolvedor rodar os testes e o linter antes do git push. Em equipes reais, um único commit esquecido quebra o build de toda a equipe e introduz regressões silenciosas.

### 2. CI vs. CD: Onde Atuamos Hoje?

Continuous Integration (CI — Integração Contínua): Prática de integrar alterações de código frequentemente (várias vezes ao dia) em um repositório central. Cada push ou Pull Request dispara automaticamente uma bateria de validações (Lint, Build, Testes). Se qualquer etapa falhar, o merge é bloqueado (Fail-Fast na esteira).

Continuous Delivery / Deployment (CD — Entrega/Implantação Contínua): Extensão do CI que empacota a aplicação aprovada (ex: imagem Docker) e a disponibiliza automaticamente em ambientes de homologação (Staging) ou produção.

### 3. GitHub Actions

O GitHub Actions é uma plataforma nativa de automação e CI/CD (Integração Contínua e Entrega/Implantação Contínua) integrada diretamente aos repositórios do GitHub. Ele permite automatizar tarefas como compilação, execução de testes, empacotamento em contêineres e deploy a partir de eventos do repositório (como push, pull_request ou release).

### 4. Anatomia de um Workflow no GitHub Actions

```txt

Gatilho (Trigger: push / pull_request na branch main)
       │
       ▼
 ┌─────────────────────────────────────────────────────────────────────────┐
 │ WORKFLOW (.github/workflows/ci.yml)                                     │
 │  ├─ JOB: quality-and-tests (Roda em uma VM Ubuntu efêmera - Runner)     │
 │  │   ├─ SERVICE: postgres:16-alpine (Banco temporário na rede interna)  │
 │  │   ├─ STEP 1: actions/checkout@v4 (Baixa o código do repositório)     │
 │  │   ├─ STEP 2: actions/setup-node@v4 (Instala Node 20 + Cache npm)     │
 │  │   ├─ STEP 3: npm ci (Instalação limpa e determinística)              │
 │  │   ├─ STEP 4: Lint & Typecheck (Análise estática de código)           │
 │  │   ├─ STEP 5: Prisma Generate & Migrate Deploy (Prepara o banco)      │
 │  │   ├─ STEP 6: Testes Unitários + Integração (Jest + Supertest)        │
 │  │   └─ STEP 7: npm run build (Garante compilação TS -> JS sem erros)   │
 └─────────────────────────────────────────────────────────────────────────┘

```

Os fluxos de trabalho são definidos em arquivos YAML dentro do diretório .github/workflows/ na raiz do repositório e seguem uma estrutura principal:

• Gatilhos (on): eventos que iniciam a automação, como push na branch main, abertura de um Pull Request ou execução agendada.
• Jobs: conjuntos de etapas que rodam em máquinas virtuais (runners) Linux, Windows ou macOS hospedadas pelo GitHub ou em runners auto-hospedados.
• Steps e Actions: comandos de shell ou ações reutilizáveis (do marketplace ou criadas pela equipe) que executam tarefas específicas, como instalar dependências, rodar testes e publicar artefatos.

```yml

name: CI/CD Pipeline

on:
  push:
    branches: ["main"]
  pull_request:
    branches: ["main"]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - name: Baixar código
        uses: actions/checkout@v4

      - name: Configurar ambiente
        uses: actions/setup-node@v4
        with:
          node-version: "22"

      - name: Instalar e testar
        run: |
          npm ci
          npm test


```

Boas práticas essenciais

• Segurança e segredos: armazene tokens, chaves de API e credenciais de nuvem em GitHub Secrets ou use OIDC em vez de credenciais estáticas de longa duração.
• Ambientes e aprovações: use Environments com regras de proteção e revisão manual antes de publicar em produção.
• Eficiência: utilize cache de dependências e dispare etapas de deploy apenas após a aprovação dos testes.

### 5. Diferença Crítica: npm install vs. npm ci

npm install: Pode atualizar pacotes dentro das faixas semânticas (^ ou ~) e modificar o package-lock.json. Mais lento e sujeito a variações entre máquinas.

npm ci (Clean Install): Apaga a node_modules existente e instala exatamente as versões travadas no package-lock.json. Se houver divergência entre package.json e package-lock.json, ele falha imediatamente. É obrigatório em ambientes de CI.

## Preparação dos Scripts no package.json

Antes de escrever o arquivo YAML do GitHub Actions, garantimos que todos os comandos de verificação existam e funcionem localmente:

```json

{
  "scripts": {
    "build": "tsc",
    "lint": "eslint \"src/**/*.ts\" \"tests/**/*.ts\"",
    "typecheck": "tsc --noEmit",
    "test:unit": "jest --testPathPattern=tests/unit",
    "test:integration": "jest --testPathPattern=tests/integration --runInBand",
    "test:ci": "jest --ci --coverage --runInBand"
  }
}

```

## Implementação do Workflow (.github/workflows/ci.yml)

O GitHub Actions procura arquivos YAML dentro do diretório oculto .github/workflows/. Abaixo está a pipeline completa da PokéManager API, incluindo um contêiner PostgreSQL efêmero para rodar os testes de integração com Supertest:

```yml

# .github/workflows/ci.yml
name: CI - Quality, Build & Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  ci-pipeline:
    name: Lint, Build & Automated Tests
    runs-on: ubuntu-latest

    # Sobe um banco PostgreSQL efêmero exclusivo para a execução desta pipeline
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: poke_user
          POSTGRES_PASSWORD: poke_password
          POSTGRES_DB: pokemanager_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    # Variáveis de ambiente injetadas em todos os steps (validadas pelo env.ts com Zod)
    env:
      NODE_ENV: test
      PORT: 3333
      DATABASE_URL: postgresql://poke_user:poke_password@localhost:5432/pokemanager_test?schema=public
      JWT_SECRET: ci_pipeline_super_secret_jwt_key_minimum_32_characters
      JWT_EXPIRES_IN: 15m
      VIA_CEP_BASE_URL: https://viacep.com.br/ws
      FRONTEND_URL: http://localhost:3000

    steps:
      # 1. Faz o clone do código do commit/PR atual
      - name: Checkout repository
        uses: actions/checkout@v4

      # 2. Configura o Node.js com cache nativo do npm para acelerar builds futuros
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      # 3. Instalação determinística das dependências
      - name: Install dependencies
        run: npm ci

      # 4. Análise estática (ESLint + Verificação de Tipos TypeScript)
      - name: Run Linter & Typecheck
        run: |
          npm run lint
          npm run typecheck

      # 5. Geração do Prisma Client e aplicação das migrations no banco do service
      - name: Setup Prisma & Database Migrations
        run: |
          npx prisma generate
          npx prisma migrate deploy

      # 6. Execução completa da suíte de testes (Unitários + Integração + Coverage)
      - name: Run Automated Tests with Coverage
        run: npm run test:ci

      # 7. Compilação final da aplicação para JavaScript (dist/)
      - name: Build Application
        run: npm run build

      # 8. (Opcional) Publica o relatório de cobertura como artefato para download no PR
      - name: Upload Coverage Report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/
          retention-days: 7

```

## Governança de Repositório (Branch Protection Rules)

A esteira de CI só cumpre seu papel de barreira de qualidade quando o repositório impede o merge de Pull Requests que falharam nas verificações:

1. No GitHub, acesse Settings ➔ Branches ➔ Add branch protection rule.

2. Em Branch name pattern, informe main.

3. Marque Require a pull request before merging (bloqueia git push direto na main).

4. Marque Require status checks to pass before merging e selecione o job Lint, Build & Automated Tests.

5. Marque Require branches to be up to date before merging (garante que o PR seja testado contra o estado mais recente da main).

## ESLint e Prettier (npm lint)

Para que o passo npm run lint na esteira de CI funcione de forma determinística e sem conflitos entre formatação e regras de análise estática, utilizamos o ESLint v9+ (Flat Config) integrado ao TypeScript-ESLint e ao Prettier.

Adicione os comandos de verificação estática e formatação automática:

```json

{
  "scripts": {
    "lint": "eslint \"src/**/*.ts\" \"tests/**/*.ts\" --max-warnings=0",
    "lint:fix": "eslint \"src/**/*.ts\" \"tests/**/*.ts\" --fix",
    "format": "prettier --write \"src/**/*.ts\" \"tests/**/*.ts\"",
    "typecheck": "tsc --noEmit"
  }
}

```

- `--max-warnings=0` no `npm run lint`: Faz com que qualquer warn (como um console.log esquecido ou um any explícito) também falhe a esteira de CI, mantendo o repositório estritamente limpo.

- `npm run lint:fix`: Corrige automaticamente formatação, ponto e vírgula, aspas e regras auto-corrigíveis antes do commit.
