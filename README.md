# Integração com APIs Externas e o Padrão Gateway (Boundary Layer)

## O Problema do Mundo Real: O "Caos das Dependências Ocultas"

No desenvolvimento de software comercial, raramente uma aplicação é uma ilha isolada. Sistemas modernos dependem continuamente de serviços de terceiros (Third-party APIs):

- Provedores de Pagamento: Stripe, Mercado Pago, Pagar.me.

- Comunicação: Twilio (SMS/WhatsApp), SendGrid/SES (E-mail).

- Geolocalização e Logística: Google Maps API, ViaCEP, Correios.

- Autenticação e Métricas: Auth0, Firebase, Google OAuth.

### O Desastre da Invasão de Código Externo

Quando não isolamos a integração com terceiros, cometemos o erro de instanciar bibliotecas (Axios, SDKs do Stripe ou AWS) e fazer chamadas HTTP diretamente dentro dos Nossos Use Cases ou Controllers.

Considere este exemplo real de código acoplado (Anti-Pattern):

```ts

// ❌ PÉSSIMA PRÁTICA: Regra de negócio misturada com detalhes técnicos de HTTP e terceiros
export class ProcessPaymentUseCase {
  async execute(orderId: string, creditCardToken: string, amount: number) {
    // Se o SDK do Pagar.me mudar a versão ou a assinatura da chamada, O USE CASE QUEBRA!
    const response = await pagarme.transactions.create({
      card_token: creditCardToken,
      amount: amount * 100, // Pagar.me espera em centavos
    });

    if (response.status !== 'paid') {
      throw new Error('Pagamento recusado');
    }

    // ...salva pedido no banco
  }
}

```

O que acontece se a API do Pagar.me cair, mudar de versão ou a empresa decidir migrar para o Stripe?

1. Efeito Dominó: Você precisará reescrever regras de negócio em dezenas de Use Cases e Controllers.

2. Impossibilidade de Testar: Para testar o Use Case em ambiente local, você será obrigado a disparar chamadas HTTP reais na internet ou criar mocks complexos de bibliotecas de terceiros.

3. Contaminação de Tipos: DTOs e enums criados pelo fornecedor da API começam a vazar para dentro das entidades de domínio do seu sistema.

## Boundary Layer (Camada de Fronteira)

Na arquitetura de software, a Boundary Layer é a linha de demarcação que separa o domínio interno controlado da aplicação do mundo externo imprevisível.

O mundo externo engloba tudo o que está fora do processo da sua aplicação:

- Clientes HTTP fazendo requisições para a sua API (navegadores, apps móveis).

- Bancos de dados relacionais e NoSQL.

- APIs REST e gRPC de terceiros (PokeAPI, Stripe, ViaCEP).

- Fila de mensagens (RabbitMQ, Kafka).

```txt

  🌐 MUNDO EXTERNO (Imprevisível)             🏠 MUNDO INTERNO (Controlado)
 ┌─────────────────────────────┐           ┌─────────────────────────────┐
 │ • APIs de Terceiros         │  Boundary │ • Regras de Negócio         │
 │ • Payloads instáveis        │   Layer   │ • Entidades de Domínio      │
 │ • Quedas de conexão/Rede    │  ═══════> │ • Use Cases determinísticos │
 │ • Formatos brutos (JSON)    │   (Gate-  │ • Tipagem forte e segura    │
 └─────────────────────────────┘    ways)  └─────────────────────────────┘

```

### O Papel da Boundary Layer

A Camada de Fronteira atua como uma alfândega de dados. Nenhuma informação crua do mundo externo entra no Domínio sem passar por validação (Zod) e tradução/adaptação (Gateways / Mappers).

Se a PokeAPI mudar a estrutura da resposta JSON amanhã, o impacto morre na Boundary Layer (no seu Gateway). O seu Domínio nem percebe que houve alteração.

## A Solução Arquitetural: O Padrão Gateway e a Camada Anti-Corrupção (ACL)

O Gateway Pattern (combinado com o padrão Adapter) estabelece um ponto de fronteira rígido entre a sua aplicação e o serviço externo.

