import { endOfDay, isValid, parseISO, startOfDay } from "date-fns";
import { parseAsString, useQueryState } from "nuqs";
import { useMemo } from "react";

/**
 * `from` / `to` in URL (YYYY-MM-DD) merged into oRPC `from` / `to` (Date range on createdAt, etc.)
 */
export function useAdminPeriodQuery() {
	const [fromStr, setFromStr] = useQueryState("from", parseAsString);
	const [toStr, setToStr] = useQueryState("to", parseAsString);

	const { from, to } = useMemo(() => {
		let from: Date | undefined;
		let to: Date | undefined;
		if (fromStr) {
			const p = parseISO(fromStr);
			if (isValid(p)) from = startOfDay(p);
		}
		if (toStr) {
			const p = parseISO(toStr);
			if (isValid(p)) to = endOfDay(p);
		}
		return { from, to };
	}, [fromStr, toStr]);

	return { from, to, fromStr, toStr, setFromStr, setToStr };
}
