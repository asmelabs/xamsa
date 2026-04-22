import type { ClickStatus } from "@xamsa/schemas/db/schemas/enums/ClickStatus.schema";
import { ClickStatusSchema } from "@xamsa/schemas/db/schemas/enums/ClickStatus.schema";
import type { ListAdminClicksInputType } from "@xamsa/schemas/modules/admin";
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

function clickStatuses(
	v: string | null | undefined,
): ClickStatus[] | undefined {
	const list = parseCommaList(v);
	if (!list?.length) return undefined;
	const out: ClickStatus[] = [];
	for (const x of list) {
		const r = ClickStatusSchema.safeParse(x);
		if (r.success) out.push(r.data);
	}
	return out.length ? out : undefined;
}

export function useAdminClicksFilterUI() {
	const { from, to, fromStr, toStr, setFromStr, setToStr } =
		useAdminPeriodQuery();
	const [pusers, setPusers] = useQueryState("cpl", parseAsString);
	const [gcodes, setGcodes] = useQueryState("cgc", parseAsString);
	const [qsl, setQsl] = useQueryState("cqs", parseAsString);
	const [tsl, setTsl] = useQueryState("cts", parseAsString);
	const [psl, setPsl] = useQueryState("cps", parseAsString);
	const [st, setSt] = useQueryState("cst", parseAsString);
	const [mpt, setMpt] = useQueryState("mpt", parseAsString);
	const [xpt, setXpt] = useQueryState("xpt", parseAsString);
	const [mps, setMps] = useQueryState("mps", parseAsString);
	const [xps, setXps] = useQueryState("xps", parseAsString);
	const [mms, setMms] = useQueryState("mms", parseAsString);
	const [xms, setXms] = useQueryState("xms", parseAsString);
	const [fo, setFo] = useQueryState("cfo", parseAsBoolean.withDefault(false));

	const filterInput = useMemo((): Partial<ListAdminClicksInputType> => {
		return {
			...(parseCommaList(pusers)
				? { playerUsernames: parseCommaList(pusers) }
				: {}),
			...(parseCommaList(gcodes) ? { gameCodes: parseCommaList(gcodes) } : {}),
			...(parseCommaList(qsl) ? { questionSlugs: parseCommaList(qsl) } : {}),
			...(parseCommaList(tsl) ? { topicSlugs: parseCommaList(tsl) } : {}),
			...(parseCommaList(psl) ? { packSlugs: parseCommaList(psl) } : {}),
			...(clickStatuses(st) ? { statuses: clickStatuses(st) } : {}),
			...(num(mpt) != null ? { minPoints: num(mpt) } : {}),
			...(num(xpt) != null ? { maxPoints: num(xpt) } : {}),
			...(num(mps) != null ? { minPos: num(mps) } : {}),
			...(num(xps) != null ? { maxPos: num(xps) } : {}),
			...(num(mms) != null ? { minMs: num(mms) } : {}),
			...(num(xms) != null ? { maxMs: num(xms) } : {}),
			...(from ? { from } : {}),
			...(to ? { to } : {}),
		};
	}, [
		pusers,
		gcodes,
		qsl,
		tsl,
		psl,
		st,
		mpt,
		xpt,
		mps,
		xps,
		mms,
		xms,
		from,
		to,
	]);

	const activeCount = useMemo(
		() =>
			countTruthy([
				{ value: parseCommaList(pusers) },
				{ value: parseCommaList(gcodes) },
				{ value: parseCommaList(qsl) },
				{ value: parseCommaList(tsl) },
				{ value: parseCommaList(psl) },
				{ value: clickStatuses(st) },
				{ value: num(mpt) },
				{ value: num(xpt) },
				{ value: num(mps) },
				{ value: num(xps) },
				{ value: num(mms) },
				{ value: num(xms) },
				{ value: fromStr },
				{ value: toStr },
			]),
		[
			pusers,
			gcodes,
			qsl,
			tsl,
			psl,
			st,
			mpt,
			xpt,
			mps,
			xps,
			mms,
			xms,
			fromStr,
			toStr,
		],
	);

	const clear = () => {
		void setPusers(null);
		void setGcodes(null);
		void setQsl(null);
		void setTsl(null);
		void setPsl(null);
		void setSt(null);
		void setMpt(null);
		void setXpt(null);
		void setMps(null);
		void setXps(null);
		void setMms(null);
		void setXms(null);
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
				title="Clicks — filters"
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
				<div className="max-h-[75vh] space-y-2 overflow-y-auto pr-1 text-sm">
					<Row label="Player usernames" v={pusers} setV={setPusers} />
					<Row label="Game codes" v={gcodes} setV={setGcodes} />
					<Row label="Question slugs" v={qsl} setV={setQsl} />
					<Row label="Topic slugs" v={tsl} setV={setTsl} />
					<Row label="Pack slugs" v={psl} setV={setPsl} />
					<div className="space-y-1">
						<Label>Statuses (pending, correct, wrong, expired)</Label>
						<Input
							value={st ?? ""}
							onChange={(e) => void setSt(e.target.value || null)}
						/>
					</div>
					<Rg a={mpt} b={xpt} sa={setMpt} sb={setXpt} k="points" />
					<Rg a={mps} b={xps} sa={setMps} sb={setXps} k="position" />
					<Rg a={mms} b={xms} sa={setMms} sb={setXms} k="reaction (ms)" />
					<div className="grid grid-cols-2 gap-2 pt-1">
						<div className="space-y-1">
							<Label>Clicked from</Label>
							<Input
								type="date"
								value={fromStr?.slice(0, 10) ?? ""}
								onChange={(e) => void setFromStr(e.target.value || null)}
							/>
						</div>
						<div className="space-y-1">
							<Label>Clicked to</Label>
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

function Row({
	label,
	v,
	setV,
}: {
	label: string;
	v: string | null;
	setV: (v: string | null) => void;
}) {
	return (
		<div className="space-y-1">
			<Label>{label}</Label>
			<Input
				value={v ?? ""}
				onChange={(e) => void setV(e.target.value || null)}
			/>
		</div>
	);
}

function Rg({
	a,
	b,
	sa,
	sb,
	k,
}: {
	a: string | null;
	b: string | null;
	sa: (v: string | null) => void;
	sb: (v: string | null) => void;
	k: string;
}) {
	return (
		<div className="grid grid-cols-2 gap-2">
			<div className="space-y-1">
				<Label>Min {k}</Label>
				<Input
					type="number"
					value={a ?? ""}
					onChange={(e) => void sa(e.target.value || null)}
				/>
			</div>
			<div className="space-y-1">
				<Label>Max {k}</Label>
				<Input
					type="number"
					value={b ?? ""}
					onChange={(e) => void sb(e.target.value || null)}
				/>
			</div>
		</div>
	);
}
