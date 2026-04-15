import * as z from 'zod';

export const QuestionScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'slug', 'order', 'text', 'description', 'answer', 'acceptableAnswers', 'explanation', 'topicId'])

export type QuestionScalarFieldEnum = z.infer<typeof QuestionScalarFieldEnumSchema>;