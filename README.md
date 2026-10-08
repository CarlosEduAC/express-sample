# Autenticação JWT e Autorização RBAC

## Teoria - Fundamentos de Autenticação e RBAC

Em sistemas de software profissionais, segurança não é um recurso adicional (feature), mas uma propriedade transversal do sistema (cross-cutting concern). Ignorar a separação rigorosa entre Autenticação e Autorização é a principal causa de vazamento de dados, sequestro de contas e comprometimento de infraestrutura.

### 1. Autenticação vs. Autorização

- Autenticação (Quem é você?): O processo de verificar a identidade do usuário (e-mail e senha hashed).

- Autorização (O que você pode fazer?): O processo de verificar se a identidade autenticada tem permissão/papel (Role) para acessar um recurso ou executar uma ação.

**A Analogia do Hotel**:

Uma das maiores confusões na engenharia de software é tratar Autenticação e Autorização como uma coisa só. Para consolidar esse conceito com os alunos, utilizamos a Analogia do Check-in de Hotel:

```txt

🔑 AUTENTICAÇÃO ("Quem é você?")
    └─ Você chega à recepção do hotel, apresenta seu documento de identidade (E-mail/Senha).
       O hotel confirma que você é uma pessoa real e lhe entrega o Cartão de Acesso (JWT).

 🚪 AUTORIZAÇÃO ("Aonde você pode ir?")
    └─ Você encosta o Cartão de Acesso (JWT) na porta do quarto 302. A porta ABRE.
       Se você tentar encostar o mesmo cartão na Suíte Presidencial ou na Sala dos Servidores,
       a porta PERMANECE FECHADA e dispara um alarme (Status 403 Forbidden).

```

**O Triângulo da Segurança HTTP**:

| Conceito      | Pergunta                             | Mecanismo                                        | Código HTTP de Falha |
|---------------|--------------------------------------|--------------------------------------------------|----------------------|
| Identificação | "Quem você diz que é?"               | Payload da Requisição (E-mail, Login)            | —                    |
| Autenticação  | "Você pode provar quem é?"           | Validação de Senha / Assinatura do Token JWT     | 401 Unauthorized     |
| Autorização   | "Você tem permissão para esta ação?" | Verificação de Papel (Role) ou Permissão (Scope) | 403 Forbidden        |

**Dica Importante:** O status 401 Unauthorized na verdade significa "Não Autenticado" (Token ausente ou inválido). O status 403 Forbidden significa "Não Autorizado" (Você está autenticado, mas seu papel não tem permissão).

### 2. A Estrutura do JWT (JSON Web Token) e Segurança Stateless

Em arquiteturas legadas ou monolíticas, utilizavam-se Sessões Stateful (armazenadas em memória do servidor ou em banco Redis). Em microsserviços e APIs REST de alta escala, adotamos o modelo Stateless com JWT (JSON Web Token).

Por que JWT em APIs RESTful?

- Escalabilidade Horizontal Nativa: Como o servidor não precisa guardar a sessão do usuário na memória RAM, você pode subir 100 instâncias do seu container Docker rodando o Node.js. Qualquer container consegue validar a assinatura do JWT de forma independente apenas conhecendo a chave secreta (JWT_SECRET).

- Auto-Contido (Self-Contained): O token carrega consigo os dados essenciais do usuário (ex: sub [ID do usuário] e role [Papel de Acesso]). Não é necessário fazer uma consulta ao banco de dados em todas as requisições para descobrir o nome ou papel de quem está chamando a API.

```txt

 ┌─────────────────────────────────────────────────────────────────────────┐
 │                            ESTRUTURA DO JWT                             │
 ├───────────────────┬─────────────────────────────────┬───────────────────┤
 │     HEADER        │             PAYLOAD             │     SIGNATURE     │
 │ (Algoritmo e Tipo)│      (Declarações públicas)      │  (Assinatura Hash)│
 ├───────────────────┼─────────────────────────────────┼───────────────────┤
 │ {                 │ {                               │ HMACSHA256(       │
 │   "alg": "HS256", │   "sub": "usr_98123",           │   base64Url(Header)│
 │   "typ": "JWT"    │   "role": "ADMIN",              │   + "." +         │
 │ }                 │   "exp": 1735689600             │   base64Url(Payload),│
 │                   │ }                               │   secret)         │
 └───────────────────┴─────────────────────────────────┴───────────────────┘

```

**Atenção para a Clean Architecture:** Os dados contidos no Payload do JWT são apenas codificados em Base64, NÃO são criptografados. Qualquer pessoa pode decodificar o Payload. Nunca coloque senhas, dados de cartão ou informações sensíveis de saúde/negócio dentro do Payload do JWT!

