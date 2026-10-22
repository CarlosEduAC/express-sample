import { Request, Response, NextFunction } from 'express';
import { ListUsersUseCase } from '@application/useCases/listUsers';
import { CreateUserUseCase } from '@application/useCases/createUser';
import { GetUserByIdUseCase } from '@application/useCases/getUserById';
import { AuthenticateUserUseCase } from '@application/useCases/authenticateUser';

export class UserController {
  constructor(
    private listUsersUseCase: ListUsersUseCase,
    private createUserUseCase: CreateUserUseCase,
    private getUserByIdUseCase: GetUserByIdUseCase,
    private authenticateUserUseCase: AuthenticateUserUseCase,
  ) {}

  async create(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const { name, email, password } = req.body;
      const user = await this.createUserUseCase.execute({
        name,
        email,
        password,
      });

      return res.status(201).json({
        message: 'Usuário criado com sucesso!',
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async list(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const users = await this.listUsersUseCase.execute();

      return res.status(200).json(users);
    } catch (error) {
      next(error);
    }
  }

  async getById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const { id } = req.params as { id: string };
      const user = await this.getUserByIdUseCase.execute(id);

      return res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  }

  async authenticate(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const { email, password } = req.body;

      const result = await this.authenticateUserUseCase.execute({
        email,
        password,
      });

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
