import { current, productName } from "@/data/app-releases-meta";

/** Format YY.MM.patch with zero-padded month (e.g. 26.04.1) */
export function formatCalver(parts: {
	year: number;
	month: number;
	patch: number;
}): string {
	const yy = parts.year % 100;
	const mm = String(parts.month).padStart(2, "0");
	return `${yy}.${mm}.${parts.patch}`;
}

export function formatProductVersionLabel(parts: {
	year: number;
	month: number;
	patch: number;
	productName?: string;
}): string {
	const name = parts.productName ?? productName;
	return `${name} v${formatCalver(parts)}`;
}

export function getCurrentCalverString(): string {
	return formatCalver(current);
}

export function getCurrentProductVersionLabel(): string {
	return formatProductVersionLabel({
		...current,
		productName,
	});
}
