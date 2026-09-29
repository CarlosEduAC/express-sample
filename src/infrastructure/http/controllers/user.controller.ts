import { Request, Response, NextFunction } from 'express';
import { ListUsersUseCase } from '@application/useCases/listUsers';
import { CreateUserUseCase } from '@application/useCases/createUser';
import { GetUserByIdUseCase } from '@application/useCases/getUserById';

export class UserController {
  constructor(
    private listUsersUseCase: ListUsersUseCase,
    private createUserUseCase: CreateUserUseCase,
    private getUserByIdUseCase: GetUserByIdUseCase,
  ) {}

  async create(req: Request, res: Response): Promise<Response> {
    const { id, name, email } = req.body;
    const user = await this.createUserUseCase.execute({ id, name, email });

    return res.status(201).json({
      message: 'Usuário criado com sucesso!',
      data: { id: user.id, name: user.name, email: user.email },
    });
  }

  async list(req: Request, res: Response): Promise<Response> {
    const users = await this.listUsersUseCase.execute();

    const formattedUsers = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
    }));

    return res.status(200).json({ data: formattedUsers });
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
}
