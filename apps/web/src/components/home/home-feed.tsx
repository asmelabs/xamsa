import type { QueryKey } from "@tanstack/react-query";
import {
	useInfiniteQuery,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import type { CommentThreadNodeType } from "@xamsa/schemas/modules/comment";
import type {
	ListPostsFeedType,
	PostRowType,
} from "@xamsa/schemas/modules/post";
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
import { cn } from "@xamsa/ui/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
	BarChart3Icon,
	Bookmark,
	BookOpen,
	ChevronDownIcon,
	ChevronRightIcon,
	EyeIcon,
	Gamepad2,
	LibraryBig,
	Link2Icon,
	Loader2Icon,
	MessageCircleIcon,
	MoreHorizontalIcon,
	SendIcon,
} from "lucide-react";
import {
	type KeyboardEvent,
	type MouseEvent,
	type ReactNode,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";

import { MentionRichText } from "@/components/home/mention-rich-text";
import { MentionTextarea } from "@/components/home/mention-textarea";
import { CommentReactionBar } from "@/components/reactions/comment-reaction-bar";
import { usePostViewTracker } from "@/hooks/use-post-view-tracker";
import {
	adjustPostTotalCommentsInHomeFeedCache,
	homePostListInfiniteOptions,
	invalidateHomePostFeed,
	removePostFromHomeFeedCache,
	setPostBookmarkedInCaches,
} from "@/lib/home-post-feed-query";
import { getSiteOrigin } from "@/lib/site-origin";
import { orpc } from "@/utils/orpc";
import { HOME_POST_SLOTS, totalPinnedPostCount } from "./home-feed-constants";
import { PostReactionBar } from "./home-post-reactions";

export { CreatePostComposer } from "./home-create-post";

const COMMENT_PAGE_LIMIT = 8;

function CommentTreeNode({
	node,
	sessionUserId,
	postId,
	replyToId,
	onReply,
	onClearReply,
	collapsedIds,
	onToggleCollapsed,
	createPending,
	threadQueryKey,
	loginRedirect,
}: {
	node: CommentThreadNodeType;
	sessionUserId: string | undefined;
	postId: string;
	replyToId: string | null;
	onReply: (id: string) => void;
	onClearReply: () => void;
	collapsedIds: Set<string>;
	onToggleCollapsed: (id: string) => void;
	createPending: boolean;
	threadQueryKey: QueryKey;
	loginRedirect: string;
}) {
	const hasReplies = node.replies.length > 0;
	const branchCollapsed = collapsedIds.has(node.id);
	const canReply = node.depth < 3;

	return (
		<div id={`c-${node.id}`}>
			<div className="flex gap-3 py-2.5">
				<Avatar className="size-8 shrink-0">
					<AvatarImage src={node.user.image ?? undefined} alt="" />
					<AvatarFallback className="text-[10px]">
						{node.user.username.slice(0, 2).toUpperCase()}
					</AvatarFallback>
				</Avatar>
				<div className="min-w-0 flex-1">
					<div className="flex items-baseline gap-2">
						<Link
							className="truncate font-semibold text-foreground text-sm hover:underline"
							params={{ username: node.user.username }}
							to="/u/$username"
						>
							{node.user.name ?? node.user.username}
						</Link>
						<span className="truncate text-muted-foreground text-xs">
							@{node.user.username}
						</span>
						<span aria-hidden className="text-muted-foreground/50">
							·
						</span>
						<time
							className="shrink-0 text-muted-foreground text-xs tabular-nums"
							title={new Date(node.createdAt).toLocaleString()}
						>
							{formatDistanceToNow(new Date(node.createdAt), {
								addSuffix: true,
							})}
						</time>
					</div>
					<p className="mt-1.5 whitespace-pre-wrap text-[14.5px] text-foreground leading-relaxed">
						<MentionRichText text={node.body} mentions={node.mentions} />
					</p>
					<div className="mt-2 space-y-1.5">
						<CommentReactionBar
							comment={node}
							sessionUserId={sessionUserId}
							threadQueryKey={threadQueryKey}
							loginRedirect={loginRedirect}
						/>
						<div className="flex items-center gap-3">
							{sessionUserId && canReply ? (
								<button
									type="button"
									disabled={createPending}
									className="font-medium text-muted-foreground text-xs transition-colors hover:text-foreground disabled:opacity-50"
									onClick={() =>
										replyToId === node.id ? onClearReply() : onReply(node.id)
									}
								>
									{replyToId === node.id ? "Cancel reply" : "Reply"}
								</button>
							) : null}
							{hasReplies ? (
								<button
									type="button"
									className="inline-flex items-center gap-1 font-medium text-muted-foreground text-xs transition-colors hover:text-foreground"
									onClick={() => onToggleCollapsed(node.id)}
								>
									<ChevronRightIcon
										className={cn(
											"size-3 shrink-0 transition-transform",
											!branchCollapsed && "rotate-90",
										)}
									/>
									{branchCollapsed ? "Show" : "Hide"} {node.replies.length}{" "}
									{node.replies.length === 1 ? "reply" : "replies"}
								</button>
							) : null}
						</div>
					</div>
				</div>
			</div>
			{hasReplies && !branchCollapsed ? (
				<div className="ml-4 border-border/60 border-l pl-4">
					{node.replies.map((ch) => (
						<CommentTreeNode
							key={ch.id}
							node={ch}
							sessionUserId={sessionUserId}
							postId={postId}
							replyToId={replyToId}
							onReply={onReply}
							onClearReply={onClearReply}
							collapsedIds={collapsedIds}
							onToggleCollapsed={onToggleCollapsed}
							createPending={createPending}
							threadQueryKey={threadQueryKey}
							loginRedirect={loginRedirect}
						/>
					))}
				</div>
			) : null}
		</div>
	);
}

function PostCommentsSection({
	post,
	sessionUserId,
	open,
	onOpenChange,
	variant = "accordion",
}: {
	post: PostRowType;
	sessionUserId: string | undefined;
	open: boolean;
	onOpenChange: (next: boolean) => void;
	variant?: "accordion" | "inline";
}) {
	const qc = useQueryClient();
	const isInline = variant === "inline";
	const [draft, setDraft] = useState("");
	const [replyToId, setReplyToId] = useState<string | null>(null);
	const [collapsedIds, setCollapsedIds] = useState<Set<string>>(
		() => new Set(),
	);

	const threadListOpts = useMemo(
		() =>
			orpc.comment.listThreadsByPost.infiniteOptions({
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
		...threadListOpts,
		enabled: open,
	});

	const roots = list.data?.pages.flatMap((p) => p.roots) ?? [];

	const create = useMutation(
		orpc.comment.create.mutationOptions({
			onMutate: async () => {
				adjustPostTotalCommentsInHomeFeedCache(qc, post.id, 1);
				setDraft("");
				setReplyToId(null);
				return {};
			},
			onError: () => {
				adjustPostTotalCommentsInHomeFeedCache(qc, post.id, -1);
			},
			onSettled: async () => {
				await qc.invalidateQueries({
					queryKey: threadListOpts.queryKey,
				});
				await invalidateHomePostFeed(qc);
				void list.refetch();
			},
		}),
	);

	const toggleCollapsed = (id: string) => {
		setCollapsedIds((prev) => {
			const n = new Set(prev);
			if (n.has(id)) {
				n.delete(id);
			} else {
				n.add(id);
			}
			return n;
		});
	};

	const loginRedirect = `/p/${post.slug}/`;

	const submit = () => {
		const trimmed = draft.trim();
		if (trimmed.length === 0) return;
		create.mutate({
			postId: post.id,
			body: trimmed,
			...(replyToId ? { parentId: replyToId } : {}),
		});
	};

	if (!isInline && !open) return null;

	return (
		<div
			className={cn(
				"border-border border-t",
				isInline ? "mt-8 pt-7" : "mt-3 border-dashed pt-4",
			)}
		>
			{isInline ? (
				<div className="mb-5 flex items-baseline gap-2">
					<h3 className="font-semibold text-base text-foreground tracking-tight">
						Comments
					</h3>
					<span className="text-muted-foreground text-xs tabular-nums">
						{post.totalComments === 1
							? "1 reply"
							: `${post.totalComments} replies`}
					</span>
				</div>
			) : null}
			<div className="space-y-5">
				{sessionUserId ? (
					<div className="space-y-2">
						{replyToId ? (
							<p className="text-muted-foreground text-xs">
								Replying to a comment —{" "}
								<button
									type="button"
									className="font-medium underline underline-offset-2"
									onClick={() => setReplyToId(null)}
								>
									cancel
								</button>
							</p>
						) : null}
						<div className="flex items-end gap-2">
							<MentionTextarea
								value={draft}
								onValueChange={setDraft}
								rows={1}
								placeholder="Write a comment…"
								disabled={create.isPending}
								onKeyDown={(e) => {
									if (
										e.key === "Enter" &&
										(e.metaKey || e.ctrlKey) &&
										draft.trim().length > 0 &&
										!create.isPending
									) {
										e.preventDefault();
										submit();
									}
								}}
								className="flex-1 [&_textarea]:max-h-48 [&_textarea]:min-h-9 [&_textarea]:py-2 [&_textarea]:max-sm:min-h-9"
							/>
							<Button
								type="button"
								size="icon"
								disabled={create.isPending || draft.trim().length === 0}
								className="shrink-0"
								onClick={submit}
							>
								<SendIcon className="size-4" />
							</Button>
						</div>
						<p className="text-[10px] text-muted-foreground">
							Press ⌘ Enter / Ctrl Enter to send
						</p>
					</div>
				) : (
					<p className="text-muted-foreground text-sm">
						<Link
							className="font-medium underline underline-offset-4"
							to="/auth/login"
							search={{ redirect_url: loginRedirect }}
						>
							Log in
						</Link>{" "}
						to comment.
					</p>
				)}
				<div>
					{list.isFetching && roots.length === 0 ? (
						<div className="flex justify-center py-8">
							<Spinner />
						</div>
					) : roots.length === 0 ? (
						<p className="py-6 text-center text-muted-foreground text-sm">
							No comments yet — say hello.
						</p>
					) : (
						<div className="space-y-1">
							{roots.map((node) => (
								<CommentTreeNode
									key={node.id}
									node={node}
									sessionUserId={sessionUserId}
									postId={post.id}
									replyToId={replyToId}
									onReply={setReplyToId}
									onClearReply={() => setReplyToId(null)}
									collapsedIds={collapsedIds}
									onToggleCollapsed={toggleCollapsed}
									createPending={create.isPending}
									threadQueryKey={threadListOpts.queryKey}
									loginRedirect={loginRedirect}
								/>
							))}
						</div>
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
						{list.isFetchingNextPage ? "Loading…" : "More threads"}
					</Button>
				) : null}
				{!isInline ? (
					<div className="flex justify-end">
						<button
							type="button"
							onClick={() => onOpenChange(false)}
							className="font-medium text-muted-foreground text-xs hover:text-foreground"
						>
							Hide comments
						</button>
					</div>
				) : null}
			</div>
		</div>
	);
}

function PostCardInner({
	post,
	sessionUserId,
	commentsInitiallyOpen = false,
}: {
	post: PostRowType;
	sessionUserId: string | undefined;
	commentsInitiallyOpen?: boolean;
}) {
	const navigate = useNavigate();
	const qc = useQueryClient();
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [commentsOpen, setCommentsOpen] = useState(commentsInitiallyOpen);
	const isArticleLayout = commentsInitiallyOpen;
	const cardRef = useRef<HTMLDivElement>(null);
	usePostViewTracker(cardRef, post.id);

	const deletePostMutation = useMutation(
		orpc.post.delete.mutationOptions({
			onSuccess: async () => {
				removePostFromHomeFeedCache(qc, post.id);
				await invalidateHomePostFeed(qc);
				setDeleteDialogOpen(false);
			},
		}),
	);

	const setBookmarkMutation = useMutation(
		orpc.post.setBookmark.mutationOptions({
			onMutate: async (vars) => {
				const previous = post.myBookmarked;
				setPostBookmarkedInCaches(qc, post.id, vars.bookmarked);
				return { previous };
			},
			onError: (_err, _vars, ctx) => {
				const prev = ctx?.previous;
				setPostBookmarkedInCaches(qc, post.id, prev ?? false);
			},
			onSuccess: (_d, vars) => {
				toast.success(vars.bookmarked ? "Saved" : "Removed from saved");
			},
			onSettled: () => {
				void invalidateHomePostFeed(qc);
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

	const copyPostPermalink = () => {
		const origin =
			getSiteOrigin() ??
			(typeof window !== "undefined" ? window.location.origin : "");
		const url = `${origin}/p/${post.slug}/`;
		void navigator.clipboard.writeText(url).then(
			() => toast.success("Link copied"),
			() => toast.error("Could not copy link"),
		);
	};

	const openPost = () => {
		void navigate({
			to: "/p/$postSlug",
			params: { postSlug: post.slug },
		});
	};

	const AttachmentIcon =
		post.attachment == null
			? null
			: post.attachment.resource === "game"
				? Gamepad2
				: post.attachment.resource === "pack"
					? LibraryBig
					: BookOpen;

	const attachmentPrimaryLine =
		post.attachment == null
			? ""
			: post.attachment.resource === "game"
				? `Game ${post.attachment.gameCode ?? "?"}`
				: post.attachment.resource === "pack"
					? (post.attachment.packName ?? post.attachment.packSlug ?? "Pack")
					: (post.attachment.topicName ?? post.attachment.topicSlug ?? "Topic");

	const renderAttachment = () => {
		if (post.attachment == null) return null;
		if (!attachmentHref) {
			return (
				<div className="mt-3 border border-dashed px-3 py-2 text-muted-foreground text-xs">
					Attached{" "}
					<span className="font-medium text-foreground capitalize">
						{post.attachment.resource}
					</span>{" "}
					— link unavailable yet.
				</div>
			);
		}
		return (
			<Link
				to={attachmentHref.to}
				params={attachmentHref.params}
				className="group mt-3 flex items-center gap-3 border border-border bg-muted/20 px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.05]"
			>
				{AttachmentIcon ? (
					<span className="flex size-9 shrink-0 items-center justify-center border border-border bg-card text-muted-foreground transition-colors group-hover:border-primary/40 group-hover:text-primary">
						<AttachmentIcon className="size-4" strokeWidth={1.75} />
					</span>
				) : null}
				<div className="min-w-0 flex-1">
					<p className="text-[10px] text-muted-foreground uppercase tracking-wider">
						{post.attachment.resource}
					</p>
					<p className="truncate font-medium text-foreground text-sm">
						{attachmentPrimaryLine}
					</p>
				</div>
				<ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-foreground" />
			</Link>
		);
	};

	const bodyBlock = (opts: { feed: boolean }) => (
		<>
			{(post.body?.trim()?.length ?? 0) > 0 ? (
				<div
					className={cn(
						"whitespace-pre-wrap text-foreground leading-relaxed",
						opts.feed
							? "mt-1.5 text-sm"
							: "text-[16.5px] sm:text-[17px] sm:leading-[1.65]",
						opts.feed &&
							"-mx-2 cursor-pointer rounded-md px-2 py-1 outline-none transition-colors hover:bg-muted/40",
					)}
					{...(opts.feed
						? {
								role: "link" as const,
								tabIndex: 0,
								"aria-label": "Open post",
								onClick: (e: MouseEvent<HTMLDivElement>) => {
									if ((e.target as HTMLElement).closest("a, button")) {
										return;
									}
									openPost();
								},
								onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										openPost();
									}
								},
							}
						: {})}
				>
					<MentionRichText text={post.body ?? ""} mentions={post.mentions} />
				</div>
			) : null}
			{post.image ? (
				opts.feed ? (
					<Link
						to="/p/$postSlug"
						params={{ postSlug: post.slug }}
						className="mt-3 flex max-h-[24rem] min-h-[12rem] items-center justify-center overflow-hidden border border-border bg-muted/20"
					>
						<img
							src={post.image}
							alt=""
							className="max-h-[24rem] max-w-full object-contain"
						/>
					</Link>
				) : (
					<button
						type="button"
						onClick={() => {
							const src = post.image;
							if (src) {
								window.open(src, "_blank", "noopener,noreferrer");
							}
						}}
						className="mt-4 flex max-h-[30rem] min-h-[14rem] w-full cursor-zoom-in items-center justify-center overflow-hidden border border-border bg-muted/20 p-0"
					>
						<img
							src={post.image}
							alt=""
							className="max-h-[30rem] max-w-full object-contain"
						/>
					</button>
				)
			) : null}
			{renderAttachment()}
		</>
	);

	const engagementRow = (opts: { compact: boolean }) => (
		<div
			className={cn(
				"flex flex-wrap items-center gap-x-3 gap-y-2 border-border/70 border-t",
				opts.compact ? "mt-3 pt-3" : "mt-6 pt-4",
			)}
		>
			<div className="min-w-0 flex-1">
				<PostReactionBar post={post} sessionUserId={sessionUserId} />
			</div>
			<button
				type="button"
				onClick={() => {
					if (isArticleLayout) {
						const el = document.getElementById(`comments-${post.id}`);
						if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
					} else {
						setCommentsOpen((o) => !o);
					}
				}}
				className={cn(
					"inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2 text-muted-foreground text-xs transition-colors hover:text-foreground",
					!isArticleLayout && commentsOpen && "text-foreground",
				)}
				aria-expanded={!isArticleLayout ? commentsOpen : undefined}
				aria-label={
					isArticleLayout
						? `${post.totalComments} comments`
						: commentsOpen
							? "Hide comments"
							: "Show comments"
				}
			>
				<MessageCircleIcon className="size-4 shrink-0" strokeWidth={1.75} />
				<span className="font-medium tabular-nums">{post.totalComments}</span>
				{!isArticleLayout ? (
					<ChevronDownIcon
						className={cn(
							"size-3.5 shrink-0 transition-transform",
							commentsOpen && "rotate-180",
						)}
					/>
				) : null}
			</button>
			<span
				className="inline-flex h-8 shrink-0 items-center gap-1.5 px-1 text-muted-foreground text-xs"
				title={`${post.totalViews.toLocaleString()} ${post.totalViews === 1 ? "view" : "views"}`}
				aria-label={`${post.totalViews} views`}
			>
				<EyeIcon className="size-4 shrink-0" strokeWidth={1.75} />
				<span className="font-medium tabular-nums">
					{post.totalViews.toLocaleString()}
				</span>
			</span>
			{sessionUserId ? (
				<button
					type="button"
					onClick={() =>
						setBookmarkMutation.mutate({
							postId: post.id,
							bookmarked: !(post.myBookmarked ?? false),
						})
					}
					disabled={setBookmarkMutation.isPending}
					aria-label={post.myBookmarked ? "Remove from saved" : "Save post"}
					className={cn(
						"inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:opacity-60",
						post.myBookmarked && "text-primary hover:text-primary",
					)}
				>
					<Bookmark
						className={cn(
							"size-4",
							post.myBookmarked && "fill-current text-primary",
						)}
						strokeWidth={1.75}
					/>
				</button>
			) : null}
		</div>
	);

	const authorMeta = (opts: { article: boolean }) => (
		<div className="flex min-w-0 items-baseline gap-1.5">
			<Link
				className={cn(
					"truncate font-semibold text-foreground hover:underline",
					opts.article ? "text-base sm:text-lg" : "text-sm",
				)}
				params={{ username: post.author.username }}
				to="/u/$username"
			>
				{post.author.name ?? post.author.username}
			</Link>
			<span
				className={cn(
					"truncate text-muted-foreground",
					opts.article ? "text-sm" : "text-xs",
				)}
			>
				@{post.author.username}
			</span>
			<span aria-hidden className="text-muted-foreground/50">
				·
			</span>
			<time
				className={cn(
					"shrink-0 text-muted-foreground tabular-nums",
					opts.article ? "text-xs sm:text-sm" : "text-xs",
				)}
				title={new Date(post.createdAt).toLocaleString()}
			>
				{formatDistanceToNow(new Date(post.createdAt), {
					addSuffix: true,
				})}
			</time>
		</div>
	);

	const actionMenu = (
		<DropdownMenu>
			<DropdownMenuTrigger className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/35">
				<span className="sr-only">Post actions</span>
				<MoreHorizontalIcon className="size-4" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem
					onClick={() => {
						copyPostPermalink();
					}}
				>
					<Link2Icon className="size-4" />
					Copy link
				</DropdownMenuItem>
				{isAuthor ? (
					<DropdownMenuItem
						onClick={() => {
							void navigate({
								to: "/p/$postSlug/insights",
								params: { postSlug: post.slug },
							});
						}}
					>
						<BarChart3Icon className="size-4" />
						Insights
					</DropdownMenuItem>
				) : null}
				{isAuthor ? (
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
				) : null}
			</DropdownMenuContent>
		</DropdownMenu>
	);

	return (
		<>
			<Card
				ref={cardRef}
				className={cn(
					"overflow-hidden border bg-card",
					isArticleLayout ? "shadow-sm" : "p-3.5 sm:p-4",
				)}
			>
				{isArticleLayout ? (
					<>
						<header className="border-border border-b bg-gradient-to-b from-muted/40 to-transparent px-5 py-5 sm:px-7 sm:py-6">
							<div className="flex items-start gap-4">
								<Avatar className="size-12 shrink-0 sm:size-14">
									<AvatarImage src={post.author.image ?? undefined} alt="" />
									<AvatarFallback className="font-semibold text-sm">
										{initials}
									</AvatarFallback>
								</Avatar>
								<div className="min-w-0 flex-1">
									{authorMeta({ article: true })}
								</div>
								{actionMenu}
							</div>
						</header>
						<div
							id={`comments-${post.id}`}
							className="px-5 py-6 sm:px-7 sm:py-8"
						>
							{bodyBlock({ feed: false })}
							{engagementRow({ compact: false })}
							<PostCommentsSection
								post={post}
								sessionUserId={sessionUserId}
								open={commentsOpen}
								onOpenChange={setCommentsOpen}
								variant="inline"
							/>
						</div>
					</>
				) : (
					<div className="flex items-start gap-3">
						<Avatar className="size-10 shrink-0 sm:size-11">
							<AvatarImage src={post.author.image ?? undefined} alt="" />
							<AvatarFallback className="font-medium text-xs">
								{initials}
							</AvatarFallback>
						</Avatar>
						<div className="min-w-0 flex-1">
							<div className="flex items-start gap-2">
								<div className="min-w-0 flex-1">
									{authorMeta({ article: false })}
								</div>
								{actionMenu}
							</div>
							<div className="mt-1.5">
								{bodyBlock({ feed: true })}
								{engagementRow({ compact: true })}
								<PostCommentsSection
									post={post}
									sessionUserId={sessionUserId}
									open={commentsOpen}
									onOpenChange={setCommentsOpen}
									variant="accordion"
								/>
							</div>
						</div>
					</div>
				)}
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

export function PostCard(
	props: Parameters<typeof PostCardInner>[0] & {
		commentsInitiallyOpen?: boolean;
	},
) {
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);
	if (!mounted) {
		return (
			<Card className="overflow-hidden border bg-muted/20">
				<div className="flex items-start gap-3 p-4">
					<div className="size-10 shrink-0 animate-pulse rounded-full bg-muted/60" />
					<div className="flex-1 space-y-2">
						<div className="h-3.5 w-2/5 animate-pulse bg-muted/60" />
						<div className="h-3 w-3/4 animate-pulse bg-muted/40" />
						<div className="h-3 w-1/2 animate-pulse bg-muted/40" />
					</div>
				</div>
			</Card>
		);
	}
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
	homeFeed: ListPostsFeedType;
}

export function HomeMixedFeed({
	mode,
	composerSlot,
	slots,
	sessionUserId,
	homeFeed,
}: HomeMixedFeedProps) {
	const {
		data,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isLoading,
		isError,
	} = useInfiniteQuery({
		...homePostListInfiniteOptions(mode === "signedIn" ? homeFeed : "everyone"),
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
				<div className="flex flex-col gap-4">
					{posts.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							{mode === "signedIn" && homeFeed === "following"
								? "No posts from people you follow yet."
								: "No posts yet — be the first."}
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
