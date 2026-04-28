import * as z from 'zod';

export const TopicSchema = z.object({
  id: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  slug: z.string(),
  order: z.number().int().min(1, 'Order must be at least 1').max(100, 'Order must be less than or equal to 100'),
  name: z.string().min(2, 'Name must be at least 2 characters long').max(100, 'Name must be less than 100 characters long'),
  description: z.string().max(1000, 'Description must be less than 1000 characters').nullish(),
  packId: z.string(),
  tdr: z.number().default(4.5),
  tdrUpdatedAt: z.coerce.date().nullish(),
});

export type TopicType = z.infer<typeof TopicSchema>;
