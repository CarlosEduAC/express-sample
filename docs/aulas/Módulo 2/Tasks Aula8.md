# Atividades

## Exercício 1: Adicionar Banco de Dados no PokeManager API

1. Criar a tabela users via pgAdmin

- Acesse <http://localhost:8080>.
- Abra a ferramenta Query Tool no banco pokemanager_db.
- Execute o script de CREATE TABLE apresentado na aula.

2. Implementar a classe PgPokemonRepository no PokeManager API

- Substituir a injeção do repositório na Factory pelo PgPokemonRepository.

3. Disparar requisições via Swagger (/api/docs)

- Cadastrar novos pokemons no POST /pokemons.

- Abrir o pgAdmin e dar um SELECT * FROM pokemons; para visualizar as linhas inseridas fisicamente no banco!

- Ajustar todos os endpoints para utilizar o PgPokemonRepository.

Obs: Garanta a utilização de parâmetros preparados ($1) para evitar vulnerabilidades de SQL Injection:

```ts

// ✅ Seguro: Parametrizado via driver pg
const query = `SELECT id, name, type, level FROM pokemons WHERE type = $1`;
const result = await postgresPool.query(query, [type]);

```

## Exercício 2: Atualização de Nível do Pokémon (PATCH)

1. Implementar o endpoint PATCH /pokemons/:id/level no PokeManager API para atualizar o nível de um Pokémon específico.
2. Implementar a lógica no PgPokemonRepository para atualizar o nível do Pokémon no banco de dados utilizando parâmetros preparados ($1, $2). Implemente as instruções DML em SQL puro.
3. Testar o endpoint PATCH /pokemons/:id/level via Swagger (/api/docs) para garantir que o nível do Pokémon seja atualizado corretamente no banco de dados.

```ts

updateLevel(id: string, newLevel: number): Promise<void>

```

Obs: Lembre-se de manter a estrutura de clean code ao implementar o método updateLevel.

## Exercício 3: Tabela de Treinadores e Captura de Duplicidade (UNIQUE)

Tratar exceções nativas do PostgreSQL (Código 23505 — unique_violation) ao tentar cadastrar um treinador com e-mail ou insígnia já existente.

1. Estrutura SQL no pgAdmin:

```sql

CREATE TABLE IF NOT EXISTS trainers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  city VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

```

2. O que fazer no código:

- Criar uma interface IPgTrainerRepository com métodos para cadastrar, atualizar e buscar treinadores no banco de dados utilizando parâmetros preparados.
- No repositório PgTrainerRepository, ao executar a inserção de um novo Treinador (INSERT INTO trainers...), envolva a chamada do postgresPool.query em um bloco try/catch.
- Capture o código de erro nativo do PostgreSQL 23505 e converta para a nossa classe de domínio AppError:

```ts

try {
  await postgresPool.query(query, [trainer.id, trainer.name, trainer.email, trainer.city]);
} catch (error: any) {
  if (error.code === '23505') {
    throw new AppError('Já existe um Treinador cadastrado com este e-mail.', 409);
  }
  throw error;
}

```

- Teste o comportamento enviando dois cadastros iguais via Swagger e confirme se a API responde com status 409 Conflict.

## Exercício 4: Consulta Avançada com Filtro Parcial (LIKE) e Contagem

Praticar busca por nome parcial de Pokémons e contagem total do catálogo no banco.

O que fazer:

1. Crie o método searchByName(term: string): Promise<Pokemon[]> no repositório nativo.

2. Utilize o operador ILIKE do PostgreSQL para fazer a busca case-insensitive (ignorando maiúsculas e minúsculas):

```ts

const query = `SELECT id, name, type, level FROM pokemons WHERE name ILIKE $1`;
const result = await postgresPool.query(query, [`%${term}%`]);

```

3. Teste buscando por "pika" e verifique se o banco retorna "Pikachu".
