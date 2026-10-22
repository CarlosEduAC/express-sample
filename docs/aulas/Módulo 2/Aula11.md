# Tratamento Global de Erros de Infraestrutura

## Por Que Estruturar um Tratamento Global de Erros?

Em sistemas distribuídos e APIs REST em produção, exceções vão acontecer. A diferença entre um sistema frágil e um resiliente está em como a aplicação lida com essas exceções quando elas ocorrem.

Sem um tratamento global centralizado, a aplicação sofre de três problemas graves:

1. Vazamento de Informações Sensíveis (Information Disclosure):

Exibir o stack trace nativo do Node.js ou queries SQL cruas revela a estrutura do banco de dados, nomes de tabelas e versões de pacotes para possíveis atacantes.

2. Inconsistência de Contrato no Front-end:

Se o Zod responde de um jeito `({ issues: [...] })`, a regra de negócio de outro `({ error: "Mensagem" })` e o Express de outro `(<pre>Cannot POST /...</pre>)`, a equipe de Front-end/Mobile é obrigada a escrever dezenas de if/else apenas para tratar erros.

3. Queda do Processo Node.js (Uncaught Exceptions):

Promessas rejeitadas (Unhandled Rejections) que não são capturadas por um middleware na borda podem travar o evento loop ou derrubar a instância da aplicação no container Docker.

## A Taxonomia dos Erros na Clean Architecture

Para projetar um sistema elegante, precisamos categorizar os erros de acordo com a camada de origem e a sua natureza operacional:

```txt

                                ┌──────────────────────────┐
                                │   Requisição HTTP (API)  │
                                └────────────┬─────────────┘
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       ▼                                           ▼
          [ Erros Operacionais (4xx) ]               [ Erros de Sistema / Bugs (500) ]
        Previsíveis e esperados no fluxo             Inesperados, falhas de infra
                       │                                           │
      ┌────────────────┼────────────────┐                          │
      ▼                ▼                ▼                          ▼
Erros de Borda    Erros de Domínio   Erros de Infra         Erros Não Tratados
(Sintaxe / Zod)   (Regras / State)   (Prisma / Driver)      (NullPointer, Crash)

```

### A. Erros Operacionais (Status HTTP 4xx)

São exceções previsíveis que fazem parte do fluxo normal da aplicação. Ocorrem quando o cliente envia dados incorretos ou tenta realizar uma ação não permitida pelas regras de negócio.

Exemplos: E-mail já cadastrado, saldo insuficiente, token expirado, ID inexistente.

Comportamento Esperado: Não devem poluir os logs de erro crítico do servidor (nível ERROR). Devem responder imediatamente com um código HTTP apropriado (400, 401, 403, 404, 409) e orientar o usuário sobre como corrigir.

### B. Erros de Sistema / Não Operacionais (Status HTTP 500)

São falhas inesperadas causadas por bugs de código, indisponibilidade do banco de dados, falta de memória ou falha de rede com serviços externos.

Exemplos: Cannot read property 'name' of undefined, perda da conexão com o PostgreSQL, falha no parse de um arquivo JSON corrompido.

Comportamento Esperado: Devem ser registrados em ferramentas de observabilidade (Sentry, Datadog) em nível ERROR com o stack trace completo. Para o cliente público, o servidor deve retornar apenas uma mensagem genérica: "Erro interno do servidor".

## A Hierarquia de Domínio: Expandindo o AppError

Na Clean Architecture, a camada de Domínio não deve conhecer bibliotecas HTTP (Express) nem ORMs (Prisma). No entanto, para que o sistema consiga traduzir os erros de negócio em respostas HTTP sem acoplamento, estruturamos uma hierarquia de exceções de domínio.

A classe base AppError serve de fundação para erros operacionais especializados:

```txt

                             ┌───────────────────┐
                             │     AppError      │ (Abstract/Base Class)
                             └─────────┬─────────┘
                                       │
      ┌──────────────────┬─────────────┼─────────────┬──────────────────┐
      ▼                  ▼             ▼             ▼                  ▼
NotFoundError     ConflictError   ValidationError  UnauthorizedError  ForbiddenError
   (404)              (409)          (400)               (401)             (403)

```

### Por que especializar as classes de erro de Domínio?

1. Semântica Clara no Use Case: O Use Case lança throw new NotFoundError('Usuário não encontrado') ou throw new ConflictError('E-mail já está em uso') em vez de hardcodear códigos HTTP numéricos soltos (404, 409).

