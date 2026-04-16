import z from "zod";
import {
	CursorPaginationInputSchema,
	CursorPaginationOutputSchema,
} from "../common/pagination";
import { CountSchema } from "../common/utils";
import { PackLanguageSchema } from "../db/schemas/enums/PackLanguage.schema";
import { PackStatusSchema } from "../db/schemas/enums/PackStatus.schema";
import { PackVisibilitySchema } from "../db/schemas/enums/PackVisibility.schema";
import { PackRatingSchema, PackSchema, UserSchema } from "../db/schemas/models";
import { packPeriod, packSearch, packSort } from "./listings/pack";

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
	rating: PackRatingSchema.shape.rating.optional(),
	author: UserSchema.pick({
		name: true,
		username: true,
	}),
});

export type FindOnePackInputType = z.infer<typeof FindOnePackInputSchema>;
export type FindOnePackOutputType = z.infer<typeof FindOnePackOutputSchema>;

/**
 * LIST
 */
export const ListPacksFiltersSchema = z.object({
	authors: z.array(UserSchema.shape.username),
	visibilities: z.array(PackVisibilitySchema),
	statuses: z.array(PackStatusSchema),
	languages: z.array(PackLanguageSchema),
	minAverageRating: z.number().min(0).max(5).default(0),
	minPlays: z.number().int().min(0).default(0),
	hasRatings: z.boolean(),
});
export const ListPacksInputSchema = ListPacksFiltersSchema.partial()
	.extend(CursorPaginationInputSchema.shape)
	.extend(packSort.shape())
	.extend(packSearch.shape())
	.extend(packPeriod.shape());

export const ListPacksOutputSchema = CursorPaginationOutputSchema(
	PackSchema.pick({
		slug: true,
		name: true,
		description: true,
		averageRating: true,
		totalPlays: true,
		totalRatings: true,
		createdAt: true,
		language: true,
		status: true,
		visibility: true,
	}).extend({
		_count: CountSchema("topics"),
		author: UserSchema.pick({
			username: true,
			name: true,
		}),
	}),
);

export type ListPacksFiltersType = z.infer<typeof ListPacksFiltersSchema>;
export type ListPacksInputType = z.infer<typeof ListPacksInputSchema>;
export type ListPacksOutputType = z.infer<typeof ListPacksOutputSchema>;
