import * as z from 'zod';

export const GameSettingsScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'gameId', 'allowLaterJoins', 'duplicateQuestionPolicy'])

export type GameSettingsScalarFieldEnum = z.infer<typeof GameSettingsScalarFieldEnumSchema>;