import type { RouterClient } from "@orpc/server";
import { packRouter } from "./modules/pack/router";
import { packRatingRouter } from "./modules/pack-rating/router";
import { questionRouter } from "./modules/question/router";
import { topicRouter } from "./modules/topic/router";

export const appRouter = {
	pack: packRouter,
	packRating: packRatingRouter,
	topic: topicRouter,
	question: questionRouter,
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
