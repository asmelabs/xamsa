import { useQueryClient } from "@tanstack/react-query";
import {
	channels,
	INBOX_EVENTS,
	InboxNewMessageSchema,
	InboxReadMessageSchema,
	InboxRemovedMessageSchema,
	InboxSeenMessageSchema,
} from "@xamsa/ably/channels";
import type { UnreadCountOutputType } from "@xamsa/schemas/modules/notification";
import { useEffect } from "react";
import { getAblyClient } from "@/lib/ably";
import { orpc } from "@/utils/orpc";

/**
 * Subscribes the signed-in user to their per-user `user:<id>:inbox`
 * Ably channel and keeps the unread badge + inbox list cache fresh
 * across tabs:
 *   - `notification:new` bumps the unread count optimistically using
 *     the payload's `unreadCount` and invalidates list queries so the
 *     popover and `/notifications` route re-render with the new row.
 *   - `notification:seen` clears the badge across tabs (when one tab
 *     opens the bell, the others drop the badge too).
 *   - `notification:read` invalidates the list so read state lines up.
 *
 * Pass `null` (or undefined) for `userId` to disable the subscription
 * — used for signed-out / loading states without breaking the rules
 * of hooks.
 */
export function useUserInboxChannel(userId: string | null | undefined): void {
	const queryClient = useQueryClient();

	useEffect(() => {
		if (!userId) return;

		const client = getAblyClient();
		const channel = client.channels.get(channels.userInbox(userId));

		const unreadKey = orpc.notification.unreadCount.queryKey({ input: {} });
		const listMatcher = { queryKey: ["notification", "list"] as const };

		const onNew = (msg: { data?: unknown }) => {
			const parsed = InboxNewMessageSchema.safeParse(msg.data);
			if (!parsed.success) return;
			queryClient.setQueryData<UnreadCountOutputType>(unreadKey, (old) => ({
				unseen: parsed.data.unreadCount,
				unread: Math.max(parsed.data.unreadCount, old?.unread ?? 0),
			}));
			void queryClient.invalidateQueries(listMatcher);
		};

		const onSeen = (msg: { data?: unknown }) => {
			const parsed = InboxSeenMessageSchema.safeParse(msg.data);
			if (!parsed.success) return;
			queryClient.setQueryData<UnreadCountOutputType>(unreadKey, (old) => ({
				unseen: 0,
				unread: old?.unread ?? 0,
			}));
		};

		const onRead = (msg: { data?: unknown }) => {
			const parsed = InboxReadMessageSchema.safeParse(msg.data);
			if (!parsed.success) return;
			void queryClient.invalidateQueries({ queryKey: unreadKey });
			void queryClient.invalidateQueries(listMatcher);
		};

		const onRemoved = (msg: { data?: unknown }) => {
			const parsed = InboxRemovedMessageSchema.safeParse(msg.data);
			if (!parsed.success) return;
			queryClient.setQueryData<UnreadCountOutputType>(unreadKey, (old) => ({
				unseen: parsed.data.unreadCount,
				unread: Math.min(old?.unread ?? 0, parsed.data.unreadCount),
			}));
			void queryClient.invalidateQueries(listMatcher);
		};

		channel.subscribe(INBOX_EVENTS.NOTIFICATION_NEW, onNew);
		channel.subscribe(INBOX_EVENTS.NOTIFICATION_SEEN, onSeen);
		channel.subscribe(INBOX_EVENTS.NOTIFICATION_READ, onRead);
		channel.subscribe(INBOX_EVENTS.NOTIFICATION_REMOVED, onRemoved);

		return () => {
			channel.unsubscribe(INBOX_EVENTS.NOTIFICATION_NEW, onNew);
			channel.unsubscribe(INBOX_EVENTS.NOTIFICATION_SEEN, onSeen);
			channel.unsubscribe(INBOX_EVENTS.NOTIFICATION_READ, onRead);
			channel.unsubscribe(INBOX_EVENTS.NOTIFICATION_REMOVED, onRemoved);
		};
	}, [userId, queryClient]);
}
