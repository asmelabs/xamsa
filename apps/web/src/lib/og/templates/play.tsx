import { OgEyebrow, OgFooter, OgShell, OgSubtitle, OgTitle } from "../shell";

export function PlayOg() {
	return (
		<OgShell>
			<div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
				<OgEyebrow>Xamsa · Live quiz</OgEyebrow>
				<OgTitle size={104}>Play a pack</OgTitle>
				<OgSubtitle color="#374151">
					Pick a pack, host a real-time room with a buzzer, and play with
					friends. Topics, points, and recap built in.
				</OgSubtitle>
			</div>
			<OgFooter
				left={<span>xamsa.site/play</span>}
				right={<span>Host or join in seconds</span>}
			/>
		</OgShell>
	);
}
