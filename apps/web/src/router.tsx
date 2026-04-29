import { QueryClientProvider } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import type { CreateTopicPayloadType } from "@xamsa/schemas/modules/topic";
import { Spinner } from "@xamsa/ui/components/spinner";

import "./index.css";
import { routeTree } from "./routeTree.gen";
import { orpc, queryClient } from "./utils/orpc";

export const getRouter = () => {
	const router = createTanStackRouter({
		routeTree,
		scrollRestoration: true,
		defaultPreloadStaleTime: 0,
		context: { orpc, queryClient, session: null },
		defaultPendingComponent: () => (
			<div className="flex h-screen items-center justify-center">
				<Spinner />
			</div>
		),
		defaultNotFoundComponent: () => <div>Not Found</div>,
		Wrap: ({ children }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		),
	});
	return router;
};

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}

	interface HistoryState {
		prefilledTopics?: CreateTopicPayloadType[];
		importedViaStructuredImport?: boolean;
		prefilledTsualPackageId?: number;
		prefilledTsualSourceName?: string;
	}
}
