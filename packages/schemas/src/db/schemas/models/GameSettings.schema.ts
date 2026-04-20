import * as z from 'zod';

export const GameSettingsSchema = z.object({
  id: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  gameId: z.string(),
  allowLaterJoins: z.boolean().default(true),
});

export type GameSettingsType = z.infer<typeof GameSettingsSchema>;
