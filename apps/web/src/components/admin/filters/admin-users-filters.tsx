import { RoleSchema } from "@xamsa/schemas/db/schemas/enums/Role.schema";
import type { ListAdminUsersInputType } from "@xamsa/schemas/modules/admin";
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
	return Number.isFinite(n) ? n : undefined;
}

function rolesCsv(
	value: string | null | undefined,
): Array<"user" | "admin" | "moderator"> | undefined {
	const list = parseCommaList(value);
	if (!list?.length) return undefined;
	const out: Array<"user" | "admin" | "moderator"> = [];
	for (const x of list) {
		const r = RoleSchema.safeParse(x);
		if (r.success) out.push(r.data);
	}
	return out.length ? out : undefined;
}

export function useAdminUsersFilterUI() {
	const { from, to, fromStr, toStr, setFromStr, setToStr } =
		useAdminPeriodQuery();
	const [roles, setRoles] = useQueryState("ur", parseAsString);
	const [mpx, setMpx] = useQueryState("mpx", parseAsString);
	const [xpx, setXpx] = useQueryState("xpx", parseAsString);
	const [mel, setMel] = useQueryState("mel", parseAsString);
	const [xel, setXel] = useQueryState("xel", parseAsString);
	const [mho, setMho] = useQueryState("mho", parseAsString);
	const [xho, setXho] = useQueryState("xho", parseAsString);
	const [mplay, setMplay] = useQueryState("mpy", parseAsString);
	const [xplay, setXplay] = useQueryState("xpy", parseAsString);
	const [mpub, setMpub] = useQueryState("mpk", parseAsString);
	const [xpub, setXpub] = useQueryState("xpk", parseAsString);
	const [fo, setFo] = useQueryState("ufo", parseAsBoolean.withDefault(false));

	const filterInput = useMemo((): Partial<ListAdminUsersInputType> => {
		const roleList = rolesCsv(roles);
		return {
			...(roleList ? { roles: roleList } : {}),
			...(num(mpx) != null ? { minXp: num(mpx) } : {}),
			...(num(xpx) != null ? { maxXp: num(xpx) } : {}),
			...(num(mel) != null ? { minElo: num(mel) } : {}),
			...(num(xel) != null ? { maxElo: num(xel) } : {}),
			...(num(mho) != null ? { minHosted: num(mho) } : {}),
			...(num(xho) != null ? { maxHosted: num(xho) } : {}),
			...(num(mplay) != null ? { minPlayed: num(mplay) } : {}),
			...(num(xplay) != null ? { maxPlayed: num(xplay) } : {}),
			...(num(mpub) != null ? { minPacks: num(mpub) } : {}),
			...(num(xpub) != null ? { maxPacks: num(xpub) } : {}),
			...(from ? { from } : {}),
			...(to ? { to } : {}),
		};
	}, [roles, mpx, xpx, mel, xel, mho, xho, mplay, xplay, mpub, xpub, from, to]);

	const activeCount = useMemo(
		() =>
			countTruthy([
				{ value: rolesCsv(roles) },
				{ value: num(mpx) },
				{ value: num(xpx) },
				{ value: num(mel) },
				{ value: num(xel) },
				{ value: num(mho) },
				{ value: num(xho) },
				{ value: num(mplay) },
				{ value: num(xplay) },
				{ value: num(mpub) },
				{ value: num(xpub) },
				{ value: fromStr },
				{ value: toStr },
			]),
		[
			roles,
			mpx,
			xpx,
			mel,
			xel,
			mho,
			xho,
			mplay,
			xplay,
			mpub,
			xpub,
			fromStr,
			toStr,
		],
	);

	const clear = () => {
		void setRoles(null);
		void setMpx(null);
		void setXpx(null);
		void setMel(null);
		void setXel(null);
		void setMho(null);
		void setXho(null);
		void setMplay(null);
		void setXplay(null);
		void setMpub(null);
		void setXpub(null);
		void setFromStr(null);
		void setToStr(null);
	};

	const range = (
		label: string,
		a: string | null,
		sa: (v: string | null) => void,
		b: string | null,
		sb: (v: string | null) => void,
		id: string,
	) => (
		<div className="grid grid-cols-2 gap-2">
			<div className="space-y-1.5">
				<Label htmlFor={`${id}a`}>Min {label}</Label>
				<Input
					id={`${id}a`}
					type="number"
					value={a ?? ""}
					onChange={(e) => void sa(e.target.value || null)}
				/>
			</div>
			<div className="space-y-1.5">
				<Label htmlFor={`${id}b`}>Max {label}</Label>
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
				title="Users — filters"
				description="Min/max ranges are optional. Comma-separate list for roles: user, moderator, admin"
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
					<div className="space-y-1.5">
						<Label htmlFor="u-r">Roles</Label>
						<Input
							id="u-r"
							value={roles ?? ""}
							onChange={(e) => void setRoles(e.target.value || null)}
							placeholder="user, admin"
						/>
					</div>
					{range("XP", mpx, setMpx, xpx, setXpx, "ux")}
					{range("Elo", mel, setMel, xel, setXel, "ue")}
					{range("Hosted", mho, setMho, xho, setXho, "uh")}
					{range("Played", mplay, setMplay, xplay, setXplay, "upl")}
					{range("Packs", mpub, setMpub, xpub, setXpub, "upk")}
					<div className="grid grid-cols-2 gap-2">
						<div className="space-y-1.5">
							<Label htmlFor="u-from">Created from</Label>
							<Input
								id="u-from"
								type="date"
								value={fromStr?.slice(0, 10) ?? ""}
								onChange={(e) => void setFromStr(e.target.value || null)}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="u-to">Created to</Label>
							<Input
								id="u-to"
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
