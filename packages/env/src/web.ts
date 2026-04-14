import { createEnv } from "@t3-oss/env-core";

export const env = createEnv({
	clientPrefix: "VITE_",
	client: {},
	// biome-ignore lint/suspicious/noExplicitAny: we need to use any for the runtime environment
	runtimeEnv: (import.meta as any).env,
	emptyStringAsUndefined: true,
});
