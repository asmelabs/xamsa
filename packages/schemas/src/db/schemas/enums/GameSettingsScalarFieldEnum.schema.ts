import * as z from 'zod';

export const GameSettingsScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'gameId', 'allowLaterJoins'])

export type GameSettingsScalarFieldEnum = z.infer<typeof GameSettingsScalarFieldEnumSchema>;