import { IUserRepository } from '@domain/repositories/user.repository';
import { User } from '@domain/entities/user';
import { AppError } from '@domain/errors/app.error';

export class GetUserByIdUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new AppError('Usuário não encontrado', 404);
    }

    return user;
  }
}
