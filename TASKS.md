# Atividades de Configuração do Ambiente de Testes — PokéManager API

Este documento guia a estruturação e validação do ecossistema de testes automatizados com **Jest** e **TypeScript**, garantindo o isolamento arquitetural da Clean Architecture, resolução correta de Path Aliases e métricas de cobertura de código.

---

## 📦 1. Instalação de Dependências

* [ ] **1.1. Instalar o motor de testes e compilador TypeScript**
  * Executar no terminal:
    ```bash
    npm install -D jest ts-jest @types/jest
    ```
* [ ] **1.2. Instalar ferramentas auxiliares para testes de borda e variáveis de ambiente (Preparação para Integração)**
  * Executar no terminal:
    ```bash
    npm install -D supertest @types/supertest dotenv-cli
    ```

---

## ⚙️ 2. Configuração do Jest & Path Aliases

* [ ] **2.1. Criar o arquivo `jest.config.ts` na raiz do projeto**
  * Configurar o preset `ts-jest` e `testEnvironment: 'node'`.
  * Definir o mapeamento de `moduleNameMapper` espelhando os aliases do `tsconfig.json`:
    * `@domain/*` $\rightarrow$ `<rootDir>/src/domain/$1`
    * `@application/*` $\rightarrow$ `<rootDir>/src/application/$1`
    * `@infrastructure/*` $\rightarrow$ `<rootDir>/src/infrastructure/$1`
    * `@main/*` $\rightarrow$ `<rootDir>/src/main/$1`
    * `@tests/*` $\rightarrow$ `<rootDir>/tests/$1`
  * Configurar `clearMocks: true` para isolamento entre os casos de teste.
* [ ] **2.2. Configurar thresholds e diretivas de cobertura (`collectCoverageFrom`)**
  * Incluir `src/domain/**/*.ts` e `src/application/useCases/**/*.ts`.
  * Excluir tipagens (`*.d.ts`), arquivos de exportação (`index.ts`) e interfaces puras.
  * Estabelecer meta mínima global (`coverageThreshold`) de **80%** para *branches*, *functions*, *lines* e *statements*.
* [ ] **2.3. Verificar inclusão da pasta `tests/` no `tsconfig.json`**
  * Garantir que o TypeScript reconheça os arquivos `.spec.ts` e `.test.ts` sem gerar erros de compilação ou incluir arquivos de teste no build de produção (`dist/`).

---

## 📜 3. Scripts de Automação (`package.json`)

* [ ] **3.1. Adicionar os comandos de execução na seção `"scripts"` do `package.json`:**
  * `"test": "jest --runInBand"` (Execução sequencial completa)
  * `"test:watch": "jest --watch"` (Modo interativo em tempo real durante o desenvolvimento)
  * `"test:unit": "jest --testPathPattern=tests/unit"` (Execução ultrarrápida apenas da camada de domínio/aplicação)
  * `"test:coverage": "jest --coverage"` (Geração de relatório matricial no terminal e visual em HTML)
  * `"test:ci": "jest --ci --coverage --runInBand"` (Execução estrita para pipelines de CI/CD)
* [ ] **3.2. Ignorar diretório de relatórios no `.gitignore`**
  * Adicionar `coverage/` ao arquivo `.gitignore` para evitar versionamento de arquivos gerados.

---

## 📁 4. Estruturação de Diretórios e Dublês (Test Doubles)

* [ ] **4.1. Criar a árvore de diretórios de testes na raiz:**
  ```text
  tests/
  ├── unit/          # Testes isolados de Entidades e Use Cases (*.spec.ts)
  ├── integration/   # Testes de Repositórios, Middlewares e Endpoints (*.test.ts)
  └── mocks/         # Implementações In-Memory e Fakes reutilizáveis
  ```
* [ ] **4.2. Implementar dublês base em `tests/mocks/`:**
  * `in-memory-user-repository.ts`: Implementação em memória da interface `IUserRepository`.
  * `in-memory-token-repository.ts`: Implementação em memória da interface `TokenRepository` (Refresh Tokens + Blacklist).
  * `fake-hash-provider.ts`: Dublê determinístico rápido da interface `HashProvider` (substituindo o custo de CPU do `bcrypt`).

---

## ✅ 5. Validação do Ambiente (Smoke Test)

* [ ] **5.1. Criar o primeiro teste unitário (`tests/unit/create-user.use-case.spec.ts`)**
  * Cobrir o fluxo de criação com sucesso (padrão AAA: Arrange, Act, Assert).
  * Cobrir a regra de negócio de bloqueio por e-mail duplicado (`ConflictError`).
* [ ] **5.2. Executar e validar a suíte**
  * Rodar `npm run test:unit` e confirmar execução em milissegundos sem depender de Docker/Banco ativo.
  * Rodar `npm run test:coverage` e abrir `coverage/lcov-report/index.html` no navegador para inspecionar a cobertura visual.
