import { ListUsersUseCase } from '@application/useCases/listUsers';
import { CreateUserUseCase } from '@application/useCases/createUser';
import { UserController } from '@infrastructure/http/controllers/user.controller';
import { PgUserRepository } from '@infrastructure/database/postgres/pgUser.repository';

// Repositório compartilhado (Singleton em memória durante o runtime)
const userRepository = new PgUserRepository();

export function makeUserController(): UserController {
  const listUsersUseCase = new ListUsersUseCase(userRepository);
  const createUserUseCase = new CreateUserUseCase(userRepository);

  return new UserController(listUsersUseCase, createUserUseCase);
}
