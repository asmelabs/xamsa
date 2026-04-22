import { createFileRoute, redirect } from "@tanstack/react-router";
import { CreatePackForm } from "@/components/create-pack-form";
import {
	PacksBreadcrumb,
	PacksSubpageContainer,
	PacksSubpageHeader,
} from "@/components/packs";
import { getUser } from "@/functions/get-user";
import { pageSeo } from "@/lib/seo";

export const Route = createFileRoute("/packs/new/")({
	component: RouteComponent,
	beforeLoad: async () => {
		const session = await getUser();
		return { session };
	},
	loader: async ({ context }) => {
		if (!context.session) {
			throw redirect({
				to: "/auth/login",
				search: {
					redirect_url: "/packs/new",
				},
			});
		}

		return context.session.user;
	},
	head: () =>
		pageSeo({
			title: "Create a pack",
			description:
				"Start a new question pack on Xamsa: add topics, write five questions each, publish when ready, and host live buzzer games with friends.",
			path: "/packs/new/",
			noIndex: true,
			keywords:
				"Xamsa, create pack, quiz builder, trivia deck, host a quiz, question pack",
		}),
});

function RouteComponent() {
	return (
		<PacksSubpageContainer>
			<PacksBreadcrumb
				items={[
					{ label: "Packs", to: "/packs" },
					{ label: "New pack", current: true },
				]}
			/>
			<PacksSubpageHeader
				description="Name your pack, set language and visibility, then add topics with five questions each. You can import from 3sual when eligible."
				eyebrow="Pack builder"
				title="Create a pack"
			/>
			<CreatePackForm />
		</PacksSubpageContainer>
	);
}
