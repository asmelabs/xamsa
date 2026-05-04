import type { ListAdminPostsInputType } from "@xamsa/schemas/modules/admin";
import { Button } from "@xamsa/ui/components/button";
import { Input } from "@xamsa/ui/components/input";
import { Label } from "@xamsa/ui/components/label";
import { parseAsBoolean, parseAsString, useQueryState } from "nuqs";
import { useMemo } from "react";
import { AdminFiltersButton } from "@/components/admin/admin-filters-button";
import { BetterDialog } from "@/components/better-dialog";
import { useAdminPeriodQuery } from "@/hooks/admin-filters/period";
import { countTruthy, parseCommaList } from "@/lib/csv-query";

function parseOptionalInt(s: string | null | undefined): number | undefined {
	if (s == null || s === "") return undefined;
	const n = Number(s);
	return Number.isFinite(n) ? Math.round(n) : undefined;
}

function parseTri(value: string | null | undefined): boolean | undefined {
	if (value === "1") return true;
	if (value === "0") return false;
	return undefined;
}

export function useAdminPostsFilterUI() {
	const { from, to, fromStr, toStr, setFromStr, setToStr } =
		useAdminPeriodQuery();
	const [auths, setAuths] = useQueryState("pau", parseAsString);
	const [hasImg, setHasImg] = useQueryState("phi", parseAsString);
	const [hasAtt, setHasAtt] = useQueryState("pha", parseAsString);
	const [minRx, setMinRx] = useQueryState("pmr", parseAsString);
	const [maxRx, setMaxRx] = useQueryState("pxr", parseAsString);
	const [minCm, setMinCm] = useQueryState("pmc", parseAsString);
	const [maxCm, setMaxCm] = useQueryState("pxc", parseAsString);
	const [fo, setFo] = useQueryState("pfo", parseAsBoolean.withDefault(false));

	const filterInput = useMemo((): Partial<ListAdminPostsInputType> => {
		const authorUsernames = parseCommaList(auths);
		const hasImage = parseTri(hasImg);
		const hasAttachment = parseTri(hasAtt);
		const minReactions = parseOptionalInt(minRx);
		const maxReactions = parseOptionalInt(maxRx);
		const minComments = parseOptionalInt(minCm);
		const maxComments = parseOptionalInt(maxCm);
		return {
			...(authorUsernames ? { authorUsernames } : {}),
			...(hasImage != null ? { hasImage } : {}),
			...(hasAttachment != null ? { hasAttachment } : {}),
			...(minReactions != null ? { minReactions } : {}),
			...(maxReactions != null ? { maxReactions } : {}),
			...(minComments != null ? { minComments } : {}),
			...(maxComments != null ? { maxComments } : {}),
			...(from ? { from } : {}),
			...(to ? { to } : {}),
		};
	}, [auths, hasImg, hasAtt, minRx, maxRx, minCm, maxCm, from, to]);

	const activeCount = useMemo(
		() =>
			countTruthy([
				{ value: parseCommaList(auths) },
				{ value: parseTri(hasImg) },
				{ value: parseTri(hasAtt) },
				{ value: parseOptionalInt(minRx) },
				{ value: parseOptionalInt(maxRx) },
				{ value: parseOptionalInt(minCm) },
				{ value: parseOptionalInt(maxCm) },
				{ value: fromStr },
				{ value: toStr },
			]),
		[auths, hasImg, hasAtt, minRx, maxRx, minCm, maxCm, fromStr, toStr],
	);

	const clear = () => {
		void setAuths(null);
		void setHasImg(null);
		void setHasAtt(null);
		void setMinRx(null);
		void setMaxRx(null);
		void setMinCm(null);
		void setMaxCm(null);
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
				title="Posts — filters"
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
						<Label>Author usernames</Label>
						<Input
							value={auths ?? ""}
							onChange={(e) => void setAuths(e.target.value || null)}
							placeholder="comma-separated"
						/>
					</div>
					<div className="grid grid-cols-2 gap-2">
						<div className="space-y-1">
							<Label>Has image</Label>
							<select
								className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
								value={hasImg ?? ""}
								onChange={(e) => void setHasImg(e.target.value || null)}
							>
								<option value="">Any</option>
								<option value="1">Yes</option>
								<option value="0">No</option>
							</select>
						</div>
						<div className="space-y-1">
							<Label>Has attachment</Label>
							<select
								className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
								value={hasAtt ?? ""}
								onChange={(e) => void setHasAtt(e.target.value || null)}
							>
								<option value="">Any</option>
								<option value="1">Yes</option>
								<option value="0">No</option>
							</select>
						</div>
					</div>
					<div className="grid grid-cols-2 gap-2">
						<div className="space-y-1">
							<Label>Min reactions</Label>
							<Input
								type="number"
								min="0"
								value={minRx ?? ""}
								onChange={(e) => void setMinRx(e.target.value || null)}
							/>
						</div>
						<div className="space-y-1">
							<Label>Max reactions</Label>
							<Input
								type="number"
								min="0"
								value={maxRx ?? ""}
								onChange={(e) => void setMaxRx(e.target.value || null)}
							/>
						</div>
					</div>
					<div className="grid grid-cols-2 gap-2">
						<div className="space-y-1">
							<Label>Min comments</Label>
							<Input
								type="number"
								min="0"
								value={minCm ?? ""}
								onChange={(e) => void setMinCm(e.target.value || null)}
							/>
						</div>
						<div className="space-y-1">
							<Label>Max comments</Label>
							<Input
								type="number"
								min="0"
								value={maxCm ?? ""}
								onChange={(e) => void setMaxCm(e.target.value || null)}
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
