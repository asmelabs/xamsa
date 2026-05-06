import z from "zod";
import { NotificationDeliveryLevelSchema } from "../db/schemas/enums/NotificationDeliveryLevel.schema";
import { NotificationTypeSchema } from "../db/schemas/enums/NotificationType.schema";
import { UserSchema } from "../db/schemas/models";

/* ------------------------------------------------------------------ */
/* Listing                                                            */
/* ------------------------------------------------------------------ */

export const NotificationActorSchema = UserSchema.pick({
	id: true,
	username: true,
	name: true,
	image: true,
});
export type NotificationActorType = z.infer<typeof NotificationActorSchema>;

/**
 * Polymorphic subject info attached to a grouped row. Only the fields
 * relevant to the row's `type` are populated; the client renders the
 * one-line preview and deep link from this shape.
 */
export const NotificationSubjectSchema = z.object({
	postId: z.string().nullable(),
	postSlug: z.string().nullable(),
	postBodyExcerpt: z.string().nullable(),
	commentId: z.string().nullable(),
	commentBodyExcerpt: z.string().nullable(),
	packId: z.string().nullable(),
	packSlug: z.string().nullable(),
	packName: z.string().nullable(),
	topicId: z.string().nullable(),
	topicSlug: z.string().nullable(),
	topicName: z.string().nullable(),
	gameId: z.string().nullable(),
	gameCode: z.string().nullable(),
	/** Pre-built href the client can navigate to when the row is clicked. */
	href: z.string().nullable(),
});
export type NotificationSubjectType = z.infer<typeof NotificationSubjectSchema>;

/**
 * One row in the bell / inbox feed. May represent multiple raw
 * notifications collapsed by `(groupKey, seenAt IS NULL)`.
 */
export const NotificationGroupRowSchema = z.object({
	groupKey: z.string(),
	type: NotificationTypeSchema,
	latestAt: z.coerce.date(),
	count: z.number().int().min(1),
	actors: z.array(NotificationActorSchema),
	totalActors: z.number().int().min(0),
	subject: NotificationSubjectSchema,
	seenAt: z.coerce.date().nullable(),
	readAt: z.coerce.date().nullable(),
});
export type NotificationGroupRowType = z.infer<
	typeof NotificationGroupRowSchema
>;

export const NotificationListFilterSchema = z.enum([
	"all",
	"unread",
	"mention",
	"social",
	"gameplay",
]);
export type NotificationListFilterType = z.infer<
	typeof NotificationListFilterSchema
>;

export const ListNotificationsInputSchema = z.object({
	cursor: z.string().min(1).optional(),
	limit: z.number().int().min(1).max(50).default(20),
	filter: NotificationListFilterSchema.default("all"),
});
export type ListNotificationsInputType = z.infer<
	typeof ListNotificationsInputSchema
>;

export const ListNotificationsOutputSchema = z.object({
	items: z.array(NotificationGroupRowSchema),
	metadata: z.object({
		nextCursor: z.string().nullable(),
		hasMore: z.boolean(),
	}),
});
export type ListNotificationsOutputType = z.infer<
	typeof ListNotificationsOutputSchema
>;

export const UnreadCountOutputSchema = z.object({
	/** Notifications the user has not opened the bell over yet (badge count). */
	unseen: z.number().int().min(0),
	/** Notifications the user has not marked read individually. */
	unread: z.number().int().min(0),
});
export type UnreadCountOutputType = z.infer<typeof UnreadCountOutputSchema>;

/* ------------------------------------------------------------------ */
/* Mark seen / read                                                    */
/* ------------------------------------------------------------------ */

export const MarkAllSeenOutputSchema = z.object({
	ok: z.literal(true),
	updated: z.number().int().min(0),
});
export type MarkAllSeenOutputType = z.infer<typeof MarkAllSeenOutputSchema>;

export const MarkReadInputSchema = z.object({
	groupKey: z.string().min(1),
});
export type MarkReadInputType = z.infer<typeof MarkReadInputSchema>;

export const MarkReadOutputSchema = z.object({
	ok: z.literal(true),
	updated: z.number().int().min(0),
});
export type MarkReadOutputType = z.infer<typeof MarkReadOutputSchema>;

