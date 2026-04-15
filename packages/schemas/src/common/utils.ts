import z from "zod";

export const CountSchema = <const T extends readonly string[]>(...fields: T) =>
	z.object(
		Object.fromEntries(fields.map((f) => [f, z.number()])) as {
			[K in T[number]]: z.ZodNumber;
		},
	);