Na Clean Architecture, o Domínio dita as regras. Ele não quer saber se o pagamento é feito via Stripe ou Pagar.me, nem se a requisição roda sobre Axios, Fetch ou SDK nativo. O Domínio apenas estabelece um Contrato de Negócio (Interface).

```txt

 ┌─────────────────────────────────────────────────────────────────┐
 │                       CAMADA DE DOMÍNIO                         │
 │                                                                 │
 │   [ UseCase ] ────> ( Interface: PaymentGateway )               │
 └────────────────────────────────┬────────────────────────────────┘
                                  │ (Inversão de Dependência - DIP)
 ┌────────────────────────────────┴────────────────────────────────┐
 │                    CAMADA DE INFRAESTRUTURA                     │
 │                                                                 │
 │   ┌─────────────────────────────────────────────────────────┐   │
 │   │ StripePaymentGateway (Implementa PaymentGateway)        │   │
 │   └────────────┬────────────────────────────────────────────┘   │
 │                │ (Axios / Fetch / SDK)                          │
 └────────────────┼────────────────────────────────────────────────┘
                  ▼
        🌐 [ API Externa: Stripe ]

```

### A Camada Anti-Corrupção (Anti-Corruption Layer - ACL)

A principal função do Gateway é atuar como uma Camada Anti-Corrupção:

- **Tradução de Entrada**: Converte os parâmetros do Domínio para o formato exigido pela API externa.

- **Tradução de Saída**: Pega o JSON do fornecedor externo (que pode conter nomes de campos confusos em inglês, códigos numéricos ou formatos estranhos) e traduz para um Objeto de Domínio Limpo.

## Resiliência e Três Pilares para APIs Externas em Produção

Chamar APIs externas na rede pública introduz volatilidade. Uma arquitetura profissional deve prever falhas de rede:

### A. Timeouts Rígidos

Uma API de terceiros pode travar ou demorar 30 segundos para responder. Se você não configurar um tempo limite de espera (timeout), as conexões HTTP da sua API ficarão pendentes até esgotar a memória do servidor Node.js.

Boa Prática: Configure timeouts curtos (ex: 3.000ms a 5.000ms). Se o fornecedor não responder no tempo estipulado, aborte e trate como falha temporária.

### B. Mapeamento de Erros HTTP Externos

Erros de rede (ECONNREFUSED, ETIMEDOUT) ou respostas com status 502 Bad Gateway e 503 Service Unavailable da API externa não devem vazar para o cliente como exceções sem tratamento.

Boa Prática: Capture os erros de rede no Gateway e converta-os em exceções conhecidas da sua aplicação (ex: throw new AppError('Serviço de pagamento indisponível no momento', 503)).

### C. Testabilidade Instantânea (Mocks e In-Memory)

Graças à Inversão de Dependência, em ambientes de Desenvolvimento (DEV) ou Testes de Integração, você pode injetar uma classe mockada do Gateway sem depender de internet:

```ts

// Em ambiente de teste, zero chamadas HTTP reais na internet!
const paymentGateway = new FakePaymentGateway();
const useCase = new ProcessPaymentUseCase(paymentGateway);

```

## Live Coding: Autopreenchimento por CEP

Demonstraremos o ciclo completo da criação de um Gateway utilizando o serviço do ViaCEP no cadastro de Usuários.

### Passo 1: O Contrato do Domínio (src/domain/gateways/address-gateway.ts)

Definimos a interface limpa e a estrutura de dados que o nosso sistema espera receber.

```ts

// src/domain/gateways/address-gateway.ts

export interface AddressDetails {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface AddressGateway {
  findAddressByCep(cep: string): Promise<AddressDetails | null>;
}

```

### Passo 2: A Implementação na Infraestrutura (src/infrastructure/gateways/via-cep-gateway.ts)

Criamos o adaptador concreto usando Axios com controle de timeout e tratamento da Camada Anti-Corrupção.

