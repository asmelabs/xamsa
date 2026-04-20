import { z } from "zod";

export const PeriodInputSchema = z.object({
	from: z.coerce.date().optional(),
	to: z.coerce.date().optional(),
});

export type TPeriodInput = z.infer<typeof PeriodInputSchema>;

type PeriodPaths<T, Depth extends unknown[] = []> = Depth["length"] extends 3
	? never
	: T extends object
		? {
				[K in Extract<keyof T, string>]:
					| `${K}`
					| PeriodPaths<NonNullable<T[K]>, [...Depth, unknown]>;
			}[Extract<keyof T, string>]
		: never;

export function definePeriod<TWhere>(field: PeriodPaths<TWhere>) {
	return {
		shape: () => PeriodInputSchema.shape,

		resolve: (from?: Date, to?: Date): TWhere | undefined => {
			if (!from && !to) return undefined;

			const condition: Record<string, unknown> = {};
			if (from) condition.gte = from;
			if (to) condition.lte = to;

			return { [field]: condition } as TWhere;
		},
	};
}
