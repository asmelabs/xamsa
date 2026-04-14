import * as z from "zod";

export const SessionSchema = z.object({
	id: z.string(),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
	expiresAt: z.coerce.date(),
	token: z.string(),
	ipAddress: z.string().nullish(),
	userAgent: z.string().nullish(),
	userId: z.string(),
});

export type SessionType = z.infer<typeof SessionSchema>;
