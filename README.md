# Introdução à Pirâmide de Testes & Configuração do Jest no TypeScript

## 1. Por que Testamos Software? A Perspectiva de Negócio e Engenharia

Muitos desenvolvedores encaram testes como burocracia ou sobrecarga de trabalho (overhead). Na engenharia de software profissional, entretanto, código sem testes automatizados é um passivo financeiro imediato.

### A. A Lei da Curva de Custo da Mudança (Cost of Change Curve)

Conforme formulado por Barry Boehm e demonstrado na indústria ao longo das décadas, o custo de corrigir uma falha cresce exponencialmente à medida que ela avança no ciclo de vida do desenvolvimento:

```txt

  CUSTO ($)
    ▲
    │                                                    [ Produção: Incidente crítico,
    │                                                      vazamento de dados, SLA rompido ]
    │                                                                   ▲
    │                                                                  ╱
    │                                              [ Homologação / QA]╱
    │                                                     ▲          ╱
    │                                                    ╱          ╱
    │                              [ Pull Request / CI ]╱          ╱
    │                                      ▲           ╱          ╱
    │              [ Feedback Imediato ]  ╱           ╱          ╱
    │               (Teste Unitário: ms) ╱           ╱          ╱
    └───────────────────────┴───────────┴───────────┴──────────┴────────────────► TEMPO
                       Desenvolvimento     Build       Deploy     Operação

```

- No Teste Unitário (Feedback em milissegundos): Custo próximo de zero. O desenvolvedor percebe a regressão antes mesmo de commitar.

- Em Produção: Custo altíssimo. Envolve horas de equipe sênior em incidentes, reuniões de post-mortem, perda de confiança do cliente, rollback de banco de dados e potencial dano financeiro direto.

### B. O Maior Benefício: O Fim do "Medo de Refatorar"

Sem testes, qualquer melhoria arquitetural (ex: trocar um ORM, atualizar a versão do Node ou reorganizar pastas) é evitada por medo de quebrar comportamentos secundários (efeito colateral oculto).

> Princípio Central: Os testes automatizados atuam como uma rede de segurança de alta precisão. Eles liberam o time para limpar o código continuamente, pagar dívidas técnicas e aplicar princípios de Clean Code sem paralisar as entregas de negócio.

### C. Testes como Design Tool (Como a Clean Architecture Facilita o Teste)

Existe uma correlação direta entre facilidade de teste e qualidade arquitetural:

- Se uma classe é difícil de testar, ela provavelmente viola o SRP (Single Responsibility Principle) ou possui dependências ocultas acopladas (violação do DIP).

- Na Clean Architecture, como a regra de dependência aponta sempre para dentro (Domínio no centro), Use Cases e Entidades não conhecem Express, Prisma ou Redis. Eles dependem apenas de contratos (IUserRepository, HashProvider).

- Isso significa que podemos testar as regras mais críticas do negócio sem subir nenhum servidor HTTP, sem inicializar contêineres Docker e sem conexão de rede.

## 2. Anatomia da Pirâmide de Testes

A Pirâmide de Testes (popularizada por Mike Cohn e detalhada por Martin Fowler) orienta como distribuir os esforços de teste para balancear velocidade, custo e confiança.

```txt

                     ▲
                    ╱ ╲
                   ╱   ╲            1. TESTES E2E (Ponta a Ponta)
                  ╱ E2E ╲           • Escopo: Borda HTTP até o Banco Real
                 ╱───────╲          • Foco: Jornadas completas do usuário
                ╱         ╲         • Características: Lentos (segundos/min), frágeis, caros
               ╱Integração ╲
              ╱─────────────╲       2. TESTES DE INTEGRAÇÃO
             ╱               ╲      • Escopo: Comunicação entre camadas
            ╱                 ╲     • Foco: Repositórios Prisma, Gateways de API, Middlewares
           ╱    UNITÁRIOS      ╲    • Características: Velocidade média, validam integrações de I/O
          ╱_____________________╲
                                    3. TESTES UNITÁRIOS
                                    • Escopo: Funções, Entidades, Use Cases
                                    • Foco: Lógica de negócio pura e casos de borda
                                    • Características: Ultrarrápidos (ms), isolados, determinísticos

```

