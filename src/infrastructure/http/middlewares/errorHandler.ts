import { Request, Response, NextFunction } from 'express';
import { AppError } from '@domain/errors/app.error';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
) {
  // 1. Tratamento de erros conhecidos da aplicação (AppError)
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      status: 'error',
      statusCode: error.statusCode,
      message: error.message,
    });
  }

  // 2. Log interno para erros não mapeados (Crashes/Bugs de runtime)
  console.error('💥 [Uncaught Exception]:', error);

  // 3. Resposta genérica para o cliente em caso de erro 500
  return res.status(500).json({
    status: 'error',
    statusCode: 500,
    message: 'Erro interno no servidor.',
  });
}
