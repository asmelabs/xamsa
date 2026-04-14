import * as z from "zod";

export const TwoFactorScalarFieldEnumSchema = z.enum([
	"id",
	"createdAt",
	"updatedAt",
	"secret",
	"backupCodes",
	"userId",
]);

export type TwoFactorScalarFieldEnum = z.infer<
	typeof TwoFactorScalarFieldEnumSchema
>;
