# Atividades

## Exercício 1: Schema de Cadastro de Pokémons

Objetivo: Criar um schema Zod para validação da inclusão de novos Pokémons no catálogo do PokéManager.

O que fazer:

1. Crie o arquivo src/infrastructure/http/schemas/pokemon-schemas.ts.

2. Implemente o createPokemonSchema atendendo às regras:

- name: String obrigatória, mínimo 2 caracteres.

- type: Enum restrito aos tipos: 'FIRE', 'WATER', 'GRASS', 'ELECTRIC', 'POISON', 'FLYING'. (Dica: Use z.enum()).

- level: Número inteiro, valor mínimo 1 e valor máximo 100. (Dica: Use z.number().int().min(1).max(100)).

- trainerId: Opcional, devendo ser um UUID válido se informado.

## Exercício 2: Schemas do Domínio Treinador (Trainer)

Objetivo: Validar os dados de entrada para o cadastro de novos treinadores na aplicação.

O que fazer:

1. Crie o arquivo src/infrastructure/http/schemas/trainer-schemas.ts.

2. Implemente o createTrainerSchema:

- name: String obrigatória, mínimo 3 caracteres, removendo espaços das pontas (.trim()).

- email: E-mail válido, em caixa baixa (.toLowerCase()).

- city: String obrigatória com no mínimo 2 caracteres.

3. Exporte os tipos inferidos via z.infer<typeof createTrainerSchema>.

## Exercício 3: Validação de Parâmetros de Busca

Objetivo: Validar os dados de criação de Treinadores e filtros de query string para busca de Pokémons.

O que fazer:

1. Crie o arquivo src/infrastructure/http/schemas/trainer-schemas.ts com o createTrainerSchema:

- name: String (mínimo 3 caracteres).

- email: E-mail válido e em letras minúsculas.

- city: String com no mínimo 2 caracteres.

2. No pokemon-schemas.ts, crie o listPokemonsQuerySchema para validar a rota GET /api/v1/pokemons:

type: String opcional.

- minLevel: Deve aceitar string enviada pela query e transformá-la em número com valor padrão 1 (Dica: Use z.string().optional().transform(...)).

- maxLevel: Deve aceitar string enviada pela query e transformá-la em número com valor padrão 100 (Dica: Use z.string().optional().transform(...)).

3. Defina o schema listPokemonsQuerySchema para aceitar a query string GET /api/v1/pokemons:

- type: String opcional.

- minLevel: Recebe uma string numérica da query e converte em inteiro com valor padrão 1. (Dica: Use .transform()).

## Exercício 4: Teste de Resposta com Payload Inválido no PokéManager

Objetivo: Validar o comportamento do middleware interceptando chamadas malformadas.

O que fazer:

1. Conecte os schemas criados nas rotas POST /api/v1/pokemons e POST /api/v1/trainers.

2. Envie uma requisição POST /api/v1/pokemons via Swagger com o body:

```json

{
  "name": "P",
  "type": "DIGIMON",
  "level": 999
}

```

3. Verifique se a API retorna 400 Bad Request com a estrutura detalhada de erro:

```json

{
  "status": "error",
  "message": "Dados de entrada inválidos",
  "details": [
    { "field": "name", "message": "O nome deve ter no mínimo 2 caracteres" },
    { "field": "type", "message": "Invalid enum value. Expected 'FIRE' | 'WATER'..." },
    { "field": "level", "message": "Number must be less than or equal to 100" }
  ]
}

```