### 3. Por Que Adotar o Padrão RBAC (Role-Based Access Control)?

Em aplicações comerciais, controlar acesso via if/else espalhado pelo código (ex: if (user.email === 'admin@empresa.com')) é uma receita para o desastre. O RBAC (Controle de Acesso Baseado em Papéis) resolve isso agrupando permissões em papéis conceituais.

A Hierarquia do RBAC no PokéManager:

```txt

┌────────────────────────┐
                  │    Usuário Anônimo     │
                  └───────────┬────────────┘
                              │ (Apenas Leitura Pública)
                              ▼
                  ┌────────────────────────┐
                  │    TREINADOR (USER)    │
                  ├────────────────────────┤
                  │ • Ver Pokémons         │
                  │ • Capturar Pokémons    │
                  │ • Atualizar Meu Perfil │
                  └───────────┬────────────┘
                              │ (Herda permissões + privilégios elevados)
                              ▼
                  ┌────────────────────────┐
                  │     MESTRE (ADMIN)     │
                  ├────────────────────────┤
                  │ • Deletar Treinadores  │
                  │ • Criar novos Pokémons │
                  │ • Promover Contas      │
                  └────────────────────────┘

```

Benefícios do RBAC:

1. Minimização de Privilégios (Principle of Least Privilege): Cada usuário recebe apenas o nível de acesso estritamente necessário para desempenhar sua função.

2. Manutenibilidade: Se no futuro a empresa criar o papel MODERATOR, basta adicionar o novo valor ao enum e criar as regras de middleware sem alterar as entidades centrais do sistema.

3. Auditoria e Compliance (LGPD / ISO 27001): Permite rastrear exatamente quem executou cada operação destrutiva no banco de dados.

### 4. Autenticação e RBAC Dentro da Clean Architecture

Onde moram os conceitos de Segurança na Clean Architecture?

```txt

🟢 CAMADA DE DOMÍNIO (domain/)
    ├── Entities/User.ts ──────> (Entidade possui o campo 'role' e regras de senha)
    ├── Providers/HashProvider.ts (Interface/Contrato para criptografia de senha - DIP)
    └── Errors/UnauthorizedError.ts (Exceção semântica de autenticação)

 🔵 CAMADA DE APLICAÇÃO (application/)
    └── UseCases/AuthenticateUser.ts (Valida credenciais, gera o JWT Token)

 🔴 CAMADA DE INFRAESTRUTURA (infrastructure/)
    ├── Providers/BcryptHashProvider.ts (Implementação concreta do bcryptjs)
    ├── Middlewares/ensureAuthenticated.ts (Valida o cabeçalho Bearer Token)
    └── Middlewares/ensureRole.ts (Guarda de rota RBAC - Borda)

```

A Regra de Ouro da Inversão de Dependência no Login:

O Use Case AuthenticateUserUseCase não chama a biblioteca bcryptjs diretamente. Ele depende de uma interface HashProvider.

Assim, se amanhã a equipe decidir trocar o algoritmo bcrypt por Argon2 ou scrypt (padrões modernos recomendados pela OWASP), nenhum código de Use Case ou Teste de Domínio precisará ser alterado — alteramos apenas a implementação de infraestrutura!

### 5. Extensão de Tipos e Injeção de Contexto no Express

Para transmitir com segurança as informações do usuário autenticado entre os middlewares e os Controllers, estendemos a definição global de tipos do Express (@types/express):

```ts

// src/@types/express/index.d.ts
declare namespace Express {
  export interface Request {
    user?: {
      id: string;
      role: string;
    };
  }
}

```

Dessa forma, qualquer rota protegida pelo middleware ensureAuthenticated terá acesso instantâneo e totalmente tipado ao req.user.id e req.user.role sem fazer type casting manual.

## Live Coding Hands-on - Módulo de Autenticação

### Passo 1: Atualização do Schema do Prisma (prisma/schema.prisma)

Adicionamos o enum de papéis e o campo de senha (criptografada) na tabela de Usuários/Treinadores:

```sql

enum Role {
  USER
  ADMIN
}

model User {
  id        String   @id @default(uuid())
  name      String
  email     String   @unique
  password  String
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("users")
}

```

### Passo 2: Gateway/Provider de Criptografia no Domínio (src/domain/providers/hash-provider.ts)

Seguindo o DIP, o Domínio define o contrato de hashing de senha sem depender diretamente da biblioteca bcryptjs:

