# Testes Unitários de Regras de Negócio e Casos de Uso

## Testando Comportamento vs. Testando Implementação (Fragile Tests)

- A Armadilha: Fazer asserções excessivas sobre detalhes internos privados (ex: verificar exatamente quantas vezes um método privado auxiliar foi chamado em vez do resultado final). Se o desenvolvedor refatorar o algoritmo interno mantendo a mesma regra de negócio, o teste quebra.

- A Regra de Ouro: O teste unitário deve acoplar-se apenas ao contrato público (entrada e saída do Use Case ou mudança de estado observável no repositório em memória).

## Propriedades F.I.R.S.T. de Bons Testes Unitários

- Fast (Rápidos): Devem rodar em milissegundos para não desencorajar o desenvolvedor de rodá-los a cada salvamento.

- Independent / Isolated (Independentes): A ordem de execução nunca pode importar. O Teste B jamais pode depender do registro criado pelo Teste A.

- Repeatable (Repetíveis): Devem produzir exatamente o mesmo resultado na máquina do desenvolvedor, no servidor de CI/CD ou sem conexão com a internet (cuidado com new Date() sem controle de relógio).

- Self-Validating (Auto-validáveis): O resultado deve ser estritamente booleano (Passou / Falhou) sem depender de leitura manual de console.log.

- Timely (Oportunos): Escritos junto com o código de produção (ou antes, no TDD), nunca deixados para "quando sobrar tempo".

## Particionamento de Equivalência e Análise de Valor Limite (Boundary Value Analysis)

Em vez de testar dez senhas diferentes aleatoriamente, divide-se o domínio em classes de equivalência e testa-se exatamente as fronteiras. Exemplo para um Refresh Token com validade de 7 dias:

- Fronteira Válida: 6 dias, 23 horas e 59 minutos (deve passar).

- Fronteira Exata / Inválida: 7 dias e 1 segundo (deve lançar UnauthorizedError).

## Implementação Prática

1. Dublê em Memória para Tokens (tests/mocks/in-memory-token-repository.ts)

```ts

// tests/mocks/in-memory-token-repository.ts
import { TokenRepository, RefreshTokenData } from '@domain/repositories/token-repository';
import { randomUUID } from 'crypto';

export class InMemoryTokenRepository implements TokenRepository {
  public refreshTokens: RefreshTokenData[] = [];
  public blacklist: Set<string> = new Set();

  async createRefreshToken(userId: string, token: string, expiresIn: Date): Promise<RefreshTokenData> {
    await this.deleteRefreshTokenByUserId(userId);

    const record: RefreshTokenData = {
      id: randomUUID(),
      userId,
      token,
      expiresIn,
    };

    this.refreshTokens.push(record);
    return record;
  }

  async findRefreshToken(token: string): Promise<RefreshTokenData | null> {
    return this.refreshTokens.find((item) => item.token === token) || null;
  }

  async deleteRefreshTokenByUserId(userId: string): Promise<void> {
    this.refreshTokens = this.refreshTokens.filter((item) => item.userId !== userId);
  }

  async invalidateToken(token: string, _ttlInSeconds: number): Promise<void> {
    this.blacklist.add(token);
  }

  async isTokenInvalidated(token: string): Promise<boolean> {
    return this.blacklist.has(token);
  }
}

```

2. Suíte de Testes Unitários: RefreshTokenUseCase (tests/unit/refresh-token.use-case.spec.ts)

Cobre todas as ramificações (Branches): token inexistente, token expirado (validando o expurgo automático) e sucesso com rotação de token.

```ts

// tests/unit/refresh-token.use-case.spec.ts
import { RefreshTokenUseCase } from '@application/useCases/refresh-token.use-case';
import { InMemoryTokenRepository } from '../mocks/in-memory-token-repository';
import { InMemoryUserRepository } from '../mocks/in-memory-user-repository';
import { User } from '@domain/entities/user';
import { UnauthorizedError } from '@domain/errors/unauthorized-error';

describe('RefreshTokenUseCase (Unit)', () => {
  let tokenRepository: InMemoryTokenRepository;
  let userRepository: InMemoryUserRepository;
  let sut: RefreshTokenUseCase;

  beforeEach(() => {
    tokenRepository = new InMemoryTokenRepository();
    userRepository = new InMemoryUserRepository();
    sut = new RefreshTokenUseCase(tokenRepository, userRepository);
  });

  it('deve emitir um novo par de Access Token e Refresh Token rotacionado quando válido', async () => {
    // Arrange
    const user = new User({
      id: 'user-123',
      name: 'Lance Dragonmaster',
      email: 'lance@indigo.com',
      password: 'hashed_password',
      role: 'ADMIN',
    });
    await userRepository.create(user);

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    await tokenRepository.createRefreshToken('user-123', 'valid-refresh-uuid', futureDate);

    // Act
    const response = await sut.execute({ refreshToken: 'valid-refresh-uuid' });

    // Assert
    expect(response).toHaveProperty('token');
    expect(response).toHaveProperty('refreshToken');
    expect(response.refreshToken).not.toBe('valid-refresh-uuid'); // Garante rotação
    expect(tokenRepository.refreshTokens).toHaveLength(1);
    expect(tokenRepository.refreshTokens[0].token).toBe(response.refreshToken);
  });

  it('deve lançar UnauthorizedError se o Refresh Token não existir no repositório', async () => {
    await expect(
      sut.execute({ refreshToken: 'non-existent-token' })
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('deve lançar UnauthorizedError e remover o token caso esteja expirado', async () => {
    // Arrange
    const pastDate = new Date();
    pastDate.setMinutes(pastDate.getMinutes() - 10); // Expirado há 10 minutos
    await tokenRepository.createRefreshToken('user-123', 'expired-token', pastDate);

    // Act & Assert
    await expect(
      sut.execute({ refreshToken: 'expired-token' })
    ).rejects.toBeInstanceOf(UnauthorizedError);

    // Garante que o token vencido foi expurgado
    expect(tokenRepository.refreshTokens).toHaveLength(0);
  });
});

```

