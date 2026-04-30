import { sentinelClient } from "@better-auth/infra/client";
import type { auth } from "@xamsa/auth";
import {
	inferAdditionalFields,
	lastLoginMethodClient,
	twoFactorClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	plugins: [
		inferAdditionalFields<typeof auth>(),
		sentinelClient(),
		lastLoginMethodClient(),
		twoFactorClient(),
	],
});