```ts

// src/infrastructure/gateways/via-cep-gateway.ts
import axios from 'axios';
import { AddressGateway, AddressDetails } from '@domain/gateways/address-gateway';
import { AppError } from '@domain/errors/app-error';

// DTO Privado: Reflete exatamente a resposta feia/nativa da API externa
interface ViaCepRawResponse {
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export class ViaCepGateway implements AddressGateway {
  private readonly baseUrl = 'https://viacep.com.br/ws';

  async findAddressByCep(cep: string): Promise<AddressDetails | null> {
    const cleanCep = cep.replace(/\D/g, '');

    if (cleanCep.length !== 8) {
      return null;
    }

    try {
      const response = await axios.get<ViaCepRawResponse>(`${this.baseUrl}/${cleanCep}/json/`, {
        timeout: 4000, // Timeout estipulado em 4 segundos
      });

      // Trata o caso em que o CEP não existe na base dos Correios
      if (response.data.erro) {
        return null;
      }

      // Camada Anti-Corrupção: Traduz os campos do ViaCEP para a nomenclatura do nosso Domínio
      return {
        street: response.data.logradouro,
        neighborhood: response.data.bairro,
        city: response.data.localidade,
        state: response.data.uf,
      };
    } catch (error) {
      // Intercepta erros de rede/timeout sem quebrar a aplicação
      if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
        throw new AppError('O serviço de busca de CEP demorou muito para responder', 503);
      }

      return null;
    }
  }
}

```

### Passo 3: O Uso no Caso de Uso de Aplicação (src/application/useCases/findAddress.ts)

Note como o UseCase é 100% limpo e desconhece completamente o Axios ou o ViaCEP.

```ts

// src/application/useCases/findAddress.ts
import { AddressGateway } from '@domain/gateways/address-gateway';
import { NotFoundError } from '@domain/errors/not-found-error';

export class FindAddressUseCase {
  constructor(private readonly addressGateway: AddressGateway) {}

  async execute(cep: string) {
    const address = await this.addressGateway.findAddressByCep(cep);

    if (!address) {
      throw new NotFoundError('Endereço para o CEP informado');
    }

    return address;
  }
}

```

### Passo 4: Schema de Validação de Borda com Zod (src/infrastructure/http/schemas/address-schemas.ts)

Garante que o parâmetro :cep recebido na URL seja higienizado e siga o formato sintático correto antes de acionar o Use Case.

```ts

// src/infrastructure/http/schemas/address-schemas.ts
import { z } from 'zod';

export const getAddressByCepSchema = z.object({
  cep: z
    .string({ required_error: 'O CEP é obrigatório' })
    .transform((val) => val.replace(/\D/g, '')) // Remove traços e pontos
    .refine((val) => val.length === 8, {
      message: 'O CEP deve conter exatamente 8 dígitos numéricos',
    }),
});

export type GetAddressByCepParams = z.infer<typeof getAddressByCepSchema>;

```

### Passo 5: Controller do Express (src/infrastructure/http/controllers/address.controller.ts)

```ts

// src/infrastructure/http/controllers/address.controller.ts
import { Request, Response, NextFunction } from 'express';
import { FindAddressUseCase } from '@application/useCases/findAddress';

export class AddressController {
  constructor(private readonly findAddressUseCase: FindAddressUseCase) {}

  async getByCep(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { cep } = req.params as { cep: string };
      const address = await this.findAddressUseCase.execute(cep);

      return res.status(200).json(address);
    } catch (error) {
      next(error);
    }
  }
}

```

### Passo 6: Factory de Injeção de Dependências (src/main/factories/make-address-controller.ts)

Injeta a implementação concreta de infraestrutura (ViaCepGateway) no Use Case do Domínio e instancia o Controller.

```ts

// src/main/factories/make-address-controller.ts
import { ViaCepGateway } from '@infrastructure/gateways/via-cep-gateway';
import { FindAddressUseCase } from '@application/useCases/findAddress';
import { AddressController } from '@infrastructure/http/controllers/address.controller';

export const makeAddressController = (): AddressController => {
  const addressGateway = new ViaCepGateway();
  const findAddressUseCase = new FindAddressUseCase(addressGateway);

  return new AddressController(findAddressUseCase);
};

```

