# Testes de Integração de Endpoints (Supertest + Banco de Testes)

## O Problema da Concorrência e Isolamento de Estado no Banco (--runInBand)

- Por padrão, o Jest executa arquivos de teste em paralelo utilizando múltiplos Worker Threads para ganhar velocidade.

- O Conflito: Em testes de integração que compartilham a mesma instância do PostgreSQL, se o user.test.ts executar resetDatabase() enquanto o auth-flow.test.ts acabou de criar um usuário para fazer login, ocorrerão falhas intermitentes (Flaky Tests).

- A Solução Arquitetural: Executar testes de integração sequencialmente (--runInBand) ou isolar cada worker em um schema diferente do PostgreSQL (?schema=test_worker_1).

## Testes Herméticos e Fronteiras Externas (WireMock / Nock / MSW)

- Um teste de integração deve validar a integração da API com a própria infraestrutura (Express + Middlewares + Prisma + PostgreSQL), mas nunca deve depender de APIs de terceiros reais pela internet (como o ViaCEP real).

- Por quê? Se o servidor do ViaCEP ficar fora do ar ou sofrer lentidão, a pipeline de deploy da sua aplicação falha por uma indisponibilidade externa. Usa-se interceptação HTTP na borda de saída (como nock ou msw) para simular respostas 200 OK, 404 Not Found e 504 Timeout do gateway externo de forma determinística.

## Estratégias de Limpeza de Dados: DELETE vs. TRUNCATE vs. Transações

- `deleteMany()`: Seguro e respeita chaves estrangeiras na ordem correta, ideal para bases pequenas de teste.

- `TRUNCATE ... RESTART IDENTITY CASCADE`: Mais rápido em bancos maiores e reseta sequências numéricas (SERIAL), mas exige cuidado com deadlocks se houver conexões abertas.

## O Anti-Padrão da Pirâmide Invertida (Ice Cream Cone Anti-Pattern)

- Alertar os alunos sobre o risco de escrever apenas testes E2E com Supertest e ignorar testes unitários: a suíte passa a demorar 15 minutos para rodar, qualquer erro de sintaxe exige subir contêineres pesados e o feedback de desenvolvimento trava.

## Setup e Implementação Prática

1. Instalação de Dependências

```bash

npm install -D supertest @types/supertest dotenv-cli nock

```

2. Contrato Isolado de Ambiente (.env.test)

```bash

NODE_ENV=test
PORT=3334
DATABASE_URL="postgresql://user:password@localhost:5432/pokemanager_test?schema=public"
JWT_SECRET="chave_exclusiva_para_ambiente_de_testes_integracao_32_chars"
JWT_EXPIRES_IN="15m"
VIA_CEP_BASE_URL="https://viacep.com.br/ws"

```

3. Helper de Limpeza do Banco de Dados (tests/helpers/reset-db.ts)

Garante que cada arquivo de teste de integração comece com as tabelas completamente vazias, evitando poluição de estado entre execuções:

```ts

// tests/helpers/reset-db.ts
import { prisma } from '@infrastructure/database/prisma/prisma-client';

export async function resetDatabase(): Promise<void> {
  await prisma.$transaction([
    prisma.refreshToken.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

```

4. Suíte de Integração HTTP (tests/integration/auth-flow.test.ts)

Utiliza o supertest importando diretamente a instância app (sem chamar app.listen(), evitando conflitos de porta no sistema operacional).

```ts

// tests/integration/auth-flow.test.ts
import request from 'supertest';
import { app } from '@main/app';
import { prisma } from '@infrastructure/database/prisma/prisma-client';
import { resetDatabase } from '../helpers/reset-db';

describe('Fluxo de Autenticação e Segurança de Borda (Integration)', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await resetDatabase();
    await prisma.$disconnect();
  });

  it('deve cadastrar, autenticar, acessar /me e invalidar o token após logout (201 -> 200 -> 200 -> 401)', async () => {
    // 1. Cadastro de Usuário (POST /users)
    const registerResponse = await request(app)
      .post('/api/v1/users')
      .send({
        name: 'Cynthia Champion',
        email: 'cynthia@sinnoh.com',
        password: 'garchompStrongPassword123',
      });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.data).toHaveProperty('id');
    expect(registerResponse.body.data).not.toHaveProperty('password');

    // 2. Autenticação (POST /auth/sessions)
    const loginResponse = await request(app)
      .post('/api/v1/auth/sessions')
      .send({
        email: 'cynthia@sinnoh.com',
        password: 'garchompStrongPassword123',
      });

    expect(loginResponse.status).toBe(200);
    const { token } = loginResponse.body;
    expect(token).toBeDefined();

    // 3. Acesso a Rota Protegida (GET /auth/me)
    const meResponse = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.data.email).toBe('cynthia@sinnoh.com');

    // 4. Logout e Inclusão na Blacklist (POST /auth/logout)
    const logoutResponse = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(logoutResponse.status).toBe(200);

    // 5. Tentativa de Reuso do Token Revogado (Deve falhar com 401)
    const blockedResponse = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(blockedResponse.status).toBe(401);
  });

  it('deve sanitizar tags maliciosas (XSS) no payload de cadastro antes de salvar no banco', async () => {
    const response = await request(app)
      .post('/api/v1/users')
      .send({
        name: '<script>alert("xss")</script>Red Trainer',
        email: 'red@kanto.com',
        password: 'charizardFire123',
      });

    expect(response.status).toBe(201);
    expect(response.body.data.name).toBe('Red Trainer');
  });

  it('deve bloquear com HTTP 429 após exceder o limite de tentativas no login', async () => {
    // Dispara 5 tentativas falhas consecutivas (limite configurado no authRateLimiter)
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/v1/auth/sessions')
        .send({ email: 'ataque@hacker.com', password: 'errada' });
    }

    // A 6ª tentativa deve ser barrra pela camada de borda antes de tocar no banco
    const blockedAttempt = await request(app)
      .post('/api/v1/auth/sessions')
      .send({ email: 'ataque@hacker.com', password: 'errada' });

    expect(blockedAttempt.status).toBe(429);
  });
});

```

