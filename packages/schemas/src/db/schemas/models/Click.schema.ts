import * as z from 'zod';
import { ClickStatusSchema } from '../enums/ClickStatus.schema';

export const ClickSchema = z.object({
  id: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  clickedAt: z.coerce.date(),
  answeredAt: z.coerce.date().nullish(),
  status: ClickStatusSchema.default("pending"),
  playerId: z.string(),
  gameId: z.string(),
  topicId: z.string(),
  questionId: z.string(),
  position: z.number().int(),
  reactionMs: z.number().int().nullish(),
  pointsAwarded: z.number().int(),
});

export type ClickType = z.infer<typeof ClickSchema>;
