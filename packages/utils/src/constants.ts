import type { env } from "@xamsa/env/server";

export const QUESTIONS_PER_TOPIC = 5;

export const MIN_TOPICS_PER_PACK_TO_PUBLISH = 5;

/** Minimum topics when the host submits an explicit subset (`topicPackOrders`). */
export const MIN_TOPICS_PER_GAME_SUBSET = 5;
export const MAX_TOPICS_PER_PACK = 100;

export const MIN_PLAYERS_PER_GAME_TO_START = 2;
export const MAX_PLAYERS_PER_GAME = 16;

export const DOMAINS = {
	development: {
		server: ["http://localhost:3000"],
		clients: ["http://localhost:3000", "http://localhost:3001"],
	},
	test: {
		server: ["http://localhost:3000"],
		clients: ["http://localhost:3000", "http://localhost:3001"],
	},
	production: {
		server: ["https://api.xamsa.site"],
		clients: ["https://www.xamsa.site", "https://xamsa.site"],
	},
} as const satisfies Record<
	NonNullable<typeof env.NODE_ENV>,
	Record<"server" | "clients", readonly string[]>
>;
