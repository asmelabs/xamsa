import z from "zod";
import { RegisterInputSchema } from "./register";

export const ResetPasswordInputSchema = z
	.object({
		token: z.string(),
	})
	.extend({
		password: RegisterInputSchema.shape.password,
		confirmPassword: RegisterInputSchema.shape.confirmPassword,
	});

export const ResetPasswordOutputSchema = z.object({
	message: z.string(),
});

export type ResetPasswordInput = z.infer<typeof ResetPasswordInputSchema>;
export type ResetPasswordOutput = z.infer<typeof ResetPasswordOutputSchema>;
