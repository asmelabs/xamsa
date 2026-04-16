// apps/web/src/server/ably.ts

import { createServerFn } from "@tanstack/react-start";
import { createTokenRequest } from "@xamsa/ably/server";
import { authMiddleware } from "@/middleware/auth";

export const getAblyToken = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async ({ context }) => {
		if (!context.session?.user) {
			throw new Error("Unauthorized");
		}

		return createTokenRequest(context.session.user.id);
	});
