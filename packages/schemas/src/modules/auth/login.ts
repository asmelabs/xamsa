import z from "zod";

export const LoginInputSchema = z.object({
	email: z.email(),
	password: z.string("Invalid password").min(1, "Password is required"),
	rememberMe: z.boolean("Invalid remember me value").optional(),
});

export const LoginOutputSchema = z.object({
	redirect: z.boolean(),
	url: z.string().optional(),
	token: z.string(),
});

export type LoginInput = z.infer<typeof LoginInputSchema>;
export type LoginOutput = z.infer<typeof LoginOutputSchema>;
