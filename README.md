# Renovação com Refresh Tokens, Revogação e Rota

Em sistemas corporativos, emitir um token JWT no momento do login é apenas o primeiro passo de uma estratégia de segurança. O verdadeiro desafio de engenharia começa depois do login: como manter a sessão segura ao longo do tempo sem degradar a experiência do usuário (UX) e sem violar os princípios da Clean Architecture?

## O Dilema da Expiração: Segurança vs. Usabilidade

Projetar o tempo de vida (Time-to-Live - TTL) de um token é um jogo de balanço entre dois riscos opostos:

```txt

🔴 Access Token com Vida Longa (ex: 30 dias)
 ├─ Vantagem: O usuário raramente precisa digitar a senha (ótima UX).
 └─ Perigo: Se o token for roubado (via script malicioso XSS ou intercepção), o atacante
    terá 30 dias de acesso irrestrito. Você não consegue derrubar a sessão do invasor.

 🔴 Access Token com Vida Curta (ex: 15 minutos)
 ├─ Vantagem: Se interceptado, a janela de ataque fecha rapidamente.
 └─ Perigo: A cada 15 minutos o usuário é deslogado abruptamente e precisa refazer o login (pessíma UX).

```

### A Solução Industrial: A Estratégia de Tokens Duplos

Para resolver esse dilema, a indústria adota o padrão de Tokens Duplos, onde cada token desempenha um papel cirúrgico na arquitetura:

```txt

 ┌───────────────────────────────────────────────────────────────────────────┐
 │                      COMPARAÇÃO DE PAPÉIS DOS TOKENS                      │
 ├───────────────────┬────────────────────────────┬──────────────────────────┤
 │ Característica    │ Access Token               │ Refresh Token            │
 ├───────────────────┼────────────────────────────┼──────────────────────────┤
 │ Finalidade        │ Autorizar requisições HTTP │ Emitir novos Access      │
 │                   │ a recursos protegidos      │ Tokens sem pedir senha   │
 ├───────────────────┼────────────────────────────┼──────────────────────────┤
 │ Tempo de Vida     │ Muito curto (15 min)       │ Longo (7 a 30 dias)      │
 ├───────────────────┼────────────────────────────┼──────────────────────────┤
 │ Formato           │ JWT (Stateless, assinado)  │ Opaque Token / UUID v4   │
 │                   │                            │ (Stateful, persistido)   │
 ├───────────────────┼────────────────────────────┼──────────────────────────┤
 │ Armazenamento     │ Memória RAM do App/State   │ HttpOnly + Secure Cookie │
 │ no Cliente        │ (Inacessível por JS/XSS)   │ (Protegido contra XSS)   │
 └───────────────────┴────────────────────────────┴──────────────────────────┘

 ```

## 2. A Mecânica da Renovação Silenciosa (Silent Refresh)

Para o usuário final, a renovação deve ser completamente invisível. O sistema opera em um ciclo autônomo entre o Frontend (interceptores HTTP como Axios ou Fetch) e o Backend:

```txt

Navegador / App Client                          APIs & Auth Gateway
    │                                                   │
    ├───── 1. Executa requisição com Access Token ─────►│
    │◄──── 2. HTTP 401 Unauthorized (Token Expirado) ──┤  (Falha esperada)
    │                                                   │
    ├───── 3. POST /auth/refresh-token ────────────────►│
    │      (Envia o Refresh Token no Cookie HttpOnly)   │  (Valida no Banco/Cache)
    │                                                   │
    │◄──── 4. Retorna NOVO Access Token (200 OK) ───────┤
    │                                                   │
    └───── 5. Repete a requisição original #1 ─────────►│  (Sucesso transparente para o usuário!)

```

### O Conceito de Refresh Token Rotation (Rotacionamento)

Por que apenas validar o Refresh Token não basta? Se um atacante roubar o Refresh Token, ele poderá renovar a sessão para sempre.

