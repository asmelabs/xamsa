import {
	clampForOg,
	OgEyebrow,
	OgFooter,
	OgShell,
	OgSubtitle,
	OgTitle,
} from "../shell";

export interface BadgeAwardOgData {
	badgeId: string;
	badgeName: string;
	badgeDescription: string;
	username: string;
	displayName: string;
	packName: string;
	gameCode: string;
	earnedAtIso: string;
}

function fitTitle(name: string): number {
	if (name.length > 40) return 56;
	if (name.length > 22) return 72;
	return 88;
}

export function BadgeAwardOg({ data }: { data: BadgeAwardOgData }) {
	const earnedDate = new Date(data.earnedAtIso).toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});

	return (
		<OgShell>
			<div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
				<OgEyebrow>Badge earned · Xamsa</OgEyebrow>
				<OgTitle size={fitTitle(data.badgeName)}>
					{data.displayName} earned “{data.badgeName}”
				</OgTitle>
				<OgSubtitle color="#374151">
					{clampForOg(data.badgeDescription, 200)}
				</OgSubtitle>
				<div
					style={{
						display: "flex",
						gap: 24,
						color: "#4b5563",
						fontSize: 28,
					}}
				>
					<span>@{data.username}</span>
					<span>·</span>
					<span>{data.packName}</span>
					<span>·</span>
					<span>Game {data.gameCode}</span>
					<span>·</span>
					<span>{earnedDate}</span>
				</div>
			</div>

			<OgFooter
				left={<span>xamsa.site</span>}
				right={<span>/badges/{data.badgeId}</span>}
			/>
		</OgShell>
	);
}
