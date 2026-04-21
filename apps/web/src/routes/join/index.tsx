import { createFileRoute, redirect } from "@tanstack/react-router";
import {
	Frame,
	FrameHeader,
	FramePanel,
	FrameTitle,
} from "@xamsa/ui/components/frame";
import { JoinGameForm } from "@/components/join-game-form";
import { getUser } from "@/functions/get-user";

export const Route = createFileRoute("/join/")({
	component: RouteComponent,

	beforeLoad: async () => {
		const session = await getUser();
		if (!session?.user) {
			throw redirect({
				to: "/auth/login",
				search: { redirect_url: "/join" },
			});
		}
		return { session };
	},

	head: () => ({
		meta: [{ title: "Join a game — Xamsa" }],
	}),
});

function RouteComponent() {
	return (
		<div className="container mx-auto max-w-md py-10">
			<Frame>
				<FrameHeader>
					<FrameTitle>Join a game</FrameTitle>
				</FrameHeader>
				<FramePanel>
					<JoinGameForm />
				</FramePanel>
			</Frame>
		</div>
	);
}
