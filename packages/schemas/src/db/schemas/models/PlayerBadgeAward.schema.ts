import * as z from 'zod';

export const PlayerBadgeAwardSchema = z.object({
  id: z.string(),
  createdAt: z.coerce.date(),
  earnedAt: z.coerce.date(),
  playerId: z.string(),
  badgeId: z.string(),
  gameTopicId: z.string().nullish(),
  gameQuestionId: z.string().nullish(),
});

export type PlayerBadgeAwardType = z.infer<typeof PlayerBadgeAwardSchema>;
