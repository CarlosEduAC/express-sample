import { IUserRepository } from '@domain/repositories/user.repository';
import { HashProvider } from '@domain/providers/hash.provider';
import { UnauthorizedError } from '@domain/errors/unauthorized.error';
import { sign } from 'jsonwebtoken';

interface AuthenticateRequest {
  email: string;
  password: string;
}

interface AuthenticateResponse {
  user: {
    id?: string;
    name: string;
    email: string;
    role: string;
  };
  token: string;
}

export class AuthenticateUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly hashProvider: HashProvider,
  ) {}

  async execute({
    email,
    password,
  }: AuthenticateRequest): Promise<AuthenticateResponse> {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new UnauthorizedError('Credenciais inválidas');
    }

    const passwordMatched = await this.hashProvider.compareHash(
      password,
      user.password,
    );

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
