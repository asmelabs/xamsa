import { Link } from "@tanstack/react-router";
import { Badge } from "@xamsa/ui/components/badge";
import { Button } from "@xamsa/ui/components/button";
import {
	Frame,
	FrameHeader,
	FramePanel,
	FrameTitle,
} from "@xamsa/ui/components/frame";
import {
	BarChart3Icon,
	CrownIcon,
	HomeIcon,
	MedalIcon,
	PlayIcon,
	StarIcon,
	TrophyIcon,
	ZapIcon,
} from "lucide-react";
import { parseAsBoolean, useQueryState } from "nuqs";
import type { GameData, GamePlayer } from "@/lib/game-types";
import { sortGamePlayersForScoreboard } from "@/lib/sort-game-players";
import { RatePackDialog } from "./rate-pack-dialog";

interface EndGameScreenProps {
	game: GameData;
}

function formatDurationFromMs(ms: number): string {
	const totalSeconds = Math.max(0, Math.round(ms / 1000));
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	if (minutes === 0) return `${seconds}s`;
	return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

function formatClickMs(ms: number | null | undefined): string {
	if (ms === null || ms === undefined) return "—";
	if (ms < 1000) return `${Math.round(ms)}ms`;
	return `${(ms / 1000).toFixed(2)}s`;
}

export function EndGameScreen({ game }: EndGameScreenProps) {
	// Shares the same `rate-pack` query key that RatePackDialog reads, so
	// toggling this state opens the dialog without needing a custom trigger.
	const [, setRatePackOpened] = useQueryState(
		"rate-pack",
		parseAsBoolean.withDefault(false),
	);

	const ranked = sortGamePlayersForScoreboard(game.players);
	const [first, second, third] = ranked;
	const rest = ranked.slice(3);

	const winner = game.winnerId
		? game.players.find((p) => p.id === game.winnerId)
		: (first ?? null);

	const myPlayer = game.myPlayer;
	const myRank = myPlayer
		? ranked.findIndex((p) => p.id === myPlayer.id) + 1 || null
		: null;

	const totalDurationMs =
		game.startedAt && game.finishedAt
			? new Date(game.finishedAt).getTime() - new Date(game.startedAt).getTime()
			: null;

	return (
		<div className="mx-auto max-w-3xl space-y-5 p-4 pb-12">
			{/* Header */}
			<div className="flex flex-col items-center gap-2 pt-4 text-center">
				<Badge variant="success">
					<TrophyIcon className="size-3" />
					Game complete
				</Badge>
				<h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
					{game.pack.name}
				</h1>
				<p className="text-muted-foreground text-sm">
					Hosted by {game.pack.author.name}
					{totalDurationMs !== null ? (
						<>
							<span className="mx-1.5">·</span>
							{formatDurationFromMs(totalDurationMs)}
						</>
					) : null}
				</p>
			</div>

			{/* Winner hero */}
			{winner ? (
				<div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-linear-to-br from-amber-500/10 via-amber-500/5 to-transparent p-5 sm:p-6">
					<div className="pointer-events-none absolute -top-4 -right-4 text-amber-500/10">
						<TrophyIcon className="size-32 sm:size-40" />
					</div>
					<div className="relative flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex items-center gap-3">
							<div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-amber-500/20 ring-2 ring-amber-500/40">
								<CrownIcon className="size-6 text-amber-600 dark:text-amber-400" />
							</div>
							<div className="min-w-0">
								<p className="text-amber-700 text-xs uppercase tracking-wide dark:text-amber-400">
									Winner
								</p>
								<p className="truncate font-bold text-2xl sm:text-3xl">
									{winner.user.name}
								</p>
								<p className="text-muted-foreground text-xs">
									@{winner.user.username}
								</p>
							</div>
						</div>
						<div className="text-left sm:text-right">
							<p className="text-muted-foreground text-xs uppercase tracking-wide">
								Final score
							</p>
							<p className="font-bold text-3xl sm:text-4xl">
								{winner.score.toLocaleString()}
							</p>
						</div>
					</div>
				</div>
			) : (
				<div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
					<p className="text-muted-foreground text-sm">
						No winner was recorded for this game.
					</p>
				</div>
			)}

			{/* Podium (only if we have at least 2 players so it's meaningful) */}
			{ranked.length >= 2 && (
				<div className="grid grid-cols-3 items-end gap-2 sm:gap-3">
					{/* 2nd */}
					<PodiumColumn
						player={second}
						place={2}
						heightClass="h-24 sm:h-28"
						accent="from-zinc-400/20 to-zinc-400/5"
						medalClass="bg-zinc-400/15 text-zinc-500"
					/>
					{/* 1st */}
					<PodiumColumn
						player={first}
						place={1}
						heightClass="h-32 sm:h-40"
						accent="from-amber-500/25 to-amber-500/5"
						medalClass="bg-amber-500/20 text-amber-600 dark:text-amber-400"
						isWinner
					/>
					{/* 3rd */}
					<PodiumColumn
						player={third}
						place={3}
						heightClass="h-20 sm:h-24"
						accent="from-orange-700/20 to-orange-700/5"
						medalClass="bg-orange-700/15 text-orange-700 dark:text-orange-500"
					/>
				</div>
			)}

			{/* CTAs */}
			<div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
				<Button variant="outline" size="sm" render={<Link to="/" />}>
					<HomeIcon />
					Back home
				</Button>
				<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
					{!game.isHost && (
						<Button
							size="sm"
							variant="outline"
							onClick={() => setRatePackOpened(true)}
						>
							<StarIcon />
							Rate this pack
						</Button>
					)}
					<Button
						size="sm"
						variant="secondary"
						render={<Link to="/g/$code/stats" params={{ code: game.code }} />}
					>
						<BarChart3Icon />
						Full stats
					</Button>
					{game.isHost && (
						<Button
							size="sm"
							render={
								<Link
									to="/play/new/$packSlug"
									params={{ packSlug: game.pack.slug }}
								/>
							}
						>
							<PlayIcon />
							Play again
						</Button>
					)}
				</div>
			</div>

			{/* Rate-pack dialog (mounted for non-hosts so the CTA above can open it) */}
			{!game.isHost && <RatePackDialog packSlug={game.pack.slug} hideTrigger />}

			{/* Full scoreboard */}
			{rest.length > 0 && (
				<Frame>
					<FrameHeader className="flex items-center justify-between">
						<FrameTitle>
							<ZapIcon className="mr-1.5 inline size-4 text-primary" />
							Scoreboard
						</FrameTitle>
						<Badge variant="outline">{ranked.length} players</Badge>
					</FrameHeader>
					<FramePanel className="space-y-1.5">
						{rest.map((player, index) => (
							<ScoreboardRow
								key={player.id}
								player={player}
								rank={player.rank ?? index + 4}
								isMe={player.id === myPlayer?.id}
							/>
						))}
					</FramePanel>
				</Frame>
			)}

			{/* Per-player breakdown */}
			<Frame>
				<FrameHeader>
					<FrameTitle>
						<MedalIcon className="mr-1.5 inline size-4 text-muted-foreground" />
						Player stats
					</FrameTitle>
				</FrameHeader>
				<FramePanel className="space-y-3">
					{ranked.map((player, index) => (
						<PlayerStatsCard
							key={player.id}
							player={player}
							rank={player.rank ?? index + 1}
							isMe={player.id === myPlayer?.id}
						/>
					))}
				</FramePanel>
			</Frame>

			{/* Personal footer note */}
			{myRank && myPlayer && (
				<div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
					<p className="text-muted-foreground text-xs uppercase tracking-wide">
						Your finish
					</p>
					<p className="mt-1 font-bold text-xl">
						#{myRank} · {myPlayer.score.toLocaleString()} pts
					</p>
				</div>
			)}
		</div>
	);
}

function PodiumColumn({
	player,
	place,
	heightClass,
	accent,
	medalClass,
	isWinner,
}: {
	player: GamePlayer | undefined;
	place: number;
	heightClass: string;
	accent: string;
	medalClass: string;
	isWinner?: boolean;
}) {
	if (!player) {
		return (
			<div className="flex flex-col items-center gap-1.5">
				<div className="h-8" />
				<div
					className={`w-full rounded-t-xl border border-border border-dashed bg-muted/20 ${heightClass}`}
				/>
			</div>
		);
	}

	return (
		<div className="flex min-w-0 flex-col items-center gap-1.5 text-center">
			<div className="min-w-0 max-w-full">
				<p className="truncate font-semibold text-sm">{player.user.name}</p>
				<p className="font-bold text-lg">{player.score.toLocaleString()}</p>
			</div>
			<div
				className={`relative w-full overflow-hidden rounded-t-xl border border-border bg-linear-to-b ${accent} ${heightClass}`}
			>
				<div
					className={`absolute top-2 left-1/2 flex size-8 -translate-x-1/2 items-center justify-center rounded-full font-bold text-xs ${medalClass}`}
				>
					{isWinner ? <CrownIcon className="size-4" /> : place}
				</div>
			</div>
		</div>
	);
}

function ScoreboardRow({
	player,
	rank,
	isMe,
}: {
	player: GamePlayer;
	rank: number;
	isMe: boolean;
}) {
	return (
		<div
			className={`flex items-center gap-3 rounded-xl border p-2.5 ${
				isMe ? "border-primary/30 bg-primary/5" : "border-border"
			}`}
		>
			<div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted font-semibold text-muted-foreground text-xs">
				{rank}
			</div>
			<div className="min-w-0 flex-1">
				<p className="truncate font-medium text-sm">
					{isMe ? "You" : player.user.name}
				</p>
				{player.status === "left" && (
					<p className="text-[10px] text-muted-foreground uppercase tracking-wide">
						Left
					</p>
				)}
			</div>
			<p className="font-semibold text-sm">{player.score.toLocaleString()}</p>
		</div>
	);
}

function PlayerStatsCard({
	player,
	rank,
	isMe,
}: {
	player: GamePlayer;
	rank: number;
	isMe: boolean;
}) {
	const rankAccent =
		rank === 1
			? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
			: rank === 2
				? "bg-zinc-400/10 text-zinc-500"
				: rank === 3
					? "bg-orange-700/10 text-orange-700 dark:text-orange-500"
					: "bg-muted text-muted-foreground";

	return (
		<div
			className={`rounded-xl border p-3 ${
				isMe ? "border-primary/30 bg-primary/3" : "border-border"
			}`}
		>
			<div className="flex items-center gap-3">
				<div
					className={`flex size-8 shrink-0 items-center justify-center rounded-lg font-semibold text-xs ${rankAccent}`}
				>
					{rank}
				</div>
				<div className="min-w-0 flex-1">
					<p className="truncate font-semibold text-sm">
						{isMe ? `${player.user.name} (You)` : player.user.name}
					</p>
					<p className="text-[11px] text-muted-foreground">
						@{player.user.username}
					</p>
				</div>
				<p className="font-bold text-lg">{player.score.toLocaleString()}</p>
			</div>

			<div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
				<Stat label="Correct" value={player.correctAnswers} tone="good" />
				<Stat label="Wrong" value={player.incorrectAnswers} tone="bad" />
				<Stat label="Expired" value={player.expiredClicks} />
				<Stat label="1st buzz" value={player.firstClicks} />
				<Stat label="Streak" value={player.longestCorrectStreak} />
				<Stat label="Fastest" value={formatClickMs(player.fastestClickMs)} />
			</div>
		</div>
	);
}

function Stat({
	label,
	value,
	tone,
}: {
	label: string;
	value: number | string;
	tone?: "good" | "bad";
}) {
	const toneClass =
		tone === "good"
			? "text-green-600 dark:text-green-400"
			: tone === "bad"
				? "text-red-600 dark:text-red-400"
				: "text-foreground";
	return (
		<div className="rounded-lg border border-border bg-background p-2 text-center">
			<p className="text-[10px] text-muted-foreground uppercase tracking-wide">
				{label}
			</p>
			<p className={`font-semibold text-sm ${toneClass}`}>{value}</p>
		</div>
	);
}