Para mitigar isso, aplicamos a Rotação de Refresh Tokens:

1. Toda vez que a rota POST /auth/refresh-token é chamada, o servidor invalida/queima o Refresh Token utilizado.

2. Emite um novo par: um novo Access Token E um novo Refresh Token.

3. Se o mesmo Refresh Token for reutilizado uma segunda vez, o servidor detecta uma tentativa de roubo ou reuso indevido (Reuse Detection) e invalida todas as sessões e tokens daquele usuário imediatamente.

## 3. A Teoria da Revogação: Como Quebrar a Natureza Stateless do JWT?

O maior dilema teórico do JWT é que ele é autocontido (stateless). Uma vez emitido e assinado criptograficamente com a chave secreta, o servidor de aplicação não consulta o banco de dados para saber se o token é válido — ele apenas verifica a assinatura matemática e o tempo de expiração (exp).

> "Se o JWT é validado apenas pela assinatura sem olhar o banco, o que acontece se o usuário clicar em 'Sair' (Logout), for demitido ou for banido pelo Administrador?"

Sem um mecanismo de revogação, o token continuará válido na mão do cliente até que o tempo do exp expire!

### Estratégia de Invalidação Ativa: A Blacklist Efêmera

Para resolver esse problema sem perder a performance e a escalabilidade do JWT, criamos uma Blacklist (Lista de Tokens Revogados):

```txt

 ┌─────────────────────────────────────────────────────────────────────────┐
 │                   MECANISMO DE BLACKLIST NO MIDDLEWARE                  │
 └─────────────────────────────────────────────────────────────────────────┘

  Requisição HTTP ──► [ Middleware ensureAuthenticated ]
                             │
                             ├─ 1. Checa se o Token está na BLACKLIST (Memory/Redis)
                             │     ├── SIM ──► HTTP 401 Unauthorized ("Sessão Encerrada")
                             │     └── NÃO ──► Continua validação...
                             │
                             └─ 2. Valida Assinatura Criptográfica & Expiração JWT
                                   └── OK ──► Anexa req.user e avança pro Controller

```

Por que usar Redis/In-Memory com TTL (Time-To-Live) na Blacklist?

Não precisamos guardar o token na Blacklist para sempre. Se um Access Token expira em 15 minutos e o usuário clica em Logout no minuto 2:

- Guardamos a hash do token na Blacklist com um tempo de vida (TTL) de apenas 13 minutos (o tempo restante até a expiração natural do JWT).

- Após 13 minutos, a memória limpa a chave automaticamente, mantendo a Blacklist leve, ultra-rápida e eficiente!

## 4. Como Tudo Isso se Encaixa na Clean Architecture?

Para evitar que bibliotecas externas de cache (como Redis) ou do banco (Prisma) poluam as regras de negócio, aplicamos o Princípio da Inversão de Dependência (DIP) na camada de segurança:

```txt

🟢 CAMADA DE DOMÍNIO (domain/)
    ├── Entities/RefreshToken.ts ──────► (Entidade de negócio representando a renovação)
    └── Repositories/TokenRepository.ts ─► (Interface/Contrato: invalidateToken e isTokenInvalidated)

 🔵 CAMADA DE APLICAÇÃO (application/)
    ├── UseCases/RefreshTokenUseCase.ts (Aplica a regra de rotacionamento)
    └── UseCases/LogoutUseCase.ts ───── (Aciona o expurgo do token no repositório)

 🔴 CAMADA DE INFRAESTRUTURA (infrastructure/)
    ├── Database/RedisTokenRepository.ts (Implementação concreta e ultra-rápida em memória)
    └── Middlewares/ensureAuthenticated.ts (Consome a interface TokenRepository via Injeção)

```

## Anatomia da Estratégia de Renovação

