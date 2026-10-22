import { IUserRepository } from '@domain/repositories/user.repository';
import { UserRole } from '@domain/entities/user';
import { NotFoundError } from '@domain/errors/notFound.error';

export interface GetUserResponseDTO {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: Date;
  updatedAt?: Date;
}

export class GetUserByIdUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(id: string): Promise<GetUserResponseDTO> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundError('Usuário');
    }

    // Retorna o DTO sanitizado sem o campo password
    return {
      id: user.id!,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