2. Desacoplamento do Protocolo: A camada de aplicação sinaliza o que aconteceu de errado conceitualmente, enquanto o errorHandler na borda (Infraestrutura) decide a tradução para o protocolo HTTP.

## O Funcionamento do Funil (Middleware Global)

O errorHandler no Express atua como o ponto central de convergência (Single Point of Failure Handler). No Express, qualquer middleware que receba exatamente 4 parâmetros (error, req, res, next) é reconhecido como o manipulador global de exceções.

A Ordem de Processamento no Funil:

1. Checagem de AppError (Domínio/Aplicação):

Se o erro for uma instância de AppError (ou de suas filhas NotFoundError, ConflictError), o middleware extrai a mensagem, o status code configurado e os detalhes operacionais, retornando imediatamente.

2. Checagem de ZodError (Borda / Validação):

Se uma exceção do Zod escapou ou foi repassada pelo middleware de validação, o funil a captura, formata a lista de campos inválidos e responde com 400 Bad Request.

3. Checagem de PrismaClientKnownRequestError (Infraestrutura):

Se o repositório tentou executar uma query que violou restrições do banco (ex: chave única P2002 ou registro inexistente P2025), o PrismaErrorMapper intercepta e traduz o código do banco em uma mensagem de domínio legível.

4. Fallback do Desenvolvedor (Erro Inesperado - 500):

Se o erro não se encaixar em nenhuma das categorias acima, significa que é um bug de código ou uma falha física de infraestrutura. O middleware registra o erro no console/logger e responde com 500 Internal Server Error, mascarando os detalhes internos.

### Hierarquia e Mapeamento de Erros no Funil HTTP

```txt

             🌐 Requisição HTTP
                      │
                      ▼
 ┌──────────────────────────────────────────┐
 │         Middleware Global de Erros       │
 └────────────────────┬─────────────────────┘
                      │
   ┌──────────────────┼──────────────────┬──────────────────┐
   │ (Instância de)   │ (Instância de)   │ (Instância de)   │ (Outros Erros)
   ▼                  ▼                  ▼                  ▼
AppError           ZodError        PrismaError        Error Generico
   │                  │                  │                  │
 400/404/409        400 Bad            Mapeado para        500 Internal
 Operacional        Request            AppError (409/404)  Server Error
 (Regra/Borda)      (Borda)            (Infraestrutura)   (Log do Sistema)

```

## Refatoração Prática da Hierarquia de Erros de Domínio

1. Atualizando a Classe Base AppError (src/domain/errors/app-error.ts)

```ts

// src/domain/errors/app-error.ts
export abstract class AppError {
  public readonly message: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 400, details?: unknown) {
    this.message = message;
    this.statusCode = statusCode;
    this.details = details;
  }
}

```

2. Criando as Exceções Especializadas de Domínio

```ts

// src/domain/errors/not-found-error.ts
import { AppError } from './app-error';

export class NotFoundError extends AppError {
  constructor(entityName: string) {
    super(`${entityName} não encontrado(a)`, 404);
  }
}

// src/domain/errors/conflict-error.ts
import { AppError } from './app-error';

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

// src/domain/errors/unauthorized-error.ts
import { AppError } from './app-error';

export class UnauthorizedError extends AppError {
  constructor(message = 'Não autorizado') {
    super(message, 401);
  }
}

```

3. Exemplo de Uso nos Use Cases de Domínio

Veja como o código dos Casos de Uso ganha leitura expressiva e limpa:

```ts

// src/application/useCases/getUserById.ts
import { UserRepository } from '@domain/repositories/user.repository';
import { User } from '@domain/entities/user';
import { NotFoundError } from '@domain/errors/not-found-error';

export class GetUserByIdUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      // Usa a exceção semântica de Domínio
      throw new NotFoundError('Usuário');
    }

    return user;
  }
}

```

```ts

// src/application/useCases/createUser.ts
import { UserRepository } from '@domain/repositories/user.repository';
import { ConflictError } from '@domain/errors/conflict-error';

export class CreateUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(data: { name: string; email: string }) {
    const userExists = await this.userRepository.findByEmail(data.email);

    if (userExists) {
      // Sinaliza conflito sem precisar citar o status HTTP 409 explicitamente
      throw new ConflictError('Já existe um usuário cadastrado com este e-mail');
    }

    return this.userRepository.create(data);
  }
}

```

## Live Coding: Conectando a Infraestrutura ao Funil de Erros

