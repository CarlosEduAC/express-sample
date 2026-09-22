import { User } from '@domain/entities/user';
import { IUserRepository } from '@domain/repositories/user.repository';
import { AppError } from '@domain/errors/app.error';

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
      throw new AppError('Usuário com este e-mail já está cadastrado.', 400);
    }

    const user = new User(data);
    await this.userRepository.create(user);
    return user;
  }
}
