import {
	ListNotificationsInputSchema,
	ListNotificationsOutputSchema,
	MarkAllReadOutputSchema,
	MarkAllSeenOutputSchema,
	MarkReadInputSchema,
	MarkReadOutputSchema,
	NotificationPreferenceOutputSchema,
	UnreadCountOutputSchema,
	UpdateNotificationPreferenceInputSchema,
} from "@xamsa/schemas/modules/notification";
import { z } from "zod";
import { protectedProcedure } from "../../procedures";
import {
	getPreferences,
	listNotifications,
	markAllRead,
	markAllSeen,
	markRead,
	unreadCount,
	updatePreferences,
} from "./service";

export const notificationRouter = {
	list: protectedProcedure
		.input(ListNotificationsInputSchema)
		.output(ListNotificationsOutputSchema)
		.handler(({ input, context }) =>
			listNotifications(input, context.session.user.id),
		),
	unreadCount: protectedProcedure
		.input(z.object({}).optional())
		.output(UnreadCountOutputSchema)
		.handler(({ context }) => unreadCount(context.session.user.id)),
	markAllSeen: protectedProcedure
		.input(z.object({}).optional())
		.output(MarkAllSeenOutputSchema)
		.handler(({ context }) => markAllSeen(context.session.user.id)),
	markRead: protectedProcedure
		.input(MarkReadInputSchema)
		.output(MarkReadOutputSchema)
		.handler(({ input, context }) => markRead(input, context.session.user.id)),
	markAllRead: protectedProcedure
		.input(z.object({}).optional())
		.output(MarkAllReadOutputSchema)
		.handler(({ context }) => markAllRead(context.session.user.id)),
	getPreferences: protectedProcedure
		.input(z.object({}).optional())
		.output(NotificationPreferenceOutputSchema)
		.handler(({ context }) => getPreferences(context.session.user.id)),
	updatePreferences: protectedProcedure
		.input(UpdateNotificationPreferenceInputSchema)
		.output(NotificationPreferenceOutputSchema)
		.handler(({ input, context }) =>
			updatePreferences(input, context.session.user.id),
		),
};
