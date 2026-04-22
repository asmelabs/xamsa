import z from "zod";
import { CreateTopicPayloadSchema } from "./topic";

/**
 * 3sual.az public API — request/response shapes for package listing and full pack ("for use") payloads.
 * Base URL: https://api.3sual.az/api
 */

// --- shared / listing (GET /packages/forhome) ---

export const ListTsualPackagesInputSchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	/** Comma-separated game type ids, e.g. "2,3,5" */
	games: z.string(),
	word: z.string().optional().default(""),
});

export const TsualForHomeOrganizationSchema = z.object({
	logo: z.string(),
	name: z.string(),
});

export const TsualForHomePackageSchema = z.object({
	id: z.int().positive(),
	name: z.string(),
	game: z.string(),
	organization: TsualForHomeOrganizationSchema,
	/** ISO datetime string from API */
	date: z.string(),
});

export const ListTsualPackagesResponseSchema = z.object({
	count: z.int().min(0),
	packages: z.array(TsualForHomePackageSchema),
});

export type ListTsualPackagesInput = z.infer<
	typeof ListTsualPackagesInputSchema
>;
export type ListTsualPackagesResponse = z.infer<
	typeof ListTsualPackagesResponseSchema
>;
export type TsualForHomePackage = z.infer<typeof TsualForHomePackageSchema>;

// --- full package (GET /packages/foruse?id=…) ---

export const FindOnePackageInputSchema = z.object({
	id: z.coerce.number().int().positive(),
});

const TsualGameInfoSchema = z.object({
	id: z.int().positive(),
	name: z.string(),
	with_Theme: z.boolean(),
});

const TsualTagSchema = z.object({
	id: z.int().positive(),
	name: z.string(),
});

/** Editor/author line on a pack or theme */
export const TsualPersonRefSchema = z.object({
	id: z.int().positive(),
	user: z.unknown().nullable(),
	fullname: z.string(),
});

export const TsualQuestionValueSchema = z.object({
	id: z.int().positive(),
	text: z.string(),
	answer: z.string(),
	comment: z.string(),
	rekvizit: z.unknown().nullable(),
	source_media: z.unknown().nullable(),
	sources: z.array(z.unknown()),
});

export const TsualThemeSchema = z.object({
	id: z.int().positive(),
	/** API field name (not "round") */
	raund: z.int(),
	name: z.string(),
	information: z.string(),
	authors: z.array(TsualPersonRefSchema),
	values: z.array(TsualQuestionValueSchema),
	sources: z.array(z.unknown()),
});

export type TsualTheme = z.infer<typeof TsualThemeSchema>;
export type TsualQuestionValue = z.infer<typeof TsualQuestionValueSchema>;

export type TsualPhase = {
	id: number;
	name: string;
	information: string | null;
	questions: unknown;
	themes: TsualTheme[];
	subs: TsualPhase[] | null;
};

export const TsualPhaseSchema: z.ZodType<TsualPhase> = z.lazy(() =>
	z.object({
		id: z.int().positive(),
		name: z.string(),
		information: z.string().nullable(),
		questions: z.unknown().nullable(),
		themes: z.array(TsualThemeSchema),
		subs: z.array(TsualPhaseSchema).nullable(),
	}),
);

export const TsualPackageBodySchema = z.object({
	id: z.int().positive(),
	name: z.string(),
	isReady: z.boolean(),
	information: z.string().nullable(),
	added: z.string(),
	played: z.string().nullable(),
	updated: z.string().nullable(),
	game: TsualGameInfoSchema,
	editors: z.array(TsualPersonRefSchema),
	phases: z.array(TsualPhaseSchema),
	tags: z.array(TsualTagSchema),
});

export const TsualTournamentSchema = z.object({
	id: z.int().positive(),
	name: z.string(),
	information: z.string().nullable(),
	isLeague: z.boolean(),
	added: z.string(),
	continuation_ID: z.int().nullable(),
	continuation: z.string().nullable(),
	organizations: z.array(
		z.object({
			id: z.int().positive(),
			name: z.string(),
		}),
	),
	organizers: z.array(z.unknown()),
});

export const TsualForUseUserSchema = z.object({
	id: z.int().positive(),
	fullname: z.string(),
});

/**
 * Top-level "for use" response. The API returns the view flag as `viewtype` (lowercase).
 */
export const FindOnePackageOutputSchema = z.object({
	package: TsualPackageBodySchema,
	tournament: TsualTournamentSchema,
	user: TsualForUseUserSchema,
	copies: z.array(z.unknown()),
	viewtype: z.int(),
});

export type FindOnePackageInput = z.infer<typeof FindOnePackageInputSchema>;
export type FindOnePackageOutput = z.infer<typeof FindOnePackageOutputSchema>;
export type TsualPackageBody = z.infer<typeof TsualPackageBodySchema>;

/**
 * Remote package mapped to Xamsa topic payloads (5 questions per theme with exactly 5 values on 3sual).
 * Used to preview an import from 3sual before `topic.bulkCreate`.
 */
export const PreviewTsualImportOutputSchema = z.object({
	topics: z.array(CreateTopicPayloadSchema),
	/** 3sual package name for suggested pack title in UI */
	sourceName: z.string(),
});

export type PreviewTsualImportOutput = z.infer<
	typeof PreviewTsualImportOutputSchema
>;
