import type { BadgeEarnedMessage } from "@xamsa/ably/channels";
import { Button } from "@xamsa/ui/components/button";
import type { BadgeId } from "@xamsa/utils/badges";
import { getBadge, isBadgeId } from "@xamsa/utils/badges";
import { X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** ~4–5.5s before auto-dismiss; extra time if many badges / players. */
const DISPLAY_MS_MIN = 4500;
const DISPLAY_MS_PER_EXTRA_BADGE = 120;
const DISPLAY_MS_PER_EXTRA_PLAYER = 180;
const DISPLAY_MS_MAX = 5800;

function displayDurationMs(badgeCount: number, playerCount: number): number {
	return Math.min(
		DISPLAY_MS_MIN +
			Math.max(0, badgeCount - 1) * DISPLAY_MS_PER_EXTRA_BADGE +
			Math.max(0, playerCount - 1) * DISPLAY_MS_PER_EXTRA_PLAYER,
		DISPLAY_MS_MAX,
	);
}

type PlayerBadgeRow = {
	playerId: string;
	displayName: string;
	badges: BadgeEarnedMessage[];
};

function groupBadgesByPlayer(messages: BadgeEarnedMessage[]): PlayerBadgeRow[] {
	const order: string[] = [];
	const byId = new Map<
		string,
		{ displayName: string; badges: BadgeEarnedMessage[] }
	>();

	for (const m of messages) {
		const name = m.playerName?.trim() || m.username || "Player";
		let entry = byId.get(m.playerId);
		if (!entry) {
			entry = { displayName: name, badges: [] };
			byId.set(m.playerId, entry);
			order.push(m.playerId);
		}
		entry.badges.push(m);
	}

	return order.map((playerId) => {
		const e = byId.get(playerId);
		if (!e) {
			return { playerId, displayName: "Player", badges: [] };
		}
		return { playerId, displayName: e.displayName, badges: e.badges };
	});
}

type Props = {
	/** One entry per server batch (e.g. topic awards together; scavenger is its own batch). */
	batchQueue: BadgeEarnedMessage[][];
	onConsume: () => void;
};

/**
 * Bottom strip per batch: names + badges, ~4.5–5.8s auto-close, dismiss with X.
 * `pointer-events-auto` on the card so the close control works; rest of screen
 * stays inert. Must sit above `PlayerView`’s fixed buzzer strip (z-40).
 */
export function BadgeCelebrationOverlay({ batchQueue, onConsume }: Props) {
	const [current, setCurrent] = useState<BadgeEarnedMessage[] | null>(null);
	const autoCloseRef = useRef<number | null>(null);

	const dismiss = useCallback(() => {
		if (autoCloseRef.current != null) {
			window.clearTimeout(autoCloseRef.current);
			autoCloseRef.current = null;
		}
		setCurrent(null);
		onConsume();
	}, [onConsume]);

	const { valid, rows } = useMemo(() => {
		if (!current?.length) {
			return {
				valid: [] as BadgeEarnedMessage[],
				rows: [] as PlayerBadgeRow[],
			};
		}
		const valid = current.filter((m) => isBadgeId(m.badgeId));
		return { valid, rows: groupBadgesByPlayer(valid) };
	}, [current]);

	useEffect(() => {
		if (current) {
			return;
		}
		const next = batchQueue[0];
		if (!next?.length) {
			return;
		}
		setCurrent(next);
	}, [batchQueue, current]);

	useEffect(() => {
		if (!current?.length) {
			return;
		}
		const v = current.filter((m) => isBadgeId(m.badgeId));
		if (v.length === 0) {
			setCurrent(null);
			onConsume();
			return;
		}
		const r = groupBadgesByPlayer(v);
		const t = window.setTimeout(
			() => {
				autoCloseRef.current = null;
				dismiss();
			},
			displayDurationMs(v.length, r.length),
		);
		autoCloseRef.current = t;
		return () => {
			if (autoCloseRef.current != null) {
				window.clearTimeout(autoCloseRef.current);
				autoCloseRef.current = null;
			}
		};
	}, [current, dismiss, onConsume]);

	if (!current?.length) {
		return null;
	}

	if (valid.length === 0 || rows.length === 0) {
		return null;
	}

	const announcement = rows
		.map(
			(row) =>
				`${row.displayName}: ${row.badges
					.map((b) => getBadge(b.badgeId as BadgeId).name)
					.join(", ")}`,
		)
		.join(" · ");

	return (
		<div
			className="pointer-events-none fixed right-0 bottom-0 left-0 z-50 flex justify-center px-3 pb-4 sm:px-4 sm:pb-5"
			role="status"
			aria-live="polite"
			aria-atomic="true"
		>
			<div className="slide-in-from-bottom-2 fade-in pointer-events-auto relative w-full max-w-lg animate-in border border-border/80 bg-card/95 py-2.5 pr-2 pl-3 shadow-lg backdrop-blur-md duration-300 sm:py-2.5 sm:pr-2 sm:pl-4">
				<Button
					type="button"
					variant="ghost"
					size="icon-xs"
					className="absolute top-0.5 right-0.5 z-10 text-muted-foreground hover:text-foreground"
					aria-label="Close badge notification"
					onClick={dismiss}
				>
					<X className="size-3.5 sm:size-4" />
				</Button>
				<p className="pr-6 text-center font-medium text-[10px] text-muted-foreground uppercase tracking-wider sm:pr-7 sm:text-xs">
					Badges
				</p>
				<div className="mt-2 space-y-2.5">
					{rows.map((row, rowIndex) => (
						<div
							key={row.playerId}
							className={
								rowIndex > 0 ? "border-border/60 border-t pt-2.5" : undefined
							}
						>
							<p className="text-center font-semibold text-foreground text-sm leading-none">
								{row.displayName}
							</p>
							<div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
								{row.badges.map((m, i) => {
									const meta = getBadge(m.badgeId as BadgeId);
									return (
										<span
											key={`${m.badgeId}-${i}`}
											className="inline-flex max-w-full items-center gap-1 rounded-md bg-muted/60 px-1.5 py-0.5"
											title={meta.name}
										>
											<span
												className="shrink-0 text-base leading-none"
												aria-hidden
											>
												{meta.icon}
											</span>
											<span className="truncate text-foreground text-xs">
												{meta.name}
											</span>
										</span>
									);
								})}
							</div>
						</div>
					))}
				</div>
				<span className="sr-only">{announcement}</span>
			</div>
		</div>
	);
}
