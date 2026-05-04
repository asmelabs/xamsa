import {
	type AdminCommentTargetKind,
	AdminCommentTargetKindSchema,
	type ListAdminCommentsInputType,
} from "@xamsa/schemas/modules/admin";
import { Button } from "@xamsa/ui/components/button";
import { Input } from "@xamsa/ui/components/input";
import { Label } from "@xamsa/ui/components/label";
import { parseAsBoolean, parseAsString, useQueryState } from "nuqs";
import { useMemo } from "react";
import { AdminFiltersButton } from "@/components/admin/admin-filters-button";
import { BetterDialog } from "@/components/better-dialog";
import { useAdminPeriodQuery } from "@/hooks/admin-filters/period";
import { countTruthy, parseCommaList } from "@/lib/csv-query";

const TARGET_KINDS = AdminCommentTargetKindSchema.options;

const TARGET_LABEL: Record<AdminCommentTargetKind, string> = {
	post: "Post",
	pack: "Pack",
	topic: "Topic",
	question: "Question",
};

function parseOptionalInt(s: string | null | undefined): number | undefined {
	if (s == null || s === "") return undefined;
	const n = Number(s);
	return Number.isFinite(n) ? Math.round(n) : undefined;
}

function parseTargetKindsCsv(
	value: string | null | undefined,
): AdminCommentTargetKind[] | undefined {
	const parts = parseCommaList(value);
	if (!parts) return undefined;
	const allowed = new Set<string>(TARGET_KINDS);
	const filtered = parts.filter((p): p is AdminCommentTargetKind =>
		allowed.has(p),
	);
	return filtered.length > 0 ? filtered : undefined;
}

export function useAdminCommentsFilterUI() {
	const { from, to, fromStr, toStr, setFromStr, setToStr } =
		useAdminPeriodQuery();
	const [auths, setAuths] = useQueryState("cau", parseAsString);
	const [kinds, setKinds] = useQueryState("ckn", parseAsString);
	const [minRx, setMinRx] = useQueryState("cmr", parseAsString);
	const [maxRx, setMaxRx] = useQueryState("cxr", parseAsString);
	const [minDp, setMinDp] = useQueryState("cmd", parseAsString);
	const [maxDp, setMaxDp] = useQueryState("cxd", parseAsString);
	const [fo, setFo] = useQueryState("cfo", parseAsBoolean.withDefault(false));

	const filterInput = useMemo((): Partial<ListAdminCommentsInputType> => {
		const authorUsernames = parseCommaList(auths);
		const targetKinds = parseTargetKindsCsv(kinds);
		const minReactions = parseOptionalInt(minRx);
		const maxReactions = parseOptionalInt(maxRx);
		const minDepth = parseOptionalInt(minDp);
		const maxDepth = parseOptionalInt(maxDp);
		return {
			...(authorUsernames ? { authorUsernames } : {}),
			...(targetKinds ? { targetKinds } : {}),
			...(minReactions != null ? { minReactions } : {}),
			...(maxReactions != null ? { maxReactions } : {}),
			...(minDepth != null ? { minDepth } : {}),
			...(maxDepth != null ? { maxDepth } : {}),
			...(from ? { from } : {}),
			...(to ? { to } : {}),
		};
	}, [auths, kinds, minRx, maxRx, minDp, maxDp, from, to]);

	const activeCount = useMemo(
		() =>
			countTruthy([
				{ value: parseCommaList(auths) },
				{ value: parseTargetKindsCsv(kinds) },
				{ value: parseOptionalInt(minRx) },
				{ value: parseOptionalInt(maxRx) },
				{ value: parseOptionalInt(minDp) },
				{ value: parseOptionalInt(maxDp) },
				{ value: fromStr },
				{ value: toStr },
			]),
		[auths, kinds, minRx, maxRx, minDp, maxDp, fromStr, toStr],
	);

	const clear = () => {
		void setAuths(null);
		void setKinds(null);
		void setMinRx(null);
		void setMaxRx(null);
		void setMinDp(null);
		void setMaxDp(null);
		void setFromStr(null);
		void setToStr(null);
	};

	const selectedKinds = parseTargetKindsCsv(kinds) ?? [];
	const toggleKind = (kind: AdminCommentTargetKind) => {
		const set = new Set(selectedKinds);
		if (set.has(kind)) {
			set.delete(kind);
		} else {
			set.add(kind);
		}
		void setKinds(set.size === 0 ? null : [...set].join(","));
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
				title="Comments — filters"
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
					<div className="space-y-1">
						<Label>Target kinds</Label>
						<div className="flex flex-wrap gap-1.5">
							{TARGET_KINDS.map((kind) => {
								const active = selectedKinds.includes(kind);
								return (
									<button
										key={kind}
										type="button"
										onClick={() => toggleKind(kind)}
										className={`rounded-md border px-2.5 py-1 font-medium text-xs transition-colors ${
											active
												? "border-primary/55 bg-primary/10 text-foreground"
												: "border-border bg-card text-muted-foreground hover:text-foreground"
										}`}
									>
										{TARGET_LABEL[kind]}
									</button>
								);
							})}
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
							<Label>Min depth</Label>
							<Input
								type="number"
								min="0"
								max="3"
								value={minDp ?? ""}
								onChange={(e) => void setMinDp(e.target.value || null)}
							/>
						</div>
						<div className="space-y-1">
							<Label>Max depth</Label>
							<Input
								type="number"
								min="0"
								max="3"
								value={maxDp ?? ""}
								onChange={(e) => void setMaxDp(e.target.value || null)}
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
