import * as z from 'zod';

export const UserTsualPackageImportSchema = z.object({
  id: z.string(),
  createdAt: z.coerce.date(),
  userId: z.string(),
  tsualPackageId: z.number().int(),
  packId: z.string(),
});

export type UserTsualPackageImportType = z.infer<typeof UserTsualPackageImportSchema>;