### Passo 1: Mapeador de Erros do Prisma (src/infrastructure/database/prisma/prisma-error-mapper.ts)

Quando o banco de dados rejeita uma operação (por exemplo, um e-mail duplicado ou uma chave estrangeira inválida), o Prisma lança uma exceção da classe PrismaClientKnownRequestError.

Criaremos uma classe utilitária responsável por traduzir esses códigos numéricos do Prisma (P2002, P2025, P2003) em exceções limpas do nosso domínio (ConflictError, NotFoundError, AppError):

```ts

// src/infrastructure/database/prisma/prisma-error-mapper.ts
import { Prisma } from '@prisma/client';
import { AppError } from '@domain/errors/app-error';
import { ConflictError } from '@domain/errors/conflict-error';
import { NotFoundError } from '@domain/errors/not-found-error';

export class PrismaErrorMapper {
  static toAppError(error: Prisma.PrismaClientKnownRequestError): AppError {
    switch (error.code) {
      case 'P2002': {
        // Violação de constraint Única (Unique constraint)
        const target = (error.meta?.target as string[])?.join(', ') || 'campo';
        return new ConflictError(`Já existe um registro cadastrado com este ${target}`);
      }
      case 'P2025': {
        // Registro não encontrado para atualização ou exclusão
        return new NotFoundError('Registro no banco de dados');
      }
      case 'P2003': {
        // Violação de Chave Estrangeira (Foreign key constraint)
        return new AppError('Relacionamento inválido. O recurso associado não existe', 400);
      }
      default:
        // Caso ocorra algum erro do Prisma não mapeado explicitamente
        return new AppError('Erro ao processar operação no banco de dados', 500);
    }
  }
}

```

### Passo 2: O Middleware Global de Erros Refatorado (src/infrastructure/http/middlewares/error-handler.ts)

Agora, atualizamos o nosso errorHandler para atuar como o Funil Unificado de Exceções. Ele tratará em ordem de prioridade:

1. AppError: Erros de Domínio e Regras de Negócio (NotFoundError, ConflictError, etc.).

2. ZodError: Falhas de validação de borda.

3. PrismaClientKnownRequestError: Exceções do banco de dados interceptadas pelo PrismaErrorMapper.

4. Erro Não Tratado (500): Fallback para bugs imprevistos de sistema.

```ts

// src/infrastructure/http/middlewares/error-handler.ts
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '@domain/errors/app-error';
import { PrismaErrorMapper } from '@infrastructure/database/prisma/prisma-error-mapper';

export const errorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  // 1. Erros Operacionais de Domínio e Regras de Negócio Mapeadas
  if (error instanceof AppError) {
    const responsePayload: Record<string, unknown> = {
      status: 'error',
      message: error.message,
    };

    if (error.details !== undefined && error.details !== null) {
      responsePayload.details = error.details;
    }

    return res.status(error.statusCode).json(responsePayload);
  }

  // 2. Erros de Validação da Borda (Zod)
  if (error instanceof ZodError) {
    const issueDetails = error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));

    return res.status(400).json({
      status: 'error',
      message: 'Dados de entrada inválidos',
      details: issueDetails,
    });
  }

  // 3. Erros Conhecidos de Infraestrutura / Banco de Dados (Prisma)
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const appError = PrismaErrorMapper.toAppError(error);
    return res.status(appError.statusCode).json({
      status: 'error',
      message: appError.message,
    });
  }

  // 4. Erros Desconhecidos ou Críticos de Sistema (500 Internal Server Error)
  console.error('💥 [Unhandled System Error]:', error);

  return res.status(500).json({
    status: 'error',
    message: 'Erro interno do servidor',
  });
};

```

### Passo 3: Registrando o errorHandler na Aplicação (src/main/app.ts ou server.ts)

O middleware de erro DEVE obrigatoriamente ser registrado APÓS todas as rotas da aplicação.

```ts

// src/main/app.ts
import express from 'express';
import 'express-async-errors'; // Garante a captura automática de erros em funções assíncronas
import { userRoutes } from '@infrastructure/http/routes/user-routes';
import { errorHandler } from '@infrastructure/http/middlewares/error-handler';

const app = express();

app.use(express.json());

// Registro das Rotas da Aplicação
app.use('/api/v1/users', userRoutes);

// 🛑 O Middleware Global de Erros DEVE ser a ÚLTIMA declaração do app!
app.use(errorHandler);

export { app };

```
