import {
	OG_COLORS,
	OG_FONT_FAMILY,
	OgAvatar,
	OgEyebrow,
	OgFooter,
	OgShell,
	OgSubtitle,
	OgTitle,
} from "../shell";

export interface LeaderboardOgRow {
	rank: 1 | 2 | 3;
	name: string;
	username: string;
	image: string | null;
	elo: number;
}

export interface LeaderboardOgData {
	board: "elo";
	top: LeaderboardOgRow[];
}

const PODIUM_COLORS: Record<1 | 2 | 3, string> = {
	1: "#dd6b0d",
	2: "#9ca3af",
	3: "#b45309",
};

function PodiumTile({ row }: { row: LeaderboardOgRow }) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				gap: 12,
				width: 240,
				padding: "20px 16px",
				borderRadius: 24,
				border: `1px solid ${OG_COLORS.border}`,
				backgroundColor: "#ffffff",
				fontFamily: OG_FONT_FAMILY,
			}}
		>
			<div
				style={{
					display: "flex",
					fontFamily: OG_FONT_FAMILY,
					alignItems: "center",
					justifyContent: "center",
					width: 48,
					height: 48,
					borderRadius: 48,
					backgroundColor: PODIUM_COLORS[row.rank],
					color: "#ffffff",
					fontSize: 28,
					fontWeight: 700,
				}}
			>
				{row.rank}
			</div>
			<OgAvatar src={row.image} name={row.name} size={96} />
			<div
				style={{
					display: "flex",
					fontFamily: OG_FONT_FAMILY,
					fontSize: 26,
					fontWeight: 700,
					color: OG_COLORS.fg,
					maxWidth: 220,
					overflow: "hidden",
				}}
			>
				{row.name}
			</div>
			<div
				style={{
					display: "flex",
					fontFamily: OG_FONT_FAMILY,
					fontSize: 22,
					color: OG_COLORS.muted,
				}}
			>
				@{row.username}
			</div>
			<div
				style={{
					display: "flex",
					fontFamily: OG_FONT_FAMILY,
					gap: 6,
					alignItems: "baseline",
					fontSize: 28,
				}}
			>
				<span
					style={{
						fontFamily: OG_FONT_FAMILY,
						fontWeight: 700,
						color: OG_COLORS.primary,
					}}
				>
					{row.elo.toLocaleString()}
				</span>
				<span
					style={{
						fontFamily: OG_FONT_FAMILY,
						color: OG_COLORS.muted,
						fontSize: 22,
					}}
				>
					Elo
				</span>
			</div>
		</div>
	);
}

export function LeaderboardOg({ data }: { data: LeaderboardOgData }) {
	return (
		<OgShell>
			<div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
				<OgEyebrow>Global leaderboard · Elo</OgEyebrow>
				<OgTitle size={68}>Top players on Xamsa</OgTitle>
				<OgSubtitle color="#374151">
					Live competitive rating across all hosts and players.
				</OgSubtitle>
			</div>

			<div
				style={{
					display: "flex",
					gap: 22,
					marginTop: 32,
					alignItems: "flex-end",
				}}
			>
				{data.top.map((row) => (
					<PodiumTile key={row.username} row={row} />
				))}
			</div>

			<OgFooter
				left={<span>xamsa.site/leaderboard</span>}
				right={<span>Updated live</span>}
			/>
		</OgShell>
	);
}
