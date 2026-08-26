# Estrutura de Projeto Node.js com Clean Architecture

## Teoria – Anatomia de um Projeto Profissional

1. O Problema das Estruturas Tradicionais (Ex: "MVC Invertido" ou "Pasta por Tipo")

Nas abordagens tradicionais (muito comuns em frameworks como Laravel, Django ou aplicações Express legadas), o projeto é organizado categorizando os arquivos pelo seu tipo técnico (controllers, models, routes, services).

```txt
    ❌ Estrutura Ruim (Pasta por Tipo de Arquivo):
    src/
    ├── controllers/    <-- Mistura lógica de usuário, produtos, pagamentos...
    ├── models/         <-- Mistura banco de dados com lógica de negócio
    ├── routes/         <-- Apenas rotas Express soltas
    └── utils/          <-- A "lixeira" do projeto onde tudo é colocado
```

Por que essa abordagem gera problemas em aplicações que crescem?

- *Acoplamento Severo (Efeito Dominó)*: O Controller acessa diretamente o Model do banco de dados ou executa regras de negócio. Se o schema do banco muda, o controller quebra, o formulário do frontend quebra e os testes falham.

- *Refém do Framework*: A lógica de negócio fica "presa" às classes e métodos do framework HTTP (Express, Fastify) ou do ORM (Prisma, TypeORM). Migrar de biblioteca ou atualizar versões torna-se um pesadelo técnico.

- *Dificuldade de Testar*: Para testar uma simples regra de cálculo de desconto ou limite de cadastro, você é obrigado a subir um banco de dados real e iniciar um servidor HTTP, tornando os testes lentos e difíceis de manter.

- *Baixa Legibilidade de Negócio (Screaming Architecture)*: Ao olhar para a pasta services/, você vê dezenas de arquivos misturando regras de usuários, pagamentos, produtos e relatórios no mesmo nível, sem clareza sobre o que o sistema realmente faz.

2. A Solução: Estrutura Orientada à Arquitetura Limpa

A Clean Architecture (Arquitetura Limpa), introduzida por Robert C. Martin (Uncle Bob), propõe a separação do sistema em camadas concêntricas, onde a Regra da Dependência dita que o código das camadas internas nunca deve conhecer nada sobre as camadas externas.

```txt
    src/
    ├── domain/                      # [Camada 1: Núcleo / Entidades]
    │   ├── entities/                # Regras de negócio puras (Classes TS)
    │   ├── errors/                  # Exceções customizadas do domínio
    │   └── repositories/            # Contratos/Interfaces (IPokemonRepository)
    │
    ├── application/                 # [Camada 2: Casos de Uso / Aplicação]
    │   ├── use-cases/               # Ações do sistema (CreatePokemon, ListPokemons)
    │   └── dtos/                    # Contratos de entrada e saída de dados
    │
    ├── infrastructure/              # [Camada 3 e 4: Detalhes e Frameworks]
    │   ├── database/                # Implementações concretas de BD (In-Memory ou Prisma)
    │   └── http/                    # Express: Controllers, Middlewares e Rotas
    │
    └── main/                        # [A "Cola" / Ponto de Composição]
        ├── factories/               # Instanciação de objetos (Dependency Injection)
        ├── config/                  # Variáveis de ambiente e configs do app
        └── server.ts                # Inicialização do servidor HTTP
```

O Conceito-Chave: Inversão de Dependência (DIP)
A razão técnica pela qual essa estrutura é superior é que ela trata frameworks, bancos de dados e protocolos web como meros detalhes editáveis.

Se você precisa do banco de dados, o seu caso de uso não chama o banco diretamente; ele chama uma interface (IPokemonRepository). Quem implementa essa interface é o banco concreto (PrismaPokemonRepository), que fica isolado na camada de infraestrutura.

### Benefícios da Arquitetura Limpa

- *Independência de Frameworks*: A regra de negócio não sabe se você está usando Express, Fastify ou NestJS. Mudar o framework web exige alterar apenas a camada de infrastructure/http, sem tocar no núcleo da aplicação.
- *Testabilidade Extremamente Alta*: Como a camada de aplicação depende apenas de interfaces (IPokemonRepository), os testes unitários rodam em milissegundos utilizando repositórios em memória (InMemoryPokemonRepository), sem precisar de Docker ou banco de dados ativo.
- *Facilidade para Troca de Persistência*: É possível começar o projeto salvando dados em memória ou arquivo JSON e, semanas depois, migrar para PostgreSQL, MongoDB ou DynamoDB trocando apenas a implementação da interface do repositório na pasta main/.
- *Clareza de Domínio*: A pasta application/use-cases/ funciona como uma documentação viva. Ao abrir a pasta, qualquer desenvolvedor lê exatamente o que o sistema faz: CreatePokemonUseCase, CatchPokemonUseCase, AuthenticateTrainerUseCase.
- *Trabalho Paralelo em Equipe*: Um desenvolvedor pode criar a regra de negócio do Caso de Uso enquanto outro desenvolve a integração com o banco ou a rota HTTP, sem gerar conflitos de código (merge conflicts).

### Malefícios e Pontos de Atenção (Trade-offs)

Nenhuma arquitetura é uma "bala de prata". Aplicar a Arquitetura Limpa traz custos que devem ser avaliados:

- *Complexidade Inicial e "Overengineering" em Projetos Pequenos*: Para criar um CRUD simples de 2 tabelas, você precisará escrever a Entidade, a Interface do Repositório, o Repositório Concreto, o Caso de Uso, o DTO e o Controller. Em scripts curtos ou microsserviços simples, isso pode ser excessivo.
- *Curva de Aprendizado Elevada*: Desenvolvedores iniciantes costumam ter dificuldade para entender por que não podem chamar o banco de dados direto no controller ou por que precisam de tantas interfaces e arquivos indiretos.
- *Aumento da Quantidade de Arquivos*: O número total de arquivos no repositório cresce consideravelmente se comparado a uma estrutura clássica em arquivo único ou MVC simples.
- *Verborragia de Código (Boilerplate)*: Mapear dados da entidade de domínio para o DTO de resposta e depois para o schema do banco de dados exige escrever conversores (Mappers), aumentando o volume de código digitado.

## Conclusão: Vale a pena?

Para APIs modernas, sistemas corporativos e aplicações comerciais que pretendem evoluir com segurança ao longo do tempo, a Arquitetura Limpa é a escolha ideal. Ela troca o ganho imediato de velocidade de codificação na primeira semana por sustentabilidade, facilidade de manutenção e altíssima qualidade de testes durante todo o ciclo de vida do software.
