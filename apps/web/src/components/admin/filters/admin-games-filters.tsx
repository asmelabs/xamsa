import type { GameStatus } from "@xamsa/schemas/db/schemas/enums/GameStatus.schema";
import { GameStatusSchema } from "@xamsa/schemas/db/schemas/enums/GameStatus.schema";
import type { ListAdminGamesInputType } from "@xamsa/schemas/modules/admin";
import { Button } from "@xamsa/ui/components/button";
import { Input } from "@xamsa/ui/components/input";
import { Label } from "@xamsa/ui/components/label";
import { parseAsBoolean, parseAsString, useQueryState } from "nuqs";
import { useMemo } from "react";
import { AdminFiltersButton } from "@/components/admin/admin-filters-button";
import { BetterDialog } from "@/components/better-dialog";
import { useAdminPeriodQuery } from "@/hooks/admin-filters/period";
import { countTruthy, parseCommaList } from "@/lib/csv-query";

function num(s: string | null | undefined): number | undefined {
	if (s == null || s === "") return undefined;
	const n = Number(s);
	return Number.isFinite(n) ? Math.trunc(n) : undefined;
}

function parseGameStatuses(
	v: string | null | undefined,
): GameStatus[] | undefined {
	const list = parseCommaList(v);
	if (!list?.length) return undefined;
	const out: GameStatus[] = [];
	for (const x of list) {
		const r = GameStatusSchema.safeParse(x);
		if (r.success) out.push(r.data);
	}
	return out.length ? out : undefined;
}

export function useAdminGamesFilterUI() {
	const { from, to, fromStr, toStr, setFromStr, setToStr } =
		useAdminPeriodQuery();
	const [packs, setPacks] = useQueryState("gps", parseAsString);
	const [hosts, setHosts] = useQueryState("gho", parseAsString);
	const [st, setSt] = useQueryState("gst", parseAsString);
	const [mpl, setMpl] = useQueryState("mpl", parseAsString);
	const [xpl, setXpl] = useQueryState("xpl", parseAsString);
	const [mtop, setMtop] = useQueryState("mtop", parseAsString);
	const [xtop, setXtop] = useQueryState("xtop", parseAsString);
	const [mq, setMq] = useQueryState("mgq", parseAsString);
	const [xq, setXq] = useQueryState("xgq", parseAsString);
	const [fo, setFo] = useQueryState("gfo", parseAsBoolean.withDefault(false));

	const filterInput = useMemo((): Partial<ListAdminGamesInputType> => {
		const packSlugs = parseCommaList(packs);
		const hostUsernames = parseCommaList(hosts);
		const statuses = parseGameStatuses(st);
		return {
			...(packSlugs ? { packSlugs } : {}),
			...(hostUsernames ? { hostUsernames } : {}),
			...(statuses ? { statuses } : {}),
			...(num(mpl) != null ? { minPlayers: num(mpl) } : {}),
			...(num(xpl) != null ? { maxPlayers: num(xpl) } : {}),
			...(num(mtop) != null ? { minTopics: num(mtop) } : {}),
			...(num(xtop) != null ? { maxTopics: num(xtop) } : {}),
			...(num(mq) != null ? { minQuestions: num(mq) } : {}),
			...(num(xq) != null ? { maxQuestions: num(xq) } : {}),
			...(from ? { from } : {}),
			...(to ? { to } : {}),
		};
	}, [packs, hosts, st, mpl, xpl, mtop, xtop, mq, xq, from, to]);

	const activeCount = useMemo(
		() =>
			countTruthy([
				{ value: parseCommaList(packs) },
				{ value: parseCommaList(hosts) },
				{ value: parseGameStatuses(st) },
				{ value: num(mpl) },
				{ value: num(xpl) },
				{ value: num(mtop) },
				{ value: num(xtop) },
				{ value: num(mq) },
				{ value: num(xq) },
				{ value: fromStr },
				{ value: toStr },
			]),
		[packs, hosts, st, mpl, xpl, mtop, xtop, mq, xq, fromStr, toStr],
	);

	const clear = () => {
		void setPacks(null);
		void setHosts(null);
		void setSt(null);
		void setMpl(null);
		void setXpl(null);
		void setMtop(null);
		void setXtop(null);
		void setMq(null);
		void setXq(null);
		void setFromStr(null);
		void setToStr(null);
	};

	const rg = (
		a: string | null,
		sa: (v: string | null) => void,
		b: string | null,
		sb: (v: string | null) => void,
		lab: string,
		id: string,
	) => (
		<div className="grid grid-cols-2 gap-2">
			<div className="space-y-1">
				<Label htmlFor={`${id}a`}>Min {lab}</Label>
				<Input
					id={`${id}a`}
					type="number"
					value={a ?? ""}
					onChange={(e) => void sa(e.target.value || null)}
				/>
			</div>
			<div className="space-y-1">
				<Label htmlFor={`${id}b`}>Max {lab}</Label>
				<Input
					id={`${id}b`}
					type="number"
					value={b ?? ""}
					onChange={(e) => void sb(e.target.value || null)}
				/>
			</div>
		</div>
	);

	const filterUi = (
		<>
			<AdminFiltersButton
				onClick={() => setFo(true)}
				activeCount={activeCount}
			/>
			<BetterDialog
				opened={fo}
				setOpened={(o) => setFo(o ?? false)}
				title="Games — filters"
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
				<div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
					<div className="space-y-1">
						<Label>Pack slugs</Label>
						<Input
							value={packs ?? ""}
							onChange={(e) => void setPacks(e.target.value || null)}
							placeholder="slug-a, slug-b"
						/>
					</div>
					<div className="space-y-1">
						<Label>Host usernames</Label>
						<Input
							value={hosts ?? ""}
							onChange={(e) => void setHosts(e.target.value || null)}
						/>
					</div>
					<div className="space-y-1">
						<Label>Status (waiting, active, paused, completed)</Label>
						<Input
							value={st ?? ""}
							onChange={(e) => void setSt(e.target.value || null)}
						/>
					</div>
					{rg(mpl, setMpl, xpl, setXpl, "players", "gp")}
					{rg(mtop, setMtop, xtop, setXtop, "topics", "gt")}
					{rg(mq, setMq, xq, setXq, "questions", "gq")}
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
