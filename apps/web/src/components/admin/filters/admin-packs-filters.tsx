import { PackStatusSchema } from "@xamsa/schemas/db/schemas/enums/PackStatus.schema";
import { PackVisibilitySchema } from "@xamsa/schemas/db/schemas/enums/PackVisibility.schema";
import type { ListAdminPacksInputType } from "@xamsa/schemas/modules/admin";
import { Button } from "@xamsa/ui/components/button";
import { Input } from "@xamsa/ui/components/input";
import { Label } from "@xamsa/ui/components/label";
import { Switch } from "@xamsa/ui/components/switch";
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

function parseEnumCsv<T extends string>(
	value: string | null | undefined,
	schema: { safeParse: (v: string) => { success: boolean; data?: T } },
): T[] | undefined {
	const list = parseCommaList(value);
	if (!list?.length) return undefined;
	const out: T[] = [];
	for (const x of list) {
		const r = schema.safeParse(x);
		if (r.success && r.data != null) out.push(r.data);
	}
	return out.length ? out : undefined;
}

export function useAdminPacksFilterUI() {
	const { from, to, fromStr, toStr, setFromStr, setToStr } =
		useAdminPeriodQuery();

	const [authors, setAuthors] = useQueryState("auth", parseAsString);
	const [statusCsv, setStatusCsv] = useQueryState("pstatus", parseAsString);
	const [visCsv, setVisCsv] = useQueryState("pvis", parseAsString);
	const [minR, setMinR] = useQueryState("mrat", parseAsString);
	const [maxR, setMaxR] = useQueryState("xrat", parseAsString);
	const [minP, setMinP] = useQueryState("mplay", parseAsString);
	const [maxP, setMaxP] = useQueryState("xplay", parseAsString);
	const [hasRatings, setHasRatings] = useQueryState(
		"hasr",
		parseAsBoolean.withDefault(false),
	);
	const [filtersOpen, setFiltersOpen] = useQueryState(
		"pfo",
		parseAsBoolean.withDefault(false),
	);

	const filterInput = useMemo((): Partial<ListAdminPacksInputType> => {
		const authorUsernames = parseCommaList(authors);
		const statuses = parseEnumCsv(statusCsv, PackStatusSchema);
		const visibilities = parseEnumCsv(visCsv, PackVisibilitySchema);
		const minRating = parseOptionalNum(minR);
		const maxRating = parseOptionalNum(maxR);
		const minPlay = parseOptionalNum(minP);
		const maxPlay = parseOptionalNum(maxP);

		return {
			...(authorUsernames ? { authorUsernames } : {}),
			...(statuses ? { statuses } : {}),
			...(visibilities ? { visibilities } : {}),
			...(minRating != null ? { minRating } : {}),
			...(maxRating != null ? { maxRating } : {}),
			...(minPlay != null ? { minPlay } : {}),
			...(maxPlay != null ? { maxPlay } : {}),
			...(hasRatings ? { hasRating: true } : {}),
			...(from ? { from } : {}),
			...(to ? { to } : {}),
		};
	}, [
		authors,
		statusCsv,
		visCsv,
		minR,
		maxR,
		minP,
		maxP,
		hasRatings,
		from,
		to,
	]);

	const activeCount = useMemo(
		() =>
			countTruthy([
				{ value: parseCommaList(authors) },
				{ value: parseEnumCsv(statusCsv, PackStatusSchema) },
				{ value: parseEnumCsv(visCsv, PackVisibilitySchema) },
				{ value: parseOptionalNum(minR) },
				{ value: parseOptionalNum(maxR) },
				{ value: parseOptionalNum(minP) },
				{ value: parseOptionalNum(maxP) },
				{ value: hasRatings, isActive: (v) => v === true },
				{ value: fromStr },
				{ value: toStr },
			]),
		[
			authors,
			statusCsv,
			visCsv,
			minR,
			maxR,
			minP,
			maxP,
			hasRatings,
			fromStr,
			toStr,
		],
	);

	const clearFilters = () => {
		void setAuthors(null);
		void setStatusCsv(null);
		void setVisCsv(null);
		void setMinR(null);
		void setMaxR(null);
		void setMinP(null);
		void setMaxP(null);
		void setHasRatings(false);
		void setFromStr(null);
		void setToStr(null);
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
				title="Packs — filters"
				description="Comma-separated lists where noted. Same URL params can be shared with teammates."
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
						<Label htmlFor="pf-authors">Author usernames</Label>
						<Input
							id="pf-authors"
							value={authors ?? ""}
							onChange={(e) => void setAuthors(e.target.value || null)}
							placeholder="alice, bob"
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="pf-st">Status (draft, published, archived)</Label>
						<Input
							id="pf-st"
							value={statusCsv ?? ""}
							onChange={(e) => void setStatusCsv(e.target.value || null)}
							placeholder="published"
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="pf-vis">Visibility (public, private)</Label>
						<Input
							id="pf-vis"
							value={visCsv ?? ""}
							onChange={(e) => void setVisCsv(e.target.value || null)}
						/>
					</div>
					<div className="grid gap-3 sm:grid-cols-2">
						<div className="space-y-1.5">
							<Label htmlFor="pf-mr">Min rating</Label>
							<Input
								id="pf-mr"
								type="number"
								step="0.01"
								value={minR ?? ""}
								onChange={(e) => void setMinR(e.target.value || null)}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="pf-xr">Max rating</Label>
							<Input
								id="pf-xr"
								type="number"
								step="0.01"
								value={maxR ?? ""}
								onChange={(e) => void setMaxR(e.target.value || null)}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="pf-mp">Min plays</Label>
							<Input
								id="pf-mp"
								type="number"
								value={minP ?? ""}
								onChange={(e) => void setMinP(e.target.value || null)}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="pf-xp">Max plays</Label>
							<Input
								id="pf-xp"
								type="number"
								value={maxP ?? ""}
								onChange={(e) => void setMaxP(e.target.value || null)}
							/>
						</div>
					</div>
					<div className="flex items-center justify-between gap-2">
						<Label className="text-sm" htmlFor="pf-hr">
							Only packs with ratings
						</Label>
						<Switch
							id="pf-hr"
							checked={hasRatings}
							onCheckedChange={(c) => void setHasRatings(!!c)}
						/>
					</div>
					<div className="grid gap-3 sm:grid-cols-2">
						<div className="space-y-1.5">
							<Label htmlFor="pf-from">Created from (date)</Label>
							<Input
								id="pf-from"
								type="date"
								value={fromStr?.slice(0, 10) ?? ""}
								onChange={(e) => void setFromStr(e.target.value || null)}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="pf-to">Created to (date)</Label>
							<Input
								id="pf-to"
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
