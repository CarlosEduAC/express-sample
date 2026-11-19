# Atividades

Este documento consolida todas as tarefas práticas necessárias para cobrir a **Pirâmide de Testes** da **PokéManager API**, desde o núcleo isolado de Domínio/Aplicação até a borda HTTP integrada com banco de dados de testes.

---

## 🧩 Parte 1: Testes Unitários (Domínio & Aplicação)

**Premissa:** Zero I/O (sem Express, sem PostgreSQL, sem chamadas de rede). Todos os testes devem rodar em milissegundos usando dublês em memória (*Fakes*) e aplicando o padrão **AAA (Arrange, Act, Assert)** e princípios **F.I.R.S.T.**

### 1.1. Dublês de Teste (Test Doubles em `tests/mocks/`)

* [ ] **Criar `in-memory-user-repository.ts`**: Implementar `create`, `findByEmail`, `findById` e `findAll` armazenando usuários em um array local.
* [ ] **Criar `in-memory-token-repository.ts`**: Implementar `createRefreshToken`, `findRefreshToken`, `deleteRefreshTokenByUserId`, `invalidateToken` e `isTokenInvalidated` (usando `Set` em memória para a Blacklist).
* [ ] **Criar `fake-hash-provider.ts`**: Implementar `generateHash` e `compareHash` de forma determinística e instantânea (`hashed_${payload}`).

### 1.2. Testes de Entidades de Domínio (`tests/unit/domain/`)

* [ ] **`user.spec.ts`**:
  * [ ] Validar criação da entidade atribuindo `role: 'USER'` por padrão quando não especificado.
  * [ ] Validar geração automática de `id` e timestamps (`createdAt`, `updatedAt`).
  * [ ] Validar atualização de senha ou propriedades garantindo imutabilidade/consistência de invariantes.

### 1.3. Testes de Casos de Uso (`tests/unit/use-cases/`)

* [ ] **`create-user.use-case.spec.ts`**:
  * [ ] Cadastrar novo usuário com senha hasheada e papel padrão `USER`.
  * [ ] Lançar `ConflictError` ao tentar cadastrar e-mail já existente (Análise de Fronteira).
* [ ] **`authenticate-user.use-case.spec.ts`**:
  * [ ] Gerar par de tokens (`token` JWT + `refreshToken`) quando credenciais estiverem corretas.
  * [ ] Lançar `UnauthorizedError` quando o e-mail não for encontrado.
  * [ ] Lançar `UnauthorizedError` quando a senha estiver incorreta.
* [ ] **`refresh-token.use-case.spec.ts`**:
  * [ ] Emitir novo `AccessToken` e novo `RefreshToken` rotacionado, invalidando o anterior.
  * [ ] Lançar `UnauthorizedError` quando o Refresh Token fornecido não existir.
  * [ ] Lançar `UnauthorizedError` e expurgar o registro quando o Refresh Token estiver expirado (`expiresIn < now`).
* [ ] **`get-current-user.use-case.spec.ts`**:
  * [ ] Retornar o DTO sanitizado do perfil do usuário (garantindo ausência do campo `password`).
  * [ ] Lançar `NotFoundError` caso o ID do usuário não exista na base.

### 1.4. Auditoria de Cobertura Unitária

* [ ] Executar `npm run test:unit` e verificar tempo de execução abaixo de 2 segundos.
* [ ] Executar `npm run test:coverage` e validar se os indicadores de **`% Branch`** estão acima de **80%** em todos os Use Cases.

---

## 🌐 Parte 2: Testes de Integração & E2E (Supertest + Banco de Testes)

**Premissa:** Validar o fluxo HTTP real passando por todos os middlewares de borda (`helmet`, `cors`, `rate-limiter`, `sanitizeRequest`, `ensureAuthenticated`, `ensureRole`), validação Zod e persistência real no PostgreSQL via Prisma.

### 2.1. Infraestrutura Isolada de Testes

* [ ] **Criar contrato `.env.test` na raiz do projeto**:
  * [ ] Configurar `NODE_ENV=test` e `PORT=3334`.
  * [ ] Apontar `DATABASE_URL` para um banco de dados exclusivo de testes (`pokemanager_test`) separado do banco de desenvolvimento.
  * [ ] Definir `JWT_SECRET` válido (mínimo 32 caracteres).
* [ ] **Criar helper de reset do banco (`tests/helpers/reset-db.ts`)**:
  * [ ] Implementar função `resetDatabase()` executando `deleteMany()` em transação (`refreshToken` seguido de `user`) para garantir independência entre testes.
* [ ] **Configurar script no `package.json`**:
  * [ ] `"test:integration": "dotenv -e .env.test -- npx prisma migrate deploy && dotenv -e .env.test -- jest --testPathPattern=tests/integration --runInBand"`
  * [ ] Garantir o uso da flag `--runInBand` para impedir *race conditions* entre suítes que compartilham o banco.

### 2.2. Suítes de Integração HTTP (`tests/integration/`)

* [ ] **`auth-flow.test.ts` (Ciclo de Vida Completo de Sessão)**:
  * [ ] `POST /api/v1/users`: Cadastrar usuário (`201 Created`) e validar omissão da senha no JSON de resposta.
  * [ ] `POST /api/v1/auth/sessions`: Autenticar usuário (`200 OK`) e extrair `token` e `refreshToken`.
  * [ ] `GET /api/v1/auth/me`: Acessar rota protegida com header `Authorization: Bearer <token>` (`200 OK`).
  * [ ] `POST /api/v1/auth/refresh-token`: Renovar sessão (`200 OK`) e validar que o Refresh Token antigo não pode mais ser reutilizado (`401 Unauthorized`).
  * [ ] `POST /api/v1/auth/logout`: Encerrar sessão (`200 OK`) e validar que tentativas subsequentes em `/auth/me` com o mesmo Access Token sejam barradas pela Blacklist (`401 Unauthorized`).
* [ ] **`security-hardening.test.ts` (Blindagem OWASP & RBAC)**:
  * [ ] **Sanitização XSS:** Enviar `<script>alert("xss")</script>` no campo `name` no cadastro e validar que a tag foi removida antes da persistência.
  * [ ] **Controle de Acesso (RBAC):** Tentar acessar endpoint exclusivo de administrador com token de usuário `USER` e validar retorno `403 Forbidden`.
  * [ ] **Validação de Payload (Zod):** Enviar e-mail malformado ou senha curta e validar retorno `400 Bad Request` estruturado.
  * [ ] **Rate Limiting:** Disparar 6 tentativas consecutivas de login e confirmar bloqueio da borda com `429 Too Many Requests`.
* [ ] **`address-gateway.test.ts` (Fronteiras Externas Herméticas)**:
  * [ ] Interceptar requisições HTTP para o ViaCEP (usando `nock` ou mock do gateway) para simular resposta `200 OK` e `404 Not Found` sem depender de acesso externo à internet.

---

## 🚀 Parte 3: Validação Final da Pipeline (CI Ready)

* [ ] Executar `npm run test:all` garantindo que tanto `test:unit` quanto `test:integration` passem sem falhas intermitentes (*flakiness*).
* [ ] Validar desconexão limpa do Prisma (`await prisma.$disconnect()`) no hook `afterAll` de todas as suítes de integração para evitar avisos de *open handles* no Jest.
