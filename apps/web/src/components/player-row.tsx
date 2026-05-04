import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@xamsa/ui/components/avatar";
import { Button } from "@xamsa/ui/components/button";
import {
	Menu,
	MenuItem,
	MenuPopup,
	MenuTrigger,
} from "@xamsa/ui/components/menu";
import { EllipsisIcon, UserMinusIcon } from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";
import { toast } from "sonner";
import { useGamePresence } from "@/hooks/use-game-presence";
import type { GamePlayer } from "@/lib/game-types";
import { toastOrpcMutationFailure } from "@/lib/orpc-email-verification-error";
import { orpc } from "@/utils/orpc";
import { BetterDialog } from "./better-dialog";
import { LoadingButton } from "./loading-button";
import { PresenceDot } from "./presence-dot";
import { ProfileImageLightbox } from "./profile-image-lightbox";

interface PlayerRowProps {
	player: GamePlayer;
	rank: number;
	isHostView: boolean;
	gameCode?: string;
}

export function PlayerRow({
	player,
	rank,
	isHostView,
	gameCode,
}: PlayerRowProps) {
	const queryClient = useQueryClient();
	const presence = useGamePresence();
	const playerPresence = presence.getPlayerPresence(player.id);

	const [kickTarget, setKickTarget] = useQueryState(
		"kick-player",
		parseAsString,
	);
	const isKickOpen = kickTarget === player.id;

	const { mutate: kick, isPending: isKicking } = useMutation({
		...orpc.player.kick.mutationOptions(),
		onSuccess() {
			toast.success(`${player.user.name} was kicked`);
			setKickTarget(null);
			if (gameCode) {
				queryClient.invalidateQueries({
					queryKey: orpc.game.findOne.queryKey({
						input: { code: gameCode },
					}),
				});
			}
		},
		onError(error) {
			toastOrpcMutationFailure(error, "Failed to kick player");
		},
	});

	const rankBadge =
		rank === 1
			? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
			: rank === 2
				? "bg-zinc-400/10 text-zinc-500"
				: rank === 3
					? "bg-orange-700/10 text-orange-700 dark:text-orange-500"
					: "bg-muted text-muted-foreground";

	const initials =
		player.user.name
			.split(/\s+/u)
			.filter(Boolean)
			.slice(0, 2)
			.map((p) => p[0]?.toUpperCase() ?? "")
			.join("") || "?";

	return (
		<div className="flex items-center gap-3 rounded-xl border border-border p-2.5">
			<div
				className={`flex size-7 shrink-0 items-center justify-center rounded-lg font-semibold text-xs ${rankBadge}`}
			>
				{rank}
			</div>

			<ProfileImageLightbox
				name={player.user.name}
				image={player.user.image}
				initials={initials}
				triggerClassName="size-9 shrink-0 rounded-lg [&_[data-slot=avatar]]:size-9 [&_[data-slot=avatar]]:rounded-lg"
			>
				<Avatar className="size-9 rounded-lg">
					{player.user.image ? (
						<AvatarImage src={player.user.image} alt="" />
					) : null}
					<AvatarFallback className="rounded-lg text-[10px]">
						{initials.slice(0, 2)}
					</AvatarFallback>
				</Avatar>
			</ProfileImageLightbox>

			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-1.5">
					<p className="truncate font-medium text-sm">{player.user.name}</p>
					<PresenceDot state={playerPresence} size="sm" />
				</div>
				<p className="text-muted-foreground text-xs">
					{player.score.toLocaleString()} pts
				</p>
			</div>

			{isHostView && gameCode && (
				<>
					<Menu>
						<MenuTrigger render={<Button variant="ghost" size="icon-xs" />}>
							<EllipsisIcon className="size-3.5" />
						</MenuTrigger>
						<MenuPopup align="end">
							<MenuItem
								variant="destructive"
								onClick={() => setKickTarget(player.id)}
							>
								<UserMinusIcon />
								Kick from game
							</MenuItem>
						</MenuPopup>
					</Menu>

					<BetterDialog
						opened={isKickOpen}
						setOpened={(open) => setKickTarget(open ? player.id : null)}
						title={`Kick ${player.user.name}?`}
						description="They will no longer be able to rejoin this game."
						submit={
							<LoadingButton
								type="button"
								variant="destructive"
								isLoading={isKicking}
								loadingText="Kicking..."
								onClick={() => kick({ code: gameCode, playerId: player.id })}
							>
								Kick
							</LoadingButton>
						}
					>
						<p className="text-muted-foreground text-sm">
							This will immediately remove{" "}
							<span className="font-medium text-foreground">
								{player.user.name}
							</span>{" "}
							from the game and expire any pending buzz they may have.
						</p>
					</BetterDialog>
				</>
			)}
		</div>
	);
}
