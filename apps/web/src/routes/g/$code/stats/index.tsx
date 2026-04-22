import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CompletedGameStatsPage } from "@/components/completed-game-stats-page";
import { pageSeo } from "@/lib/seo";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/g/$code/stats/")({
	component: RouteComponent,
	loader: async ({ params, context }) => {
		await context.queryClient.prefetchQuery(
			orpc.game.getCompletedRecap.queryOptions({
				input: { code: params.code },
			}),
		);
		return { code: params.code };
	},
	head: ({ loaderData }) =>
		pageSeo({
			title: "Game stats",
			description:
				"Detailed recap for a completed Xamsa game: scores, rounds, questions, and every buzz.",
			path: `/g/${loaderData?.code ?? ""}/stats/`,
			noIndex: true,
			keywords: "Xamsa, game stats, quiz recap, buzzer",
		}),
});

function RouteComponent() {
	const { code } = Route.useLoaderData();

	useQuery(orpc.game.getCompletedRecap.queryOptions({ input: { code } }));

	return <CompletedGameStatsPage code={code} />;
}
