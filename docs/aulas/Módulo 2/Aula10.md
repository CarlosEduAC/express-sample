# Validação dos Dados de Entrada com Zod

Em sistemas de software, dados malformados, maliciosos ou ausentes são a causa nº 1 de falhas em tempo de execução (runtime errors), vazamentos de dados e corrupção de estado de banco de dados.

Quando não validamos os dados de entrada logo na borda da aplicação (na camada de transporte HTTP), abrimos espaço para três grandes categorias de problemas:

1. Exceções Não Tratadas no Core da Aplicação: Uma string enviada onde se esperava um número causará um erro ao tentar executar operações matemáticas no Use Case, derrubando a requisição com um erro genérico 500 Internal Server Error.

2. Poluição e Corrupção de Dados: Salvar registros com strings de espaço em branco ("   "), e-mails sem @ ou valores fora de limites operacionais exige limpezas caras no banco de dados posteriormente.

3. Brechas de Segurança: Sem higienização de payload, o sistema fica exposto a ataques como Injection (SQL, NoSQL, Command Injection) e Mass Assignment (quando o cliente envia campos internos como isAdmin: true no corpo do JSON e o servidor aceita sem filtrar).

## O Princípio Fail-Fast (Falhe Rápido)

O princípio Fail-Fast afirma que um sistema deve interromper imediatamente a execução de uma operação ao primeiro sinal de que o dado está incorreto, devolvendo o controle com feedback claro ao chamador.

```txt

❌ SEM FAIL-FAST:
[ HTTP Request ] ──(Payload Inválido)──> [ Express Route ] ──> [ Controller ] ──> [ Use Case ] ──> [ Database Error 💥 ]

✅ COM FAIL-FAST (Zod Middleware):
[ HTTP Request ] ──(Payload Inválido)──> [ Zod Middleware ] ──X (Interrompe e retorna Status 400 em milissegundos)

```

Na Clean Architecture, a camada de Infraestrutura / HTTP serve como barreira. Nenhum dado malformado (e-mail sem @, nome muito curto, IDs inválidos) deve chegar aos Use Cases ou às Entidades de Domínio.

```txt

 🌐 Client Request (HTTP)
        │
        ▼
 🛡️  Zod Middleware (Fail-Fast: Rejeita dados inválidos com Status 400 antes do Controller)
        │ (Somente dados 100% validados passam)
        ▼
 🎮 UserController
        │
        ▼
 ⚙️  CreateUserUseCase (Camada de Aplicação)

```

**Benefícios do Fail-Fast na Prática:**

- Economia de Recursos: Evita alocar memória, abrir conexões de banco de dados ou chamar APIs externas caras para requisições que já nasceram erradas.

- Feedback Instantâneo: Retorna ao cliente do front-end/mobile uma resposta padronizada de status 400 Bad Request indicando exatamente qual campo falhou e por quê.

- Previsibilidade: Garante que o código interno das camadas de Aplicação e Domínio sempre receberá dados no formato perfeito e esperado.

## Validação de Borda vs. Regras de Negócio de Domínio

É muito comum confundirmos Validação de Entrada (Schema Validation) com Regras de Negócio de Domínio. Definir essa fronteira é essencial para manter a Clean Architecture limpa:

| Característica    | Validação de Entrada (Borda - Zod)                                                     | Regra de Negócio (Domínio / Use Case)                                                                                |
| ----------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| O que analisa?    | O formato e a sintaxe da estrutura dos dados.                                          | O significado e o estado dos dados no sistema.                                                                       |
| Exemplos          | • O campo email é uma string válida com @? • O campo age é um número inteiro $\ge 18$? | • Este e-mail já pertence a outro usuário cadastrado no banco? • O usuário tem saldo suficiente para esta transação? |
| Depende do Banco? | Nunca. É uma checagem puramente em memória (stateless).                                | Frequentemente. Precisa consultar o estado atual do sistema via Repositories.                                        |
| Onde reside?      | Camada de Infraestrutura / HTTP (Middlewares/Schemas).                                 | Camada de Domínio e Casos de Uso (Entities/Use Cases).                                                               |

**Regra de Ouro:** Se a checagem precisa consultar o banco de dados para responder se o dado é válido, ela NÃO é uma validação do Zod; ela é uma Regra de Negócio do Caso de Uso!

Eu consigo validar isso em memória, de forma isolada, SEM consultar o banco de dados ou um serviço externo?

- SIM: É Validação de Borda -> Zod Schema (Middleware).
- NÃO: É Regra de Negócio -> Use Case / Entidade de Domínio.

**Exemplos Usuários (Auth / Management):**

