import * as z from 'zod';

export const DuplicateQuestionPolicySchema = z.enum(['none', 'block_individuals', 'block_room'])

export type DuplicateQuestionPolicy = z.infer<typeof DuplicateQuestionPolicySchema>;