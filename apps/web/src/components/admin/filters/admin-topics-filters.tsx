import type { ListAdminTopicsInputType } from "@xamsa/schemas/modules/admin";
import { Button } from "@xamsa/ui/components/button";
import { Input } from "@xamsa/ui/components/input";
import { Label } from "@xamsa/ui/components/label";
import { parseAsBoolean, parseAsString, useQueryState } from "nuqs";
import { useMemo } from "react";
import { AdminFiltersButton } from "@/components/admin/admin-filters-button";
import { BetterDialog } from "@/components/better-dialog";
import { useAdminPeriodQuery } from "@/hooks/admin-filters/period";
import { countTruthy, parseCommaList } from "@/lib/csv-query";

function parseOptionalNum(s: string | null | undefined): number | undefined {
	if (s == null || s === "") return undefined;
	const n = Number(s);
	return Number.isFinite(n) ? n : undefined;
}

export function useAdminTopicsFilterUI() {
	const { from, to, fromStr, toStr, setFromStr, setToStr } =
		useAdminPeriodQuery();
	const [packs, setPacks] = useQueryState("tps", parseAsString);
	const [auths, setAuths] = useQueryState("tau", parseAsString);
	const [minTdr, setMinTdr] = useQueryState("mtdr", parseAsString);
	const [maxTdr, setMaxTdr] = useQueryState("xtdr", parseAsString);
	const [fo, setFo] = useQueryState("tfo", parseAsBoolean.withDefault(false));

	const filterInput = useMemo((): Partial<ListAdminTopicsInputType> => {
		const packSlugs = parseCommaList(packs);
		const authorUsernames = parseCommaList(auths);
		const minTdrN = parseOptionalNum(minTdr);
		const maxTdrN = parseOptionalNum(maxTdr);
		return {
			...(packSlugs ? { packSlugs } : {}),
			...(authorUsernames ? { authorUsernames } : {}),
			...(minTdrN != null ? { minTdr: minTdrN } : {}),
			...(maxTdrN != null ? { maxTdr: maxTdrN } : {}),
			...(from ? { from } : {}),
			...(to ? { to } : {}),
		};
	}, [packs, auths, minTdr, maxTdr, from, to]);

	const activeCount = useMemo(
		() =>
			countTruthy([
				{ value: parseCommaList(packs) },
				{ value: parseCommaList(auths) },
				{ value: parseOptionalNum(minTdr) },
				{ value: parseOptionalNum(maxTdr) },
				{ value: fromStr },
				{ value: toStr },
			]),
		[packs, auths, minTdr, maxTdr, fromStr, toStr],
	);

	const clear = () => {
		void setPacks(null);
		void setAuths(null);
		void setMinTdr(null);
		void setMaxTdr(null);
		void setFromStr(null);
		void setToStr(null);
	};

	const filterUi = (
		<>
			<AdminFiltersButton
				onClick={() => setFo(true)}
				activeCount={activeCount}
			/>
			<BetterDialog
				opened={fo}
				setOpened={(o) => setFo(o ?? false)}
				title="Topics — filters"
				submit={
					<Button
						variant="destructive"
						type="button"
						onClick={() => {
							clear();
							setFo(false);
						}}
					>
						Clear all
					</Button>
				}
			>
				<div className="space-y-3">
					<div className="space-y-1">
						<Label>Pack slugs</Label>
						<Input
							value={packs ?? ""}
							onChange={(e) => void setPacks(e.target.value || null)}
						/>
					</div>
					<div className="space-y-1">
						<Label>Pack author usernames</Label>
						<Input
							value={auths ?? ""}
							onChange={(e) => void setAuths(e.target.value || null)}
						/>
					</div>
					<div className="grid grid-cols-2 gap-2">
						<div className="space-y-1">
							<Label>Min TDR</Label>
							<Input
								type="number"
								step="0.01"
								value={minTdr ?? ""}
								onChange={(e) => void setMinTdr(e.target.value || null)}
							/>
						</div>
						<div className="space-y-1">
							<Label>Max TDR</Label>
							<Input
								type="number"
								step="0.01"
								value={maxTdr ?? ""}
								onChange={(e) => void setMaxTdr(e.target.value || null)}
							/>
						</div>
					</div>
					<div className="grid grid-cols-2 gap-2">
						<div className="space-y-1">
							<Label>From</Label>
							<Input
								type="date"
								value={fromStr?.slice(0, 10) ?? ""}
								onChange={(e) => void setFromStr(e.target.value || null)}
							/>
						</div>
						<div className="space-y-1">
							<Label>To</Label>
							<Input
								type="date"
								value={toStr?.slice(0, 10) ?? ""}
								onChange={(e) => void setToStr(e.target.value || null)}
							/>
						</div>
					</div>
				</div>
			</BetterDialog>
		</>
	);

	return { filterInput, filterUi };
}
