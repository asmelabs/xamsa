import {
	clampForOg,
	OgEyebrow,
	OgFooter,
	OgShell,
	OgSubtitle,
	OgTitle,
} from "../shell";

export interface ReleaseOgData {
	versionLabel: string;
	title: string | null;
	releasedAt: string;
}

function fitTitle(t: string): number {
	if (t.length > 60) return 52;
	if (t.length > 36) return 64;
	return 76;
}

export function ReleaseOg({ data }: { data: ReleaseOgData }) {
	const title = data.title?.trim() || "Release notes";
	return (
		<OgShell>
			<div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
				<OgEyebrow>Xamsa · What’s new</OgEyebrow>
				<OgTitle size={108}>{data.versionLabel}</OgTitle>
				<OgSubtitle color="#374151">
					{clampForOg(title, fitTitle(title) > 60 ? 220 : 180)}
				</OgSubtitle>
			</div>

			<OgFooter
				left={<span>xamsa.site/whats-new</span>}
				right={<span>{data.releasedAt}</span>}
			/>
		</OgShell>
	);
}
