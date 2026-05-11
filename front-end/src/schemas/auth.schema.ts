import { z } from 'zod';

export const loginUnitSchema = z.enum(['pedertractor', 'tractor']);

export const loginSchema = z.object({
  card: z.string().trim().min(1, 'Informe o número do cartão'),
  unit: loginUnitSchema,
  password: z.string().min(1, 'Informe a senha'),
});

export type LoginPayload = z.infer<typeof loginSchema>;
export type LoginUnit = z.infer<typeof loginUnitSchema>;
