import { sentinelClient } from "@better-auth/infra/client";
import type { auth } from "@xamsa/auth";
import { env } from "@xamsa/env/web";
import {
	inferAdditionalFields,
	lastLoginMethodClient,
	twoFactorClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/** Align with `BETTER_AUTH_URL`; when unset (same-origin dev), omit so the client defaults to `window.origin`. */
const betterAuthExplicitOrigin =
	env.VITE_PUBLIC_BETTER_AUTH_URL ?? env.VITE_PUBLIC_SITE_URL;

export const authClient = createAuthClient({
	...(betterAuthExplicitOrigin
		? { baseURL: betterAuthExplicitOrigin.replace(/\/$/, "") }
		: {}),
	plugins: [
		inferAdditionalFields<typeof auth>(),
		sentinelClient(),
		lastLoginMethodClient(),
		twoFactorClient(),
	],
});
