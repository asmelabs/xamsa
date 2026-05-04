import {
	clampForOg,
	OgChip,
	OgEyebrow,
	OgFooter,
	OgShell,
	OgSubtitle,
	OgTitle,
} from "../shell";

export interface PostOgData {
	bodyPreview: string | null;
	authorName: string;
	authorUsername: string;
	hasImage: boolean;
	reactionCount: number;
	commentCount: number;
}

export function PostOg({ data }: { data: PostOgData }) {
	const primary =
		data.bodyPreview?.trim() ||
		(data.hasImage
			? "Photo post on the Xamsa home feed."
			: "Post on the Xamsa home feed.");
	const desc = clampForOg(primary, 200);
	return (
		<OgShell>
			<div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
				<OgEyebrow>Post</OgEyebrow>
				<OgTitle
					size={data.bodyPreview && data.bodyPreview.length > 80 ? 52 : 64}
				>
					{desc}
				</OgTitle>
				<OgSubtitle>by {data.authorName}</OgSubtitle>
			</div>

			<div style={{ display: "flex", gap: 14, marginTop: 24 }}>
				<OgChip
					label={data.commentCount === 1 ? "comment" : "comments"}
					value={data.commentCount.toLocaleString()}
				/>
				<OgChip
					label={data.reactionCount === 1 ? "reaction" : "reactions"}
					value={data.reactionCount.toLocaleString()}
				/>
				{data.hasImage ? <OgChip label="media" value="photo" /> : null}
			</div>

			<OgFooter
				left={<span>xamsa.site</span>}
				right={<span>@{data.authorUsername}</span>}
			/>
		</OgShell>
	);
}