3. Teste de Invariantes de Entidade (tests/unit/domain/user.entity.spec.ts)

Garante que as regras de negócio intrínsecas da entidade User funcionam independentemente de qualquer Use Case:

```ts

// tests/unit/domain/user.entity.spec.ts
import { User } from '@domain/entities/user';

describe('User Entity (Unit)', () => {
  it('deve atribuir role USER e gerar timestamps automaticamente quando não informados', () => {
    const user = new User({
      name: 'Professor Oak',
      email: 'oak@pallet.com',
      password: 'hashed_password',
    });

    expect(user.role).toBe('USER');
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
  });

  it('deve atualizar a senha e renovar o timestamp updatedAt', () => {
    const pastDate = new Date('2025-01-01T10:00:00Z');
    const user = new User({
      name: 'Blue Oak',
      email: 'blue@viridian.com',
      password: 'old_hashed_password',
      updatedAt: pastDate,
    });

    user.updatePassword('new_hashed_password');

    expect(user.password).toBe('new_hashed_password');
    expect(user.updatedAt.getTime()).toBeGreaterThan(pastDate.getTime());
  });
});

```

4. Teste de Autenticação (tests/unit/application/authenticate-user.use-case.spec.ts)

Cobre todas as ramificações (Branches) do login: credenciais corretas, usuário inexistente e senha incorreta:

```ts

// tests/unit/application/authenticate-user.use-case.spec.ts
import { AuthenticateUserUseCase } from '@application/useCases/authenticate-user.use-case';
import { InMemoryUserRepository } from '../../mocks/in-memory-user-repository';
import { FakeHashProvider } from '../../mocks/fake-hash-provider';
import { User } from '@domain/entities/user';
import { UnauthorizedError } from '@domain/errors/unauthorized-error';

describe('AuthenticateUserUseCase (Unit)', () => {
  let userRepository: InMemoryUserRepository;
  let hashProvider: FakeHashProvider;
  let sut: AuthenticateUserUseCase;

  beforeEach(async () => {
    userRepository = new InMemoryUserRepository();
    hashProvider = new FakeHashProvider();
    sut = new AuthenticateUserUseCase(userRepository, hashProvider);

    const hashedPassword = await hashProvider.generateHash('pikachu123');
    await userRepository.create(
      new User({
        id: 'user-01',
        name: 'Ash Ketchum',
        email: 'ash@kanto.com',
        password: hashedPassword,
        role: 'USER',
      })
    );
  });

  it('deve autenticar com credenciais válidas e retornar token JWT e dados do usuário', async () => {
    const result = await sut.execute({
      email: 'ash@kanto.com',
      password: 'pikachu123',
    });

    expect(result).toHaveProperty('token');
    expect(result.user.email).toBe('ash@kanto.com');
    expect(result.user).not.toHaveProperty('password');
  });

  it('deve lançar UnauthorizedError quando o e-mail não estiver cadastrado', async () => {
    await expect(
      sut.execute({
        email: 'desconhecido@kanto.com',
        password: 'pikachu123',
      })
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('deve lançar UnauthorizedError quando a senha estiver incorreta', async () => {
    await expect(
      sut.execute({
        email: 'ash@kanto.com',
        password: 'senhaErrada',
      })
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

```

3. Teste de Sanitização de DTO (tests/unit/application/get-current-user.use-case.spec.ts)

Garante que dados sensíveis (password) nunca vazem na camada de apresentação e valida a falha quando o ID não existe:

```ts

// tests/unit/application/get-current-user.use-case.spec.ts
import { GetCurrentUserUseCase } from '@application/useCases/get-current-user.use-case';
import { InMemoryUserRepository } from '../../mocks/in-memory-user-repository';
import { User } from '@domain/entities/user';
import { NotFoundError } from '@domain/errors/notFound.error';

describe('GetCurrentUserUseCase (Unit)', () => {
  let userRepository: InMemoryUserRepository;
  let sut: GetCurrentUserUseCase;

  beforeEach(() => {
    userRepository = new InMemoryUserRepository();
    sut = new GetCurrentUserUseCase(userRepository);
  });

  it('deve retornar os dados públicos do usuário sem expor o campo password', async () => {
    await userRepository.create(
      new User({
        id: 'trainer-99',
        name: 'May',
        email: 'may@hoenn.com',
        password: 'secret_hash_value',
        role: 'USER',
      })
    );

    const profile = await sut.execute('trainer-99');

    expect(profile.id).toBe('trainer-99');
    expect(profile.email).toBe('may@hoenn.com');
    expect(profile).not.toHaveProperty('password');
  });

  it('deve lançar NotFoundError se o usuário não existir', async () => {
    await expect(sut.execute('id-inexistente')).rejects.toBeInstanceOf(NotFoundError);
  });
});

```
