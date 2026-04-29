import {
	createFileRoute,
	notFound,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { Button } from "@xamsa/ui/components/button";
import { Download } from "lucide-react";
import { useState } from "react";
import { CreateTopicForm } from "@/components/create-topic-form";
import {
	PacksBreadcrumb,
	PacksSubpageContainer,
	PacksSubpageHeader,
} from "@/components/packs";
import { TopicImportDialog } from "@/components/topic-import-dialog";
import { getUser } from "@/functions/get-user";
import { authClient } from "@/lib/auth-client";
import { pageSeo } from "@/lib/seo";
import { orpc } from "@/utils/orpc";

function isModeratorOrAdmin(
	user: { role?: string } | undefined,
): user is { role: "moderator" | "admin" } {
	const r = user?.role;
	return r === "moderator" || r === "admin";
}

export const Route = createFileRoute("/packs/$packSlug/topics/new/")({
	component: RouteComponent,
	beforeLoad: async () => {
		const session = await getUser();
		return { session };
	},
	loader: async ({ context, params }) => {
		if (!context.session) {
			throw redirect({
				to: "/auth/login",
				search: {
					redirect_url: `/packs/${params.packSlug}/topics/new`,
				},
			});
		}
		const pack = await orpc.pack.findOne
			.call({ slug: params.packSlug })
			.catch(() => {
				throw notFound();
			});
		if (!pack.isAuthor) {
			throw redirect({ to: "/packs" });
		}
		if (pack.status !== "draft") {
			throw redirect({
				to: "/packs/$packSlug",
				params: { packSlug: params.packSlug },
			});
		}
		return { pack };
	},
	head: ({ params }) =>
		pageSeo({
			title: "Create a topic",
			description:
				"Add a new topic to your pack on Xamsa. Each topic holds five questions that appear in order during live games.",
			path: `/packs/${params.packSlug}/topics/new/`,
			noIndex: true,
			keywords:
				"Xamsa, create topic, quiz topic, five questions, pack editor, trivia builder",
		}),
});

function RouteComponent() {
	const { pack } = Route.useLoaderData();
	const navigate = useNavigate();
	const { data: session } = authClient.useSession();
	const canImport3sual = isModeratorOrAdmin(session?.user);
	const [importOpen, setImportOpen] = useState(false);

	return (
		<PacksSubpageContainer>
			<PacksBreadcrumb
				items={[
					{ label: "Packs", to: "/packs" },
					{
						label: pack.name,
						to: "/packs/$packSlug",
						params: { packSlug: pack.slug },
					},
					{
						label: "Topics",
						to: "/packs/$packSlug/topics",
						params: { packSlug: pack.slug },
					},
					{ label: "New topic", current: true },
				]}
			/>
			<PacksSubpageHeader
				actions={
					<Button
						size="sm"
						type="button"
						variant="secondary"
						onClick={() => setImportOpen(true)}
					>
						<Download className="mr-1.5 size-4" />
						Import
					</Button>
				}
				description="Each topic includes five questions shown in order during live games. You can draft with AI, import many topics (opens bulk create), or edit before saving."
				eyebrow="Pack editor"
				title="Add a topic"
			/>
			<TopicImportDialog
				canImport3sual={canImport3sual}
				open={importOpen}
				onOpenChange={setImportOpen}
				onImported={(payload) => {
					const is3sual = payload.meta?.tsualPackageId != null;
					if (is3sual) {
						navigate({
							to: "/packs/$packSlug/topics/bulk",
							params: { packSlug: pack.slug },
							state: {
								prefilledTopics: payload.topics,
								prefilledTsualPackageId: payload.meta?.tsualPackageId,
								prefilledTsualSourceName: payload.meta?.sourceLabel,
							},
						});
					} else {
						navigate({
							to: "/packs/$packSlug/topics/bulk",
							params: { packSlug: pack.slug },
							state: {
								prefilledTopics: payload.topics,
								importedViaStructuredImport: true,
							},
						});
					}
				}}
			/>
			<CreateTopicForm packSlug={pack.slug} />
		</PacksSubpageContainer>
	);
}
