import { useMutation } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	notFound,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@xamsa/ui/components/alert";
import { Button } from "@xamsa/ui/components/button";
import {
	Frame,
	FrameFooter,
	FrameHeader,
	FramePanel,
	FrameTitle,
} from "@xamsa/ui/components/frame";
import { ArrowLeftIcon, LayersIcon, PlayIcon, UsersIcon } from "lucide-react";
import { toast } from "sonner";
import { LoadingButton } from "@/components/loading-button";
import { toastOrpcMutationFailure } from "@/lib/orpc-email-verification-error";
import { pageSeo, truncateMeta } from "@/lib/seo";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/play/new/$packSlug/")({
	component: RouteComponent,

	loader: async ({ params, context }) => {
		if (!context.session) {
			throw redirect({
				to: "/auth/login",
				search: {
					redirect_url: `/play/new/${params.packSlug}`,
				},
			});
		}

		try {
			const pack = await orpc.pack.findOne.call({ slug: params.packSlug });

			const canHostThisPack =
				pack.status === "published" &&
				(pack.isAuthor ||
					(pack.allowOthersHost === true && pack.visibility === "public"));

			if (!canHostThisPack) {
				throw new Error("You cannot host a game with this pack");
			}

			return pack;
		} catch {
			throw notFound();
		}
	},

	head: ({ loaderData }) => {
		if (!loaderData) {
			return pageSeo({
				title: "Host a game",
				description:
					"Create a live Xamsa session from one of your published packs, get a room code, and invite players to join.",
				path: "/play/new/",
				noIndex: true,
			});
		}
		const packDesc = loaderData.description?.trim();
		const desc = `Start hosting a live quiz with your pack “${loaderData.name}” on Xamsa. Create a game room, share the code, and play in real time with buzzers.${packDesc ? ` ${truncateMeta(packDesc, 100)}` : ""}`;
		return pageSeo({
			title: `Host · ${loaderData.name}`,
			description: desc,
			path: `/play/new/${loaderData.slug}/`,
			ogTitle: `Host: ${loaderData.name}`,
			ogDescription: truncateMeta(desc),
			keywords: `Xamsa, host quiz, live game, ${loaderData.name}, multiplayer trivia`,
			noIndex: true,
		});
	},
});

function RouteComponent() {
	const { packSlug } = Route.useParams();
	const pack = Route.useLoaderData();
	const navigate = useNavigate();

	const { mutate: createGame, isPending } = useMutation({
		...orpc.game.create.mutationOptions(),
		onSuccess({ code }) {
			toast.success("Game created");
			navigate({
				to: "/g/$code",
				params: { code },
			});
		},
		onError(error) {
			toastOrpcMutationFailure(
				error,
				"Failed to create game. Please try again.",
			);
		},
	});

	const handleStart = () => {
		createGame({ pack: packSlug });
	};

	return (
		<div className="container mx-auto max-w-2xl space-y-6 py-10">
			<Button variant="ghost" size="sm" render={<Link to="/play" />}>
				<ArrowLeftIcon />
				Choose a different pack
			</Button>

			<h1 className="font-bold text-2xl tracking-tight">Host a new game</h1>

			<Frame>
				<FrameHeader>
					<FrameTitle>Ready to host?</FrameTitle>
				</FrameHeader>

				<FramePanel className="space-y-5">
					<div className="space-y-2">
						<p className="text-muted-foreground text-xs uppercase tracking-wide">
							Pack
						</p>
						<h2 className="font-bold text-xl">{pack.name}</h2>
						{pack.description && (
							<p className="text-muted-foreground text-sm">
								{pack.description}
							</p>
						)}
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div className="flex items-center gap-3 rounded-xl border border-border p-3">
							<div className="flex size-9 items-center justify-center rounded-lg bg-muted">
								<LayersIcon className="size-4 text-muted-foreground" />
							</div>
							<div className="min-w-0">
								<p className="text-muted-foreground text-xs">Topics</p>
								<p className="font-semibold">{pack._count.topics}</p>
							</div>
						</div>
						<div className="flex items-center gap-3 rounded-xl border border-border p-3">
							<div className="flex size-9 items-center justify-center rounded-lg bg-muted">
								<UsersIcon className="size-4 text-muted-foreground" />
							</div>
							<div className="min-w-0">
								<p className="text-muted-foreground text-xs">Previous plays</p>
								<p className="font-semibold">
									{pack.totalPlays.toLocaleString()}
								</p>
							</div>
						</div>
					</div>

					<Alert>
						<AlertTitle>How it works</AlertTitle>
						<AlertDescription>
							A game code will be generated. Share the code or invite link with
							your players. You'll host the game from your device while players
							join and buzz in from theirs.
						</AlertDescription>
					</Alert>
				</FramePanel>

				<FrameFooter>
					<div className="flex justify-end">
						<LoadingButton
							onClick={handleStart}
							isLoading={isPending}
							loadingText="Creating game..."
						>
							<PlayIcon />
							Create game
						</LoadingButton>
					</div>
				</FrameFooter>
			</Frame>
		</div>
	);
}