```txt

 ┌──────────────────────────────────────────────────────────────────────────────────┐
 │                               FLUXO DE REFRESH TOKEN                             │
 └──────────────────────────────────────────────────────────────────────────────────┘

   Cliente (Frontend)                                   API (PokéManager)
         │                                                      │
         ├─────── 1. POST /auth/sessions (Email/Senha) ────────►│
         │◄────── 2. Retorna AccessToken (15m) + RefreshToken ──┤
         │                                                      │
         │   ... 15 minutos se passam (AccessToken expira) ...  │
         │                                                      │
         ├─────── 3. GET /addresses/01001000 ──────────────────►│
         │◄────── 4. HTTP 401 Unauthorized (Token Expirado) ────┤
         │                                                      │
         ├─────── 5. POST /auth/refresh-token (RefreshToken) ──►│
         │◄────── 6. Valida no Banco/Cache e gera novo Par ─────┤

```

## Live Coding Hands-on

1. Entidade e Interface do Repositório no Domínio

A. Interface do Repositório de Tokens (src/domain/repositories/token-repository.ts)

```ts

export interface RefreshTokenData {
  id: string;
  token: string;
  userId: string;
  expiresIn: Date;
}

export interface TokenRepository {
  // Operações de Refresh Token
  createRefreshToken(userId: string, token: string, expiresIn: Date): Promise<RefreshTokenData>;
  findRefreshToken(token: string): Promise<RefreshTokenData | null>;
  deleteRefreshTokenByUserId(userId: string): Promise<void>;

  // Operações de Blacklist (Invalidação de Access Tokens)
  invalidateToken(token: string, ttlInSeconds: number): Promise<void>;
  isTokenInvalidated(token: string): Promise<boolean>;
}

```

2. Implementação do Repositório na Infraestrutura (Prisma + Memória)

Atenção: Utilizamos um Set em memória como estratégia leve de Blacklist para o ambiente de dev/aula, extensível para Redis em produção.

```ts

// src/infrastructure/database/prisma/repositories/prisma-token.repository.ts
import { TokenRepository, RefreshTokenData } from '@domain/repositories/token-repository';
import { prisma } from '../prisma-client';

export class PrismaTokenRepository implements TokenRepository {
  // Armazenamento em memória efêmero para a Blacklist de Access Tokens
  private static blacklist = new Set<string>();

  async createRefreshToken(userId: string, token: string, expiresIn: Date): Promise<RefreshTokenData> {
    // Remove tokens antigos do mesmo usuário para manter apenas uma sessão ativa por simplicidade
    await this.deleteRefreshTokenByUserId(userId);

    const refreshToken = await prisma.refreshToken.create({
      data: {
        userId,
        token,
        expiresIn,
      },
    });

    return refreshToken;
  }

  async findRefreshToken(token: string): Promise<RefreshTokenData | null> {
    const refreshToken = await prisma.refreshToken.findUnique({
      where: { token },
    });

    return refreshToken;
  }

  async deleteRefreshTokenByUserId(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  async invalidateToken(token: string, ttlInSeconds: number): Promise<void> {
    PrismaTokenRepository.blacklist.add(token);

    // Remove automaticamente da memória após o TTL (tempo restante de vida do JWT)
    setTimeout(() => {
      PrismaTokenRepository.blacklist.delete(token);
    }, ttlInSeconds * 1000);
  }

  async isTokenInvalidated(token: string): Promise<boolean> {
    return PrismaTokenRepository.blacklist.has(token);
  }
}

```

3. Use Cases da Aplicação

A. Use Case: Contexto do Usuário Logado (src/application/useCases/get-current-user.use-case.ts)

```ts

// src/application/useCases/get-current-user.use-case.ts
import { IUserRepository } from '@domain/repositories/user.repository';
import { GetUserResponseDTO } from './get-user-by-id.use-case';
import { NotFoundError } from '@domain/errors/notFound.error';

export class GetCurrentUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(userId: string): Promise<GetUserResponseDTO> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundError('Usuário');
    }

    return {
      id: user.id!,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

```

