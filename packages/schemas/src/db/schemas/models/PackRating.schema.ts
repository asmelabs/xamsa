import * as z from 'zod';

export const PackRatingSchema = z.object({
  id: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  rating: z.number().int().min(0, 'Rating must be at least 0').max(5, 'Rating must be less than or equal to 5'),
  feedback: z.string().max(1000, 'Feedback must be less than 1000 characters').nullish(),
  userId: z.string(),
  packId: z.string(),
});

export type PackRatingType = z.infer<typeof PackRatingSchema>;
