import { useMutation } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	notFound,
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
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/play/new/$packSlug/")({
	component: RouteComponent,

	loader: async ({ params }) => {
		try {
			const pack = await orpc.pack.findOne.call({ slug: params.packSlug });

			if (!pack.isAuthor) {
				throw new Error("You can only host games from your own packs");
			}

			if (pack.status !== "published") {
				throw new Error("Only published packs can be played");
			}

			return pack;
		} catch {
			throw notFound();
		}
	},

	head: ({ loaderData }) => ({
		meta: [
			{
				title: loaderData
					? `Start game: ${loaderData.name} — Xamsa`
					: "Start game — Xamsa",
			},
		],
	}),
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
			toast.error(error.message || "Failed to create game. Please try again.");
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
