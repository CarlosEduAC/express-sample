import { Request, Response } from 'express';
import { ListUsersUseCase } from '@application/useCases/listUsers';
import { CreateUserUseCase } from '@application/useCases/createUser';

export class UserController {
  constructor(
    private listUsersUseCase: ListUsersUseCase,
    private createUserUseCase: CreateUserUseCase,
  ) {}

  async create(req: Request, res: Response): Promise<Response> {
    try {
      const { id, name, email } = req.body;
      const user = await this.createUserUseCase.execute({ id, name, email });

      return res.status(201).json({
        message: 'Usuário criado com sucesso!',
        data: { id: user.id, name: user.name, email: user.email },
      });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Erro interno no servidor' });
    }
  }

  async list(req: Request, res: Response): Promise<Response> {
    const users = await this.listUsersUseCase.execute();

    // Mapeamos os dados para expor apenas o necessário na resposta RESTful
    const formattedUsers = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
    }));

    return res.status(200).json({ data: formattedUsers });
  }
}
