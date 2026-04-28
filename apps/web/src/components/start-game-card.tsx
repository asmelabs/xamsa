import { useMutation } from "@tanstack/react-query";
import type { DuplicateQuestionPolicy } from "@xamsa/schemas/db/schemas/enums/DuplicateQuestionPolicy.schema";
import { Label } from "@xamsa/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@xamsa/ui/components/select";
import { MIN_PLAYERS_PER_GAME_TO_START } from "@xamsa/utils/constants";
import { PlayIcon, UsersIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { GameData, GamePlayer } from "@/lib/game-types";
import { orpc } from "@/utils/orpc";
import { LoadingButton } from "./loading-button";

const DUPLICATE_POLICY_OPTIONS: {
	value: DuplicateQuestionPolicy;
	label: string;
	description: string;
}[] = [
	{
		value: "none",
		label: "No replay restriction",
		description:
			"Everyone can buzz even if they played this pack in a finished game before.",
	},
	{
		value: "block_individuals",
		label: "Block repeat players only",
		description:
			"If you saw this question in a past finished game with this pack, you cannot buzz.",
	},
	{
		value: "block_room",
		label: "Block room if anyone has seen it",
		description:
			"If anyone in this room saw this question in a past finished game with this pack, nobody can buzz.",
	},
];

interface StartGameCardProps {
	game: GameData;
	activePlayers: GamePlayer[];
}

export function StartGameCard({ game, activePlayers }: StartGameCardProps) {
	const [duplicateQuestionPolicy, setDuplicateQuestionPolicy] =
		useState<DuplicateQuestionPolicy>("none");

	const { mutate: startGame, isPending } = useMutation({
		...orpc.game.start.mutationOptions(),
		onSuccess() {
			toast.success("Game started");
		},
		onError(error) {
			toast.error(error.message || "Failed to start game");
		},
	});

	const canStart = activePlayers.length >= MIN_PLAYERS_PER_GAME_TO_START;

	return (
		<div className="flex flex-col items-center gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center">
			<div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
				<PlayIcon className="size-7 fill-primary text-primary" />
			</div>

			<div className="space-y-1">
				<h2 className="font-bold text-xl">Ready to host?</h2>
				<p className="text-muted-foreground text-sm">
					Use <span className="font-medium text-foreground">Share</span> in the
					header to copy the room code or invite link, open
					WhatsApp/Telegram/X/Facebook, or use your device&apos;s native share
					sheet. When everyone&apos;s in, start the game.
				</p>
			</div>

			<div className="flex items-center gap-2 text-sm">
				<UsersIcon className="size-4 text-muted-foreground" />
				<span className="font-medium">
					{activePlayers.length}{" "}
					{activePlayers.length === 1 ? "player" : "players"} joined
				</span>
			</div>

			{activePlayers.length < MIN_PLAYERS_PER_GAME_TO_START && (
				<p className="text-muted-foreground text-xs">
					Waiting for at least {MIN_PLAYERS_PER_GAME_TO_START} players...
				</p>
			)}

			<div className="w-full max-w-md space-y-2 text-left">
				<Label
					className="text-muted-foreground text-xs"
					htmlFor="duplicate-policy"
				>
					Replay / duplicate questions
				</Label>
				<Select
					value={duplicateQuestionPolicy}
					onValueChange={(v) =>
						setDuplicateQuestionPolicy(v as DuplicateQuestionPolicy)
					}
				>
					<SelectTrigger id="duplicate-policy" className="w-full">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{DUPLICATE_POLICY_OPTIONS.map((opt) => (
							<SelectItem key={opt.value} value={opt.value}>
								<span className="font-medium">{opt.label}</span>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<p className="text-[11px] text-muted-foreground leading-snug">
					{
						DUPLICATE_POLICY_OPTIONS.find(
							(o) => o.value === duplicateQuestionPolicy,
						)?.description
					}
				</p>
			</div>

			<LoadingButton
				size="lg"
				disabled={!canStart}
				isLoading={isPending}
				loadingText="Starting..."
				onClick={() =>
					startGame({
						code: game.code,
						duplicateQuestionPolicy,
					})
				}
			>
				<PlayIcon />
				Start game
			</LoadingButton>
		</div>
	);
}