| Ação         | 🛡️ Validação de Borda (Zod)                                                                                  | ⚙️ Regra de Negócio (Domínio)                                                 |
| ------------ | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| E-mail       | O valor enviado é uma string no formato sintático válido? (ex: tem @, possui domínio, sem espaços).         | O e-mail informado já existe cadastrado no banco de dados?                   |
| Senha        | A senha atinge a complexidade mínima? (mínimo de 8 caracteres, pelo menos 1 número e 1 caractere especial). | A senha atual informada confere com o hash criptografado salvo no banco?     |
| Idade / Data | O campo birthDate é uma data válida no padrão ISO 8601 (YYYY-MM-DD)?                                        | O usuário tem pelo menos 18 anos completos para acessar esta funcionalidade? |

## Por que escolher o Zod no ecossistema TypeScript?

Existem bibliotecas tradicionais como Joi e Yup, mas o Zod tornou-se o padrão da indústria no ecossistema Node.js/TypeScript pelos seguintes motivos:

### A. Single Source of Truth (Fonte Única de Verdade)

Sem o Zod, o desenvolvedor precisa criar um tipo/interface TypeScript E uma regra de validação separada:

```ts

// ❌ Sem Zod: Duplicidade e risco de dessincronização
interface CreateUserBody {
  name: string;
  age: number;
}
// E em outro arquivo, escrever a validação manual...

```

Com o Zod, o Schema em tempo de execução gera a tipagem em tempo de compilação automaticamente:

```ts

// ✅ Com Zod: Schema + Tipo estático unificados
export const createUserSchema = z.object({
  name: z.string().min(3),
  age: z.number().min(18),
});

// O TypeScript infere a interface automaticamente a partir do Schema!
export type CreateUserDTO = z.infer<typeof createUserSchema>;

```

### B. Mutações e Higienização Transparente (Parsing & Transformation)

O Zod não se limita a validar dados (valid: true/false); ele os higieniza e transforma no mesmo passo:

- trim(): Remove espaços em branco desnecessários das pontas.

- toLowerCase(): Padroniza e-mails antes de chegarem à camada de uso.

- coerce / transform(): Converte automaticamente query strings como "page=2" (string) para o número 2 antes de entregar o valor para a aplicação.

## Live Coding: Validação de Usuários

### Passo 0: Ajustes no app.error.ts e erroHandler.ts

Antes de iniciar a validação com Zod, ajustamos o `AppError` para suportar detalhes adicionais e o `errorHandler` para retornar esses detalhes na resposta HTTP.

[app.error.ts](src/domain/errors/app.error.ts)
[errorHandler.ts](src/infrastructure/http/middlewares/errorHandler.ts)

### Passo 1: Instalação do Zod

No terminal do projeto:

```bash

npm install zod

```

### Passo 2: Criando o Middleware Genérico de Validação (src/infrastructure/http/middlewares/validate-request.ts)

Este middleware aceita schemas para body, query e params, validando o payload antes de repassá-lo ao Controller.

```ts

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from '@domain/errors/app-error';

interface RequestValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export const validateRequest = (schemas: RequestValidationSchemas) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Formata os erros do Zod para exibição no AppError
        const issueDetails = error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));

        return next(new AppError('Dados de entrada inválidos', 400, issueDetails));
      }
      next(error);
    }
  };
};

```

### Passo 3: Criando os Schemas de Usuário (src/infrastructure/http/schemas/user-schemas.ts)

Definimos as regras de entrada para Criação e Busca por ID de Usuários:

```ts

import { z } from 'zod';

export const createUserSchema = z.object({
  name: z
    .string({ required_error: 'O nome é obrigatório' })
    .min(3, 'O nome deve ter no mínimo 3 caracteres')
    .trim(),
  email: z
    .string({ required_error: 'O e-mail é obrigatório' })
    .email('Formato de e-mail inválido')
    .toLowerCase(),
});

export const getUserByIdSchema = z.object({
  id: z.string().uuid('O ID do usuário deve ser um UUID válido'),
});

// Inferência automática de tipos TypeScript a partir dos schemas Zod
export type CreateUserDTO = z.infer<typeof createUserSchema>;
export type GetUserByIdParams = z.infer<typeof getUserByIdSchema>;

```

### Passo 4: Acoplando o Middleware às Rotas de Usuário (src/infrastructure/http/routes/user-routes.ts)

Injetamos o middleware diretamente nas rotas HTTP do Express:

```ts

import { Router } from 'express';
import { validateRequest } from '../middlewares/validate-request';
import { createUserSchema, getUserByIdSchema } from '../schemas/user-schemas';
import { makeUserController } from '@main/factories/make-user-controller';

const userRoutes = Router();
const userController = makeUserController();

userRoutes.post(
  '/',
  validateRequest({ body: createUserSchema }),
  (req, res, next) => userController.create(req, res, next)
);

userRoutes.get(
  '/:id',
  validateRequest({ params: getUserByIdSchema }),
  (req, res, next) => userController.getById(req, res, next)
);

export { userRoutes };

```
