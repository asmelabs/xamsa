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
  password: z.string().nullish(),
  userId: z.string(),
});

export type AccountType = z.infer<typeof AccountSchema>;