### Passo 7: Rota do Express (src/infrastructure/http/routes/address-routes.ts)

Declara o endpoint público acoplando o middleware de validação do Zod ao Controller.

```ts

// src/infrastructure/http/routes/address-routes.ts
import { Router } from 'express';
import { validateRequest } from '../middlewares/validate-request';
import { getAddressByCepSchema } from '../schemas/address-schemas';
import { makeAddressController } from '@main/factories/make-address-controller';

const addressRoutes = Router();
const addressController = makeAddressController();

addressRoutes.get(
  '/:cep',
  validateRequest({ params: getAddressByCepSchema }),
  (req, res, next) => {
    /*
      #swagger.tags = ['Endereços']
      #swagger.summary = 'Busca detalhes de endereço por CEP'
      #swagger.description = 'Consome o gateway do ViaCEP na Boundary Layer para autopreenchimento e validação de endereço.'

      #swagger.parameters['cep'] = {
        in: 'path',
        description: 'CEP com 8 dígitos numéricos (com ou sem hífen)',
        required: true,
        type: 'string',
        example: '01001000'
      }

      #swagger.responses[200] = {
        description: 'Endereço encontrado com sucesso.',
        schema: {
          street: 'Praça da Sé',
          neighborhood: 'Sé',
          city: 'São Paulo',
          state: 'SP'
        }
      }

      #swagger.responses[400] = {
        description: 'Validação de borda (Zod) - CEP inválido.',
        schema: {
          status: 'error',
          message: 'Dados de entrada inválidos',
          details: [{ field: 'cep', message: 'O CEP deve conter exatamente 8 dígitos numéricos' }]
        }
      }

      #swagger.responses[404] = {
        description: 'Endereço não encontrado para o CEP informado.',
        schema: {
          status: 'error',
          message: 'Endereço para o CEP informado não encontrado(a)'
        }
      }

      #swagger.responses[503] = {
        description: 'Serviço do ViaCEP indisponível ou timeout no Gateway.',
        schema: {
          status: 'error',
          message: 'O serviço de busca de CEP está temporariamente indisponível'
        }
      }
    */
    return addressController.getByCep(req, res, next);
  }
);

export { addressRoutes };

```

### Passo 8: Garantir o Registro do Router (src/infrastructure/http/routes/index.ts)

Para garantir que o novo módulo de rotas de endereço seja reconhecido pela aplicação, devemos registrá-lo no arquivo de índice de rotas.

Certifique-se de que o arquivo principal lido pelo script do swagger-autogen (onde as rotas são acopladas) importou o addressRoutes:

```ts

// src/infrastructure/http/routes/index.ts (ou no app.ts dependendo de como está seu swagger-autogen)
import { Router } from 'express';
import { addressRoutes } from './address-routes';
import { userRoutes } from './user-routes';

const routes = Router();

routes.use('/addresses', addressRoutes);
routes.use('/users', userRoutes);

export { routes };

```

### Passo 9: Registro na Aplicação Principal (src/main/app.ts)

Registra o novo módulo de rotas no servidor Express.

```ts

// src/main/app.ts
import express from 'express';
import 'express-async-errors';
import { addressRoutes } from '@infrastructure/http/routes/address-routes';
import { errorHandler } from '@infrastructure/http/middlewares/error-handler';

const app = express();

app.use(express.json());

// Registra as rotas de endereço
app.use('/api/v1/addresses', addressRoutes);

// O Middleware de Erros deve continuar sendo a ÚLTIMA declaração
app.use(errorHandler);

export { app };

```

### Passo Extra: Criando o Mock Gateway (src/infrastructure/gateways/in-memory-address-gateway.ts)

Para testar o FindAddressUseCase de forma 100% isolada (sem depender da internet, do ViaCEP ou gastar requisições HTTP reais), criamos um Mock Gateway que implementa a mesma interface AddressGateway.

Esta classe simula o comportamento da API de CEP em memória. Ela permite definir cenários de sucesso, CEP não encontrado e até simular falhas de rede.

