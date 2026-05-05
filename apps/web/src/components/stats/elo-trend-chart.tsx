import type { EloHistoryRow } from "@xamsa/schemas/modules/user";
import {
	CartesianGrid,
	Line,
	LineChart,
	ReferenceLine,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

interface EloTrendChartProps {
	history: EloHistoryRow[];
	startElo?: number;
}

function formatXAxis(d: Date): string {
	return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Profile Elo trend: oldest → newest. The chart receives history with newest
 * first (server orderBy), so we reverse here.
 */
export function EloTrendChart({
	history,
	startElo = 1000,
}: EloTrendChartProps) {
	if (history.length === 0) {
		return (
			<p className="py-6 text-center text-muted-foreground text-sm">
				No ranked games yet. Finish a game with two or more players to start
				tracking Elo.
			</p>
		);
	}

	const data = [...history].reverse().map((row) => ({
		date: row.finishedAt,
		dateLabel: formatXAxis(new Date(row.finishedAt)),
		elo: row.ratingAfter,
		delta: row.delta,
		gameCode: row.gameCode,
		packName: row.packName,
		rank: row.rank,
	}));

	return (
		<div className="h-[220px] w-full min-w-0">
			<ResponsiveContainer width="100%" height="100%">
				<LineChart
					data={data}
					margin={{ left: 0, right: 8, top: 8, bottom: 4 }}
				>
					<CartesianGrid strokeDasharray="2 4" opacity={0.4} />
					<XAxis
						dataKey="dateLabel"
						tick={{ fontSize: 10 }}
						interval="preserveStartEnd"
					/>
					<YAxis
						width={36}
						tick={{ fontSize: 10 }}
						domain={["dataMin - 20", "dataMax + 20"]}
					/>
					<ReferenceLine
						y={startElo}
						stroke="var(--muted-foreground)"
						strokeDasharray="3 3"
						label={{
							value: "Start",
							position: "right",
							fontSize: 9,
							fill: "var(--muted-foreground)",
						}}
					/>
					<Tooltip
						content={({ active, payload }) => {
							if (!active || !payload?.length) return null;
							const row = payload[0]?.payload as (typeof data)[number];
							if (!row) return null;
							const sign = row.delta > 0 ? "+" : row.delta < 0 ? "" : "±";
							return (
								<div className="rounded-md border border-border bg-popover px-2 py-1.5 text-popover-foreground text-xs shadow-md">
									<div className="font-medium">{row.packName}</div>
									<div className="text-muted-foreground">
										Game {row.gameCode}
										{row.rank != null ? ` · #${row.rank}` : ""}
									</div>
									<div className="font-mono">
										{row.elo} ({sign}
										{row.delta})
									</div>
								</div>
							);
						}}
					/>
					<Line
						type="monotone"
						dataKey="elo"
						stroke="var(--chart-1)"
						strokeWidth={2}
						dot={{ r: 2 }}
						activeDot={{ r: 4 }}
						isAnimationActive={false}
					/>
				</LineChart>
			</ResponsiveContainer>
		</div>
	);
}
