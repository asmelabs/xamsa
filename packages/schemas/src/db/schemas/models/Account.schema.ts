import * as z from 'zod';

export const AccountSchema = z.object({
  id: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  accessTokenExpiresAt: z.coerce.date().nullish(),
  refreshTokenExpiresAt: z.coerce.date().nullish(),
  accountId: z.string(),
  providerId: z.string(),
  accessToken: z.string().nullish(),
  refreshToken: z.string().nullish(),
  idToken: z.string().nullish(),
  scope: z.string().nullish(),
  password: z.string().min(7, 'Password must be at least 7 characters long').max(100, 'Password must be less than 100 characters long').regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{7,}$/, 'Password must contain at least one uppercase letter, one lowercase letter, and one digit').nullish(),
  userId: z.string(),
});

export type AccountType = z.infer<typeof AccountSchema>;
