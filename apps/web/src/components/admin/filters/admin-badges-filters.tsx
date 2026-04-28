import {
	AdminBadgeCatalogCategorySchema,
	AdminBadgeCatalogPeriodSchema,
	AdminBadgeCatalogTypeSchema,
	type ListAdminBadgesInputType,
} from "@xamsa/schemas/modules/admin";
import { Button } from "@xamsa/ui/components/button";
import { Input } from "@xamsa/ui/components/input";
import { Label } from "@xamsa/ui/components/label";
import { parseAsBoolean, parseAsString, useQueryState } from "nuqs";
import { useMemo } from "react";
import { AdminFiltersButton } from "@/components/admin/admin-filters-button";
import { BetterDialog } from "@/components/better-dialog";
import { countTruthy, parseCommaList } from "@/lib/csv-query";

function parseOptionalInt(s: string | null | undefined): number | undefined {
	if (s == null || s === "") return undefined;
	const n = Number(s);
	return Number.isFinite(n) ? Math.trunc(n) : undefined;
}

function parseEnumCsv<T>(
	value: string | null | undefined,
	parseOne: (raw: string) => T | null,
): T[] | undefined {
	const list = parseCommaList(value);
	if (!list?.length) return undefined;
	const out: T[] = [];
	for (const x of list) {
		const one = parseOne(x.trim());
		if (one != null) out.push(one);
	}
	return out.length ? out : undefined;
}

export function useAdminBadgesFilterUI() {
	const [periodCsv, setPeriodCsv] = useQueryState("bper", parseAsString);
	const [typeCsv, setTypeCsv] = useQueryState("btyp", parseAsString);
	const [catCsv, setCatCsv] = useQueryState("bcat", parseAsString);
	const [minA, setMinA] = useQueryState("maw", parseAsString);
	const [maxA, setMaxA] = useQueryState("xaw", parseAsString);
	const [minE, setMinE] = useQueryState("mer", parseAsString);
	const [maxE, setMaxE] = useQueryState("xer", parseAsString);
	const [filtersOpen, setFiltersOpen] = useQueryState(
		"bfo",
		parseAsBoolean.withDefault(false),
	);

	const filterInput = useMemo((): Partial<ListAdminBadgesInputType> => {
		const periods = parseEnumCsv(periodCsv, (raw) => {
			const r = AdminBadgeCatalogPeriodSchema.safeParse(raw);
			return r.success ? r.data : null;
		});
		const types = parseEnumCsv(typeCsv, (raw) => {
			const r = AdminBadgeCatalogTypeSchema.safeParse(raw);
			return r.success ? r.data : null;
		});
		const categories = parseEnumCsv(catCsv, (raw) => {
			const r = AdminBadgeCatalogCategorySchema.safeParse(raw);
			return r.success ? r.data : null;
		});

		const minTotalAwards = parseOptionalInt(minA);
		const maxTotalAwards = parseOptionalInt(maxA);
		const minEarners = parseOptionalInt(minE);
		const maxEarners = parseOptionalInt(maxE);

		return {
			...(periods ? { periods } : {}),
			...(types ? { types } : {}),
			...(categories ? { categories } : {}),
			...(minTotalAwards != null ? { minTotalAwards } : {}),
			...(maxTotalAwards != null ? { maxTotalAwards } : {}),
			...(minEarners != null ? { minEarners } : {}),
			...(maxEarners != null ? { maxEarners } : {}),
		};
	}, [periodCsv, typeCsv, catCsv, minA, maxA, minE, maxE]);

	const activeCount = useMemo(
		() =>
			countTruthy([
				{ value: parseCommaList(periodCsv) },
				{ value: parseCommaList(typeCsv) },
				{ value: parseCommaList(catCsv) },
				{ value: parseOptionalInt(minA) },
				{ value: parseOptionalInt(maxA) },
				{ value: parseOptionalInt(minE) },
				{ value: parseOptionalInt(maxE) },
			]),
		[periodCsv, typeCsv, catCsv, minA, maxA, minE, maxE],
	);

	const clearFilters = () => {
		void setPeriodCsv(null);
		void setTypeCsv(null);
		void setCatCsv(null);
		void setMinA(null);
		void setMaxA(null);
		void setMinE(null);
		void setMaxE(null);
	};

	const filterUi = (
		<>
			<AdminFiltersButton
				onClick={() => setFiltersOpen(true)}
				activeCount={activeCount}
			/>
			<BetterDialog
				opened={filtersOpen}
				setOpened={(o) => setFiltersOpen(o ?? false)}
				title="Badges — filters"
				description="Catalog filters and aggregate thresholds. Period/type/category use comma-separated values matching the badge catalog."
				submit={
					<Button
						variant="destructive"
						type="button"
						onClick={() => {
							clearFilters();
							setFiltersOpen(false);
						}}
					>
						Clear all
					</Button>
				}
			>
				<div className="space-y-4">
					<div className="space-y-1.5">
						<Label htmlFor="bf-per">
							Period (lifetime, game, topic, question)
						</Label>
						<Input
							id="bf-per"
							value={periodCsv ?? ""}
							onChange={(e) => void setPeriodCsv(e.target.value || null)}
							placeholder="game, topic"
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="bf-typ">Type (answer, buzz, score, …)</Label>
						<Input
							id="bf-typ"
							value={typeCsv ?? ""}
							onChange={(e) => void setTypeCsv(e.target.value || null)}
							placeholder="score"
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="bf-cat">Category (skill, struggle, …)</Label>
						<Input
							id="bf-cat"
							value={catCsv ?? ""}
							onChange={(e) => void setCatCsv(e.target.value || null)}
							placeholder="skill"
						/>
					</div>
					<div className="grid gap-3 sm:grid-cols-2">
						<div className="space-y-1.5">
							<Label htmlFor="bf-maw">Min total awards</Label>
							<Input
								id="bf-maw"
								type="number"
								value={minA ?? ""}
								onChange={(e) => void setMinA(e.target.value || null)}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="bf-xaw">Max total awards</Label>
							<Input
								id="bf-xaw"
								type="number"
								value={maxA ?? ""}
								onChange={(e) => void setMaxA(e.target.value || null)}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="bf-mer">Min distinct earners (users)</Label>
							<Input
								id="bf-mer"
								type="number"
								value={minE ?? ""}
								onChange={(e) => void setMinE(e.target.value || null)}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="bf-xer">Max distinct earners (users)</Label>
							<Input
								id="bf-xer"
								type="number"
								value={maxE ?? ""}
								onChange={(e) => void setMaxE(e.target.value || null)}
							/>
						</div>
					</div>
				</div>
			</BetterDialog>
		</>
	);

	return { filterInput, filterUi };
}