B. Use Case: Renovação de Token com Rotação (src/application/useCases/refresh-token.use-case.ts)

```ts

// src/application/useCases/refresh-token.use-case.ts
import { TokenRepository } from '@domain/repositories/token-repository';
import { IUserRepository } from '@domain/repositories/user.repository';
import { UnauthorizedError } from '@domain/errors/unauthorized-error';
import { sign } from 'jsonwebtoken';
import { randomUUID } from 'crypto';

interface RefreshTokenDTO {
  refreshToken: string;
}

interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
}

export class RefreshTokenUseCase {
  constructor(
    private readonly tokenRepository: TokenRepository,
    private readonly userRepository: IUserRepository
  ) {}

  async execute({ refreshToken }: RefreshTokenDTO): Promise<RefreshTokenResponse> {
    // 1. Busca o Refresh Token no banco
    const storedToken = await this.tokenRepository.findRefreshToken(refreshToken);

    if (!storedToken) {
      throw new UnauthorizedError('Refresh Token inválido');
    }

    // 2. Valida se expirou
    if (new Date() > storedToken.expiresIn) {
      await this.tokenRepository.deleteRefreshTokenByUserId(storedToken.userId);
      throw new UnauthorizedError('Refresh Token expirado. Faça login novamente.');
    }

    // 3. Busca o usuário associado
    const user = await this.userRepository.findById(storedToken.userId);
    if (!user) {
      throw new UnauthorizedError('Usuário não encontrado');
    }

    // 4. Gera novo Access Token JWT curto (15 min)
    const jwtSecret = process.env.JWT_SECRET || 'default_secret';
    const newToken = sign({ role: user.role }, jwtSecret, {
      subject: user.id,
      expiresIn: '15m',
    });

    // 5. Rotação de Refresh Token (Emite um novo e queima o anterior)
    const newRefreshTokenString = randomUUID();
    const expiresInDays = 7;
    const expiresDate = new Date();
    expiresDate.setDate(expiresDate.getDate() + expiresInDays);

    await this.tokenRepository.createRefreshToken(user.id!, newRefreshTokenString, expiresDate);

    return {
      token: newToken,
      refreshToken: newRefreshTokenString,
    };
  }
}

```

4. Controllers HTTP

```ts

// src/infrastructure/http/controllers/auth-advanced.controller.ts
import { Request, Response, NextFunction } from 'express';
import { GetCurrentUserUseCase } from '@application/useCases/get-current-user.use-case';
import { RefreshTokenUseCase } from '@application/useCases/refresh-token.use-case';
import { TokenRepository } from '@domain/repositories/token-repository';

export class AuthAdvancedController {
  constructor(
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly tokenRepository: TokenRepository
  ) {}

  // GET /auth/me
  async me(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const userId = req.user!.id;
      const user = await this.getCurrentUserUseCase.execute(userId);
      return res.status(200).json({ data: user });
    } catch (error) {
      next(error);
    }
  }

  // POST /auth/refresh-token
  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { refreshToken } = req.body;
      const result = await this.refreshTokenUseCase.execute({ refreshToken });
      return res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  }

  // POST /auth/logout
  async logout(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader) {
        const [, token] = authHeader.split(' ');
        // Adiciona na Blacklist por 15 minutos (900s)
        await this.tokenRepository.invalidateToken(token, 900);
      }

      return res.status(200).json({ message: 'Sessão encerrada com sucesso!' });
    } catch (error) {
      next(error);
    }
  }
}

```

5. Atualização do Middleware ensureAuthenticated com Blacklist

