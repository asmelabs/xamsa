import {
	OgAvatar,
	OgChip,
	OgEyebrow,
	OgFooter,
	OgShell,
	OgSubtitle,
	OgTitle,
} from "../shell";

export interface UserOgData {
	name: string;
	username: string;
	image: string | null;
	level: number;
	xp: number;
	elo: number;
	totalGames: number;
}

function fitName(name: string): number {
	if (name.length > 36) return 60;
	if (name.length > 22) return 72;
	return 88;
}

export function UserOg({ data }: { data: UserOgData }) {
	return (
		<OgShell>
			<div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
				<OgEyebrow>Player profile</OgEyebrow>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: 28,
					}}
				>
					<OgAvatar src={data.image} name={data.name} size={140} />
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							gap: 6,
						}}
					>
						<OgTitle size={fitName(data.name)}>{data.name}</OgTitle>
						<OgSubtitle>@{data.username}</OgSubtitle>
					</div>
				</div>
			</div>

			<div
				style={{
					display: "flex",
					gap: 14,
					marginTop: 32,
					flexWrap: "wrap",
				}}
			>
				<OgChip label="level" value={data.level.toLocaleString()} />
				<OgChip label="XP" value={data.xp.toLocaleString()} />
				<OgChip label="Elo" value={data.elo.toLocaleString()} />
				<OgChip
					label={data.totalGames === 1 ? "game" : "games"}
					value={data.totalGames.toLocaleString()}
				/>
			</div>

			<OgFooter
				left={<span>xamsa.site</span>}
				right={<span>@{data.username}</span>}
			/>
		</OgShell>
	);
}
