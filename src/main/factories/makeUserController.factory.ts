import { ListUsersUseCase } from '@application/useCases/listUsers';
import { CreateUserUseCase } from '@application/useCases/createUser';
import { UserController } from '@infrastructure/http/controllers/user.controller';
import { PrismaUserRepository } from '@infrastructure/database/prisma/prismaUser.repository';

const userRepository = new PrismaUserRepository();

export function makeUserController(): UserController {
  const listUsersUseCase = new ListUsersUseCase(userRepository);
  const createUserUseCase = new CreateUserUseCase(userRepository);

  return new UserController(listUsersUseCase, createUserUseCase);
}
