# PokéManager API

## Apresentação do Projeto

1. Módulo 1: Domínio limpo + Persistência em Memória + Swagger
2. Módulo 2: Banco PostgreSQL (Prisma ORM) + Consumo da PokéAPI oficial + Zod
3. Módulo 3: Autenticação JWT + Segurança OWASP + Controle de Acesso (RBAC)
4. Módulo 4: Testes automatizados + Docker + CI/CD + Deploy na Nuvem

## Código Espaguete vs Clean Architecture

### Código Espaguete

```javascript
// BAD PRACTICE: Tudo acoplado em um único endpoint Express
app.post('/pokemons', async (req, res) => {
    // 1. Validação de entrada misturada com HTTP
    if (!req.body.name) return res.status(400).send('Nome obrigatório');

  // 2. Regra de negócio acoplada
  const isLegendary = req.body.name === 'Mewtwo';

  // 3. Chamada direta de banco de dados no Controller
  const pokemon = await db.query('INSERT INTO pokemons ...');

  return res.json(pokemon);
});
```

### Problemas do Código Acima

- Impossível de testar sem banco de dados
- Difícil de manter
- Altamente acoplado ao Express e ao banco SQL

### Clean Architecture

```txt
               ┌───────────────────────────────────────────┐
               │ 4. Infrastructure                         │
               │   ┌───────────────────────────────────┐   │
               │   │3. Interface Adapters              │   │
               │   │   ┌───────────────────────────┐   │   │
               │   │   │ 2. Application            │   │   │
               │   │   │   ┌───────────────────┐   │   │   │
               │   │   │   │ 1. Domain         │   │   │   │
               │   │   │   │                   │   │   │   │
               │   │   │   └───────────────────┘   │   │   │
               │   │   └───────────────────────────┘   │   │
               │   └───────────────────────────────────┘   │
               └───────────────────────────────────────────┘
```

Camadas:

1. Domain: O coração da aplicação. Contém apenas tipos TypeScript, interfaces de repositórios e regras puras de negócio. Não importa bibliotecas externas aqui. Entities e Value Objects são implementados nessa camada.
2. Application: Contém os casos de uso da aplicação. Orquestra a lógica de negócio entre as entidades do domínio e as interfaces externas.
3. Interface Adapters: Contém os Controllers, Gateways e Presenters. Adapta os dados entre a camada de Application e as interfaces externas, ou seja, traduz dados do formato web/HTTP para o formato que os Casos de Uso entendem.
4. Infrastructure: Contém implementações concretas de frameworks e bibliotecas externas, como Express, Prisma, Docker e bibliotecas HTTP (Axios).

## Inicialização do Projeto

```bash
# 1. Criar a pasta do projeto
mkdir pokemon-manager-api
cd pokemon-manager-api

# 2. Inicializar o pacote Node.js
npm init -y
```

## Instalação do TypeScript e Dependências de Dev

```bash
# 3. Instalar TypeScript, tsx e tipos do Node.js
npm install -D typescript@^5.9.3 tsx @types/node
```

## Inicializar a configuração do TypeScript

```bash
# 4. Inicializar o TypeScript
npx tsc --init
```

Substitua o conteúdo do tsconfig.json gerado por esta configuração otimizada e estrita:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "rootDir": "./",
    "outDir": "./dist",
    "paths": {
      "@domain/*": ["./src/domain/*"],
      "@application/*": ["./src/application/*"],
      "@infrastructure/*": ["./src/infrastructure/*"],
      "@main/*": ["./src/main/*"]
    },
    "types": ["node"],
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

## Configuração do Padronizador de Código (ESLint + Prettier)

```bash
# 5. Instalar ESLint e Prettier
npm install -D eslint@^8.57.1 prettier eslint-config-prettier eslint-plugin-prettier @typescript-eslint/parser@^8.67.0 @typescript-eslint/eslint-plugin@^8.67.0
```

Observacao de compatibilidade:

- O `@typescript-eslint` 8.x suporta TypeScript na faixa `>=4.8.4 <6.1.0`.
- Para evitar `ERESOLVE`, mantenha o TypeScript em `5.x` neste setup.

Crie o arquivo .eslintrc.json na raiz do projeto:

```json
{
  "env": {
    "es2021": true,
    "node": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module"
  },
  "rules": {
    "prettier/prettier": "error",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
  }
}
```

Crie o arquivo .prettierrc:

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "all"
}
```

## Criando a Estrutura de Pastas da Clean Architecture

```bash
# Comandos para Linux/Mac ou Git Bash (no Windows crie manualmente pelo VS Code)
mkdir -p src/domain/entities src/domain/repositories src/domain/errors
mkdir -p src/application/use-cases src/application/dtos
mkdir -p src/infrastructure/http/controllers src/infrastructure/database/in-memory
mkdir -p src/main
```

A estrutura no VS Code deverá ficar assim:

pokemon-manager-api/
├── src/
│   ├── domain/                  # Camada 1: Regras do Domínio
│   │   ├── entities/
│   │   ├── errors/
│   │   └── repositories/
│   ├── application/             # Camada 2: Casos de Uso
│   │   ├── dtos/
│   │   └── use-cases/
│   ├── infrastructure/          # Camada 3 e 4: Detalhes Técnicos
│   │   ├── database/
│   │   │   └── in-memory/
│   │   └── http/
│   │       └── controllers/
│   └── main/                    # Ponto de entrada e composição
├── package.json
└── tsconfig.json

Configure o script de execução no package.json:

```json
"scripts": {
  "dev": "tsx watch src/main/server.ts",
  "build": "tsc",
  "lint": "eslint src --ext .ts"
}
```

## Dúvidas

1. tsx é uma ferramenta para rodar TypeScript direto no Node, sem compilar manualmente antes.

O que ele faz?

- Executa arquivos .ts e .tsx diretamente.
- Faz transpile em tempo de execução (usando esbuild por baixo).
- Suporta ESM e CommonJS com menos fricção que node puro.

ES Modules (ESM): padrão de estruturação de código JavaScript focado no ecossistema do lado do cliente (navegadores).

- **Exemplo**

```javascript
// Exportar dados
export const soma = (a, b) => a + b;

// Importar dados
import { soma } from './modulo.js';
```

CommonJS: padrão de estruturação de código JavaScript focado no ecossistema do lado do servidor.

- **Exemplo**

```javascript
// Exportar dados
module.exports = { soma: (a, b) => a + b };
// ou
exports.soma = (a, b) => a + b;

// Importar dados
const meuModulo = require('./modulo.js');
```

2. tsconfig.json é o arquivo de configuração do TypeScript. Ele define como o compilador TypeScript deve se comportar, incluindo opções de compilação, caminhos de arquivos, regras de verificação de tipo e muito mais.

- compilerOptions: regras principais de compilação
- include: quais arquivos entram no projeto
- exclude: quais arquivos ficam de fora do projeto
