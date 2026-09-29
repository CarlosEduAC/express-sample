import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '@domain/errors/app.error';
import { PrismaErrorMapper } from '@infrastructure/database/prisma/prismaError.mapper';

export function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  // 1. Tratamento de erros conhecidos da aplicação (AppError)
  if (error instanceof AppError) {
    const responsePayload: Record<string, unknown> = {
      status: 'error',
      statusCode: error.statusCode,
      message: error.message,
    };

    if (error.details !== undefined && error.details !== null) {
      responsePayload.details = error.details;
    }

    return res.status(error.statusCode).json(responsePayload);
  }

  // 2. Erros de Validação da Borda (Zod)
  if (error instanceof ZodError) {
    const issueDetails = error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));

    return res.status(400).json({
      status: 'error',
      message: 'Dados de entrada inválidos',
      details: issueDetails,
    });
  }

  // 3. Erros Conhecidos de Infraestrutura / Banco de Dados (Prisma)
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const appError = PrismaErrorMapper.toAppError(error);
    return res.status(appError.statusCode).json({
      status: 'error',
      message: appError.message,
    });
  }

  // 4. Erros Desconhecidos ou Críticos de Sistema (500 Internal Server Error)
  console.error('💥 [Uncaught System Exception]:', error);

  return res.status(500).json({
    status: 'error',
    statusCode: 500,
    message: 'Erro interno no servidor.',
  });
}
