import { User } from '@domain/entities/user';
import { IUserRepository } from '@domain/repositories/user.repository';

export class ListUsersUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(): Promise<User[]> {
    return await this.userRepository.findAll();
  }
}
