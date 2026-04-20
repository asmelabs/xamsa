import { createEnv } from "@t3-oss/env-core";
import z from "zod";

export const env = createEnv({
	clientPrefix: "VITE_",
	client: {
		VITE_PUBLIC_POSTHOG_PROJECT_TOKEN: z.string().optional(),
		VITE_PUBLIC_POSTHOG_HOST: z.string().optional(),
	},
	// biome-ignore lint/suspicious/noExplicitAny: we need to use any for the runtime environment
	runtimeEnv: (import.meta as any).env,
	emptyStringAsUndefined: true,
});