| Dimensão              | Testes Unitários              | Testes de Integração               | Testes Ponta a Ponta (E2E)  |
|-----------------------|-------------------------------|------------------------------------|-----------------------------|
| Alvo no Código        | domain/, application/         | infrastructure/ (Prisma, Gateways) | main/, routes/, HTTP Server |
| Tempo de Execução     | 1 a 5 milissegundos por teste | 100ms a 1s por teste               | 2 a 10s por suíte           |
| Dependência de Banco? | ❌ Não (usa memória)          | ✔️ Sim (Docker/SQLite/Test DB)     | ✔️ Sim (Ambiente completo)  |
| Custo de Manutenção   | Muito baixo                   | Médio                              | Alto (sujeito a flakiness)  |
| Volume Recomendado    | 70% a 80% da base             | 15% a 20% da base                  | 5% a 10% da base            |

## 3. O Vocabulário Essencial: Test Doubles (Gerard Meszaros)

Muitas vezes usa-se a palavra "Mock" como sinônimo para qualquer dublê de teste. Na literatura clássica (xUnit Test Patterns), existem categorias distintas:

1. Dummy: Objetos passados apenas para preencher parâmetros obrigatórios de um método, mas que nunca são efetivamente utilizados na lógica do teste (ex: um e-mail aleatório em um teste que só valida tamanho de array).

2. Stub: Objeto que fornece respostas pré-programadas e prontas para as chamadas realizadas durante o teste (ex: um gateway que sempre devolve { valid: true } sem calcular nada).

3. Spy: Um dublê que registra informações sobre como foi chamado (quais argumentos recebeu, quantas vezes foi invocado). Usado quando queremos verificar se um evento ou método colateral foi disparado.

4. Mock: Objeto configurado com expectativas prévias sobre as chamadas que deve receber. Se não for invocado conforme o esperado, o teste falha.

5. Fake: Possui uma implementação funcional real, porém simplificada e inadequada para produção por rodar em memória (ex: o InMemoryUserRepository e o FakeHashProvider). Este é o dublê padrão da Clean Architecture para isolar o Domínio.

## 4. Configuração do Ecossistema Jest + TypeScript

### A. Dependências de Desenvolvimento

```txt

npm install -D jest ts-jest @types/jest

```

### B. O Desafio dos Path Aliases no Jest (jest.config.ts)

O TypeScript compila caminhos virtuais (@domain/*, @application/*) definidos no tsconfig.json. O Jest, no entanto, é executado pelo Node.js e não lê nativamente os aliases do TypeScript sem o devido mapeamento no moduleNameMapper.

```ts

// jest.config.ts
import type { Config } from 'jest';

const config: Config = {
  // 1. Motor de compilação TS sob demanda para os testes
  preset: 'ts-jest',
  testEnvironment: 'node',

  // 2. Onde procurar arquivos de teste
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/*.spec.ts', // Padrão unitário (especificação de comportamento)
    '**/*.test.ts', // Padrão integração / E2E
  ],

  // 3. Limpeza automática de espiões e mocks antes de cada teste
  clearMocks: true,

  // 4. Mapeamento dos Path Aliases idêntico ao tsconfig.json
  moduleNameMapper: {
    '^@domain/(.*)$': '<rootDir>/src/domain/$1',
    '^@application/(.*)$': '<rootDir>/src/application/$1',
    '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
    '^@main/(.*)$': '<rootDir>/src/main/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
  },

  // 5. Cobertura de Código (Code Coverage)
  collectCoverageFrom: [
    'src/domain/**/*.ts',
    'src/application/useCases/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text-summary', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};

export default config;

```

### C. Mapa Completo de Scripts no package.json

O ecossistema de scripts no package.json determina o fluxo de trabalho diário do desenvolvedor e a esteira de integração contínua (CI/CD).

Para uma API, organizamos os comandos em execução local rápida, segmentação por camada da pirâmide e auditoria de qualidade.

```json

{
  "scripts": {
    "test": "jest --runInBand",
    "test:watch": "jest --watch",
    "test:unit": "jest --testPathPattern=tests/unit",
    "test:integration": "dotenv -e .env.test -- jest --testPathPattern=tests/integration --runInBand",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --runInBand"
  }
}

