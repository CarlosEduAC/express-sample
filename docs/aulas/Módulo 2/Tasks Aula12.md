# Atividades

## Exercício 1: Enriquecimento de Pokémons via PokeAPI Oficial

Foco: Criação do PokemonExternalGateway, consumo de API externa com Axios e Camada Anti-Corrupção.

Desafio: Ao cadastrar um novo Pokémon na PokéManager API informando apenas o seu nome (ex: "charizard"), o sistema deve consultar a API oficial pública da PokéAPI ([https://pokeapi.co/api/v2/pokemon/](https://pokeapi.co/api/v2/pokemon/){name}) para capturar automaticamente a imagem oficial (sprite) e o valor de base de experiência (base_experience).

O que deve ser feito:

1. Crie o contrato PokemonExternalGateway na pasta src/domain/gateways/pokemon-external-gateway.ts definindo a assinatura findByName(name: string): Promise<ExternalPokemonDetails | null>.

2. Crie a implementação PokeApiAxiosGateway na pasta src/infrastructure/gateways/poke-api-axios-gateway.ts.

3. Mapeie o JSON complexo retornado pela PokéAPI para extrair apenas os dados necessários:

- spriteUrl: sprites.other['official-artwork'].front_default

- baseExperience: base_experience

- height: height

- weight: weight

1. Se a PokéAPI retornar status 404 Not Found (nome do Pokémon inválido ou inexistente), o gateway deve retornar null.

2. No Use Case CreatePokemonUseCase, se o gateway retornar null, impeça o cadastro e lance a exceção NotFoundError('Pokémon não encontrado na base oficial da PokeAPI').

## Exercício 2: Tratamento de Resiliência e Error Handling Externo

Foco: Timeouts, controle de exceções de infraestrutura e status HTTP 503.

Desafio: A PokéAPI é um serviço público e pode passar por instabilidades ou oscilações de latência. A sua aplicação não pode travar nem expor chamadas pendentes indefinitivamente caso a PokéAPI fique fora do ar.

O que deve ser feito:

1. No PokeApiAxiosGateway, adicione uma configuração estrita de timeout de 3 segundos na requisição do Axios.

2. Trate exceções de rede e timeout (ECONNABORTED, ERR_BAD_RESPONSE).

3. Se a PokéAPI estiver fora do ar ou estourar o limite de tempo, capture a exceção e lance um AppError('O serviço externo da PokeAPI está temporariamente indisponível. Tente novamente mais tarde', 503).

4. Teste essa resiliência simulando uma URL inválida ou configurando o timeout para 1ms intencionalmente para ver o seu errorHandler global responder com o status 503 Service Unavailable.

## Exercício 3: Criação do Gateway de Fallback (Mock em Memória)

Foco: Testabilidade, Inversão de Dependência e execução sem acesso à internet.

Desafio: Para permitir que os testes unitários da aplicação rodem em ambientes sem acesso à internet (ou no pipeline de CI/CD), implemente um Gateway Falso (Fake/Mock).

O que deve ser feito:

1. Crie o arquivo src/infrastructure/gateways/in-memory-pokemon-gateway.ts que implemente a mesma interface PokemonExternalGateway.

2. Crie uma lista estática em memória com dados pré-cadastrados para pelo menos 3 Pokémons (pikachu, charmander, bulbasaur).

3. Altere a Factory make-pokemon-controller.ts para que, se a variável de ambiente USE_EXTERNAL_API for igual a false, o sistema injete o InMemoryPokemonGateway em vez do PokeApiAxiosGateway.

4. Teste a aplicação alterando o arquivo .env para rodar tanto no modo integrado quanto no modo isolado/offline.
