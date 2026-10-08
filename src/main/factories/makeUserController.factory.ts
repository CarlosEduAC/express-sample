import { ListUsersUseCase } from '@application/useCases/listUsers';
import { CreateUserUseCase } from '@application/useCases/createUser';
import { GetUserByIdUseCase } from '@application/useCases/getUserById';
import { AuthenticateUserUseCase } from '@application/useCases/authenticateUser';
import { UserController } from '@infrastructure/http/controllers/user.controller';
import { PrismaUserRepository } from '@infrastructure/database/prisma/prismaUser.repository';
import { BcryptHashProvider } from '@infrastructure/providers/bcryptHash.provider';

const userRepository = new PrismaUserRepository();

export function makeUserController(): UserController {
  const hashProvider = new BcryptHashProvider();

  const listUsersUseCase = new ListUsersUseCase(userRepository);
  const createUserUseCase = new CreateUserUseCase(userRepository, hashProvider);
  const getUserByIdUseCase = new GetUserByIdUseCase(userRepository);
  const authenticateUserUseCase = new AuthenticateUserUseCase(
    userRepository,
    hashProvider,
  );

  return new UserController(
    listUsersUseCase,
    createUserUseCase,
    getUserByIdUseCase,
    authenticateUserUseCase,
  );
}
