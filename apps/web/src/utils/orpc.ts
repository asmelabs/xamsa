import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import type { appRouter } from "@xamsa/api/router";
import { env } from "@xamsa/env/web";
import { toast } from "sonner";
import { tryToastOrpcEmailVerificationError } from "@/lib/orpc-email-verification-error";

export const queryClient = new QueryClient({
	queryCache: new QueryCache({
		onError: (error, query) => {
			if (tryToastOrpcEmailVerificationError(error)) {
				return;
			}
			toast.error(`Error: ${error.message}`, {
				action: {
					label: "retry",
					onClick: query.invalidate,
				},
			});
		},
	}),
});

const link = new RPCLink({
	url: `${env.VITE_PUBLIC_SERVER_URL}/rpc`,
	fetch(url, options) {
		return fetch(url, {
			...options,
			credentials: "include",
		});
	},
});

const getORPCClient = () =>
	createORPCClient(link) as RouterClient<typeof appRouter>;

export const client: RouterClient<typeof appRouter> = getORPCClient();

export const orpc = createTanstackQueryUtils(client);
