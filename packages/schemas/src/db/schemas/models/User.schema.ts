import * as z from "zod";
import { RoleSchema } from "../enums/Role.schema";

export const UserSchema = z.object({
	id: z.string(),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
	username: z.string(),
	email: z.string(),
	name: z.string(),
	image: z.string().nullish(),
	role: RoleSchema.default("user"),
	emailVerified: z.boolean(),
	twoFactorEnabled: z.boolean().nullish(),
});

export type UserType = z.infer<typeof UserSchema>;
