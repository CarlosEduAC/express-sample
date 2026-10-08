import { GetUserResponseDTO } from './getUserById';
import { IUserRepository } from '@domain/repositories/user.repository';

export class ListUsersUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(): Promise<GetUserResponseDTO[]> {
    const users = await this.userRepository.findAll();

    // Mapeia a lista omitindo as hashes de senha
    return users.map((user) => ({
      id: user.id!,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));
  }
}
