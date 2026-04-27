import {
	clampForOg,
	OgChip,
	OgEyebrow,
	OgFooter,
	OgShell,
	OgSubtitle,
	OgTitle,
} from "../shell";

export interface TopicOgData {
	name: string;
	description: string | null;
	packName: string;
	authorName: string;
	authorUsername: string;
	questionCount: number;
}

function fitTitle(name: string): number {
	if (name.length > 60) return 56;
	if (name.length > 38) return 64;
	if (name.length > 22) return 76;
	return 88;
}

export function TopicOg({ data }: { data: TopicOgData }) {
	const desc = clampForOg(
		data.description?.trim() ||
			`A topic in “${data.packName}” on Xamsa. Five quiz questions to use in live games.`,
		180,
	);
	return (
		<OgShell>
			<div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
				<OgEyebrow>Topic · {data.packName}</OgEyebrow>
				<OgTitle size={fitTitle(data.name)}>{data.name}</OgTitle>
				<OgSubtitle>by {data.authorName}</OgSubtitle>
				<OgSubtitle color="#374151">{desc}</OgSubtitle>
			</div>

			<div style={{ display: "flex", gap: 14, marginTop: 28 }}>
				<OgChip
					label={data.questionCount === 1 ? "question" : "questions"}
					value={data.questionCount.toLocaleString()}
				/>
			</div>

			<OgFooter
				left={<span>xamsa.site</span>}
				right={<span>@{data.authorUsername}</span>}
			/>
		</OgShell>
	);
}