5. Teste de Autorização RBAC (tests/integration/rbac-authorization.test.ts)

Valida o middleware ensureRole garantindo que rotas administrativas retornem 403 Forbidden para usuários comuns (USER) e 200 OK para administradores (ADMIN):

```ts

// tests/integration/rbac-authorization.test.ts
import request from 'supertest';
import { app } from '@main/app';
import { prisma } from '@infrastructure/database/prisma/prisma-client';
import { resetDatabase } from '../helpers/reset-db';
import { hash } from 'bcryptjs';

describe('Controle de Acesso Baseado em Papéis - RBAC (Integration)', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await resetDatabase();
    await prisma.$disconnect();
  });

  it('deve bloquear usuário USER (403) e liberar usuário ADMIN (200) em rotas restritas', async () => {
    const passwordHash = await hash('senhaSegura123', 8);

    // 1. Cria usuário comum e usuário administrador diretamente no banco de testes
    await prisma.user.createMany({
      data: [
        { name: 'Comum', email: 'user@poke.com', password: passwordHash, role: 'USER' },
        { name: 'Admin', email: 'admin@poke.com', password: passwordHash, role: 'ADMIN' },
      ],
    });

    // 2. Autentica ambos
    const userLogin = await request(app)
      .post('/api/v1/auth/sessions')
      .send({ email: 'user@poke.com', password: 'senhaSegura123' });

    const adminLogin = await request(app)
      .post('/api/v1/auth/sessions')
      .send({ email: 'admin@poke.com', password: 'senhaSegura123' });

    // 3. Tenta acessar rota administrativa com token USER -> 403 Forbidden
    const forbiddenRes = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${userLogin.body.token}`);

    expect(forbiddenRes.status).toBe(403);

    // 4. Acessa a mesma rota com token ADMIN -> 200 OK
    const allowedRes = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${adminLogin.body.token}`);

    expect(allowedRes.status).toBe(200);
    expect(Array.isArray(allowedRes.body.data)).toBe(true);
  });
});

```

6. Teste Hermético de Gateway Externo com nock (tests/integration/address-gateway.test.ts)

Valida a integração HTTP da borda até o serviço externo (ViaCEP) interceptando a saída de rede para evitar dependência de internet ou indisponibilidade externa (npm install -D nock):

```ts

// tests/integration/address-gateway.test.ts
import request from 'supertest';
import nock from 'nock';
import { app } from '@main/app';
import { prisma } from '@infrastructure/database/prisma/prisma-client';
import { resetDatabase } from '../helpers/reset-db';
import { env } from '@infrastructure/config/env';

describe('Integração de CEP - Teste Hermético com Nock (Integration)', () => {
  let authToken: string;

  beforeEach(async () => {
    await resetDatabase();
    nock.cleanAll();

    // Cria e autentica usuário para obter token válido
    await request(app).post('/api/v1/users').send({
      name: 'Brock',
      email: 'brock@pewter.com',
      password: 'onixPassword123',
    });

    const login = await request(app).post('/api/v1/auth/sessions').send({
      email: 'brock@pewter.com',
      password: 'onixPassword123',
    });

    authToken = login.body.token;
  });

  afterAll(async () => {
    nock.restore();
    await prisma.$disconnect();
  });

  it('deve retornar os dados de endereço formatados (200 OK) simulando resposta do ViaCEP', async () => {
    // Intercepta a chamada HTTP externa para o ViaCEP
    nock(env.VIA_CEP_BASE_URL)
      .get('/01001000/json/')
      .reply(200, {
        cep: '01001-000',
        logradouro: 'Praça da Sé',
        bairro: 'Sé',
        localidade: 'São Paulo',
        uf: 'SP',
      });

    const response = await request(app)
      .get('/api/v1/addresses/01001000')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      cep: '01001-000',
      street: 'Praça da Sé',
      city: 'São Paulo',
      state: 'SP',
    });
  });

  it('deve retornar 404 Not Found quando o ViaCEP indicar CEP inexistente ({ erro: true })', async () => {
    nock(env.VIA_CEP_BASE_URL)
      .get('/99999999/json/')
      .reply(200, { erro: true });

    const response = await request(app)
      .get('/api/v1/addresses/99999999')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(404);
  });
});

```

7. Teste de Validação de Contrato de Entrada (tests/integration/validation-errors.test.ts)

Valida se os middlewares de esquema Zod na borda HTTP rejeitam payloads malformados com 400 Bad Request antes de invocar os Use Cases:

```ts

// tests/integration/validation-errors.test.ts
import request from 'supertest';
import { app } from '@main/app';

describe('Validação de Schemas de Entrada - Zod (Integration)', () => {
  it('deve retornar 400 Bad Request ao tentar cadastrar usuário com e-mail inválido e senha curta', async () => {
    const response = await request(app)
      .post('/api/v1/users')
      .send({
        name: 'A',
        email: 'email-invalido',
        password: '123',
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message');
  });
});

```

8. Scripts Finais de Execução no package.json

```json

{
  "scripts": {
    "test:unit": "jest --testPathPattern=tests/unit",
    "test:integration": "dotenv -e .env.test -- npx prisma migrate deploy && dotenv -e .env.test -- jest --testPathPattern=tests/integration --runInBand",
    "test:all": "npm run test:unit && npm run test:integration"
  }
}

```
