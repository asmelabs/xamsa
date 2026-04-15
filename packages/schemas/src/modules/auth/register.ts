import z from "zod";
import { AccountSchema, UserSchema } from "../../db/schemas/models";

export const RegisterInputSchema = UserSchema.pick({
	email: true,
	username: true,
	name: true,
}).extend({
	password: AccountSchema.shape.password.unwrap().unwrap(),
	confirmPassword: z
		.string("Invalid confirm password")
		.min(1, "Confirm password is required"),
});

export type RegisterInput = z.infer<typeof RegisterInputSchema>;
