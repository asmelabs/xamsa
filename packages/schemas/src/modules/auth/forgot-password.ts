import z from "zod";

export const ForgotPasswordInputSchema = z.object({
	email: z.email(),
});

export const ForgotPasswordOutputSchema = z.object({
	message: z.string(),
});

export type ForgotPasswordInput = z.infer<typeof ForgotPasswordInputSchema>;
export type ForgotPasswordOutput = z.infer<typeof ForgotPasswordOutputSchema>;
