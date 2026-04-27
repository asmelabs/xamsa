import {
	clampForOg,
	OgEyebrow,
	OgFooter,
	OgShell,
	OgSubtitle,
	OgTitle,
} from "../shell";

export interface BadgeOgData {
	id: string;
	name: string;
	description: string;
}

function fitTitle(name: string): number {
	if (name.length > 40) return 64;
	if (name.length > 22) return 80;
	return 96;
}

export function BadgeOg({ data }: { data: BadgeOgData }) {
	return (
		<OgShell>
			<div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
				<OgEyebrow>Achievement · Xamsa</OgEyebrow>
				<OgTitle size={fitTitle(data.name)}>{data.name}</OgTitle>
				<OgSubtitle color="#374151">
					{clampForOg(data.description, 220)}
				</OgSubtitle>
			</div>

			<OgFooter
				left={<span>xamsa.site</span>}
				right={<span>/badges/{data.id}</span>}
			/>
		</OgShell>
	);
}
