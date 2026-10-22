import { Request, Response, NextFunction } from 'express';
import { AppError } from '@domain/errors/app.error';

export const roleHandler = (roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError('Usuário não autenticado', 401);
    }

    if (!roles.includes(req.user.role)) {
      throw new AppError('Acesso não autorizado para este recurso', 403);
    }

    return next();
  };
};
