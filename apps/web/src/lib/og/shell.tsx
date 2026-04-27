import type { ReactNode } from "react";
import { getOgBaseImageDataUrl, OG_HEIGHT, OG_WIDTH } from "./base-image";

const COLORS = {
	bg: "#ffffff",
	fg: "#0a0a0a",
	muted: "#6b7280",
	primary: "#dd6b0d",
	primaryFg: "#ffffff",
	accent: "#fde9d3",
	border: "#e5e7eb",
	chipBg: "#f3f4f6",
} as const;

export const OG_COLORS = COLORS;

/**
 * Standard OG canvas: 1200×630 with the brand template baked in (orange bars
 * on the left edge and the bow-tie logo top-right). The base PNG is layered as
 * a CSS `backgroundImage` so we never re-encode it.
 *
 * Children should compose flexbox layouts with inline `style` only. Satori has
 * no className/Tailwind support and requires `display: flex` whenever a node
 * has more than one child.
 */
export function OgShell({ children }: { children: ReactNode }) {
	return (
		<div
			style={{
				width: OG_WIDTH,
				height: OG_HEIGHT,
				display: "flex",
				flexDirection: "column",
				backgroundColor: COLORS.bg,
				backgroundImage: `url(${getOgBaseImageDataUrl()})`,
				backgroundSize: `${OG_WIDTH}px ${OG_HEIGHT}px`,
				backgroundRepeat: "no-repeat",
				color: COLORS.fg,
				fontFamily: "Geist",
				// Base template reserves ~150px on the left (bars) and ~150px on the
				// top-right corner (logo). Use 180/110 padding so content sits in the
				// safe area.
				padding: "84px 110px 80px 180px",
			}}
		>
			{children}
		</div>
	);
}

/** Small uppercase tagline shown above the main headline. */
export function OgEyebrow({ children }: { children: ReactNode }) {
	return (
		<div
			style={{
				display: "flex",
				color: COLORS.primary,
				fontSize: 26,
				fontWeight: 700,
				letterSpacing: 2,
				textTransform: "uppercase",
			}}
		>
			{children}
		</div>
	);
}

/** Main headline. Optional `size` for fitting long titles. */
export function OgTitle({
	children,
	size = 76,
}: {
	children: ReactNode;
	size?: number;
}) {
	return (
		<div
			style={{
				display: "flex",
				fontSize: size,
				fontWeight: 700,
				lineHeight: 1.05,
				letterSpacing: -1,
				color: COLORS.fg,
				// Satori does not support `-webkit-line-clamp`; we cap with overflow.
				overflow: "hidden",
			}}
		>
			{children}
		</div>
	);
}

/** Secondary line under the headline. */
export function OgSubtitle({
	children,
	color = COLORS.muted,
}: {
	children: ReactNode;
	color?: string;
}) {
	return (
		<div
			style={{
				display: "flex",
				fontSize: 30,
				color,
				lineHeight: 1.3,
			}}
		>
			{children}
		</div>
	);
}

/** Pill-shaped chip used for stats. */
export function OgChip({ label, value }: { label: string; value: string }) {
	return (
		<div
			style={{
				display: "flex",
				alignItems: "baseline",
				gap: 8,
				padding: "10px 18px",
				borderRadius: 999,
				backgroundColor: COLORS.chipBg,
				border: `1px solid ${COLORS.border}`,
				color: COLORS.fg,
				fontSize: 26,
			}}
		>
			<span style={{ fontWeight: 700 }}>{value}</span>
			<span style={{ color: COLORS.muted }}>{label}</span>
		</div>
	);
}

/** Footer line: brand mark + handle / extra info. */
export function OgFooter({
	left,
	right,
}: {
	left?: ReactNode;
	right?: ReactNode;
}) {
	return (
		<div
			style={{
				display: "flex",
				marginTop: "auto",
				justifyContent: "space-between",
				alignItems: "flex-end",
				width: "100%",
				color: COLORS.muted,
				fontSize: 24,
			}}
		>
			<div style={{ display: "flex" }}>{left ?? ""}</div>
			<div style={{ display: "flex" }}>{right ?? ""}</div>
		</div>
	);
}

/** Render either an `<img>` for an avatar URL or an initials disc. */
export function OgAvatar({
	src,
	name,
	size = 96,
}: {
	src?: string | null;
	name: string;
	size?: number;
}) {
	const initials = name
		.split(/\s+/u)
		.filter(Boolean)
		.slice(0, 2)
		.map((p) => p[0]?.toUpperCase() ?? "")
		.join("");
	if (src && /^https?:\/\//u.test(src)) {
		return (
			<img
				src={src}
				width={size}
				height={size}
				alt=""
				style={{
					width: size,
					height: size,
					borderRadius: size,
					objectFit: "cover",
					border: `2px solid ${COLORS.border}`,
				}}
			/>
		);
	}
	return (
		<div
			style={{
				width: size,
				height: size,
				borderRadius: size,
				backgroundColor: COLORS.primary,
				color: COLORS.primaryFg,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				fontSize: Math.round(size * 0.4),
				fontWeight: 700,
			}}
		>
			{initials || "X"}
		</div>
	);
}

/**
 * Trim a multi-line description down to a soft length budget so satori never
 * tries to overflow the safe area. Keeps the text readable while still giving
 * shape to the OG card.
 */
export function clampForOg(text: string, max = 160): string {
	const t = text.trim().replace(/\s+/gu, " ");
	if (t.length <= max) return t;
	return `${t.slice(0, max - 1).trim()}…`;
}
