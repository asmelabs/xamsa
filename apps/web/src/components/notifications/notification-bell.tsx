import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type {
	ListNotificationsOutputType,
	UnreadCountOutputType,
} from "@xamsa/schemas/modules/notification";
import { Button } from "@xamsa/ui/components/button";
import {
	Popover,
	PopoverPopup,
	PopoverTrigger,
} from "@xamsa/ui/components/popover";
import { Skeleton } from "@xamsa/ui/components/skeleton";
import { cn } from "@xamsa/ui/lib/utils";
import { BellIcon, CheckCheckIcon, SettingsIcon } from "lucide-react";
import { useState } from "react";
import { orpc } from "@/utils/orpc";
import { NotificationRow } from "./notification-row";

const POPOVER_LIMIT = 8;

/**
 * Header bell. Shows an unseen badge from `notification.unreadCount` and
 * opens a popover with the most recent grouped rows. Opening the popover
 * fires `markAllSeen` optimistically (badge clears immediately, server
 * call is fire-and-forget — the Ably echo + reconciles count if the
 * mutation rejects).
 */
export function NotificationBell({ className }: { className?: string }) {
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);

	const unreadKey = orpc.notification.unreadCount.queryKey({ input: {} });

	const { data: counts } = useQuery({
		...orpc.notification.unreadCount.queryOptions({ input: {} }),
		refetchOnWindowFocus: true,
		staleTime: 30_000,
	});

	const { data: feed, isPending: feedPending } = useQuery({
		...orpc.notification.list.queryOptions({
			input: { limit: POPOVER_LIMIT, filter: "all" },
		}),
		enabled: open,
	});

	const markAllSeen = useMutation(
		orpc.notification.markAllSeen.mutationOptions({
			onMutate: async () => {
				await queryClient.cancelQueries({ queryKey: unreadKey });
				const previous =
					queryClient.getQueryData<UnreadCountOutputType>(unreadKey);
				queryClient.setQueryData<UnreadCountOutputType>(unreadKey, (old) => ({
					unseen: 0,
					unread: old?.unread ?? 0,
				}));
				return { previous };
			},
			onError: (_err, _vars, ctx) => {
				if (ctx?.previous) {
					queryClient.setQueryData(unreadKey, ctx.previous);
				}
			},
			onSettled: () => {
				void queryClient.invalidateQueries({ queryKey: unreadKey });
			},
		}),
	);

	const markRead = useMutation(
		orpc.notification.markRead.mutationOptions({
			onMutate: async ({ groupKey }) => {
				const listMatcher = { queryKey: ["notification", "list"] as const };
				await queryClient.cancelQueries(listMatcher);

				const snapshots =
					queryClient.getQueriesData<ListNotificationsOutputType>(listMatcher);
				const now = new Date();
				for (const [key, value] of snapshots) {
					if (!value) continue;
					queryClient.setQueryData<ListNotificationsOutputType>(key, {
						...value,
						items: value.items.map((item) =>
							item.groupKey === groupKey
								? {
										...item,
										readAt: item.readAt ?? now,
										seenAt: item.seenAt ?? now,
									}
								: item,
						),
					});
				}

				const previousCounts =
					queryClient.getQueryData<UnreadCountOutputType>(unreadKey);
				if (previousCounts) {
					queryClient.setQueryData<UnreadCountOutputType>(unreadKey, {
						unseen: 0,
						unread: Math.max(0, previousCounts.unread - 1),
					});
				}
				return { snapshots, previousCounts };
			},
			onError: (_err, _vars, ctx) => {
				if (!ctx) return;
				for (const [key, value] of ctx.snapshots) {
					queryClient.setQueryData(key, value);
				}
				if (ctx.previousCounts) {
					queryClient.setQueryData(unreadKey, ctx.previousCounts);
				}
			},
			onSettled: () => {
				void queryClient.invalidateQueries({ queryKey: unreadKey });
				void queryClient.invalidateQueries({
					queryKey: ["notification", "list"] as const,
				});
			},
		}),
	);

	const handleOpenChange = (next: boolean) => {
		setOpen(next);
		if (next && (counts?.unseen ?? 0) > 0) {
			markAllSeen.mutate({});
		}
	};

	const unseen = counts?.unseen ?? 0;
	const items = feed?.items ?? [];

	return (
		<Popover open={open} onOpenChange={handleOpenChange}>
			<PopoverTrigger
				render={
					<Button
						type="button"
						variant="outline"
						size="icon"
						aria-label={`Notifications${unseen > 0 ? ` (${unseen} unread)` : ""}`}
						title="Notifications (⌘B)"
						className={cn("relative h-11 w-11 shadow-none", className)}
					>
						<BellIcon className="size-5" strokeWidth={1.75} />
						{unseen > 0 ? (
							<span className="absolute -top-1 -right-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-semibold text-[10px] text-primary-foreground leading-none">
								{unseen > 99 ? "99+" : unseen}
							</span>
						) : null}
					</Button>
				}
			/>

			<PopoverPopup
				className="w-[min(22rem,calc(100vw-2rem))] overflow-hidden p-0"
				align="end"
				sideOffset={8}
			>
				<div className="flex items-center justify-between gap-2 border-border border-b px-3 py-2">
					<p className="font-semibold text-sm">Notifications</p>
					<div className="flex items-center gap-1">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="h-7 px-2 text-muted-foreground text-xs"
							onClick={() => markAllSeen.mutate({})}
						>
							<CheckCheckIcon className="size-3.5" strokeWidth={1.75} />
							Mark seen
						</Button>
						<Link
							to="/settings/notifications"
							onClick={() => setOpen(false)}
							className="inline-flex h-7 items-center justify-center rounded-md px-2 text-muted-foreground hover:text-foreground"
							aria-label="Notification settings"
						>
							<SettingsIcon className="size-3.5" strokeWidth={1.75} />
						</Link>
					</div>
				</div>

				<div className="max-h-[60vh] divide-y divide-border overflow-y-auto">
					{feedPending ? (
						<div className="space-y-3 p-4">
							{Array.from({ length: 4 }, (_, i) => (
								<div key={i} className="flex gap-3">
									<Skeleton className="size-9 rounded-full" />
									<div className="flex-1 space-y-2">
										<Skeleton className="h-3 w-3/4" />
										<Skeleton className="h-3 w-1/2" />
									</div>
								</div>
							))}
						</div>
					) : items.length === 0 ? (
						<div className="px-4 py-10 text-center text-muted-foreground text-sm">
							You're all caught up.
						</div>
					) : (
						items.map((row) => (
							<NotificationRow
								key={row.groupKey + (row.readAt ? "-read" : "-unread")}
								row={row}
								onMarkRead={(groupKey) => {
									markRead.mutate({ groupKey });
									setOpen(false);
								}}
							/>
						))
					)}
				</div>

				<div className="border-border border-t px-3 py-2 text-center">
					<Link
						to="/notifications"
						onClick={() => setOpen(false)}
						className="text-muted-foreground text-xs hover:text-foreground hover:underline"
					>
						See all notifications →
					</Link>
				</div>
			</PopoverPopup>
		</Popover>
	);
}