```ts

// src/infrastructure/gateways/in-memory-address-gateway.ts
import { AddressGateway, AddressDetails } from '@domain/gateways/address-gateway';

export class InMemoryAddressGateway implements AddressGateway {
  // Banco de dados em memória para testes
  public addresses: Record<string, AddressDetails> = {
    '01001000': {
      street: 'Praça da Sé',
      neighborhood: 'Sé',
      city: 'São Paulo',
      state: 'SP',
    },
    '24020091': {
      street: 'Rua Passo da Pátria',
      neighborhood: 'São Domingos',
      city: 'Niterói',
      state: 'RJ',
    },
  };

  // Flag auxiliar para simular indisponibilidade de serviço nos testes
  public shouldThrowError = false;

  async findAddressByCep(cep: string): Promise<AddressDetails | null> {
    if (this.shouldThrowError) {
      throw new Error('Serviço indisponível');
    }

    const cleanCep = cep.replace(/\D/g, '');
    const address = this.addresses[cleanCep];

    if (!address) {
      return null;
    }

    return address;
  }
}

```

Por que esse padrão Mock Gateway é poderoso para a Clean Architecture?

- Velocidade de Execução: Os testes rodam em milissegundos, sem latência de rede.
- Independência: O pipeline de CI/CD pode rodar todos os testes unitários da aplicação sem precisar de conexão com a internet ou chaves de API.
- Demonstração Prática do DIP: Os alunos enxergam com clareza o Princípio da Inversão de Dependência (DIP) — o Use Case depende apenas da interface AddressGateway, tornando a implementação de infraestrutura (ViaCepGateway ou InMemoryAddressGateway) totalmente intercambiável.

## Retentativas Inteligentes (Smart Retries com Backoff Exponencial)

Quando chamamos uma API externa via rede pública, falhas são inevitáveis. No entanto, muitas falhas são transitórias — um pequeno pico de latência, um descarte temporário de pacote ou uma oscilação do roteador.

Se a sua primeira tentativa falhar com um erro de rede, a pior coisa a fazer é desistir imediatamente ou tentar de novo em um loop infinito instantâneo.

### A Estratégia de Backoff Exponencial + Jitter

Em vez de tentar novamente de imediato (o que pode sobrecarregar ainda mais o servidor externo que já está sofrendo), aumentamos o tempo de espera entre cada tentativa exponencialmente.

```txt

Tentativa 1: Falhou! ──(espera 1s)──>
Tentativa 2: Falhou! ──(espera 2s)──>
Tentativa 3: Falhou! ──(espera 4s)──> Desiste e lança erro 503

```

- Backoff Exponencial: $Tempo = base \times 2^{tentativa}$ (ex: 1s, 2s, 4s, 8s).

- Jitter (Ruído Aleatório): Adiciona alguns milissegundos aleatórios ao tempo de espera para evitar que milhares de instâncias da sua API tentem reconectar ao mesmo serviço exatamente no mesmo milissegundo (Thundering Herd Problem).

Regra de Ouro: Só faça retentativas para erros operacionais de rede (timeouts, falhas de conexão) ou códigos HTTP da família 5xx (servidor externo indisponível). NUNCA faça retentativa para erros 4xx (ex: 404 Not Found ou 400 Bad Request não vão mudar de resultado tentando de novo).

## O Padrão Circuit Breaker (Disjuntor de Infraestrutura)

Imagine a instalação elétrica da sua casa. Se houver um curto-circuito em um aparelho, o disjuntor da caixa de força "arma/abre", cortando a energia imediatamente para evitar que a casa pegue fogo.

No desenvolvimento de software, o Circuit Breaker faz exatamente a mesma coisa com chamadas HTTP para APIs externas.

### Por que precisamos dele?

Se a PokeAPI ficar totalmente fora do ar por 30 minutos, cada requisição que sua API fizer para lá vai esperar 3 segundos até dar timeout. Se você receber 100 requisições por segundo, rapidamente terá 300 conexões pendentes consumindo toda a memória e CPU do seu container Node.js.

Uma API externa fora do ar vai derrubar a sua própria aplicação por contágio.

