import { formatCalver } from "@xamsa/utils/app-release-calver";
import { current, productName } from "@/data/app-releases-meta";

export {
	formatCalver,
	parseCalverParam,
} from "@xamsa/utils/app-release-calver";

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
