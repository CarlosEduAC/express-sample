import { User } from '@domain/entities/user';
import { IUserRepository } from '@domain/repositories/user.repository';
import { ConflictError } from '@domain/errors/conflict.error';

interface CreateUserDTO {
  id?: string;
  name: string;
  email: string;
}

export class CreateUserUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(data: CreateUserDTO): Promise<User> {
    const userAlreadyExists = await this.userRepository.findByEmail(data.email);

    if (userAlreadyExists) {
      throw new ConflictError(
        'Já existe um usuário cadastrado com este e-mail.',
      );
    }

    const user = new User(data);
    await this.userRepository.create(user);
    return user;
  }
}
