import * as z from 'zod';
import { RoleSchema } from '../enums/Role.schema';

export const UserSchema = z.object({
  id: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  username: z.string().min(3, 'Username must be at least 3 characters long').max(30, 'Username must be less than 30 characters long').regex(/^[a-z][a-z0-9]+$/, 'Username must contain only lowercase letters and numbers and cannot start with a number'),
  email: z.email('Invalid email address'),
  name: z.string().min(3, 'Name must be at least 3 characters long').max(100, 'Name must be less than 100 characters long'),
  image: z.url('Invalid image URL').nullish(),
  role: RoleSchema.default("user"),
  emailVerified: z.boolean(),
  twoFactorEnabled: z.boolean().nullish(),
});

export type UserType = z.infer<typeof UserSchema>;