```

O que cada flag e script faz na prática:

- npm test (jest --runInBand): Executa todos os testes de forma sequencial em um único processo. Evita condições de corrida (race conditions) quando há acesso compartilhado ao banco de testes.

- npm run test:watch (jest --watch): Modo interativo durante o desenvolvimento. O Jest monitora os arquivos salvos no Git e reexecuta apenas os testes afetados pelas modificações em tempo real.

- npm run test:unit (--testPathPattern=tests/unit): Filtra e executa exclusivamente a base da pirâmide (testes de domínio e casos de uso em memória). Leva poucos milissegundos e não depende de Docker ou banco ativo.

- npm run test:integration: Carrega as variáveis isoladas do .env.test (apontando para o banco de testes) e executa apenas as suítes HTTP/Prisma.

- npm run test:coverage (jest --coverage): Instrumenta o código-fonte para rastrear cada linha e desvio lógico executado, gerando a tabela matricial no terminal e o relatório visual em HTML na pasta coverage/lcov-report/index.html.

- npm run test:ci: Comando otimizado para pipelines (GitHub Actions / GitLab CI). Desativa modos interativos, força a coleta de cobertura e falha o build caso os thresholds mínimos (ex: 80%) não sejam atingidos.

### D. Entendendo Métricas de Cobertura (Code Coverage)

Ao executar npm run test:coverage, o Jest gera um relatório matricial semelhante a esta no terminal:

```bash

----------------------------------|---------|----------|---------|---------|-------------------
File                              | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
----------------------------------|---------|----------|---------|---------|-------------------
All files                         |   88.46 |    75.00 |   90.00 |   88.46 |
 domain/entities                  |  100.00 |   100.00 |  100.00 |  100.00 |
  user.ts                         |  100.00 |   100.00 |  100.00 |  100.00 |
 application/useCases             |   84.21 |    66.66 |   85.71 |   84.21 |
  create-user.use-case.ts         |  100.00 |   100.00 |  100.00 |  100.00 |
  refresh-token.use-case.ts       |   72.72 |    50.00 |   75.00 |   72.72 | 28-34
----------------------------------|---------|----------|---------|---------|-------------------

```

**Como interpretar cada coluna:**

1. % Branch (A métrica mais importante): Se um if (new Date() > token.expiresIn) só foi testado com tokens válidos (caminho false), o % Branch daquele arquivo será 50%. É o principal indicador de que faltam testes para cenários de erro e exceção.

2. Uncovered Line #s (ex: 28-34): Aponta exatamente quais linhas físicas do arquivo nunca foram atingidas por nenhum teste — ideal para identificar regras de negócio esquecidas ou código morto (dead code).

3. Relatório HTML Interativo: Ao abrir coverage/lcov-report/index.html no navegador, o aluno consegue clicar em cada arquivo e ver visualmente:

- Verde: Linha e ramificação cobertas.

- Amarelo (I ou E): Apenas o bloco if ou apenas o bloco else foi executado.

- Vermelho: Trecho de código nunca executado.

**Observações:**

- Statements (Declarações): Porcentagem de instruções de código executadas pelo menos uma vez durante a suíte.

- Branches (Ramificações): Porcentagem de caminhos lógicos testados em estruturas condicionais (if/else, operadores ternários ? :, switch).

- Functions (Funções): Porcentagem de métodos e funções chamadas.

- Lines (Linhas): Porcentagem de linhas físicas de código executadas.

**Cuidado com a Ilusão do 100% de Cobertura:**

Cobertura mede quais linhas foram executadas, não se as asserções de negócio estão corretas. Um teste que executa uma função sem nenhum expect dá 100% de cobertura, mas 0% de confiança! O objetivo é cobrir comportamentos e regras de negócio, não linhas de código.

### E. O Que Deve Ser Ignorado na Cobertura (collectCoverageFrom)

Para não distorcer a métrica cobrindo arquivos declarativos ou puramente estruturais, configuramos exclusões cirúrgicas no jest.config.ts:

Interfaces e Contratos (`*.repository.ts, *.d.ts`): Não possuem lógica executável em tempo de execução no JavaScript compilado.

Arquivos de Exportação (index.ts): Apenas reexportam módulos.

Factories de Injeção (src/main/factories/**): Apenas instanciam classes concretas (são cobertas indiretamente pelos testes de integração/E2E).

## 5. Implementação Prática: Testando o Core Sem Banco de Dados

### A. O Dublê de Teste: tests/mocks/in-memory-user-repository.ts

Ao invés de conectar ao PostgreSQL e rodar migrações a cada teste unitário, usamos uma coleção em memória (Array) que implementa a interface de domínio IUserRepository:

```ts

// tests/mocks/in-memory-user-repository.ts
import { IUserRepository } from '@domain/repositories/user.repository';
import { User } from '@domain/entities/user';
import { randomUUID } from 'crypto';

