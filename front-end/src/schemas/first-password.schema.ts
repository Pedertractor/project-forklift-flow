import { z } from 'zod';

/** Alinhado ao back-end (`updateOwnPassword` — mínimo 4 caracteres). */
export const firstPasswordSchema = z
  .object({
    newPassword: z.string().min(4, 'A nova senha deve ter pelo menos 4 caracteres.'),
    confirmPassword: z.string().min(1, 'Confirme a nova senha.'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'As senhas não coincidem.',
    path: ['confirmPassword'],
  });

export type FirstPasswordForm = z.infer<typeof firstPasswordSchema>;
