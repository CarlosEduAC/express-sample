import { AppError } from './app.error';

export class NotFoundError extends AppError {
  constructor(entityName: string) {
    super(`${entityName} não encontrado(a)`, 404);
  }
}
