import {
	useInfiniteQuery,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { CommentRowType } from "@xamsa/schemas/modules/comment";
import type { PostRowType } from "@xamsa/schemas/modules/post";
import {
	AlertDialog,
	AlertDialogClose,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@xamsa/ui/components/alert-dialog";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@xamsa/ui/components/avatar";
import { Button } from "@xamsa/ui/components/button";
import { Card } from "@xamsa/ui/components/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@xamsa/ui/components/dropdown-menu";
import { Spinner } from "@xamsa/ui/components/spinner";
import { Textarea } from "@xamsa/ui/components/textarea";
import { formatDistanceToNow } from "date-fns";
import {
	Loader2Icon,
	MessageCircleIcon,
	MoreHorizontalIcon,
	SendIcon,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import {
	adjustPostTotalCommentsInHomeFeedCache,
	homePostListInfiniteOptions,
	invalidateHomePostFeed,
	removePostFromHomeFeedCache,
} from "@/lib/home-post-feed-query";
import { orpc } from "@/utils/orpc";
import { HOME_POST_SLOTS, totalPinnedPostCount } from "./home-feed-constants";
import { PostReactionBar } from "./home-post-reactions";

export { CreatePostComposer } from "./home-create-post";

const COMMENT_PAGE_LIMIT = 8;

function PostCommentsSection({
	post,
	sessionUserId,
}: {
	post: PostRowType;
	sessionUserId: string | undefined;
}) {
	const qc = useQueryClient();
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState("");
	const [optimistic, setOptimistic] = useState<CommentRowType[]>([]);

	const commentListInfiniteOpts = useMemo(
		() =>
			orpc.comment.listByTarget.infiniteOptions({
				input: (cursor: string | undefined) => ({
					postId: post.id,
					limit: COMMENT_PAGE_LIMIT,
					...(cursor ? { cursor } : {}),
				}),
				getNextPageParam: (lastPage) =>
					lastPage.metadata.nextCursor ?? undefined,
				initialPageParam: undefined as string | undefined,
			}),
		[post.id],
	);

	const list = useInfiniteQuery({
		...commentListInfiniteOpts,
		enabled: open,
	});

	const stored = list.data?.pages.flatMap((p) => p.items) ?? [];

	const create = useMutation(
		orpc.comment.create.mutationOptions({
			onMutate: async (vars) => {
				adjustPostTotalCommentsInHomeFeedCache(qc, post.id, 1);
				if (!sessionUserId) return {};
				const tempId = `opt-${crypto.randomUUID()}`;
				const row: CommentRowType = {
					id: tempId,
					createdAt: new Date(),
					body: vars.body,
					depth: 0,
					parentId: null,
					rootId: tempId,
					packId: null,
					topicId: null,
					questionId: null,
					postId: post.id,
					totalReactions: 0,
					user: {
						id: sessionUserId,
						username: "…",
						name: "You",
						image: null,
					},
				};
				setOptimistic([row]);
				setDraft("");
				return { tempId };
			},
			onSuccess: () => setOptimistic([]),
			onError: () => {
				adjustPostTotalCommentsInHomeFeedCache(qc, post.id, -1);
				setOptimistic([]);
			},
			onSettled: async () => {
				await qc.invalidateQueries({
					queryKey: commentListInfiniteOpts.queryKey,
				});
				await invalidateHomePostFeed(qc);
				void list.refetch();
			},
		}),
	);

	const merged =
		open && optimistic.length ? [...stored, ...optimistic] : stored;

	useEffect(() => {
		if (!open) setOptimistic([]);
	}, [open]);

	return (
		<div className="mt-3 border-border border-t pt-3">
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className="flex items-center gap-2 text-muted-foreground text-xs hover:text-foreground"
			>
				<MessageCircleIcon className="size-4" strokeWidth={1.75} />
				{open ? "Hide" : "Show"} comments ({post.totalComments})
			</button>
			{open ? (
				<div className="mt-3 space-y-3">
					{sessionUserId ? (
						<div className="flex gap-2">
							<Textarea
								value={draft}
								onChange={(e) => setDraft(e.target.value)}
								rows={2}
								placeholder="Write a comment…"
								disabled={create.isPending}
							/>
							<Button
								type="button"
								size="icon"
								disabled={create.isPending || draft.trim().length === 0}
								onClick={() =>
									create.mutate({
										postId: post.id,
										body: draft.trim(),
									})
								}
							>
								<SendIcon className="size-4" />
							</Button>
						</div>
					) : (
						<p className="text-muted-foreground text-xs">
							<Link
								className="underline"
								to="/auth/login"
								search={{ redirect_url: "/" }}
							>
								Log in
							</Link>{" "}
							to comment.
						</p>
					)}
					<div className="space-y-2">
						{list.isFetching && merged.length === 0 ? (
							<div className="flex justify-center py-4">
								<Spinner />
							</div>
						) : merged.length === 0 ? (
							<p className="text-muted-foreground text-sm">No comments yet.</p>
						) : (
							merged.map((c) => (
								<div
									key={c.id}
									className="rounded-lg bg-muted/30 px-3 py-2 text-sm"
									style={{
										marginLeft: c.depth ? c.depth * 12 : undefined,
									}}
								>
									<div className="flex items-start gap-2">
										<Avatar className="size-8">
											<AvatarImage src={c.user.image ?? undefined} />
											<AvatarFallback>
												{c.user.username.slice(0, 2).toUpperCase()}
											</AvatarFallback>
										</Avatar>
										<div className="min-w-0 flex-1">
											<Link
												className="font-medium text-xs hover:underline"
												params={{ username: c.user.username }}
												to="/u/$username"
											>
												{c.user.name ?? c.user.username}
											</Link>
											<p className="mt-1 whitespace-pre-wrap">{c.body}</p>
											<span
												className="text-[10px] text-muted-foreground"
												title={new Date(c.createdAt).toLocaleString()}
											>
												{formatDistanceToNow(new Date(c.createdAt), {
													addSuffix: true,
												})}
												{c.id.startsWith("opt-") ? " · Sending…" : null}
											</span>
										</div>
									</div>
								</div>
							))
						)}
					</div>
					{list.hasNextPage ? (
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => list.fetchNextPage()}
							disabled={list.isFetchingNextPage}
						>
							{list.isFetchingNextPage ? "Loading…" : "More comments"}
						</Button>
					) : null}
				</div>
			) : null}
		</div>
	);
}

function PostCardInner({
	post,
	sessionUserId,
}: {
	post: PostRowType;
	sessionUserId: string | undefined;
}) {
	const qc = useQueryClient();
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

	const deletePostMutation = useMutation(
		orpc.post.delete.mutationOptions({
			onSuccess: async () => {
				removePostFromHomeFeedCache(qc, post.id);
				await invalidateHomePostFeed(qc);
				setDeleteDialogOpen(false);
			},
		}),
	);

	const initials = post.author.username.slice(0, 2).toUpperCase();

	const attachmentHref =
		post.attachment == null
			? null
			: post.attachment.resource === "game" && post.attachment.gameCode
				? {
						to: "/g/$code" as const,
						params: { code: post.attachment.gameCode },
					}
				: post.attachment.resource === "pack" && post.attachment.packSlug
					? {
							to: "/packs/$packSlug" as const,
							params: { packSlug: post.attachment.packSlug },
						}
					: post.attachment.resource === "topic" &&
							post.attachment.packSlug &&
							post.attachment.topicSlug
						? {
								to: "/packs/$packSlug/topics/$topicSlug" as const,
								params: {
									packSlug: post.attachment.packSlug,
									topicSlug: post.attachment.topicSlug,
								},
							}
						: null;

	const isAuthor = sessionUserId === post.author.id;

	return (
		<>
			<Card className="space-y-3 p-4">
				<div className="flex items-start gap-3">
					<Avatar className="size-11">
						<AvatarImage src={post.author.image ?? undefined} alt="" />
						<AvatarFallback>{initials}</AvatarFallback>
					</Avatar>
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-2">
							<div className="min-w-0 flex-1">
								<Link
									className="font-semibold text-sm hover:underline"
									params={{ username: post.author.username }}
									to="/u/$username"
								>
									{post.author.name ?? post.author.username}
								</Link>
							</div>
							<span
								className="shrink-0 text-[10px] text-muted-foreground"
								title={new Date(post.createdAt).toLocaleString()}
							>
								{formatDistanceToNow(new Date(post.createdAt), {
									addSuffix: true,
								})}
							</span>
							{isAuthor ? (
								<DropdownMenu>
									<DropdownMenuTrigger className="-mr-2 inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/42">
										<span className="sr-only">Post actions</span>
										<MoreHorizontalIcon className="size-4" />
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuItem
											variant="destructive"
											onClick={() => {
												window.setTimeout(() => {
													setDeleteDialogOpen(true);
												}, 0);
											}}
										>
											Delete post
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							) : null}
						</div>
						{(post.body?.trim()?.length ?? 0) > 0 ? (
							<p className="mt-2 whitespace-pre-wrap text-sm">{post.body}</p>
						) : null}
						{post.image ? (
							<button
								type="button"
								onClick={() => {
									const src = post.image;
									if (src) window.open(src, "_blank", "noopener,noreferrer");
								}}
								className="mt-3 block overflow-hidden rounded-lg border p-0"
							>
								<img
									src={post.image}
									alt=""
									className="max-h-80 w-full object-cover"
								/>
							</button>
						) : null}
						{post.attachment ? (
							<div className="mt-3 rounded-lg border bg-muted/20 p-3 text-sm">
								<span className="text-muted-foreground text-xs uppercase">
									Attached {post.attachment.resource}
								</span>
								{attachmentHref ? (
									<div className="mt-2">
										<Link
											to={attachmentHref.to}
											params={attachmentHref.params}
											className="font-medium text-primary hover:underline"
										>
											{post.attachment.resource === "game"
												? `Game ${post.attachment.gameCode ?? "?"}`
												: post.attachment.resource === "pack"
													? (post.attachment.packName ??
														post.attachment.packSlug ??
														"Pack")
													: (post.attachment.topicName ??
														post.attachment.topicSlug ??
														"Topic")}
										</Link>
									</div>
								) : (
									<p className="mt-1 text-muted-foreground text-xs">
										Resource link unavailable yet.
									</p>
								)}
							</div>
						) : null}

						<PostReactionBar post={post} sessionUserId={sessionUserId} />
						<PostCommentsSection post={post} sessionUserId={sessionUserId} />
					</div>
				</div>
			</Card>

			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete this post?</AlertDialogTitle>
						<AlertDialogDescription>
							This cannot be undone. Comments and reactions on this post will be
							removed.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogClose>
							<Button type="button" variant="outline" size="sm">
								Cancel
							</Button>
						</AlertDialogClose>
						<Button
							type="button"
							variant="destructive"
							size="sm"
							disabled={deletePostMutation.isPending}
							onClick={() => deletePostMutation.mutate({ id: post.id })}
						>
							{deletePostMutation.isPending ? (
								<Loader2Icon className="size-4 animate-spin" />
							) : null}
							Delete
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

export function PostCard(props: Parameters<typeof PostCardInner>[0]) {
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);
	if (!mounted) return <Card className="h-44 animate-pulse bg-muted/30 p-4" />;
	return <PostCardInner {...props} />;
}

interface HomeMixedFeedSlots {
	stats?: ReactNode | null;
	recentGames?: ReactNode | null;
	trending: ReactNode;
}

interface HomeMixedFeedProps {
	mode: "signedIn" | "signedOut";
	composerSlot: ReactNode;
	slots: HomeMixedFeedSlots;
	sessionUserId?: string;
}

export function HomeMixedFeed({
	mode,
	composerSlot,
	slots,
	sessionUserId,
}: HomeMixedFeedProps) {
	const {
		data,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isLoading,
		isError,
	} = useInfiniteQuery({
		...homePostListInfiniteOptions(),
	});

	const posts = data?.pages.flatMap((page) => page.items) ?? [];
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
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	const pinnedTotal = totalPinnedPostCount(mode);
	const statsN = HOME_POST_SLOTS.statsAfter;
	const recentN = HOME_POST_SLOTS.recentAfter;
	const trendN = HOME_POST_SLOTS.trendingAfter;

	const renderChunks = () => {
		const out: React.ReactNode[] = [];
		let offset = 0;

		const consume = (n: number): PostRowType[] => {
			const slice = posts.slice(offset, offset + n);
			offset += slice.length;
			return slice;
		};

		if (mode === "signedOut") {
			const firstBlock = consume(pinnedTotal);
			out.push(
				...firstBlock.map((p) => (
					<PostCard key={p.id} post={p} sessionUserId={sessionUserId} />
				)),
			);
			out.push(<div key="trend-signed-out">{slots.trending}</div>);
			const rest = posts.slice(offset);
			out.push(
				...rest.map((p) => (
					<PostCard key={p.id} post={p} sessionUserId={sessionUserId} />
				)),
			);
			return out;
		}

		const chunk1 = consume(statsN);
		out.push(
			...chunk1.map((p) => (
				<PostCard key={p.id} post={p} sessionUserId={sessionUserId} />
			)),
		);
		if (slots.stats != null)
			out.push(<div key="stats-slot">{slots.stats}</div>);

		const chunk2 = consume(recentN);
		out.push(
			...chunk2.map((p) => (
				<PostCard key={p.id} post={p} sessionUserId={sessionUserId} />
			)),
		);
		if (slots.recentGames != null)
			out.push(<div key="recent-slot">{slots.recentGames}</div>);

		const chunk3 = consume(trendN);
		out.push(
			...chunk3.map((p) => (
				<PostCard key={p.id} post={p} sessionUserId={sessionUserId} />
			)),
		);
		out.push(<div key="trend-slot">{slots.trending}</div>);

		while (offset < posts.length) {
			const more = consume(10);
			out.push(
				...more.map((p) => (
					<PostCard key={p.id} post={p} sessionUserId={sessionUserId} />
				)),
			);
			if (more.length === 0) break;
		}

		return out;
	};

	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<h2 className="font-semibold text-muted-foreground text-sm uppercase tracking-wider">
					Feed
				</h2>
				{composerSlot}
			</div>

			{isLoading ? (
				<div className="space-y-4">
					{Array.from({ length: 3 }, (_, i) => (
						<Card key={i} className="h-40 animate-pulse bg-muted/30" />
					))}
				</div>
			) : isError ? (
				<p className="text-destructive text-sm">Could not load posts.</p>
			) : (
				<div className="flex flex-col gap-6">
					{posts.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							No posts yet — be the first.
						</p>
					) : null}
					{renderChunks()}
				</div>
			)}

			<div ref={sentinelRef} className="h-2 w-full shrink-0" />
			{isFetchingNextPage ? (
				<p className="text-center text-muted-foreground text-xs">Loading…</p>
			) : null}
		</div>
	);
}
