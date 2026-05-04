import type { QueryKey } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import type { CommentRowType } from "@xamsa/schemas/modules/comment";

import { ReactionBar } from "@/components/reactions/reaction-bar";

/**
 * Comment-side reaction strip. Mirrors `PostReactionBar` but in the
 * compact density that fits inside a comment row, and invalidates the
 * caller's thread-list infinite query so the new breakdown shows up
 * after the mutation settles.
 */
export function CommentReactionBar({
	comment,
	sessionUserId,
	threadQueryKey,
	loginRedirect,
}: {
	comment: Pick<
		CommentRowType,
		"id" | "myReactionType" | "totalReactions" | "reactionsByType"
	>;
	sessionUserId: string | undefined;
	/** Pass the infinite-query key for the thread list so the new totals refetch. */
	threadQueryKey?: QueryKey;
	loginRedirect?: string;
}) {
	const qc = useQueryClient();

	return (
		<ReactionBar
			density="comment"
			target={{ kind: "comment", id: comment.id }}
			my={comment.myReactionType ?? undefined}
			total={comment.totalReactions}
			byType={comment.reactionsByType}
			sessionUserId={sessionUserId}
			subjectLabel="comment"
			loginRedirect={loginRedirect}
			onSettled={async () => {
				if (threadQueryKey) {
					await qc.invalidateQueries({ queryKey: threadQueryKey });
				}
			}}
		/>
	);
}
