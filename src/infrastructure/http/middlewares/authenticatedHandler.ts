import { Request, Response, NextFunction } from 'express';
import { verify } from 'jsonwebtoken';
import { UnauthorizedError } from '@domain/errors/unauthorized.error';

interface TokenPayload {
  sub: string;
  role: string;
  iat: number;
  exp: number;
}

export const authenticatedHandler = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new UnauthorizedError('Token JWT não fornecido');
  }

  const [, token] = authHeader.split(' ');

  try {
    const jwtSecret = process.env.JWT_SECRET || 'default_secret';
    const decoded = verify(token, jwtSecret) as TokenPayload;

    // Anexa as informações do usuário autenticado no objeto Request do Express
    req.user = {
      id: decoded.sub,
      role: decoded.role,
    };

    return next();
  } catch {
    throw new UnauthorizedError('Token JWT inválido ou expirado');
  }
};
