# Persistência de Dados Relacional com PostgreSQL

## Fundamentos da Persistência Relacional

1. Por que abandonamos o "In-Memory"?

No Módulo 1, usamos arrays JavaScript em memória (InMemoryUserRepository).

* O problema: Toda vez que a API reinicia (npm run dev), os dados são apagados.

* A solução: Mover o estado da aplicação para um Sistema Gerenciador de Banco de Dados Relacional (SGBD) que grava as informações em disco de forma duradoura.

1. O Padrão ACID no PostgreSQL

O PostgreSQL é um banco relacional focado em conformidade e integridade:

* A - Atomicidade: Uma transação é "tudo ou nada". Se falhar no meio, ocorre o rollback.

* C - Consistência: Garante que o banco saia de um estado válido e chegue a outro estado válido respeitando as regras (chaves primárias, chaves estrangeiras).

* I - Isolamento: Transações concorrentes não interferem umas nas outras antes de serem concluídas.

* D - Durabilidade: Uma vez confirmada (commit), a alteração não é perdida mesmo se faltar energia no servidor.

## Modelagem da Tabela de Usuários

Antes de usar comandos SQL, definimos a estrutura relacional do nosso recurso de usuários:

```sql

-- Tabela de Usuários no PostgreSQL
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

```

💡 Destaques de Arquitetura no Postgres:

* UUID vs BIGINT: Usamos UUID em vez de IDS auto-incrementais (1, 2, 3...) para evitar previsibilidade de endpoints RESTful e facilitar arquitetura distribuída.
* UNIQUE Constraint: Garante no nível do próprio banco que dois usuários não tenham o mesmo e-mail, agindo como segunda linha de defesa após os Casos de Uso.

## Conectando o Node.js ao Postgres

Como a aplicação Node.js conversa com o PostgreSQL usando o driver oficial de baixo nível (pg), preparando o terreno pedagógico para entender o que o ORM resolverá na nossa próxima aula.

### Passo 1: Instalar o Driver Nativo (pg) e os Tipos

```bash
npm install pg
npm install --save-dev @types/pg
```

### Passo 2: Criar o Módulo de Conexão com o Pool (src/infrastructure/database/postgres/connection.ts)

O Connection Pool gerencia e reutiliza conexões abertas com o PostgreSQL em vez de abrir e fechar uma conexão a cada requisição HTTP:

```ts

import { Pool } from 'pg';

export const postgresPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Teste inicial de comunicação com o banco de dados
postgresPool.on('connect', () => {
  console.log('🐘 [database]: Conexão com o PostgreSQL estabelecida com sucesso!');
});

postgresPool.on('error', (err) => {
  console.error('💥 [database]: Erro inesperado no pool do PostgreSQL:', err);
});

```

### Passo 3: Criar um Repositório Nativo em SQL (src/infrastructure/database/postgres/pgUser.repository.ts)

Implementamos a mesma interface IUserRepository do domínio, mas executando queries SQL puras:

```ts

// src/infrastructure/database/postgres/pg-user-repository.ts
import { User } from '@domain/entities/user';
import { IUserRepository } from '@domain/repositories/user-repository';
import { postgresPool } from './connection';

export class PgUserRepository implements IUserRepository {
  async create(user: User): Promise<void> {
    const query = `
      INSERT INTO users (id, name, email)
      VALUES ($1, $2, $3)
    `;
    await postgresPool.query(query, [user.id, user.name, user.email]);
  }

  async findByEmail(email: string): Promise<User | null> {
    const query = `SELECT id, name, email FROM users WHERE email = $1`;
    const result = await postgresPool.query(query, [email]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return new User({ id: row.id, name: row.name, email: row.email });
  }

  async findAll(): Promise<User[]> {
    const query = `SELECT id, name, email FROM users`;
    const result = await postgresPool.query(query);

    return result.rows.map((row) => new User({ id: row.id, name: row.name, email: row.email }));
  }

  async findById(id: string): Promise<User | null> {
    const query = `SELECT id, name, email FROM users WHERE id = $1`;
    const result = await postgresPool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return new User({ id: row.id, name: row.name, email: row.email });
  }
}

```

### Passo 4: Trocar a Injeção de Dependência na Factory (src/main/factories/make-user-controller.ts)

Apenas alteramos uma linha na camada Main, sem encostar em nenhum Caso de Uso ou Controller!

```ts

import { PgUserRepository } from '@infrastructure/database/postgres/pg-user-repository'; // 👈 Mudou aqui!
import { CreateUserUseCase } from '@application/use-cases/create-user';
import { ListUsersUseCase } from '@application/use-cases/list-users';
import { GetUserByIdUseCase } from '@application/use-cases/get-user-by-id';
import { UserController } from '@infrastructure/http/controllers/user-controller';

// Agora injetamos a implementação que se conecta ao PostgreSQL real
const userRepository = new PgUserRepository();

export function makeUserController(): UserController {
  const createUserUseCase = new CreateUserUseCase(userRepository);
  const listUsersUseCase = new ListUsersUseCase(userRepository);
  const getUserByIdUseCase = new GetUserByIdUseCase(userRepository);

  return new UserController(createUserUseCase, listUsersUseCase, getUserByIdUseCase);
}

```
