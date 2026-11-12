# Atividades

Este documento consolida as tarefas necessárias para finalizar o módulo de **Segurança Defensiva na Borda (OWASP API Security)**, **Governança de Variáveis de Ambiente com Fail-Fast (Zod)** e **Ciclo de Vida de Sessões (Refresh Tokens e Blacklist)** seguindo a Clean Architecture.

---

## 1. Segurança & Borda (Hardening)

- [ ] **1. Instalar dependências de segurança**
  - Instalar `helmet`, `cors`, `express-rate-limit`, `express-mongo-sanitize`.
  - Instalar tipagens de desenvolvimento: `@types/cors`.

- [ ] **2. Criar limitadores de taxa (Rate Limiters)**
  - Localização: `src/infrastructure/http/middlewares/rate-limiter.ts`.
  - `apiRateLimiter`: Limitador global (100 requisições a cada 15 minutos por IP).
  - `authRateLimiter`: Limitador estrito para login/renovação (5 tentativas a cada 5 minutos por IP).

- [ ] **3. Configurar política restritiva de CORS**
  - Localização: `src/infrastructure/http/config/cors-options.ts`.
  - Configurar whitelist dinâmica consumindo `FRONTEND_URL` do arquivo `env`.
  - Habilitar suporte a credenciais e cabeçalhos autorizados (`Content-Type`, `Authorization`).

- [ ] **4. Acoplar middlewares de borda no `app.ts` na ordem correta**
  - Sequência obrigatória:
    1. `helmet()`
    2. `cors(corsOptions)`
    3. `apiRateLimiter` em `/api`
    4. `express.json({ limit: '10kb' })` e `urlencoded`
    5. `mongoSanitize()`
    6. `swaggerUi`
    7. `authRateLimiter` nos endpoints `/auth/sessions` e `/auth/refresh-token`
    8. `routes`
    9. `errorHandler` (último middleware com 4 parâmetros)

---

## 2. Configuração & Ambiente (Fail-Fast)

- [ ] **5. Definir contrato de variáveis (`.env.example`)**
  - Documentar no Git:
    - `NODE_ENV`
    - `PORT`
    - `DATABASE_URL`
    - `JWT_SECRET`
    - `JWT_EXPIRES_IN`
    - `VIA_CEP_BASE_URL`
    - `FRONTEND_URL`

- [ ] **6. Implementar validação Fail-Fast com Zod (`env.ts`)**
  - Localização: `src/infrastructure/config/env.ts`.
  - Validar tipos, URLs válidas e comprimento mínimo de 32 caracteres para `JWT_SECRET`.
  - Invocar `process.exit(1)` detalhando os campos faltantes em caso de erro na inicialização.

---

## 3. Autenticação Avançada & Ciclo de Vida de Sessão

- [ ] **7. Criar migration do `RefreshToken` no Prisma**
  - Atualizar `prisma/schema.prisma` com o model `RefreshToken` (campos: `id`, `token`, `userId`, `expiresIn`, `createdAt`) com remoção em cascata (`onDelete: Cascade`).
  - Executar: `npx prisma migrate dev --name add_refresh_token_table`.

- [ ] **8. Implementar repositório e Blacklist (`PrismaTokenRepository`)**
  - Localização: `src/infrastructure/database/prisma/repositories/prisma-token.repository.ts`.
  - Implementar métodos:
    - `createRefreshToken(userId, token, expiresIn)`
    - `findRefreshToken(token)`
    - `deleteRefreshTokenByUserId(userId)`
    - `invalidateToken(token, ttlInSeconds)` (armazenamento de Blacklist com expurgo automático)
    - `isTokenInvalidated(token)`

- [ ] **9. Criar Use Cases de ciclo de vida de sessão**
  - `GetCurrentUserUseCase`: Consulta o perfil do usuário logado pelo ID via DTO seguro sem expor senha.
  - `RefreshTokenUseCase`: Executa rotação de tokens, queima o refresh token consumido e emite um novo par (`AccessToken` de 15m + `RefreshToken`).

- [ ] **10. Atualizar middleware `ensureAuthenticated` com Blacklist**
  - Consultar `tokenRepository.isTokenInvalidated(token)` antes de validar a assinatura JWT.
  - Retornar `401 Unauthorized` com mensagem de sessão encerrada caso o token conste na Blacklist.

- [ ] **11. Adicionar endpoints `/me`, `/refresh-token` e `/logout`**
  - Criar `AuthAdvancedController` contendo as ações `me`, `refreshToken` e `logout`.
  - Criar factory de injeção `makeAuthAdvancedController`.
  - Mapear as rotas em `src/infrastructure/http/routes/auth-routes.ts`.

## 5. Documentação & Validação

- [ ] **12. Atualizar documentação no Swagger Autogen**
  - Incluir comentários do `swagger-autogen` nas rotas `/auth/me`, `/auth/refresh-token` e `/auth/logout`.
  - Declarar respostas esperadas: `200`, `401` e `429`.

- [ ] **13. Regerar `swagger-output.json` e testar E2E manual**
  - Executar comando de build: `npm run swagger`.
  - Acessar `http://localhost:3333/api/docs` e validar interativamente todas as rotas protegidas.
