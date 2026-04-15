import type { RouterClient } from "@orpc/server";
import { packRouter } from "./modules/pack/router";
import { topicRouter } from "./modules/topic/router";

export const appRouter = {
	pack: packRouter,
	topic: topicRouter,
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
