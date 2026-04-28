import * as z from 'zod';
import { DuplicateQuestionPolicySchema } from '../enums/DuplicateQuestionPolicy.schema';

export const GameSettingsSchema = z.object({
  id: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  gameId: z.string(),
  allowLaterJoins: z.boolean().default(true),
  duplicateQuestionPolicy: DuplicateQuestionPolicySchema.default("none"),
});

export type GameSettingsType = z.infer<typeof GameSettingsSchema>;