export const MarkAllReadOutputSchema = z.object({
	ok: z.literal(true),
	updated: z.number().int().min(0),
});
export type MarkAllReadOutputType = z.infer<typeof MarkAllReadOutputSchema>;

/* ------------------------------------------------------------------ */
/* Preferences                                                         */
/* ------------------------------------------------------------------ */

/**
 * Server-canonical view of preferences. Defaults are baked into the
 * `User Notification Preference` Prisma model; on first read the API
 * upserts the row so this output is always populated.
 */
export const NotificationPreferenceOutputSchema = z.object({
	mentionInApp: NotificationDeliveryLevelSchema,
	mentionEmail: NotificationDeliveryLevelSchema,

	reactionOnPostInApp: NotificationDeliveryLevelSchema,
	reactionOnPostEmail: NotificationDeliveryLevelSchema,

	reactionOnCommentInApp: NotificationDeliveryLevelSchema,
	reactionOnCommentEmail: NotificationDeliveryLevelSchema,

	commentOnPostInApp: NotificationDeliveryLevelSchema,
	commentOnPostEmail: NotificationDeliveryLevelSchema,

	replyToCommentInApp: NotificationDeliveryLevelSchema,
	replyToCommentEmail: NotificationDeliveryLevelSchema,

	followInApp: z.boolean(),
	followEmail: z.boolean(),

	packPublishedInApp: z.boolean(),
	packPublishedEmail: z.boolean(),

	gameStartedInApp: z.boolean(),
	gameStartedEmail: z.boolean(),

	gameFinishedInApp: z.boolean(),
	gameFinishedEmail: z.boolean(),

	muteAllExceptSecurity: z.boolean(),

	emailQuietHoursEnabled: z.boolean(),
	emailQuietHoursStartMin: z.number().int().min(0).max(1439),
	emailQuietHoursEndMin: z.number().int().min(0).max(1439),
	emailQuietHoursTimezone: z.string().min(1).max(80),
});
export type NotificationPreferenceOutputType = z.infer<
	typeof NotificationPreferenceOutputSchema
>;

/**
 * Update input — every field optional so the form can patch a single
 * row without sending the whole payload.
 */
export const UpdateNotificationPreferenceInputSchema = z
	.object({
		mentionInApp: NotificationDeliveryLevelSchema.optional(),
		mentionEmail: NotificationDeliveryLevelSchema.optional(),

		reactionOnPostInApp: NotificationDeliveryLevelSchema.optional(),
		reactionOnPostEmail: NotificationDeliveryLevelSchema.optional(),

		reactionOnCommentInApp: NotificationDeliveryLevelSchema.optional(),
		reactionOnCommentEmail: NotificationDeliveryLevelSchema.optional(),

		commentOnPostInApp: NotificationDeliveryLevelSchema.optional(),
		commentOnPostEmail: NotificationDeliveryLevelSchema.optional(),

		replyToCommentInApp: NotificationDeliveryLevelSchema.optional(),
		replyToCommentEmail: NotificationDeliveryLevelSchema.optional(),

		followInApp: z.boolean().optional(),
		followEmail: z.boolean().optional(),

		packPublishedInApp: z.boolean().optional(),
		packPublishedEmail: z.boolean().optional(),

		gameStartedInApp: z.boolean().optional(),
		gameStartedEmail: z.boolean().optional(),

		gameFinishedInApp: z.boolean().optional(),
		gameFinishedEmail: z.boolean().optional(),

		muteAllExceptSecurity: z.boolean().optional(),

		emailQuietHoursEnabled: z.boolean().optional(),
		emailQuietHoursStartMin: z.number().int().min(0).max(1439).optional(),
		emailQuietHoursEndMin: z.number().int().min(0).max(1439).optional(),
		emailQuietHoursTimezone: z.string().min(1).max(80).optional(),
	})
	.superRefine((v, ctx) => {
		if (
			v.emailQuietHoursEnabled === true &&
			v.emailQuietHoursStartMin != null &&
			v.emailQuietHoursEndMin != null &&
			v.emailQuietHoursStartMin === v.emailQuietHoursEndMin
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Start and end of quiet hours must be different.",
				path: ["emailQuietHoursEndMin"],
			});
		}
	});

export type UpdateNotificationPreferenceInputType = z.infer<
	typeof UpdateNotificationPreferenceInputSchema
>;
