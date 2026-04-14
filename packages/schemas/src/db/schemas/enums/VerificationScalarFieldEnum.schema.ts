import * as z from "zod";

export const VerificationScalarFieldEnumSchema = z.enum([
	"id",
	"createdAt",
	"updatedAt",
	"expiresAt",
	"identifier",
	"value",
]);

export type VerificationScalarFieldEnum = z.infer<
	typeof VerificationScalarFieldEnumSchema
>;
