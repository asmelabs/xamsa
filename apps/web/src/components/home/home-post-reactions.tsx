import { useQueryClient } from "@tanstack/react-query";
import type { PostRowType } from "@xamsa/schemas/modules/post";

import { ReactionBar } from "@/components/reactions/reaction-bar";
import { invalidateHomePostFeed } from "@/lib/home-post-feed-query";

export function PostReactionBar({
	post,
	sessionUserId,
}: {
	post: PostRowType;
	sessionUserId: string | undefined;
}) {
	const qc = useQueryClient();

	return (
		<ReactionBar
			target={{ kind: "post", id: post.id }}
			my={post.myReactionType ?? undefined}
			total={post.totalReactions}
			byType={post.reactionsByType}
			sessionUserId={sessionUserId}
			onSettled={() => invalidateHomePostFeed(qc)}
			subjectLabel="post"
		/>
	);
}
