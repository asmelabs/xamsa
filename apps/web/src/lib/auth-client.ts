import { sentinelClient } from "@better-auth/infra/client";
import type { auth } from "@xamsa/auth";
import { env } from "@xamsa/env/web";
import {
	inferAdditionalFields,
	lastLoginMethodClient,
	twoFactorClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/**
 * Only override when `/api/auth` is reached from a **different** origin than the page
 * (e.g. SPA on :3000 calling API on :3001). Never fall back to `VITE_PUBLIC_SITE_URL`:
 * that is often the canonical host (apex vs `www`), so using it here forces cross-origin
 * calls and CORS failures (e.g. sign-out) for users on the other hostname.
 */
const betterAuthOrigin = env.VITE_PUBLIC_BETTER_AUTH_URL?.replace(/\/$/, "");

export const authClient = createAuthClient({
	...(betterAuthOrigin ? { baseURL: betterAuthOrigin } : {}),
	plugins: [
		inferAdditionalFields<typeof auth>(),
		sentinelClient(),
		lastLoginMethodClient(),
		twoFactorClient(),
	],
});
