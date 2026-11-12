# Gestão de Segredos & Validação de Ambiente com Zod

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
