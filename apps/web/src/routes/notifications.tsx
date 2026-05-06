import {
	useInfiniteQuery,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import type {
	ListNotificationsOutputType,
	NotificationListFilterType,
	UnreadCountOutputType,
} from "@xamsa/schemas/modules/notification";
import { Button } from "@xamsa/ui/components/button";
import { Skeleton } from "@xamsa/ui/components/skeleton";
import { cn } from "@xamsa/ui/lib/utils";
import {
	BellIcon,
	CheckCheckIcon,
	Loader2Icon,
	SettingsIcon,
} from "lucide-react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useEffect, useRef } from "react";
import { NotificationRow } from "@/components/notifications/notification-row";
import { getUser } from "@/functions/get-user";
import { pageSeo } from "@/lib/seo";
import { orpc } from "@/utils/orpc";

const PAGE_SIZE = 25;

const FILTERS: { id: NotificationListFilterType; label: string }[] = [
	{ id: "all", label: "All" },
	{ id: "unread", label: "Unread" },
	{ id: "mention", label: "Mentions" },
	{ id: "social", label: "Social" },
	{ id: "gameplay", label: "Gameplay" },
];

export const Route = createFileRoute("/notifications")({
	component: NotificationsPage,

	beforeLoad: async () => {
		const session = await getUser();
		if (!session?.user) {
			throw redirect({
				to: "/auth/login",
				search: { redirect_url: "/notifications" },
			});
		}
		return { session };
	},

	head: () =>
		pageSeo({
			title: "Notifications",
			description:
				"Mentions, replies, reactions, follows, and game alerts collected in one place.",
			path: "/notifications",
			noIndex: true,
			keywords: "Xamsa notifications, inbox, alerts",
		}),
});

function NotificationsPage() {
	const queryClient = useQueryClient();
	const [filter, setFilter] = useQueryState(
		"filter",
		parseAsStringLiteral([
			"all",
			"unread",
			"mention",
			"social",
			"gameplay",
		] as const).withDefault("all"),
	);

	const unreadKey = orpc.notification.unreadCount.queryKey({ input: {} });

	const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
		useInfiniteQuery({
			...orpc.notification.list.infiniteOptions({
				input: (cursor: string | undefined) => ({
					cursor,
					limit: PAGE_SIZE,
					filter,
				}),
				getNextPageParam: (last) => last.metadata.nextCursor ?? undefined,
				initialPageParam: undefined as string | undefined,
			}),
		});

	const rows = data?.pages.flatMap((p) => p.items) ?? [];
	const sentinelRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!sentinelRef.current) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
					void fetchNextPage();
				}
			},
			{ threshold: 0 },
		);
		observer.observe(sentinelRef.current);
		return () => observer.disconnect();
	}, [fetchNextPage, hasNextPage, isFetchingNextPage]);

	const markAllRead = useMutation(
		orpc.notification.markAllRead.mutationOptions({
			onMutate: async () => {
				const listMatcher = { queryKey: ["notification", "list"] as const };
				await queryClient.cancelQueries(listMatcher);
				const snapshots =
					queryClient.getQueriesData<ListNotificationsOutputType>(listMatcher);
				const now = new Date();
				for (const [key, value] of snapshots) {
					if (!value) continue;
					queryClient.setQueryData<ListNotificationsOutputType>(key, {
						...value,
						items: value.items.map((item) => ({
							...item,
							readAt: item.readAt ?? now,
							seenAt: item.seenAt ?? now,
						})),
					});
				}
				const previous =
					queryClient.getQueryData<UnreadCountOutputType>(unreadKey);
				queryClient.setQueryData<UnreadCountOutputType>(unreadKey, {
					unseen: 0,
					unread: 0,
				});
				return { snapshots, previous };
			},
			onError: (_err, _vars, ctx) => {
				if (!ctx) return;
				for (const [key, value] of ctx.snapshots) {
					queryClient.setQueryData(key, value);
				}
				if (ctx.previous) {
					queryClient.setQueryData(unreadKey, ctx.previous);
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
				return { snapshots };
			},
			onError: (_err, _vars, ctx) => {
				if (!ctx) return;
				for (const [key, value] of ctx.snapshots) {
					queryClient.setQueryData(key, value);
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

	return (
		<div className="flex flex-col gap-5 py-6">
			<header className="flex flex-wrap items-center justify-between gap-2">
				<div>
					<h1 className="inline-flex items-center gap-2 font-bold text-2xl tracking-tight">
						<BellIcon className="size-6" strokeWidth={1.75} />
						Notifications
					</h1>
					<p className="text-muted-foreground text-sm">
						Mentions, reactions, replies, follows and game alerts.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => markAllRead.mutate({})}
						disabled={
							markAllRead.isPending || rows.every((row) => row.readAt != null)
						}
					>
						{markAllRead.isPending ? (
							<Loader2Icon className="size-4 animate-spin" strokeWidth={1.75} />
						) : (
							<CheckCheckIcon className="size-4" strokeWidth={1.75} />
						)}
						{markAllRead.isPending ? "Marking…" : "Mark all read"}
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						render={<Link to="/settings/notifications" />}
					>
						<SettingsIcon className="size-4" strokeWidth={1.75} />
						Settings
					</Button>
				</div>
			</header>

			<div className="-mx-1 flex gap-1 overflow-x-auto pb-1">
				{FILTERS.map((f) => {
					const active = filter === f.id;
					return (
						<Button
							key={f.id}
							type="button"
							size="sm"
							variant={active ? "secondary" : "ghost"}
							className={cn(
								"h-8 shrink-0 rounded-full px-3 text-xs",
								active ? "" : "text-muted-foreground",
							)}
							onClick={() => void setFilter(f.id)}
						>
							{f.label}
						</Button>
					);
				})}
			</div>

			<div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
				{isLoading ? (
					<div className="space-y-3 p-4">
						{Array.from({ length: 6 }, (_, i) => (
							<div key={i} className="flex gap-3">
								<Skeleton className="size-9 rounded-full" />
								<div className="flex-1 space-y-2">
									<Skeleton className="h-3 w-3/4" />
									<Skeleton className="h-3 w-1/2" />
								</div>
							</div>
						))}
					</div>
				) : rows.length === 0 ? (
					<div className="px-4 py-12 text-center text-muted-foreground text-sm">
						{filter === "unread"
							? "Nothing unread. You're all caught up."
							: "No notifications yet."}
					</div>
				) : (
					rows.map((row) => (
						<NotificationRow
							key={row.groupKey + (row.readAt ? "-read" : "-unread")}
							row={row}
							onMarkRead={(groupKey) => markRead.mutate({ groupKey })}
						/>
					))
				)}
			</div>

			<div ref={sentinelRef} className="h-6" />

			{isFetchingNextPage ? (
				<p className="text-center text-muted-foreground text-xs">Loading…</p>
			) : null}
		</div>
	);
}