export class InMemoryUserRepository implements IUserRepository {
  public items: User[] = [];

  async create(user: User): Promise<void> {
    const userToSave = new User({
      id: user.id || randomUUID(),
      name: user.name,
      email: user.email,
      password: user.password,
      role: user.role,
      createdAt: user.createdAt || new Date(),
    });

    this.items.push(userToSave);
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = this.items.find((item) => item.email === email);
    return user || null;
  }

  async findById(id: string): Promise<User | null> {
    const user = this.items.find((item) => item.id === id);
    return user || null;
  }

  async findAll(): Promise<User[]> {
    return this.items;
  }
}

```

### B. O Dublê de Teste: tests/mocks/fake-hash-provider.ts

Criptografar senhas com bcrypt (10 rounds de salt) consome centenas de milissegundos de processamento de CPU propositalmente. Em testes unitários, usamos um hash determinístico falso:

```ts

// tests/mocks/fake-hash-provider.ts
import { HashProvider } from '@domain/providers/hash-provider';

export class FakeHashProvider implements HashProvider {
  async generateHash(payload: string): Promise<string> {
    return `hashed_${payload}`;
  }

  async compareHash(payload: string, hashed: string): Promise<boolean> {
    return `hashed_${payload}` === hashed;
  }
}

```

### C. A Suíte de Testes Unitários: Padrão AAA (Arrange, Act, Assert)

O padrão AAA organiza o teste de forma semântica e legível:

1. Arrange (Arranjar): Prepara o cenário, instanciando os dublês e o objeto sob teste (SUT).

2. Act(Agir): Executa a operação que está sendo validada.

3. Assert(Afirmar): Checa se o resultado obtido corresponde exatamente à expectativa de negócio.

```ts

// tests/unit/create-user.use-case.spec.ts
import { CreateUserUseCase } from '@application/useCases/create-user.use-case';
import { InMemoryUserRepository } from '../mocks/in-memory-user-repository';
import { FakeHashProvider } from '../mocks/fake-hash-provider';
import { ConflictError } from '@domain/errors/conflict.error';

describe('CreateUserUseCase (Unit)', () => {
  let userRepository: InMemoryUserRepository;
  let hashProvider: FakeHashProvider;
  let sut: CreateUserUseCase; // SUT = System Under Test

  beforeEach(() => {
    // Isola cada teste em um ambiente limpo
    userRepository = new InMemoryUserRepository();
    hashProvider = new FakeHashProvider();
    sut = new CreateUserUseCase(userRepository, hashProvider);
  });

  it('deve cadastrar um novo treinador com senha hasheada e papel USER por padrão', async () => {
    // 1. Arrange
    const input = {
      name: 'Ash Ketchum',
      email: 'ash@palettown.com',
      password: 'pikachuMaster123',
    };

    // 2. Act
    const user = await sut.execute(input);

    // 3. Assert
    expect(user).toHaveProperty('id');
    expect(user.name).toBe(input.name);
    expect(user.email).toBe(input.email);
    expect(user.password).toBe('hashed_pikachuMaster123'); // Valida aplicação do hash
    expect(user.role).toBe('USER'); // Garante papel de menor privilégio
    expect(userRepository.items).toHaveLength(1);
    expect(userRepository.items[0].email).toBe(input.email);
  });

  it('deve rejeitar o cadastro lançando ConflictError caso o e-mail já esteja em uso', async () => {
    // 1. Arrange: pré-cadastra um usuário com o mesmo e-mail
    await sut.execute({
      name: 'Gary Oak',
      email: 'gary@palettown.com',
      password: 'blastoiseRocks123',
    });

    // 2. Act & 3. Assert: tenta recadastrar com o mesmo e-mail
    await expect(
      sut.execute({
        name: 'Gary Clone',
        email: 'gary@palettown.com',
        password: 'outraSenha123',
      })
    ).rejects.toBeInstanceOf(ConflictError);

    // Garante que o usuário duplicado não foi inserido
    expect(userRepository.items).toHaveLength(1);
  });
});

```

**Outro padrão popular em testes unitários:**

O padrão Given-When-Then também é muito comum no desenvolvimento orientado a comportamento (BDD) e em testes de aceitação:

1. Given (Dado que): Equivalente ao Arrange (contexto inicial).

2. When (Quando): Equivalente ao Act (ação realizada).

3. Then (Então): Equivalente ao Assert (resultado esperado).
