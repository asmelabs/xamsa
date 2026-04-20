import type z from "zod";
import { UserSchema } from "../db/schemas/models";

export const FindOneProfileInputSchema = UserSchema.pick({
	username: true,
});

export const FindOneProfileOutputSchema = UserSchema.pick({
	username: true,
	name: true,
	image: true,
	role: true,
});

export type FindOneProfileInputType = z.infer<typeof FindOneProfileInputSchema>;
export type FindOneProfileOutputType = z.infer<
	typeof FindOneProfileOutputSchema
>;
