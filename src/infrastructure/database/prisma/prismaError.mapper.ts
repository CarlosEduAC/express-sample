import { Prisma } from '@prisma/client';
import { AppError } from '@domain/errors/app.error';
import { ConflictError } from '@domain/errors/conflict.error';
import { NotFoundError } from '@domain/errors/notFound.error';

export class PrismaErrorMapper {
  static toAppError(error: Prisma.PrismaClientKnownRequestError): AppError {
    switch (error.code) {
      case 'P2002': {
        // Violação de constraint Única (Unique constraint)
        const target = (error.meta?.target as string[])?.join(', ') || 'campo';
        return new ConflictError(
          `Já existe um registro cadastrado com este ${target}`,
        );
      }
      case 'P2025': {
        // Registro não encontrado para atualização ou exclusão
        return new NotFoundError('Registro no banco de dados');
      }
      case 'P2003': {
        // Violação de Chave Estrangeira (Foreign key constraint)
        return new AppError(
          'Relacionamento inválido. O recurso associado não existe',
          400,
        );
      }
      default:
        // Caso ocorra algum erro do Prisma não mapeado explicitamente
        return new AppError(
          'Erro ao processar operação no banco de dados',
          500,
        );
    }
  }
}
