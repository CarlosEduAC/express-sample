# Atividades

## Exercício 1: Tratar E-mail Duplicado na Criação de Treinadores

Objetivo: Validar o disparo do erro HTTP 409 Conflict ao cadastrar um Treinador com e-mail já existente.

O que fazer:

1. Verifique no arquivo prisma/schema.prisma se a entidade Trainer possui o campo email marcado com a diretiva @unique.
2. Tente cadastrar dois treinadores com o mesmo e-mail executando duas chamadas POST /api/v1/trainers.
3. Verifique se o errorHandler intercepta o erro P2002 do Prisma e responde com:

```json

{
  "status": "error",
  "message": "Já existe um registro cadastrado com este email"
}

```

## Exercício 2: Tratar Treinador Inexistente ao Associar Pokémon (Chave Estrangeira)

Objetivo: Interceptar a violação de chave estrangeira ao tentar criar um Pokémon vinculado a um treinador que não existe.

O que fazer:

1. Envie uma requisição POST /api/v1/pokemons informando um trainerId no formato UUID válido (ex: a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11), mas que não esteja cadastrado na tabela de Treinadores.
2. Certifique-se de que o Prisma lança o código P2003 e o middleware responde com status 400 Bad Request:

```json
{
  "status": "error",
  "message": "Relacionamento inválido. O recurso associado não existe"
}
```

## Outros:

### Exceção de Negócio de Domínio - "Regra dos 6 Pokémons no Time"

Desafio: No universo Pokémon, um treinador só pode carregar no máximo 6 Pokémons ativamente em sua equipe. Se um treinador tentar capturar ou ter atribuído a si um 7º Pokémon, o sistema deve impedir a operação e disparar uma exceção de negócio.

O que deve ser feito:

1. Na camada de Aplicação (src/application/useCases/createPokemon.ts ou assignPokemonToTrainer.ts), crie uma verificação que consulte o repositório para contar quantos Pokémons o treinador já possui associados a ele.

2. Se a contagem for maior ou igual a 6, lance a exceção de domínio personalizada: ConflictError('O treinador já possui o limite máximo de 6 Pokémons em seu time').

3. Certifique-se de que a rota POST /api/v1/pokemons (ou de associação) intercepte esse erro e devolva uma resposta HTTP com Status 409 Conflict.

Resultado Esperado no Cliente:

```json

{
  "status": "error",
  "message": "O treinador já possui o limite máximo de 6 Pokémons em seu time"
}

```

### Resiliência de Infraestrutura - Tratar Transações e Falhas do Banco

Desafio: Quando um treinador se aposenta ou é removido do sistema, seus Pokémons não devem ser apagados do banco, mas sim ter o campo trainerId atualizado para null (ficando selvagens novamente), mantendo a integridade referencial.

O que deve ser feito:

1. Crie o Caso de Uso DeleteTrainerUseCase.

2. Implemente a exclusão do treinador utilizando uma transação do Prisma (prisma.$transaction) ou atualização em cascata no schema.prisma.

3. Se o cliente tentar deletar um treinador por um ID inexistente no banco (DELETE /api/v1/trainers/:id), garanta que o Prisma lance o erro P2025.

4. Valide se o seu PrismaErrorMapper intercepta esse erro de infraestrutura e responde com Status 404 Not Found com a mensagem: "Treinador não encontrado para exclusão".

Resultado Esperado no Cliente:

```json

{
  "status": "error",
  "message": "Treinador não encontrado no banco de dados"
}

```

### Paginação e Filtros de Busca com Validação de Borda

Desafio: Uma API profissional não deve retornar todos os registros do banco de dados em uma única chamada. Você deve implementar paginação e filtros refinados na rota GET /api/v1/pokemons.

O que deve ser feito:

1. No arquivo pokemon-schemas.ts, crie o listPokemonsQuerySchema validando a query string:

- page: String recebida via query, convertida para número com valor padrão 1 (z.string().optional().transform(...)).

- limit: String recebida via query, convertida para número com valor máximo 50 e valor padrão 10.

- type: Enum opcional de tipos de Pokémons ('FIRE', 'WATER', etc.).

2. Se o usuário enviar um parâmetro de busca inválido (ex: limit=mil ou type=DIGIMON), o Zod deve barrar a requisição na borda com Status 400 Bad Request.

3. Atualize o repositório Prisma (prisma.pokemon.findMany) para utilizar os operadores take e skip calculados a partir de page e limit.

Resultado Esperado no Cliente (Em caso de sucesso):

```json

{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 45
  }
}

```
