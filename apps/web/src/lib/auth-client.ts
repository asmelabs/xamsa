import { sentinelClient } from "@better-auth/infra/client";
import type { auth } from "@xamsa/auth";
import { env } from "@xamsa/env/web";
import {
	inferAdditionalFields,
	lastLoginMethodClient,
	twoFactorClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	baseURL: env.VITE_PUBLIC_SERVER_URL,
	plugins: [
		inferAdditionalFields<typeof auth>(),
		sentinelClient(),
		lastLoginMethodClient(),
		twoFactorClient(),
	],
});
