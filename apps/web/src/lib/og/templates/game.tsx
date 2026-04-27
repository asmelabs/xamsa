import {
	OgChip,
	OgEyebrow,
	OgFooter,
	OgShell,
	OgSubtitle,
	OgTitle,
} from "../shell";

export interface GameOgData {
	code: string;
	packName: string;
	statusLabel: string;
	playersCount: number;
}

export function GameOg({ data }: { data: GameOgData }) {
	return (
		<OgShell>
			<div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
				<OgEyebrow>Live Xamsa game</OgEyebrow>
				<OgTitle size={120}>{data.code}</OgTitle>
				<OgSubtitle>Pack · {data.packName}</OgSubtitle>
			</div>

			<div
				style={{ display: "flex", gap: 14, marginTop: 28, flexWrap: "wrap" }}
			>
				<OgChip label="status" value={data.statusLabel} />
				<OgChip
					label={data.playersCount === 1 ? "player" : "players"}
					value={data.playersCount.toLocaleString()}
				/>
			</div>

			<OgFooter
				left={<span>xamsa.site</span>}
				right={<span>Join with code {data.code}</span>}
			/>
		</OgShell>
	);
}
