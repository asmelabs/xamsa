/**
 * URLs and copy text for inviting others to a live game (room code + invite link).
 */

export type GameShareContext = {
	packName: string;
	code: string;
	/** Absolute invite URL, e.g. https://example.com/join/ABCD */
	inviteUrl: string;
};

export function buildGameShareBody(ctx: GameShareContext): string {
	const line = `Join "${ctx.packName}" on Xamsa`;
	return `${line} · Room ${ctx.code}\n${ctx.inviteUrl}`;
}

/** Web / app share targets (encode with encodeURIComponent where used). */
export function getGameShareTargets(ctx: GameShareContext, body: string) {
	const { inviteUrl } = ctx;

	return {
		whatsapp: `https://wa.me/?text=${encodeURIComponent(body)}`,
		telegram: `https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(
			`Join "${ctx.packName}" on Xamsa · Room ${ctx.code}`,
		)}`,
		twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(body)}`,
		facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteUrl)}`,
	};
}
