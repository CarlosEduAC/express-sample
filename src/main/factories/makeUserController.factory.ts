import { ListUsersUseCase } from '@application/useCases/listUsers';
import { CreateUserUseCase } from '@application/useCases/createUser';
import { GetUserByIdUseCase } from '@application/useCases/getUserById';
import { UserController } from '@infrastructure/http/controllers/user.controller';
import { PrismaUserRepository } from '@infrastructure/database/prisma/prismaUser.repository';

const userRepository = new PrismaUserRepository();

export function makeUserController(): UserController {
  const listUsersUseCase = new ListUsersUseCase(userRepository);
  const createUserUseCase = new CreateUserUseCase(userRepository);
  const getUserByIdUseCase = new GetUserByIdUseCase(userRepository);

  return new UserController(
    listUsersUseCase,
    createUserUseCase,
    getUserByIdUseCase,
  );
}