```ts

// src/domain/providers/hash-provider.ts
export interface HashProvider {
  generateHash(payload: string): Promise<string>;
  compareHash(payload: string, hashed: string): Promise<boolean>;
}

```

Implementação concreta na Infraestrutura (src/infrastructure/providers/bcrypt-hash-provider.ts):

```ts

// src/infrastructure/providers/bcrypt-hash-provider.ts
import { compare, hash } from 'bcryptjs';
import { HashProvider } from '@domain/providers/hash-provider';

export class BcryptHashProvider implements HashProvider {
  async generateHash(payload: string): Promise<string> {
    return hash(payload, 8);
  }

  async compareHash(payload: string, hashed: string): Promise<boolean> {
    return compare(payload, hashed);
  }
}

```

### Passo 3: Use Case de Autenticação (src/application/useCases/authenticateUser.ts)

```ts

// src/application/useCases/authenticateUser.ts
import { UserRepository } from '@domain/repositories/user.repository';
import { HashProvider } from '@domain/providers/hash-provider';
import { AppError } from '@domain/errors/app-error';
import { UnauthorizedError } from '@domain/errors/unauthorized-error';
import { sign } from 'jsonwebtoken';

interface AuthenticateRequest {
  email: string;
  password: string;
}

interface AuthenticateResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  token: string;
}

export class AuthenticateUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly hashProvider: HashProvider
  ) {}

  async execute({ email, password }: AuthenticateRequest): Promise<AuthenticateResponse> {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new UnauthorizedError('Credenciais inválidas');
    }

    const passwordMatched = await this.hashProvider.compareHash(password, user.password);

    if (!passwordMatched) {
      throw new UnauthorizedError('Credenciais inválidas');
    }

    // Geração do JWT Token
    const jwtSecret = process.env.JWT_SECRET || 'default_secret';
    const token = sign({ role: user.role }, jwtSecret, {
      subject: user.id,
      expiresIn: '1d',
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    };
  }
}

```

### Passo 4: Middlewares de Proteção da Borda

A. Middleware de Autenticação (src/infrastructure/http/middlewares/ensure-authenticated.ts)

```ts

// src/infrastructure/http/middlewares/ensure-authenticated.ts
import { Request, Response, NextFunction } from 'express';
import { verify } from 'jsonwebtoken';
import { UnauthorizedError } from '@domain/errors/unauthorized-error';

interface TokenPayload {
  sub: string;
  role: string;
  iat: number;
  exp: number;
}

export const ensureAuthenticated = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new UnauthorizedError('Token JWT não fornecido');
  }

  const [, token] = authHeader.split(' ');

  try {
    const jwtSecret = process.env.JWT_SECRET || 'default_secret';
    const decoded = verify(token, jwtSecret) as TokenPayload;

    // Anexa as informações do usuário autenticado no objeto Request do Express
    req.user = {
      id: decoded.sub,
      role: decoded.role,
    };

    return next();
  } catch {
    throw new UnauthorizedError('Token JWT inválido ou expirado');
  }
};

```

B. Middleware de RBAC (src/infrastructure/http/middlewares/ensure-role.ts)

```ts

// src/infrastructure/http/middlewares/ensure-role.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '@domain/errors/app-error';

export const ensureRole = (roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError('Usuário não autenticado', 401);
    }

    if (!roles.includes(req.user.role)) {
      throw new AppError('Acesso não autorizado para este recurso', 403);
    }

    return next();
  };
};

```

### Passo 5: Protegendo as Rotas com Swagger Autogen

```ts

// src/infrastructure/http/routes/pokemon-routes.ts
import { Router } from 'express';
import { ensureAuthenticated } from '../middlewares/ensure-authenticated';
import { ensureRole } from '../middlewares/ensure-role';

const pokemonRoutes = Router();

// Rota Pública: Qualquer usuário (autenticado ou não) pode listar Pokémons
pokemonRoutes.get('/', (req, res, next) => pokemonController.list(req, res, next));

// Rota Protegida: Apenas usuários com role 'ADMIN' podem criar novos Pokémons na base
pokemonRoutes.post(
  '/',
  ensureAuthenticated,
  ensureRole(['ADMIN']),
  (req, res, next) => {
    /*
      #swagger.tags = ['Pokémons']
      #swagger.summary = 'Cadastra um novo Pokémon (Apenas ADMIN)'
      #swagger.security = [{ "bearerAuth": [] }]
      #swagger.responses[401] = { description: 'Token Ausente/Inválido' }
      #swagger.responses[403] = { description: 'Acesso Proibido (Necessário papel ADMIN)' }
    */
    return pokemonController.create(req, res, next);
  }
);

export { pokemonRoutes };

```
