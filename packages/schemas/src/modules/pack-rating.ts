import z from "zod";
import { PackRatingSchema, PackSchema, UserSchema } from "../db/schemas/models";

export const CreatePackRatingInputSchema = PackRatingSchema.pick({
	rating: true,
}).extend({
	pack: PackSchema.shape.slug,
});

export const CreatePackRatingOutputSchema = PackRatingSchema.pick({
	rating: true,
}).extend({
	pack: PackSchema.shape.slug,
});

export type CreatePackRatingInputType = z.infer<
	typeof CreatePackRatingInputSchema
>;
export type CreatePackRatingOutputType = z.infer<
	typeof CreatePackRatingOutputSchema
>;

export const FindOnePackRatingInputSchema = z.object({
	pack: PackSchema.shape.slug,
	user: UserSchema.shape.username.optional(), // if optional. get for the current user
});

export const FindOnePackRatingOutputSchema = PackRatingSchema.pick({
	createdAt: true,
	rating: true,
}).extend({
	user: UserSchema.pick({
		name: true,
		username: true,
	}),
	pack: PackSchema.pick({
		slug: true,
		name: true,
	}),
});

export type FindOnePackRatingInputType = z.infer<
	typeof FindOnePackRatingInputSchema
>;
export type FindOnePackRatingOutputType = z.infer<
	typeof FindOnePackRatingOutputSchema
>;
