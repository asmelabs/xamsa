import * as z from 'zod';

export const VerificationSchema = z.object({
  id: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  expiresAt: z.coerce.date(),
  identifier: z.string(),
  value: z.string(),
});

export type VerificationType = z.infer<typeof VerificationSchema>;
