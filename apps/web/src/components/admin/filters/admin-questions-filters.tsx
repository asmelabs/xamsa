import type { ListAdminQuestionsInputType } from "@xamsa/schemas/modules/admin";
import { Button } from "@xamsa/ui/components/button";
import { Input } from "@xamsa/ui/components/input";
import { Label } from "@xamsa/ui/components/label";
import { parseAsBoolean, parseAsString, useQueryState } from "nuqs";
import { useMemo } from "react";
import { AdminFiltersButton } from "@/components/admin/admin-filters-button";
import { BetterDialog } from "@/components/better-dialog";
import { useAdminPeriodQuery } from "@/hooks/admin-filters/period";
import { countTruthy, parseCommaList } from "@/lib/csv-query";

export function useAdminQuestionsFilterUI() {
	const { from, to, fromStr, toStr, setFromStr, setToStr } =
		useAdminPeriodQuery();
	const [packs, setPacks] = useQueryState("qps", parseAsString);
	const [top, setTop] = useQueryState("qts", parseAsString);
	const [auths, setAuths] = useQueryState("qau", parseAsString);
	const [fo, setFo] = useQueryState("qfo", parseAsBoolean.withDefault(false));

	const filterInput = useMemo((): Partial<ListAdminQuestionsInputType> => {
		const packSlugs = parseCommaList(packs);
		const topicSlugs = parseCommaList(top);
		const authorUsernames = parseCommaList(auths);
		return {
			...(packSlugs ? { packSlugs } : {}),
			...(topicSlugs ? { topicSlugs } : {}),
			...(authorUsernames ? { authorUsernames } : {}),
			...(from ? { from } : {}),
			...(to ? { to } : {}),
		};
	}, [packs, top, auths, from, to]);

	const activeCount = useMemo(
		() =>
			countTruthy([
				{ value: parseCommaList(packs) },
				{ value: parseCommaList(top) },
				{ value: parseCommaList(auths) },
				{ value: fromStr },
				{ value: toStr },
			]),
		[packs, top, auths, fromStr, toStr],
	);

	const clear = () => {
		void setPacks(null);
		void setTop(null);
		void setAuths(null);
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
				title="Questions — filters"
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
						<Label>Topic slugs</Label>
						<Input
							value={top ?? ""}
							onChange={(e) => void setTop(e.target.value || null)}
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
