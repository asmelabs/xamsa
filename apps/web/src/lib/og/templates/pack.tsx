import {
	clampForOg,
	OgChip,
	OgEyebrow,
	OgFooter,
	OgShell,
	OgSubtitle,
	OgTitle,
} from "../shell";

export interface PackOgData {
	name: string;
	description: string | null;
	authorName: string;
	authorUsername: string;
	totalPlays: number;
	averageRating: number;
	totalRatings: number;
	totalTopics: number;
	language?: string | null;
}

function fitTitle(name: string): number {
	if (name.length > 60) return 56;
	if (name.length > 38) return 64;
	if (name.length > 22) return 76;
	return 88;
}

export function PackOg({ data }: { data: PackOgData }) {
	const desc = clampForOg(
		data.description?.trim() ||
			`A Xamsa question pack by ${data.authorName}. Browse topics, play live, and rate.`,
		180,
	);
	const ratingValue =
		data.totalRatings > 0 ? data.averageRating.toFixed(1) : "—";
	return (
		<OgShell>
			<div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
				<OgEyebrow>Question pack</OgEyebrow>
				<OgTitle size={fitTitle(data.name)}>{data.name}</OgTitle>
				<OgSubtitle>by {data.authorName}</OgSubtitle>
				<OgSubtitle color="#374151">{desc}</OgSubtitle>
			</div>

			<div
				style={{
					display: "flex",
					gap: 14,
					marginTop: 28,
					flexWrap: "wrap",
				}}
			>
				<OgChip label="topics" value={data.totalTopics.toLocaleString()} />
				<OgChip label="plays" value={data.totalPlays.toLocaleString()} />
				<OgChip
					label={data.totalRatings > 0 ? "rating" : "no ratings"}
					value={ratingValue}
				/>
				{data.language ? (
					<OgChip label="language" value={data.language.toUpperCase()} />
				) : null}
			</div>

			<OgFooter
				left={<span>xamsa.site</span>}
				right={<span>@{data.authorUsername}</span>}
			/>
		</OgShell>
	);
}
