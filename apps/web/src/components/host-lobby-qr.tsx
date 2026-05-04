import { QRCodeSVG } from "qrcode.react";

/**
 * Renders the join URL as a scannable SVG QR code so in-person players can
 * point a phone camera at the host screen and join without typing the room
 * code. Uses SVG so the picture stays crisp at any size on a TV / projector.
 */
export function HostLobbyQr({
	joinUrl,
	size = 168,
	caption,
}: {
	joinUrl: string;
	size?: number;
	caption?: string;
}) {
	return (
		<div className="flex flex-col items-center gap-2">
			<div className="rounded-lg border border-border bg-white p-3 shadow-xs">
				<QRCodeSVG
					value={joinUrl}
					size={size}
					level="M"
					marginSize={0}
					title="Scan to join the lobby"
				/>
			</div>
			<p className="max-w-[220px] text-center text-[11px] text-muted-foreground leading-snug">
				{caption ?? "Scan with a phone camera to join the lobby."}
			</p>
		</div>
	);
}
