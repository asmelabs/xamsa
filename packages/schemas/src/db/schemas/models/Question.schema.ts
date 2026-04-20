import * as z from 'zod';

export const QuestionSchema = z.object({
  id: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  slug: z.string(),
  order: z.number().int().min(1, 'Order must be at least 1').max(5, 'Order must be less than or equal to 5'),
  text: z.string().min(2, 'Text must be at least 2 characters long').max(1000, 'Text must be less than 1000 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters').nullish(),
  answer: z.string().min(1, 'Answer must be at least 1 character long').max(250, 'Answer must be less than 250 characters'),
  acceptableAnswers: z.array(z.string()).max(5, 'Acceptable answers must be less than or equal to 5'),
  explanation: z.string().max(1000, 'Explanation must be less than 1000 characters').nullish(),
  topicId: z.string(),
});

export type QuestionType = z.infer<typeof QuestionSchema>;
