import {
	useInfiniteQuery,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { CommentThreadNodeType } from "@xamsa/schemas/modules/comment";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@xamsa/ui/components/avatar";
import { Button } from "@xamsa/ui/components/button";
import { Spinner } from "@xamsa/ui/components/spinner";
import { cn } from "@xamsa/ui/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ChevronRightIcon, SendIcon } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";

import { MentionRichText } from "@/components/home/mention-rich-text";
import { MentionTextarea } from "@/components/home/mention-textarea";
import { orpc } from "@/utils/orpc";

const COMMENT_PAGE_LIMIT = 8;

function DiscussionCommentNode({
	node,
	sessionUserId,
	replyToId,
	onReply,
	onClearReply,
	collapsedIds,
	onToggleCollapsed,
	createPending,
}: {
	node: CommentThreadNodeType;
	sessionUserId: string | undefined;
	replyToId: string | null;
	onReply: (id: string) => void;
	onClearReply: () => void;
	collapsedIds: Set<string>;
	onToggleCollapsed: (id: string) => void;
	createPending: boolean;
}) {
	const hasReplies = node.replies.length > 0;
	const branchCollapsed = collapsedIds.has(node.id);
	const canReply = node.depth < 3;

	return (
		<div id={`d-${node.id}`}>
			<div className="flex gap-3 py-2.5">
				<Avatar className="size-8 shrink-0">
					<AvatarImage src={node.user.image ?? undefined} />
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
					<div className="mt-2 flex items-center gap-3">
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
			{hasReplies && !branchCollapsed ? (
				<div className="ml-4 border-border/60 border-l pl-4">
					{node.replies.map((ch) => (
						<DiscussionCommentNode
							key={ch.id}
							node={ch}
							sessionUserId={sessionUserId}
							replyToId={replyToId}
							onReply={onReply}
							onClearReply={onClearReply}
							collapsedIds={collapsedIds}
							onToggleCollapsed={onToggleCollapsed}
							createPending={createPending}
						/>
					))}
				</div>
			) : null}
		</div>
	);
}

type PackTopicDiscussionProps = {
	packId?: string;
	topicId?: string;
	questionId?: string;
	sessionUserId: string | undefined;
	loginRedirect: string;
	title?: ReactNode;
};

export function PackTopicDiscussionSection({
	packId,
	topicId,
	questionId,
	sessionUserId,
	loginRedirect,
	title = "Discussion",
}: PackTopicDiscussionProps) {
	const qc = useQueryClient();
	const [draft, setDraft] = useState("");
	const [replyToId, setReplyToId] = useState<string | null>(null);
	const [collapsedIds, setCollapsedIds] = useState<Set<string>>(
		() => new Set(),
	);

	const threadListOpts = useMemo(() => {
		if (packId != null) {
			return orpc.comment.listThreadsByPack.infiniteOptions({
				input: (cursor: string | undefined) => ({
					packId,
					limit: COMMENT_PAGE_LIMIT,
					...(cursor ? { cursor } : {}),
				}),
				getNextPageParam: (lastPage) =>
					lastPage.metadata.nextCursor ?? undefined,
				initialPageParam: undefined as string | undefined,
			});
		}
		if (topicId != null) {
			return orpc.comment.listThreadsByTopic.infiniteOptions({
				input: (cursor: string | undefined) => ({
					topicId,
					limit: COMMENT_PAGE_LIMIT,
					...(cursor ? { cursor } : {}),
				}),
				getNextPageParam: (lastPage) =>
					lastPage.metadata.nextCursor ?? undefined,
				initialPageParam: undefined as string | undefined,
			});
		}
		if (!questionId) {
			throw new Error(
				"PackTopicDiscussionSection requires packId, topicId, or questionId",
			);
		}
		return orpc.comment.listThreadsByQuestion.infiniteOptions({
			input: (cursor: string | undefined) => ({
				questionId,
				limit: COMMENT_PAGE_LIMIT,
				...(cursor ? { cursor } : {}),
			}),
			getNextPageParam: (lastPage) => lastPage.metadata.nextCursor ?? undefined,
			initialPageParam: undefined as string | undefined,
		});
	}, [packId, topicId, questionId]);

	const list = useInfiniteQuery({
		...threadListOpts,
		enabled: packId != null || topicId != null || questionId != null,
	});

	const roots = list.data?.pages.flatMap((p) => p.roots) ?? [];

	const create = useMutation(
		orpc.comment.create.mutationOptions({
			onSuccess: () => {
				setDraft("");
				setReplyToId(null);
			},
			onSettled: async () => {
				await qc.invalidateQueries({
					queryKey: threadListOpts.queryKey,
				});
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

	const submit = () => {
		const body = draft.trim();
		if (body.length === 0) return;
		const payload = replyToId ? { parentId: replyToId, body } : { body };
		if (packId) {
			create.mutate({ ...payload, packId });
		} else if (topicId) {
			create.mutate({ ...payload, topicId });
		} else if (questionId) {
			create.mutate({ ...payload, questionId });
		}
	};

	return (
		<div className="space-y-5">
			<div className="max-w-xl">
				<h2 className="font-semibold text-foreground text-lg tracking-tight">
					{title}
				</h2>
				<p className="mt-1 text-muted-foreground text-sm leading-relaxed">
					Questions, shout-outs, and tips—start a thread anytime.
				</p>
			</div>
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
								placeholder="Write something…"
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
							className="font-medium underline underline-offset-2"
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
						<div className="flex justify-center py-6">
							<Spinner />
						</div>
					) : roots.length === 0 ? (
						<p className="py-6 text-center text-muted-foreground text-sm">
							No messages yet. Start the thread.
						</p>
					) : (
						<div className="space-y-1">
							{roots.map((node) => (
								<DiscussionCommentNode
									key={node.id}
									node={node}
									sessionUserId={sessionUserId}
									replyToId={replyToId}
									onReply={setReplyToId}
									onClearReply={() => setReplyToId(null)}
									collapsedIds={collapsedIds}
									onToggleCollapsed={toggleCollapsed}
									createPending={create.isPending}
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
			</div>
		</div>
	);
}
