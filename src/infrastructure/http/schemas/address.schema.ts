import { z } from 'zod';

export const getAddressByCepSchema = z.object({
  cep: z
    .string({ required_error: 'O CEP é obrigatório' })
    .transform((val) => val.replace(/\D/g, '')) // Remove traços e pontos
    .refine((val) => val.length === 8, {
      message: 'O CEP deve conter exatamente 8 dígitos numéricos',
    }),
});

export type GetAddressByCepParams = z.infer<typeof getAddressByCepSchema>;
