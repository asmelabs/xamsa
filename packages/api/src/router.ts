import type { RouterClient } from "@orpc/server";
import { adminRouter } from "./modules/admin/router";
import { badgeRouter } from "./modules/badge/router";
import { clickRouter } from "./modules/click/router";
import { commentRouter } from "./modules/comment/router";
import { gameRouter } from "./modules/game/router";
import { notificationRouter } from "./modules/notification/router";
import { packRouter } from "./modules/pack/router";
import { packRatingRouter } from "./modules/pack-rating/router";
import { playerRouter } from "./modules/player/router";
import { postRouter } from "./modules/post/router";
import { questionRouter } from "./modules/question/router";
import { reactionRouter } from "./modules/reaction/router";
import { topicRouter } from "./modules/topic/router";
import { tsualRouter } from "./modules/tsual/router";
import { userRouter } from "./modules/user/router";

export const appRouter = {
	admin: adminRouter,
	badge: badgeRouter,
	user: userRouter,
	pack: packRouter,
	packRating: packRatingRouter,
	game: gameRouter,
	topic: topicRouter,
	question: questionRouter,
	player: playerRouter,
	click: clickRouter,
	comment: commentRouter,
	post: postRouter,
	reaction: reactionRouter,
	tsual: tsualRouter,
	notification: notificationRouter,
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
