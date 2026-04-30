import { useMutation } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { Button } from "@xamsa/ui/components/button";
import {
	Frame,
	FrameHeader,
	FramePanel,
	FrameTitle,
} from "@xamsa/ui/components/frame";
import { Spinner } from "@xamsa/ui/components/spinner";
import { AlertCircleIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { JoinGameForm } from "@/components/join-game-form";
import { getUser } from "@/functions/get-user";
import { toastOrpcMutationFailure } from "@/lib/orpc-email-verification-error";
import { pageSeo } from "@/lib/seo";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/join/$code/")({
	component: RouteComponent,

	beforeLoad: async ({ params }) => {
		const session = await getUser();
		if (!session?.user) {
			const trimmed = params.code.trim();
			throw redirect({
				to: "/auth/login",
				search: {
					redirect_url: `/join/${encodeURIComponent(trimmed)}`,
				},
			});
		}
	},

	head: () =>
		pageSeo({
			title: "Join game",
			description:
				"Opening your invite link — you’ll join this live game automatically when eligible.",
			path: "/join/",
			noIndex: true,
			keywords: "Xamsa, join game, invite link",
		}),
});

function RouteComponent() {
	const { code: rawParam } = Route.useParams();
	const navigate = useNavigate();
	const code = rawParam.trim().toUpperCase();

	const [phase, setPhase] = useState<"loading" | "fallback">("loading");
	const completedToast = useRef(false);

	const { mutate: joinGame } = useMutation({
		...orpc.player.join.mutationOptions(),
		onSuccess(_, variables) {
			if (!completedToast.current) {
				completedToast.current = true;
				toast.success("Joined game");
			}
			void navigate({
				to: "/g/$code",
				params: { code: variables.code },
				replace: true,
			});
		},
		onError(error) {
			toastOrpcMutationFailure(error, "Could not join this game");
			setPhase("fallback");
		},
	});

	useEffect(() => {
		if (!code) {
			setPhase("fallback");
			return;
		}
		joinGame({ code });
	}, [code, joinGame]);

	if (phase === "loading") {
		return (
			<div className="container mx-auto flex min-h-[45vh] max-w-md flex-col items-center justify-center gap-3 py-10">
				<Spinner />
				<p className="text-muted-foreground text-sm">
					Joining game <span className="font-mono">{code}</span>…
				</p>
			</div>
		);
	}

	return (
		<div className="container mx-auto max-w-md py-10">
			<Frame>
				<FrameHeader>
					<FrameTitle className="flex items-center gap-2">
						<AlertCircleIcon className="size-5 text-amber-500" />
						Could not join automatically
					</FrameTitle>
				</FrameHeader>
				<FramePanel className="space-y-4">
					<p className="text-muted-foreground text-sm">
						Check that the game is still open, not full, and that you are not
						the host. You can try again below or open the room if you already
						have access.
					</p>
					<div className="flex flex-wrap gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							render={<Link params={{ code }} to="/g/$code" />}
						>
							Open game room
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							render={<Link search={{ code }} to="/join" />}
						>
							Join page with code
						</Button>
					</div>
					<hr className="border-border" />
					<JoinGameForm
						codePrefill={code}
						description={null}
						title="Try again"
						submitLabel="Join game"
					/>
				</FramePanel>
			</Frame>
		</div>
	);
}
