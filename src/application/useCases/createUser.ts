import { User } from '@domain/entities/user';
import { IUserRepository } from '@domain/repositories/user.repository';
import { HashProvider } from '@domain/providers/hash.provider';
import { ConflictError } from '@domain/errors/conflict.error';

interface CreateUserDTO {
  id?: string;
  name: string;
  email: string;
  password: string;
}

export class CreateUserUseCase {
  constructor(
    private userRepository: IUserRepository,
    private hashProvider: HashProvider,
  ) {}

  async execute(data: CreateUserDTO): Promise<User> {
    const userAlreadyExists = await this.userRepository.findByEmail(data.email);

    if (userAlreadyExists) {
      throw new ConflictError(
        'Já existe um usuário cadastrado com este e-mail.',
      );
    }

    // Segurança: Criptografa a senha antes de instanciar o Domínio
    const hashedPassword = await this.hashProvider.generateHash(data.password);

    // Instancia a Entidade garantindo o papel de acesso seguro (USER)
    const user = new User({
      id: data.id,
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: 'USER', // Garante que autocadastros sempre recebam a Role de nível 'USER'
    });

    await this.userRepository.create(user);

    return user;
  }
}
