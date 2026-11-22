# Atividades

Este guia contém o roteiro passo a passo das atividades práticas para configurar a análise estática (**ESLint + Prettier**), preparar os scripts de validação e ativar a esteira de **Integração Contínua (CI)** no **GitHub Actions** com banco de dados PostgreSQL efêmero e proteção de branch.

---

## 📦 Etapa 1: Instalação de Dependências de Qualidade

* [ ] **1.1. Instalar ESLint, TypeScript-ESLint e Prettier**
  * No terminal, na raiz do projeto, execute:

    ```bash
    npm install -D eslint @eslint/js typescript-eslint globals prettier eslint-config-prettier eslint-plugin-prettier
    ```

---

## 🎨 Etapa 2: Configuração de Formatação e Regras de Lint

* [ ] **2.1. Criar o arquivo `.prettierrc` na raiz do projeto**
  * Padroniza aspas simples, ponto e vírgula, largura máxima de linha e quebra de linha LF (evitando falhas entre Windows e Linux no CI):

    ```json
    {
      "semi": true,
      "singleQuote": true,
      "trailingComma": "all",
      "printWidth": 100,
      "tabWidth": 2,
      "arrowParens": "always",
      "endOfLine": "lf"
    }
    ```

* [ ] **2.2. Criar o arquivo `.prettierignore` na raiz do projeto**
  * Ignora diretórios compilados, migrações e arquivos gerados automaticamente:

    ```txt
    node_modules
    dist
    coverage
    prisma/migrations
    src/infrastructure/http/docs/swagger-output.json
    ```

* [ ] **2.3. Criar o arquivo `eslint.config.mjs` (Flat Config) na raiz**
  * Integra as regras do TypeScript com o Prettier e proíbe `console.log` soltos e variáveis não utilizadas:

    ```javascript
    import js from '@eslint/js';
    import globals from 'globals';
    import tseslint from 'typescript-eslint';
    import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

    export default tseslint.config(
      {
        ignores: [
          'dist/**',
          'node_modules/**',
          'coverage/**',
          'prisma/migrations/**',
          'src/infrastructure/http/docs/swagger-output.json',
        ],
      },
      js.configs.recommended,
      ...tseslint.configs.recommended,
      {
        files: ['src/**/*.ts', 'tests/**/*.ts'],
        languageOptions: {
          ecmaVersion: 2022,
          sourceType: 'module',
          globals: {
            ...globals.node,
            ...globals.jest,
          },
        },
        rules: {
          '@typescript-eslint/no-unused-vars': [
            'error',
            { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
          ],
          '@typescript-eslint/no-explicit-any': 'warn',
          'prefer-const': 'error',
          'no-console': ['warn', { allow: ['warn', 'error'] }],
        },
      },
      eslintPluginPrettierRecommended,
    );
    ```

---

## ⚙️ Etapa 3: Scripts de Automação e Validação Local

* [ ] **3.1. Atualizar a seção `"scripts"` do arquivo `package.json`**
  * Adicione os comandos abaixo para padronizar as verificações locais e na esteira de CI:

    ```json
    {
      "scripts": {
        "build": "tsc",
        "lint": "eslint \"src/**/*.ts\" \"tests/**/*.ts\" --max-warnings=0",
        "lint:fix": "eslint \"src/**/*.ts\" \"tests/**/*.ts\" --fix",
        "format": "prettier --write \"src/**/*.ts\" \"tests/**/*.ts\"",
        "typecheck": "tsc --noEmit",
        "test:unit": "jest --testPathPattern=tests/unit",
        "test:integration": "jest --testPathPattern=tests/integration --runInBand",
        "test:ci": "jest --ci --coverage --runInBand"
      }
    }
    ```

* [ ] **3.2. Executar bateria de validação local**
  * Rode os comandos abaixo sequencialmente e corrija qualquer apontamento antes de commitar:

    ```bash
    npm run lint:fix
    npm run lint
    npm run typecheck
    npm run build
    ```

---

## 🤖 Etapa 4: Configuração do Workflow no GitHub Actions

* [ ] **4.1. Criar a estrutura de diretórios `.github/workflows/`**
  * Na raiz do projeto, crie a pasta `.github` e dentro dela a pasta `workflows`.

* [ ] **4.2. Criar o arquivo `.github/workflows/ci.yml`**
  * Configure o pipeline com PostgreSQL em contêiner (`services`), cache do `npm`, migrations do Prisma, testes automatizados e build:

    ```yaml
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

        env:
          NODE_ENV: test
          PORT: 3333
          DATABASE_URL: postgresql://poke_user:poke_password@localhost:5432/pokemanager_test?schema=public
          JWT_SECRET: ci_pipeline_super_secret_jwt_key_minimum_32_characters
          JWT_EXPIRES_IN: 15m
          VIA_CEP_BASE_URL: https://viacep.com.br/ws
          FRONTEND_URL: http://localhost:3000

        steps:
          - name: Checkout repository
            uses: actions/checkout@v4

          - name: Setup Node.js
            uses: actions/setup-node@v4
            with:
              node-version: '20'
              cache: 'npm'

          - name: Install dependencies
            run: npm ci

          - name: Run Linter & Typecheck
            run: |
              npm run lint
              npm run typecheck

          - name: Setup Prisma & Database Migrations
            run: |
              npx prisma generate
              npx prisma migrate deploy

          - name: Run Automated Tests with Coverage
            run: npm run test:ci

          - name: Build Application
            run: npm run build

          - name: Upload Coverage Report
            if: always()
            uses: actions/upload-artifact@v4
            with:
              name: coverage-report
              path: coverage/
              retention-days: 7
    ```

---

## 🔒 Etapa 5: Pull Request, Branch Protection e Teste de Fogo

* [ ] **5.1. Criar branch de feature e enviar para o GitHub**
  * Execute os comandos Git:

    ```bash
    git checkout -b feat/ci-github-actions
    git add .
    git commit -m "ci: add eslint, prettier and github actions workflow"
    git push -u origin feat/ci-github-actions
    ```

* [ ] **5.2. Abrir Pull Request e validar a execução**
  * No GitHub, abra um **Pull Request** de `feat/ci-github-actions` para `main`.
  * Acesse a aba **Actions** e verifique se todas as etapas (Setup, Lint, Prisma Migrations, Testes e Build) concluíram com sucesso (ícone verde).

* [ ] **5.3. Ativar regra de proteção na branch `main`**
  * Acesse **Settings ➔ Branches ➔ Add branch protection rule**.
  * Em **Branch name pattern**, digite `main`.
  * Marque **Require a pull request before merging**.
  * Marque **Require status checks to pass before merging** e selecione `Lint, Build & Automated Tests`.
  * Salve a regra e realize o merge do PR.

* [ ] **5.4. Realizar o Teste de Fogo (Simulação de Falha)**
  * Crie uma nova branch (`test/ci-validation`), insira um `console.log('teste')` solto em algum arquivo ou quebre propositalmente uma asserção de teste e faça o `git push`.
  * Abra um Pull Request e confirme que o GitHub Actions detecta a falha e **bloqueia o botão de Merge**.
  * Reverta o erro, envie o novo commit e confirme a liberação automática do PR.
