import { IUserRepository } from '@domain/repositories/user.repository';
import { User } from '@domain/entities/user';
import { NotFoundError } from '@domain/errors/notFound.error';

export class GetUserByIdUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundError('Usuário');
    }

    return user;
  }
}
