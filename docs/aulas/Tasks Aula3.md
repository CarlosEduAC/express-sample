# Tasks

## Exercício 1: "Descubra o Bug do JS" (Migração Básica & Inferência)

Objetivo: Identificar erros de runtime em código JS puro e corrigi-los aplicando tipagem estática e interfaces no TS.

Dado o seguinte código em JavaScript que possui bugs silenciosos:

```javascript
// ❌ CÓDIGO JS ORIGINAL (COM BUGS)
function calculatePokemonDamage(attacker, defender) {
  const baseDamage = attacker.attack - defender.defensse; // Erro de digitação!
  const totalHpRemaining = defender.hp - baseDamage;
  return "HP restante: " + totalHpRemaining;
}

const pikachu = { name: "Pikachu", attack: 55, hp: 35 };
const charmander = { name: "Charmander", attack: 52, defense: 43, hp: "39" }; // HP é string!

console.log(calculatePokemonDamage(pikachu, charmander));
```

Sua Tarefa:

1. Crie uma interface IPokemonBattleStats para definir os atributos numéricos obrigatórios (attack, defense, hp).
2. Reescreva a função calculatePokemonDamage em TypeScript tipando estritamente os parâmetros e o retorno.
3. Garanta que o TypeScript aponte o erro de digitação (defensse) e a string no hp do Charmander em tempo de compilação.

## Exercício 2: Modelagem de Domínio com Enums e Propriedades Opcionais

Objetivo: Aplicar Enum, tipos literais e propriedades opcionais na entidade de Pokémons.

Sua Tarefa:

1. Crie um Enum chamado PokemonType com os valores: FIRE, WATER, GRASS, ELECTRIC, PSYCHIC.
2. Crie um Enum chamado Rarity com os valores: COMMON, RARE, LEGENDARY.
3. Crie uma interface IPokemon com as seguintes propriedades:

- id: string
- name: string
- type: PokemonType (enum)
- hp: number
- rarity: Rarity (enum)
- nickname: string (opcional — usando o operador ?)

4. Instancie no seu código um Pokémon comum (sem apelido) e um Pokémon Lendário (com apelido) utilizando as interfaces criadas.

## Exercício 3: Union Types e DTO de Busca

Objetivo: Criar contratos de busca flexíveis usando Union Types para filtros na API.

No backend, muitas vezes recebemos parâmetros que podem ser de tipos diferentes (ex: buscar um Pokémon tanto pelo seu ID numérico/string quanto pelo seu nome exato).

Sua Tarefa:

1. Crie um tipo SearchIdentifier = string | number.
2. Crie uma função chamada findPokemonInCatalog(identifier: SearchIdentifier) que simule a busca no catálogo.
3. Se identifier for do tipo number, a função deve imprimir no console: "Buscando por Pokedex ID: <id>".
4. Se identifier for do tipo string, a função deve imprimir: "Buscando por Nome: <nome>".

## Exercício 4: Tipando os Handlers do Express (DTOs e Params)

Objetivo: Conectar as interfaces TypeScript diretamente nas requisições da nossa PokéManager API.

Sua Tarefa:

No seu arquivo src/server.ts, crie as seguintes interfaces de contrato para as rotas do Express:

1. CreateTrainerDTO: Interface para o corpo (req.body) do cadastro de um treinador, contendo name (string), age (number) e city (string).
2. TrainerParams: Interface para a rota que recebe :trainerId via req.params.
3. Atualize a rota de cadastro POST /api/v1/trainers usando os tipos genéricos do Express (Request<{}, {}, CreateTrainerDTO>) e faça uma validação que garanta que age seja um número positivo antes de responder com o status 201 Created.

## Exercício 5 (Desafio): Inversão de Dependência com Interfaces

Objetivo: Treinar o pensamento arquitetural criando a interface de um repositório que será usada nas aulas de Clean Architecture.

Sua Tarefa:

1. Crie o arquivo src/types/repository.ts.
2. Escreva uma interface TypeScript chamada IPokemonRepositoryContract que contenha a assinatura de 3 métodos assíncronos:

- save(pokemon: IPokemon): Promise<void>
- findAll(): Promise<IPokemon[]>
- findById(id: string): Promise<IPokemon | null>

3. Crie uma classe simples chamada MockPokemonRepository que implemente (implements) essa interface salvando os dados em um array interno.