```ts

// src/infrastructure/http/middlewares/ensure-authenticated.ts
import { Request, Response, NextFunction } from 'express';
import { verify } from 'jsonwebtoken';
import { UnauthorizedError } from '@domain/errors/unauthorized-error';
import { PrismaTokenRepository } from '@infrastructure/database/prisma/repositories/prisma-token.repository';

const tokenRepository = new PrismaTokenRepository();

export const ensureAuthenticated = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new UnauthorizedError('Token JWT não fornecido');
  }

  const [, token] = authHeader.split(' ');

  // 1. Checagem de Revogação (Blacklist)
  const isInvalidated = await tokenRepository.isTokenInvalidated(token);
  if (isInvalidated) {
    throw new UnauthorizedError('Sessão encerrada. Faça login novamente.');
  }

  // 2. Validação da Assinatura Criptográfica e Expiração
  try {
    const jwtSecret = process.env.JWT_SECRET || 'default_secret';
    const decoded = verify(token, jwtSecret) as { sub: string; role: string };

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

6. Rotas com Swagger Autogen (src/infrastructure/http/routes/auth-routes.ts)

```ts

// src/infrastructure/http/routes/auth-routes.ts
import { Router } from 'express';
import { ensureAuthenticated } from '../middlewares/ensure-authenticated';
import { makeAuthAdvancedController } from '@main/factories/make-auth-advanced-controller';

const authRoutes = Router();
const controller = makeAuthAdvancedController();

// GET /auth/me
authRoutes.get('/me', ensureAuthenticated, (req, res, next) => {
  /*
    #swagger.tags = ['Autenticação']
    #swagger.summary = 'Retorna o perfil do usuário logado'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.responses[200] = { description: 'Perfil recuperado com sucesso' }
    #swagger.responses[401] = { description: 'Não autenticado' }
  */
  return controller.me(req, res, next);
});

// POST /auth/refresh-token
authRoutes.post('/refresh-token', (req, res, next) => {
  /*
    #swagger.tags = ['Autenticação']
    #swagger.summary = 'Renova o Access Token JWT utilizando o Refresh Token'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: { refreshToken: 'uuid-do-refresh-token' }
    }
    #swagger.responses[200] = { description: 'Tokens renovados com sucesso' }
    #swagger.responses[401] = { description: 'Refresh token inválido ou expirado' }
  */
  return controller.refreshToken(req, res, next);
});

// POST /auth/logout
authRoutes.post('/logout', ensureAuthenticated, (req, res, next) => {
  /*
    #swagger.tags = ['Autenticação']
    #swagger.summary = 'Encerra a sessão e revoga o Access Token atual'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.responses[200] = { description: 'Sessão encerrada com sucesso' }
  */
  return controller.logout(req, res, next);
});

export { authRoutes };

```

7. Factory makeAuthAdvancedController src/main/factories/make-auth-advanced-controller.ts

```ts

// src/main/factories/make-auth-advanced-controller.ts
import { PrismaUserRepository } from '@infrastructure/database/prisma/repositories/prisma-user.repository';
import { PrismaTokenRepository } from '@infrastructure/database/prisma/repositories/prisma-token.repository';
import { GetCurrentUserUseCase } from '@application/useCases/get-current-user.use-case';
import { RefreshTokenUseCase } from '@application/useCases/refresh-token.use-case';
import { AuthAdvancedController } from '@infrastructure/http/controllers/auth-advanced.controller';

export const makeAuthAdvancedController = (): AuthAdvancedController => {
  // 1. Instanciação dos Repositórios da camada de Infraestrutura
  const userRepository = new PrismaUserRepository();
  const tokenRepository = new PrismaTokenRepository();

  // 2. Instanciação dos Use Cases injetando as dependências de repositório (DIP)
  const getCurrentUserUseCase = new GetCurrentUserUseCase(userRepository);
  const refreshTokenUseCase = new RefreshTokenUseCase(tokenRepository, userRepository);

  // 3. Instanciação do Controller agregando os Use Cases e o Repositório para Logout/Blacklist
  return new AuthAdvancedController(
    getCurrentUserUseCase,
    refreshTokenUseCase,
    tokenRepository
  );
};

```
