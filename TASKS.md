# Atividades

## Exercício 1: GET /api/v1/pokemons — Listagem e Filtro por Tipo

*Objetivo*: Criar a listagem completa do catálogo de Pokémons em memória, permitindo filtrar os resultados pelo parâmetro de busca opcional ?type=Fire via Query Parameters.

O que deve ser feito:

1. Domain: Garantir que o método findAll(): Promise<Pokemon[]> e findByType(type: string): Promise<Pokemon[]> façam parte da interface IPokemonRepository.

2. Infrastructure (DB): Implementar os métodos no InMemoryPokemonRepository.

3. Application: Criar o Caso de Uso ListPokemonsUseCase que recebe o repositório no construtor. Se um tipo for repassado no input, chama o método de filtro; caso contrário, chama a listagem geral.

4. Infrastructure (HTTP): Criar o método list(req: Request, res: Response) no PokemonController capaz de extrair req.query.type e retornar o status 200 OK com os dados.

5. Main & Routes: Atualizar a factory makePokemonController e registrar o método GET / no arquivo pokemon-routes.ts.

## Exercício 2: GET /api/v1/pokemons/:id — Busca por ID de Recurso

*Objetivo*: Buscar e retornar um único Pokémon do catálogo local a partir do identificador informado no caminho da URL (Route Params).

O que deve ser feito:

1. Domain: Garantir que a interface IPokemonRepository contenha o contrato findById(id: string): Promise<Pokemon null |>.

2. Infrastructure (DB): Implementar a busca por ID no InMemoryPokemonRepository.

3. Application: Criar o Caso de Uso GetPokemonByIdUseCase. Se o repositório retornar null, o Caso de Uso deve lançar um erro do tipo ResourceNotFoundError ("Pokémon não encontrado no catálogo.").

4. Infrastructure (HTTP): Criar o método getById(req: Request, res: Response) no PokemonController. Se o Pokémon não for encontrado, capturar a exceção e retornar o status 404 Not Found. Se encontrar, retornar 200 OK.

5. Main & Routes: Registrar o método GET /:id no arquivo pokemon-routes.ts.

## Exercício 3: POST /api/v1/pokemons — Cadastro no Catálogo Local

*Objetivo*: Cadastrar uma nova espécie de Pokémon no catálogo local via Body JSON, aplicando as validações das regras de negócio do domínio.

O que deve ser feito:

1. Domain: Garantir que a Entidade Pokemon valide os atributos no construtor (ex: hp > 0, attack > 0, defense > 0).

2. Domain: Adicionar no contrato IPokemonRepository o método create(pokemon: Pokemon): Promise<void> e findById(id: string).

3. Application: Criar o Caso de Uso CreatePokemonUseCase. Ele deve verificar se já existe um Pokémon cadastrado com o mesmo id. Se existir, lançar um erro ("Pokémon com este ID já está cadastrado."). Caso contrário, instanciar a entidade e salvar no repositório.

4. Infrastructure (HTTP): Criar o método create(req: Request, res: Response) no PokemonController extraindo os dados de req.body. Retornar o status 201 Created com a mensagem de sucesso e os dados do recurso criado.

5. Main & Routes: Registrar o método POST / no arquivo pokemon-routes.ts.

## Exercício 4: PUT /api/v1/pokemons/:id — Atualização Completa

*Objetivo*: Atualizar os atributos de um Pokémon existente no catálogo a partir do seu ID.

O que deve ser feito:

1. Domain: Adicionar no contrato IPokemonRepository o método update(pokemon: Pokemon): Promise<void>.

2. Infrastructure (DB): Implementar a atualização dos dados dentro do array do InMemoryPokemonRepository.

3. Application: Criar o Caso de Uso UpdatePokemonUseCase. Ele recebe o id e os novos dados (name, type, hp, attack, defense). Se o Pokémon não existir, lança erro de não encontrado. Se existir, atualiza suas propriedades e salva no repositório.

4. Infrastructure (HTTP): Criar o método update(req: Request, res: Response) no PokemonController extraindo o id de req.params e os novos dados de req.body. Retornar status 200 OK.

5. Main & Routes: Registrar o método PUT /:id no arquivo pokemon-routes.ts.

## Exercício 5: DELETE /api/v1/pokemons/:id — Remoção do Catálogo

*Objetivo*: Remover uma espécie de Pokémon do catálogo local.

O que deve ser feito:

1. Domain: Adicionar no contrato IPokemonRepository o método delete(id: string): Promise<void>.

2. Infrastructure (DB): Implementar a remoção do item no array do InMemoryPokemonRepository.

3. Application: Criar o Caso de Uso DeletePokemonUseCase. Ele deve verificar a existência do registro antes de deletar. Se não existir, lança erro de recurso não encontrado.

4. Infrastructure (HTTP): Criar o método delete(req: Request, res: Response) no PokemonController extraindo o id de req.params. Retornar o status RESTful 204 No Content (ou 200 OK com mensagem de confirmação).

5. Main & Routes: Registrar o método DELETE /:id no arquivo pokemon-routes.ts.

## cURLs para teste

### 1. Cadastrar Pokémon (POST - Status 201 Created)

```bash
  curl --request POST \
    --url http://localhost:3333/api/v1/pokemons \
    --header 'Content-Type: application/json' \
    --data '{
    "id": "25",
    "name": "Pikachu",
    "type": "Electric",
    "hp": 35,
    "attack": 55,
    "defense": 40
  }'
```

### 2. Listar Todos os Pokémons (GET - Status 200 OK)

```bash
  curl --request GET \
    --url http://localhost:3333/api/v1/pokemons
```

### 3. Filtrar por Tipo (GET com Query Param - Status 200 OK)

```bash
  curl --request GET \
    --url 'http://localhost:3333/api/v1/pokemons?type=Electric'
```

### 4. Buscar por ID (GET com Route Param - Status 200 OK)

```bash
  curl --request GET \
    --url http://localhost:3333/api/v1/pokemons/25
```

### 5. Atualizar Pokémon (PUT - Status 200 OK)

```bash
  curl --request PUT \
    --url http://localhost:3333/api/v1/pokemons/25 \
    --header 'Content-Type: application/json' \
    --data '{
    "name": "Pikachu Fortalecido",
    "type": "Electric",
    "hp": 50,
    "attack": 65,
    "defense": 45
  }'
```

### 6. Remover Pokémon (DELETE - Status 204 No Content)

```bash
  curl --request DELETE \
    --url http://localhost:3333/api/v1/pokemons/25
```