### Os 3 Estados do Circuit Breaker

```txt

       ┌────────────────────────────────────────────────────────┐
       │                                                        │
       ▼                                                        │
┌──────────────┐    Taxa de erros > Limite    ┌──────────────┐  │ Sucesso
│   FECHADO    │ ───────────────────────────> │    ABERTO    │  │
│ (Closed / OK)│                              │(Open / Falha)│  │
└──────────────┘                              └──────┬───────┘  │
       ▲                                             │          │
       │              Sucesso na chamada             │ Tempo de │
       └─────────────────────────────────────────────┼── teste  │
                                                     ▼          │
                                              ┌──────────────┐  │
                                              │ MEIO-ABERTO  │──┘
                                              │ (Half-Open)  │
                                              └──────────────┘
                                                Falha no teste

```

1. FECHADO (Closed - Fluxo Normal): As requisições fluem normalmente para a API externa. O Circuit Breaker monitora a taxa de falhas.

2. ABERTO (Open - Disjuntor Armado): Se a taxa de erros ultrapassar um limite (ex: 50% das últimas 10 chamadas falharam ou deram timeout), o disjuntor ABRE. A partir desse momento, nenhuma requisição é enviada para a API externa. O Gateway responde instantaneamente com erro (ou fallback), poupando recursos e evitando congelar sua API.

3. MEIO-ABERTO (Half-Open - Teste de Vida): Após um tempo de espera (ex: 30 segundos), o disjuntor entra em estado de teste. Ele deixa passar apenas 1 requisição experimental.

   - Se a chamada tiver sucesso: O disjuntor FECHA e o sistema volta ao normal.

   - Se a chamada falhar: O disjuntor ABRE novamente e o timer recomeça.

## Exemplo de Implementação Conceitual no Gateway da PokeAPI

Para demonstrar como isso se traduz em código resiliente na Boundary Layer, podemos utilizar a biblioteca madura de resiliência do ecossistema Node.js chamada Cockatiel (ou Opossum):

```ts

// src/infrastructure/gateways/poke-api-resilient-gateway.ts
import axios from 'axios';
import { CircuitBreaker, ExponentialBackoff, retry, handleAll } from 'cockatiel';
import { PokemonExternalGateway, ExternalPokemonDetails } from '@domain/gateways/pokemon-external-gateway';
import { AppError } from '@domain/errors/app-error';

export class ResilientPokeApiGateway implements PokemonExternalGateway {
  private readonly baseUrl = 'https://pokeapi.co/api/v2/pokemon';

  // 1. Configuração da Política de Retentativa com Backoff Exponencial
  private retryPolicy = retry(handleAll, {
    maxAttempts: 3, // Tenta no máximo 3 vezes
    backoff: new ExponentialBackoff({ initialDelay: 1000, maxDelay: 4000 }), // 1s, 2s, 4s
  });

  // 2. Configuração do Circuit Breaker
  private circuitBreaker = new CircuitBreaker(handleAll, {
    halfOpenAfter: 10 * 1000, // Tenta reabrir após 10 segundos
    breaker: new ConsecutiveBreaker(5), // Abre se 5 chamadas consecutivas falharem
  });

  async findByName(name: string): Promise<ExternalPokemonDetails | null> {
    try {
      // Executa a chamada envelopada pelas políticas de Resiliência
      return await this.retryPolicy.execute(() =>
        this.circuitBreaker.execute(async () => {
          const response = await axios.get(`${this.baseUrl}/${name.toLowerCase()}`, {
            timeout: 3000,
          });

          return {
            spriteUrl: response.data.sprites.other['official-artwork'].front_default,
            baseExperience: response.data.base_experience,
            height: response.data.height,
            weight: response.data.weight,
          };
        })
      );
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null; // 404 não é erro de infraestrutura, é dado inexistente
      }

      // Se o disjuntor estiver ABERTO, dispara resposta rápida 503
      throw new AppError(
        'O serviço da PokeAPI está instável ou indisponível no momento (Circuit Breaker Ativo)',
        503
      );
    }
  }
}

```
