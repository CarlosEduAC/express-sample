# Atividades

## Exercício 1: Remover um Pokémon pelo ID

Verbo HTTP: DELETE

URI: /api/v1/pokemons/:id

Regras:

Procurar o Pokémon pelo ID enviado no req.params.

Se não existir, retornar 404 Not Found.

Se existir, remover do array pokemons e retornar 200 OK ou 204 No Content.

## Exercício 2: Atualizar um Pokémon pelo ID

Verbo HTTP: PUT

URI: /api/v1/pokemons/:id

Regras:

Procurar o Pokémon pelo ID enviado no req.params.

Se não existir, retornar 404 Not Found.

Se existir, atualizar os dados do Pokémon e retornar 200 OK.

## Exercício 3: Rota de Estatísticas Gerais da API

Verbo HTTP: GET

URI: /api/v1/pokemons/stats

Regras:

- A rota não recebe parâmetros.
- Deve processar o array de Pokémons e retornar um JSON com as estatísticas acumuladas do catálogo
- Status 200 OK.

Exemplo de resposta:

```json
{
  "totalPokemons": 4,
  "typesCount": {
    "Grass": 1,
    "Fire": 1,
    "Water": 1
  }
}
```
