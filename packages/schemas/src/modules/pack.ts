import z from "zod";
import { CountSchema } from "../common/utils";
import { PackStatusSchema } from "../db/schemas/enums/PackStatus.schema";
import { PackSchema, UserSchema } from "../db/schemas/models";

/**
 * CREATE
 */
export const CreatePackInputSchema = PackSchema.pick({
	name: true,
	description: true,
	language: true,
	visibility: true,
});

export const CreatePackOutputSchema = PackSchema.pick({
	slug: true,
});

export type CreatePackInputType = z.infer<typeof CreatePackInputSchema>;
export type CreatePackOutputType = z.infer<typeof CreatePackOutputSchema>;

/**
 * UPDATE STATUS
 */
export const UpdatePackStatusInputSchema = PackSchema.pick({
	slug: true,
}).extend({
	status: PackStatusSchema.exclude(["draft"]),
});

export const UpdatePackStatusOutputSchema = PackSchema.pick({
	slug: true,
});

export type UpdatePackStatusInputType = z.infer<
	typeof UpdatePackStatusInputSchema
>;
export type UpdatePackStatusOutputType = z.infer<
	typeof UpdatePackStatusOutputSchema
>;

/**
 * UPDATE
 */
export const UpdatePackInputSchema = PackSchema.pick({
	slug: true,
	description: true,
	language: true,
	visibility: true,
})
	.extend({
		status: PackStatusSchema.exclude(["draft"]),
	})
	.partial()
	.required({ slug: true });

export const UpdatePackOutputSchema = PackSchema.pick({
	slug: true,
});

export type UpdatePackInputType = z.infer<typeof UpdatePackInputSchema>;
export type UpdatePackOutputType = z.infer<typeof UpdatePackOutputSchema>;

/**
 * DELETE
 */
export const DeletePackInputSchema = PackSchema.pick({
	slug: true,
	name: true,
});

export const DeletePackOutputSchema = PackSchema.pick({
	slug: true,
});

export type DeletePackInputType = z.infer<typeof DeletePackInputSchema>;
export type DeletePackOutputType = z.infer<typeof DeletePackOutputSchema>;

/**
 * FIND ONE
 */
export const FindOnePackInputSchema = PackSchema.pick({
	slug: true,
});

export const FindOnePackOutputSchema = PackSchema.pick({
	createdAt: true,
	name: true,
	slug: true,
	description: true,
	language: true,
	visibility: true,
	averageRating: true,
	totalPlays: true,
	totalRatings: true,
	status: true,
}).extend({
	isAuthor: z.boolean(),
	_count: CountSchema("topics"),
	author: UserSchema.pick({
		name: true,
		username: true,
	}),
});

export type FindOnePackInputType = z.infer<typeof FindOnePackInputSchema>;
export type FindOnePackOutputType = z.infer<typeof FindOnePackOutputSchema>;
