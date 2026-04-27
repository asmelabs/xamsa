import {
	OG_COLORS,
	OG_FONT_FAMILY,
	OgEyebrow,
	OgFooter,
	OgShell,
	OgSubtitle,
	OgTitle,
} from "../shell";

export function JoinOg() {
	return (
		<OgShell>
			<div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
				<OgEyebrow>Xamsa · Join a game</OgEyebrow>
				<OgTitle size={96}>Got a code?</OgTitle>
				<OgSubtitle color="#374151">
					Type a 6-character room code and jump into a live buzzer round with
					your group.
				</OgSubtitle>
			</div>
			<div
				style={{
					display: "flex",
					fontFamily: OG_FONT_FAMILY,
					marginTop: 28,
					padding: "20px 32px",
					borderRadius: 20,
					border: `2px dashed ${OG_COLORS.primary}`,
					color: OG_COLORS.primary,
					fontSize: 56,
					letterSpacing: 16,
					fontWeight: 700,
					alignSelf: "flex-start",
				}}
			>
				A B C 1 2 3
			</div>
			<OgFooter
				left={<span>xamsa.site/join</span>}
				right={<span>Real-time buzzer game</span>}
			/>
		</OgShell>
	);
}
