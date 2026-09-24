import { z } from 'zod';

export const createUserSchema = z.object({
  name: z
    .string({ required_error: 'O nome é obrigatório' })
    .min(3, 'O nome deve ter no mínimo 3 caracteres')
    .trim(),
  email: z
    .string({ required_error: 'O e-mail é obrigatório' })
    .email('Formato de e-mail inválido')
    .toLowerCase(),
});

export const getUserByIdSchema = z.object({
  id: z.string().uuid('O ID do usuário deve ser um UUID válido'),
});

// Inferência automática de tipos TypeScript a partir dos schemas Zod
export type CreateUserDTO = z.infer<typeof createUserSchema>;
export type GetUserByIdParams = z.infer<typeof getUserByIdSchema>;
