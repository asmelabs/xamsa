import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ClickStatusSchema } from "@xamsa/schemas/db/schemas/enums/ClickStatus.schema";
import type { GetCompletedGameRecapOutputType } from "@xamsa/schemas/modules/game";
import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@xamsa/ui/components/alert";
import { Badge } from "@xamsa/ui/components/badge";
import { Button } from "@xamsa/ui/components/button";
import {
	Card,
	CardDescription,
	CardHeader,
	CardPanel,
	CardTitle,
} from "@xamsa/ui/components/card";
import { Checkbox } from "@xamsa/ui/components/checkbox";
import { Input } from "@xamsa/ui/components/input";
import { Label } from "@xamsa/ui/components/label";
import {
	Select,
	SelectItem,
	SelectPopup,
	SelectTrigger,
	SelectValue,
} from "@xamsa/ui/components/select";
import { Separator } from "@xamsa/ui/components/separator";
import { Spinner } from "@xamsa/ui/components/spinner";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@xamsa/ui/components/table";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@xamsa/ui/components/tabs";
import { format } from "date-fns";
import {
	ActivityIcon,
	ArrowLeftIcon,
	BarChart2,
	BarChart3Icon,
	ClockIcon,
	FilterIcon,
	LayoutListIcon,
	TrophyIcon,
	UsersIcon,
} from "lucide-react";
import { parseAsString, parseAsStringEnum, useQueryState } from "nuqs";
import { useMemo, useState } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Legend,
	Line,
	LineChart,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { formatDifficultyDr } from "@/lib/difficulty-display";
import { sortGamePlayersForScoreboard } from "@/lib/sort-game-players";
import { orpc } from "@/utils/orpc";
import {
	buildBadgesByPlayerId,
	PlayerRecapBadges,
} from "./player-recap-badges";

const CHART_FILLS = [
	"var(--chart-1)",
	"var(--chart-2)",
	"var(--chart-3)",
	"var(--chart-4)",
	"var(--chart-5)",
	"var(--chart-6)",
	"var(--chart-7)",
	"var(--chart-8)",
];

type Recap = GetCompletedGameRecapOutputType;

function formatDurationSeconds(
	totalSeconds: number | null | undefined,
): string {
	if (totalSeconds == null || totalSeconds < 0) return "—";
	const m = Math.floor(totalSeconds / 60);
	const s = totalSeconds % 60;
	if (m === 0) return `${s}s`;
	return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function formatReactionMs(ms: number | null | undefined): string {
	if (ms == null) return "—";
	if (ms < 1000) return `${ms}ms`;
	return `${(ms / 1000).toFixed(2)}s`;
}

function clickStatusBadgeVariant(
	status: string,
): "default" | "success" | "destructive" | "warning" | "outline" {
	switch (status) {
		case "correct":
			return "success";
		case "wrong":
			return "destructive";
		case "expired":
			return "warning";
		default:
			return "outline";
	}
}

function questionStatusLabel(status: string): string {
	switch (status) {
		case "pending":
			return "Pending";
		case "active":
			return "Active";
		case "answered":
			return "Answered";
		case "revealed":
			return "Revealed";
		case "skipped":
			return "Skipped";
		default:
			return status;
	}
}

function SummaryStat({
	label,
	value,
}: {
	label: string;
	value: string | number;
}) {
	return (
		<div className="rounded-xl border bg-card p-3 text-center shadow-xs/5">
			<p className="text-[10px] text-muted-foreground uppercase tracking-wide">
				{label}
			</p>
			<p className="mt-1 font-semibold text-lg tabular-nums">{value}</p>
		</div>
	);
}

function ScoresBarChart({ recap }: { recap: Recap }) {
	const sorted = sortGamePlayersForScoreboard(recap.players);
	const data = sorted.map((p, i) => ({
		name:
			p.user.name.length > 12 ? `${p.user.name.slice(0, 11)}…` : p.user.name,
		fullName: p.user.name,
		score: p.score,
		fill: CHART_FILLS[i % CHART_FILLS.length] ?? "var(--chart-1)",
	}));

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base">
					<TrophyIcon className="size-4 text-amber-600 dark:text-amber-400" />
					Final scores
				</CardTitle>
				<CardDescription>Total points per player</CardDescription>
			</CardHeader>
			<CardPanel className="pb-4">
				<div className="h-[280px] w-full min-w-0">
					<ResponsiveContainer width="100%" height="100%">
						<BarChart
							data={data}
							layout="vertical"
							margin={{ left: 8, right: 16, top: 8, bottom: 8 }}
						>
							<CartesianGrid
								strokeDasharray="3 3"
								className="stroke-muted/40"
								horizontal
								vertical={false}
							/>
							<XAxis type="number" tick={{ fontSize: 11 }} />
							<YAxis
								type="category"
								dataKey="name"
								width={88}
								tick={{ fontSize: 11 }}
							/>
							<Tooltip
								cursor={{
									fill: "color-mix(in srgb, var(--muted), transparent 70%)",
								}}
								content={({ active, payload }) => {
									if (!active || !payload?.length) return null;
									const row = payload[0]?.payload as (typeof data)[0];
									return (
										<div className="rounded-lg border bg-popover px-3 py-2 text-popover-foreground text-sm shadow-md">
											<p className="font-medium">{row.fullName}</p>
											<p className="text-muted-foreground tabular-nums">
												{row.score.toLocaleString()} pts
											</p>
										</div>
									);
								}}
							/>
							<Bar dataKey="score" radius={[0, 4, 4, 0]} maxBarSize={28}>
								{data.map((entry, index) => (
									<Cell key={`cell-${index.toString()}`} fill={entry.fill} />
								))}
							</Bar>
						</BarChart>
					</ResponsiveContainer>
				</div>
			</CardPanel>
		</Card>
	);
}

function OutcomesPieChart({ recap }: { recap: Recap }) {
	const { totals } = recap;
	const raw = [
		{
			name: "Correct",
			value: totals.totalCorrectAnswers,
			fill: "var(--success)",
		},
		{
			name: "Wrong",
			value: totals.totalIncorrectAnswers,
			fill: "var(--destructive)",
		},
		{
			name: "Expired",
			value: totals.totalExpiredAnswers,
			fill: "var(--warning)",
		},
	];
	const data = raw.filter((d) => d.value > 0);
	if (data.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Answer outcomes</CardTitle>
					<CardDescription>No recorded answers for this game</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Answer outcomes</CardTitle>
				<CardDescription>
					Share of host-resolved clicks (correct / wrong / expired)
				</CardDescription>
			</CardHeader>
			<CardPanel className="pb-4">
				<div className="h-[260px] w-full min-w-0">
					<ResponsiveContainer width="100%" height="100%">
						<PieChart>
							<Pie
								data={data}
								dataKey="value"
								nameKey="name"
								cx="50%"
								cy="50%"
								innerRadius={52}
								outerRadius={88}
								paddingAngle={2}
								label={({ name, percent }) =>
									`${name} ${((percent ?? 0) * 100).toFixed(0)}%`
								}
							>
								{data.map((entry, index) => (
									<Cell key={`slice-${index.toString()}`} fill={entry.fill} />
								))}
							</Pie>
							<Tooltip
								content={({ active, payload }) => {
									if (!active || !payload?.length) return null;
									const p = payload[0];
									const v = Number(p?.value ?? 0);
									return (
										<div className="rounded-lg border bg-popover px-3 py-2 text-popover-foreground text-sm shadow-md">
											<p className="font-medium">{String(p?.name)}</p>
											<p className="text-muted-foreground tabular-nums">
												{v.toLocaleString()} answers
											</p>
										</div>
									);
								}}
							/>
							<Legend />
						</PieChart>
					</ResponsiveContainer>
				</div>
			</CardPanel>
		</Card>
	);
}

function TopicDurationChart({ recap }: { recap: Recap }) {
	const data = recap.topics
		.map((t) => ({
			name: `R${t.order}`,
			label:
				t.topicName.length > 14 ? `${t.topicName.slice(0, 13)}…` : t.topicName,
			seconds: t.durationSeconds ?? 0,
			fill: "var(--chart-2)",
		}))
		.filter((d) => d.seconds > 0);

	if (data.length === 0) {
		return null;
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base">
					<ClockIcon className="size-4" />
					Time per round
				</CardTitle>
				<CardDescription>
					Seconds spent in each topic (when tracked)
				</CardDescription>
			</CardHeader>
			<CardPanel className="pb-4">
				<div className="h-[240px] w-full min-w-0">
					<ResponsiveContainer width="100%" height="100%">
						<BarChart
							data={data}
							margin={{ left: 8, right: 8, top: 8, bottom: 28 }}
						>
							<CartesianGrid
								strokeDasharray="3 3"
								className="stroke-muted/40"
								vertical={false}
							/>
							<XAxis dataKey="name" tick={{ fontSize: 11 }} />
							<YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
							<Tooltip
								cursor={{
									fill: "color-mix(in srgb, var(--muted), transparent 70%)",
								}}
								content={({ active, payload }) => {
									if (!active || !payload?.length) return null;
									const row = payload[0]?.payload as (typeof data)[0];
									return (
										<div className="rounded-lg border bg-popover px-3 py-2 text-popover-foreground text-sm shadow-md">
											<p className="font-medium">{row.label}</p>
											<p className="text-muted-foreground tabular-nums">
												{formatDurationSeconds(row.seconds)}
											</p>
										</div>
									);
								}}
							/>
							<Bar dataKey="seconds" radius={[4, 4, 0, 0]} maxBarSize={40}>
								{data.map((_, index) => (
									<Cell
										key={`td-${index.toString()}`}
										fill={
											CHART_FILLS[index % CHART_FILLS.length] ??
											"var(--chart-2)"
										}
									/>
								))}
							</Bar>
						</BarChart>
					</ResponsiveContainer>
				</div>
			</CardPanel>
		</Card>
	);
}

function formatSignedPoints(n: number): string {
	if (n === 0) return "0";
	if (n > 0) return `+${n}`;
	return String(n);
}

type MatrixMetric =
	| "points"
	| "clicks"
	| "correct"
	| "wrong"
	| "expired"
	| "firstBuzz";

const MATRIX_METRIC_OPTIONS: { value: MatrixMetric; label: string }[] = [
	{ value: "points", label: "Points" },
	{ value: "clicks", label: "Clicks" },
	{ value: "correct", label: "Correct" },
	{ value: "wrong", label: "Wrong" },
	{ value: "expired", label: "Expired" },
	{ value: "firstBuzz", label: "First buzz" },
];

function metricValueForClicks(
	clicks: Recap["topics"][number]["questions"][number]["clicks"],
	selectedPlayerIds: Set<string>,
	metric: MatrixMetric,
): number {
	const filtered = clicks.filter((c) => selectedPlayerIds.has(c.playerId));
	if (filtered.length === 0) return 0;
	switch (metric) {
		case "points":
			return filtered.reduce((s, c) => s + c.pointsAwarded, 0);
		case "clicks":
			return filtered.length;
		case "correct":
			return filtered.filter((c) => c.status === "correct").length;
		case "wrong":
			return filtered.filter((c) => c.status === "wrong").length;
		case "expired":
			return filtered.filter((c) => c.status === "expired").length;
		case "firstBuzz":
			return filtered.filter((c) => c.position === 1).length;
		default:
			return 0;
	}
}

function cellHasSelectedClicks(
	clicks: Recap["topics"][number]["questions"][number]["clicks"],
	selectedPlayerIds: Set<string>,
): boolean {
	return clicks.some((c) => selectedPlayerIds.has(c.playerId));
}

function formatMatrixCell(
	value: number,
	metric: MatrixMetric,
	hasClicks: boolean,
): string {
	if (!hasClicks) return "—";
	if (metric === "points") return formatSignedPoints(value);
	return String(value);
}

function columnMetricTotal(
	recap: Recap,
	questionOrder: number,
	selectedPlayerIds: Set<string>,
	metric: MatrixMetric,
): number {
	let sum = 0;
	for (const t of recap.topics) {
		const q = t.questions.find((qq) => qq.order === questionOrder);
		if (!q) continue;
		sum += metricValueForClicks(q.clicks, selectedPlayerIds, metric);
	}
	return sum;
}

function matrixMetricDescription(metric: MatrixMetric): string {
	switch (metric) {
		case "points":
			return "Net buzz points (sum of points awarded) for selected players in each slot.";
		case "clicks":
			return "Total buzzes (answer attempts) from selected players in each slot.";
		case "correct":
			return "Count of correct buzzes from selected players in each slot.";
		case "wrong":
			return "Count of wrong buzzes from selected players in each slot.";
		case "expired":
			return "Count of expired buzzes from selected players in each slot.";
		case "firstBuzz":
			return "Count of first-position buzzes from selected players in each slot.";
		default:
			return "";
	}
}

function ScoreTimelineLineChart({
	recap,
	selectedPlayerIds,
}: {
	recap: Recap;
	selectedPlayerIds: Set<string>;
}) {
	const allSorted = sortGamePlayersForScoreboard(recap.players);
	const sorted = allSorted.filter((p) => selectedPlayerIds.has(p.id));
	const nSelected = selectedPlayerIds.size;
	const data = recap.scoreTimeline.map((step) => {
		const row: Record<string, string | number> = {
			label: step.label,
			step: step.stepIndex,
		};
		for (const p of sorted) {
			row[p.id] = step.scoresByPlayerId[p.id] ?? 0;
		}
		return row;
	});

	const empty = (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base">
					<ActivityIcon className="size-4" />
					Score over time
				</CardTitle>
			</CardHeader>
			<CardPanel>
				<p className="text-muted-foreground text-sm">
					Select at least one player to see the chart.
				</p>
			</CardPanel>
		</Card>
	);

	if (nSelected === 0) {
		return empty;
	}

	if (data.length <= 1) {
		return null;
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base">
					<ActivityIcon className="size-4" />
					Score over time
				</CardTitle>
				<CardDescription>
					{nSelected === 1
						? "This player’s running total after each question."
						: "Running total after each question (points from buzz resolutions)."}
				</CardDescription>
			</CardHeader>
			<CardPanel className="pb-4">
				<div className="h-[300px] w-full min-w-0">
					<ResponsiveContainer width="100%" height="100%">
						<LineChart
							data={data}
							margin={{ left: 4, right: 8, top: 8, bottom: 48 }}
						>
							<CartesianGrid
								strokeDasharray="3 3"
								className="stroke-muted/40"
							/>
							<XAxis
								dataKey="label"
								tick={{ fontSize: 9 }}
								interval="preserveStartEnd"
								angle={-28}
								textAnchor="end"
								height={48}
							/>
							<YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={44} />
							<Tooltip
								content={({ active, label, payload }) => {
									if (!active || !payload?.length) return null;
									return (
										<div className="rounded-lg border bg-popover px-3 py-2 text-popover-foreground text-xs shadow-md">
											<p className="mb-1 font-medium">{String(label)}</p>
											<ul className="space-y-0.5">
												{payload.map((it) => (
													<li
														key={String(it.dataKey)}
														className="flex justify-between gap-4 tabular-nums"
													>
														<span className="text-muted-foreground">
															{it.name}
														</span>
														<span>{String(it.value)}</span>
													</li>
												))}
											</ul>
										</div>
									);
								}}
							/>
							<Legend wrapperStyle={{ fontSize: 12 }} />
							{sorted.map((p, i) => (
								<Line
									key={p.id}
									type="monotone"
									dataKey={p.id}
									name={p.user.name}
									stroke={
										CHART_FILLS[i % CHART_FILLS.length] ?? "var(--chart-1)"
									}
									dot={false}
									strokeWidth={2}
									isAnimationActive={false}
								/>
							))}
						</LineChart>
					</ResponsiveContainer>
				</div>
			</CardPanel>
		</Card>
	);
}

function QuestionOrderScoreMatrix({
	recap,
	selectedPlayerIds,
}: {
	recap: Recap;
	selectedPlayerIds: Set<string>;
}) {
	const [matrixMetric, setMatrixMetric] = useState<MatrixMetric>("points");

	const topics = useMemo(() => {
		const t = [...recap.topics];
		t.sort((a, b) => a.order - b.order);
		return t;
	}, [recap.topics]);

	if (selectedPlayerIds.size === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Score by question slot</CardTitle>
				</CardHeader>
				<CardPanel>
					<p className="text-muted-foreground text-sm">
						Select at least one player to see the matrix.
					</p>
				</CardPanel>
			</Card>
		);
	}

	const colTotals = [1, 2, 3, 4, 5].map((k) =>
		columnMetricTotal(recap, k, selectedPlayerIds, matrixMetric),
	);
	const grand = colTotals.reduce((s, n) => s + n, 0);

	return (
		<Card>
			<CardHeader className="space-y-3 sm:flex sm:flex-row sm:items-end sm:justify-between sm:space-y-0">
				<div className="min-w-0 space-y-1">
					<CardTitle className="text-base">Score by question slot</CardTitle>
					<CardDescription>
						{matrixMetricDescription(matrixMetric)}
					</CardDescription>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Label
						htmlFor="matrix-metric"
						className="whitespace-nowrap text-muted-foreground text-xs"
					>
						Show
					</Label>
					<Select
						value={matrixMetric}
						onValueChange={(v) => {
							if (v) setMatrixMetric(v as MatrixMetric);
						}}
					>
						<SelectTrigger
							id="matrix-metric"
							size="sm"
							className="w-42 min-w-0"
						>
							<SelectValue placeholder="Metric">
								{MATRIX_METRIC_OPTIONS.find((o) => o.value === matrixMetric)
									?.label ?? matrixMetric}
							</SelectValue>
						</SelectTrigger>
						<SelectPopup>
							{MATRIX_METRIC_OPTIONS.map((opt) => (
								<SelectItem key={opt.value} value={opt.value}>
									{opt.label}
								</SelectItem>
							))}
						</SelectPopup>
					</Select>
				</div>
			</CardHeader>
			<CardPanel className="min-w-0 overflow-x-auto pb-4">
				<Table variant="card" className="min-w-[520px] text-xs">
					<TableHeader>
						<TableRow>
							<TableHead className="w-18 whitespace-nowrap">Round</TableHead>
							{[1, 2, 3, 4, 5].map((k) => (
								<TableHead
									key={k}
									className="min-w-18 text-center"
									title={
										topics.find((t) => t.questions.some((q) => q.order === k))
											?.topicName
									}
								>
									Q{k}
								</TableHead>
							))}
							<TableHead className="min-w-18 text-center">Total</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{topics.map((t) => {
							let rowSum = 0;
							return (
								<TableRow key={t.order}>
									<TableCell className="whitespace-nowrap font-medium">
										<span title={t.topicName}>R{t.order}</span>
									</TableCell>
									{[1, 2, 3, 4, 5].map((k) => {
										const q = t.questions.find((qq) => qq.order === k);
										if (!q) {
											return (
												<TableCell key={k} className="text-center">
													—
												</TableCell>
											);
										}
										const has = cellHasSelectedClicks(
											q.clicks,
											selectedPlayerIds,
										);
										const value = metricValueForClicks(
											q.clicks,
											selectedPlayerIds,
											matrixMetric,
										);
										rowSum += value;
										return (
											<TableCell key={k} className="text-center">
												<div className="font-medium tabular-nums">
													{formatMatrixCell(value, matrixMetric, has)}
												</div>
											</TableCell>
										);
									})}
									<TableCell className="text-center font-semibold tabular-nums">
										{matrixMetric === "points"
											? formatSignedPoints(rowSum)
											: String(rowSum)}
									</TableCell>
								</TableRow>
							);
						})}
						<TableRow>
							<TableCell className="font-medium">Total</TableCell>
							{colTotals.map((ct, i) => (
								<TableCell key={i} className="text-center">
									<div className="font-medium tabular-nums">
										{matrixMetric === "points"
											? formatSignedPoints(ct)
											: String(ct)}
									</div>
								</TableCell>
							))}
							<TableCell className="text-center font-semibold tabular-nums">
								{matrixMetric === "points"
									? formatSignedPoints(grand)
									: String(grand)}
							</TableCell>
						</TableRow>
					</TableBody>
				</Table>
			</CardPanel>
		</Card>
	);
}

function GameFlowSection({ recap }: { recap: Recap }) {
	const sorted = sortGamePlayersForScoreboard(recap.players);
	const [selectedPlayerIds, setSelectedPlayerIds] = useState(
		() => new Set(sorted.map((p) => p.id)),
	);

	const allIds = sorted.map((p) => p.id);
	const isAll =
		allIds.length > 0 && allIds.every((id) => selectedPlayerIds.has(id));

	return (
		<div className="min-w-0 space-y-6">
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Players in this view</CardTitle>
					<CardDescription>
						Include players in the line chart and score matrix (default: all)
					</CardDescription>
				</CardHeader>
				<CardPanel className="space-y-3">
					<div className="flex flex-wrap gap-2">
						<Button
							size="sm"
							variant="outline"
							type="button"
							onClick={() => setSelectedPlayerIds(new Set(allIds))}
							disabled={isAll}
						>
							Select all
						</Button>
						<Button
							size="sm"
							variant="outline"
							type="button"
							onClick={() => setSelectedPlayerIds(new Set())}
							disabled={selectedPlayerIds.size === 0}
						>
							Clear
						</Button>
					</div>
					<div className="grid gap-2 sm:grid-cols-2">
						{sorted.map((p) => {
							const id = `flow-player-${p.id}`;
							const checked = selectedPlayerIds.has(p.id);
							return (
								<div key={p.id} className="flex items-center gap-2">
									<Checkbox
										id={id}
										checked={checked}
										onCheckedChange={(next) => {
											const on = next === true;
											setSelectedPlayerIds((prev) => {
												const n = new Set(prev);
												if (on) n.add(p.id);
												else n.delete(p.id);
												return n;
											});
										}}
									/>
									<Label htmlFor={id} className="truncate font-medium text-sm">
										{p.user.name}
									</Label>
								</div>
							);
						})}
					</div>
				</CardPanel>
			</Card>
			<ScoreTimelineLineChart
				recap={recap}
				selectedPlayerIds={selectedPlayerIds}
			/>
			<QuestionOrderScoreMatrix
				recap={recap}
				selectedPlayerIds={selectedPlayerIds}
			/>
		</div>
	);
}

function StreaksSummary({ recap }: { recap: Recap }) {
	const sorted = sortGamePlayersForScoreboard(recap.players);
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Streaks</CardTitle>
				<CardDescription>
					Best correct / wrong-answer runs during the game
				</CardDescription>
			</CardHeader>
			<CardPanel>
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{sorted.map((p) => (
						<div
							key={p.id}
							className="rounded-xl border border-border bg-muted/20 px-3 py-2.5"
						>
							<p className="truncate font-medium text-sm">{p.user.name}</p>
							<div className="mt-1 flex justify-between gap-2 text-xs">
								<span className="text-muted-foreground">Best correct run</span>
								<span className="font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
									{p.longestCorrectStreak}
								</span>
							</div>
							<div className="mt-0.5 flex justify-between gap-2 text-xs">
								<span className="text-muted-foreground">Long wrong run</span>
								<span className="font-semibold text-rose-600 tabular-nums dark:text-rose-400">
									{p.longestWrongStreak}
								</span>
							</div>
						</div>
					))}
				</div>
			</CardPanel>
		</Card>
	);
}

function ClicksTable({
	clicks,
}: {
	clicks: Recap["topics"][number]["questions"][number]["clicks"];
}) {
	if (clicks.length === 0) {
		return <p className="text-muted-foreground text-xs">No buzzes recorded.</p>;
	}

	return (
		<Table variant="card" className="text-xs">
			<TableHeader>
				<TableRow>
					<TableHead>#</TableHead>
					<TableHead>Player</TableHead>
					<TableHead>Status</TableHead>
					<TableHead>Reaction</TableHead>
					<TableHead>Points</TableHead>
					<TableHead>Buzzed</TableHead>
					<TableHead>Resolved</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{clicks.map((c) => (
					<TableRow key={c.id}>
						<TableCell className="tabular-nums">{c.position}</TableCell>
						<TableCell className="max-w-[140px] truncate font-medium">
							{c.playerName}
						</TableCell>
						<TableCell>
							<Badge
								variant={clickStatusBadgeVariant(c.status)}
								className="text-[10px]"
							>
								{c.status}
							</Badge>
						</TableCell>
						<TableCell className="tabular-nums">
							{formatReactionMs(c.reactionMs)}
						</TableCell>
						<TableCell className="tabular-nums">
							{c.pointsAwarded > 0 ? "+" : ""}
							{c.pointsAwarded}
						</TableCell>
						<TableCell className="text-muted-foreground">
							{format(c.clickedAt, "HH:mm:ss.SSS")}
						</TableCell>
						<TableCell className="text-muted-foreground">
							{c.answeredAt ? format(c.answeredAt, "HH:mm:ss.SSS") : "—"}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

function QuestionBlock({
	q,
}: {
	q: Recap["topics"][number]["questions"][number];
}) {
	return (
		<div className="rounded-xl border bg-muted/20 p-4">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
				<div className="min-w-0 flex-1 space-y-1">
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="outline" className="font-mono text-[10px]">
							Q{q.order}
						</Badge>
						<Badge variant="secondary" className="text-[10px]">
							{q.points} pts
						</Badge>
						<Badge variant="outline" className="text-[10px]">
							{questionStatusLabel(q.status)}
						</Badge>
						{q.wasSkipped ? (
							<Badge variant="warning" className="text-[10px]">
								Skipped
							</Badge>
						) : null}
					</div>
					<p className="font-medium text-sm leading-snug" title={q.text}>
						{q.text}
					</p>
					<p className="text-muted-foreground text-xs">
						Answer: <span className="text-foreground">{q.answer}</span>
					</p>
					{q.winnerName ? (
						<p className="text-green-700 text-xs dark:text-green-400">
							Winner: {q.winnerName}
						</p>
					) : null}
				</div>
				<div className="grid shrink-0 grid-cols-2 gap-x-4 gap-y-1 text-[11px] sm:text-right">
					<span className="text-muted-foreground">Buzz order</span>
					<span className="tabular-nums">
						{q.firstBuzzMs != null ? formatReactionMs(q.firstBuzzMs) : "—"}
					</span>
					<span className="text-muted-foreground">Question time</span>
					<span className="tabular-nums">
						{formatDurationSeconds(q.durationSeconds)}
					</span>
					<span className="text-muted-foreground">Clicks</span>
					<span className="tabular-nums">{q.totalClicks}</span>
					<span className="text-muted-foreground">✓ / ✗ / exp</span>
					<span className="tabular-nums">
						{q.totalCorrectAnswers} / {q.totalIncorrectAnswers} /{" "}
						{q.totalExpiredClicks}
					</span>
					<span className="text-muted-foreground">QDR</span>
					<span className="tabular-nums">
						{formatDifficultyDr(q.qdr, q.qdrScoredAttempts > 0)}
					</span>
				</div>
			</div>
			<Separator className="my-3" />
			<p className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
				All buzzes (order preserved)
			</p>
			<ClicksTable clicks={q.clicks} />
		</div>
	);
}

function collectClicksForPlayer(recap: Recap, playerId: string) {
	const rows: Array<{
		topicOrder: number;
		topicName: string;
		questionOrder: number;
		click: Recap["topics"][number]["questions"][number]["clicks"][number];
	}> = [];

	for (const t of recap.topics) {
		for (const q of t.questions) {
			for (const c of q.clicks) {
				if (c.playerId === playerId) {
					rows.push({
						topicOrder: t.order,
						topicName: t.topicName,
						questionOrder: q.order,
						click: c,
					});
				}
			}
		}
	}

	rows.sort((a, b) => {
		if (a.topicOrder !== b.topicOrder) return a.topicOrder - b.topicOrder;
		if (a.questionOrder !== b.questionOrder)
			return a.questionOrder - b.questionOrder;
		return a.click.position - b.click.position;
	});

	return rows;
}

const BUZZ_FILTER_STATUSES = ["correct", "wrong", "expired"] as const;

type BuzzFilterStatus = (typeof BUZZ_FILTER_STATUSES)[number];

function buzzFilterRowLabel(status: BuzzFilterStatus): string {
	switch (status) {
		case "correct":
			return "Correct";
		case "wrong":
			return "Wrong";
		case "expired":
			return "Expired";
		default:
			return status;
	}
}

function StatsPlayerBuzzTable({
	clicks,
}: {
	clicks: ReturnType<typeof collectClicksForPlayer>;
}) {
	const [included, setIncluded] = useState<Record<BuzzFilterStatus, boolean>>({
		correct: true,
		wrong: true,
		expired: true,
	});

	const countsByStatus = useMemo(() => {
		const m: Record<BuzzFilterStatus, number> = {
			correct: 0,
			wrong: 0,
			expired: 0,
		};
		for (const row of clicks) {
			const parsed = ClickStatusSchema.safeParse(row.click.status);
			if (!parsed.success) continue;
			if (parsed.data === "pending") continue;
			m[parsed.data] += 1;
		}
		return m;
	}, [clicks]);

	const filtered = useMemo(
		() =>
			clicks.filter((row) => {
				const parsed = ClickStatusSchema.safeParse(row.click.status);
				if (!parsed.success) return false;
				if (parsed.data === "pending") return true;
				return included[parsed.data];
			}),
		[clicks, included],
	);

	const filterActive = BUZZ_FILTER_STATUSES.some((s) => !included[s]);

	const toggleStatus = (s: BuzzFilterStatus) => {
		setIncluded((p) => ({ ...p, [s]: !p[s] }));
	};

	const selectAllStatuses = () => {
		setIncluded({
			correct: true,
			wrong: true,
			expired: true,
		});
	};

	return (
		<div>
			<div className="mb-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
				<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
					Every buzz ({filtered.length}
					{filterActive ? ` of ${clicks.length}` : ""})
				</p>
				{clicks.length > 0 ? (
					<div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
						<span className="text-[10px] text-muted-foreground uppercase tracking-wide">
							Status
						</span>
						<div className="flex flex-wrap gap-x-3 gap-y-1">
							{BUZZ_FILTER_STATUSES.map((st) => (
								<label
									key={st}
									className="flex cursor-pointer items-center gap-1.5 text-xs"
								>
									<Checkbox
										checked={included[st]}
										onCheckedChange={() => {
											toggleStatus(st);
										}}
									/>
									<span>
										{buzzFilterRowLabel(st)}
										<span className="text-muted-foreground">
											{" "}
											({countsByStatus[st]})
										</span>
									</span>
								</label>
							))}
						</div>
						{filterActive ? (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="h-7 px-2 text-[11px]"
								onClick={selectAllStatuses}
							>
								Show all
							</Button>
						) : null}
					</div>
				) : null}
			</div>
			{clicks.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					No buzzes for this player.
				</p>
			) : filtered.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					No buzzes match the selected statuses.
				</p>
			) : (
				<Table variant="card" className="text-xs">
					<TableHeader>
						<TableRow>
							<TableHead>Round</TableHead>
							<TableHead>Q</TableHead>
							<TableHead>#</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Reaction</TableHead>
							<TableHead>Pts</TableHead>
							<TableHead>Buzzed</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{filtered.map((row) => (
							<TableRow key={row.click.id}>
								<TableCell className="max-w-[100px] truncate">
									{row.topicName}
								</TableCell>
								<TableCell className="tabular-nums">
									{row.questionOrder}
								</TableCell>
								<TableCell className="tabular-nums">
									{row.click.position}
								</TableCell>
								<TableCell>
									<Badge
										variant={clickStatusBadgeVariant(row.click.status)}
										className="text-[10px]"
									>
										{row.click.status}
									</Badge>
								</TableCell>
								<TableCell className="tabular-nums">
									{formatReactionMs(row.click.reactionMs)}
								</TableCell>
								<TableCell className="tabular-nums">
									{row.click.pointsAwarded > 0 ? "+" : ""}
									{row.click.pointsAwarded}
								</TableCell>
								<TableCell className="text-muted-foreground">
									{format(row.click.clickedAt, "HH:mm:ss.SSS")}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
		</div>
	);
}

function parseOptionalInt(raw: string | null | undefined): number | null {
	const t = String(raw ?? "").trim();
	if (t === "") return null;
	const n = Number.parseInt(t, 10);
	return Number.isFinite(n) ? n : null;
}

function parseOptionalNonNegInt(raw: string | null | undefined): number | null {
	const n = parseOptionalInt(raw);
	if (n == null) return null;
	return n < 0 ? null : n;
}

/** Float bounds for difficulty (TDR / avg QDR); empty → no bound. */
function parseOptionalFiniteNumber(
	raw: string | null | undefined,
): number | null {
	const t = String(raw ?? "").trim();
	if (t === "") return null;
	const n = Number.parseFloat(t);
	return Number.isFinite(n) ? n : null;
}

/** Prefer rollup vs sum of question rows so filters match what users see if data ever diverges. */
function topicBuzzTotal(topic: Recap["topics"][number]): number {
	const sumQuestions = topic.questions.reduce((s, q) => s + q.totalClicks, 0);
	return Math.max(topic.totalClicks, sumQuestions);
}

function topicAverageRatedQdr(topic: Recap["topics"][number]): number | null {
	const rated = topic.questions.filter((q) => q.qdrScoredAttempts > 0);
	if (rated.length === 0) return null;
	const sum = rated.reduce((s, q) => s + q.qdr, 0);
	return sum / rated.length;
}

function roundTopicMatchesSearch(
	topic: Recap["topics"][number],
	q: string,
): boolean {
	const s = q.trim().toLowerCase();
	if (s === "") return true;
	if (topic.topicName.toLowerCase().includes(s)) return true;
	const orderStr = String(topic.order);
	if (s === orderStr) return true;
	if (s === `round ${orderStr}` || s === `r${orderStr}`) return true;
	if (s.startsWith("round ")) {
		const rest = s.slice(6).trim();
		return rest === orderStr;
	}
	return false;
}

function CompletedGameStatsLoaded({
	recap,
	code,
}: {
	recap: Recap;
	code: string;
}) {
	const [statTab, setStatTab] = useQueryState(
		"tab",
		parseAsStringEnum([
			"overview",
			"by-round",
			"by-player",
			"flow",
		]).withDefault("overview"),
	);
	const [roundQ, setRoundQ] = useQueryState(
		"round_q",
		parseAsString.withDefault(""),
	);
	const [roundOrder, setRoundOrder] = useQueryState(
		"round_order",
		parseAsString.withDefault(""),
	);
	const [roundClicksMinRaw, setRoundClicksMinRaw] = useQueryState(
		"round_clicks_min",
		parseAsString.withDefault(""),
	);
	const [roundClicksMaxRaw, setRoundClicksMaxRaw] = useQueryState(
		"round_clicks_max",
		parseAsString.withDefault(""),
	);
	const [roundTdrMinRaw, setRoundTdrMinRaw] = useQueryState(
		"round_tdr_min",
		parseAsString.withDefault(""),
	);
	const [roundTdrMaxRaw, setRoundTdrMaxRaw] = useQueryState(
		"round_tdr_max",
		parseAsString.withDefault(""),
	);
	const [roundQdrMinRaw, setRoundQdrMinRaw] = useQueryState(
		"round_qdr_min",
		parseAsString.withDefault(""),
	);
	const [roundQdrMaxRaw, setRoundQdrMaxRaw] = useQueryState(
		"round_qdr_max",
		parseAsString.withDefault(""),
	);
	const [playerQ, setPlayerQ] = useQueryState(
		"player_q",
		parseAsString.withDefault(""),
	);
	const [playerScoreMinRaw, setPlayerScoreMinRaw] = useQueryState(
		"player_score_min",
		parseAsString.withDefault(""),
	);
	const [playerScoreMaxRaw, setPlayerScoreMaxRaw] = useQueryState(
		"player_score_max",
		parseAsString.withDefault(""),
	);
	const [playerCorrectMinRaw, setPlayerCorrectMinRaw] = useQueryState(
		"player_correct_min",
		parseAsString.withDefault(""),
	);
	const [playerCorrectMaxRaw, setPlayerCorrectMaxRaw] = useQueryState(
		"player_correct_max",
		parseAsString.withDefault(""),
	);
	const [playerWrongMinRaw, setPlayerWrongMinRaw] = useQueryState(
		"player_wrong_min",
		parseAsString.withDefault(""),
	);
	const [playerWrongMaxRaw, setPlayerWrongMaxRaw] = useQueryState(
		"player_wrong_max",
		parseAsString.withDefault(""),
	);
	const [playerClicksMinRaw, setPlayerClicksMinRaw] = useQueryState(
		"player_clicks_min",
		parseAsString.withDefault(""),
	);
	const [playerClicksMaxRaw, setPlayerClicksMaxRaw] = useQueryState(
		"player_clicks_max",
		parseAsString.withDefault(""),
	);

	const sortedPlayers = sortGamePlayersForScoreboard(recap.players);
	const badgesByPlayerId = useMemo(
		() => buildBadgesByPlayerId(recap.badgeAwards),
		[recap.badgeAwards],
	);
	const winner = recap.winnerId
		? recap.players.find((p) => p.id === recap.winnerId)
		: sortedPlayers[0];

	const topicOrdersSorted = useMemo(() => {
		const orders = [...new Set(recap.topics.map((t) => t.order))];
		orders.sort((a, b) => a - b);
		return orders;
	}, [recap.topics]);

	const filteredTopics = useMemo(() => {
		const topics = [...recap.topics];
		topics.sort((a, b) => a.order - b.order);
		const rq = roundQ;
		const ro = roundOrder.trim();
		const ordFilter = ro === "" ? null : Number.parseInt(ro, 10);
		const clicksMin = parseOptionalNonNegInt(roundClicksMinRaw);
		const clicksMax = parseOptionalNonNegInt(roundClicksMaxRaw);
		const tdrMin = parseOptionalFiniteNumber(roundTdrMinRaw);
		const tdrMax = parseOptionalFiniteNumber(roundTdrMaxRaw);
		const qdrMin = parseOptionalFiniteNumber(roundQdrMinRaw);
		const qdrMax = parseOptionalFiniteNumber(roundQdrMaxRaw);
		const qdrFilterActive = qdrMin != null || qdrMax != null;
		return topics.filter((topic) => {
			if (
				ordFilter != null &&
				Number.isFinite(ordFilter) &&
				topic.order !== ordFilter
			) {
				return false;
			}
			if (!roundTopicMatchesSearch(topic, rq)) return false;
			const buzzes = topicBuzzTotal(topic);
			if (clicksMin != null && buzzes < clicksMin) return false;
			if (clicksMax != null && buzzes > clicksMax) return false;
			if (tdrMin != null && topic.tdr < tdrMin) return false;
			if (tdrMax != null && topic.tdr > tdrMax) return false;
			if (qdrFilterActive) {
				const avgQ = topicAverageRatedQdr(topic);
				if (avgQ == null) return false;
				if (qdrMin != null && avgQ < qdrMin) return false;
				if (qdrMax != null && avgQ > qdrMax) return false;
			}
			return true;
		});
	}, [
		recap.topics,
		roundQ,
		roundOrder,
		roundClicksMinRaw,
		roundClicksMaxRaw,
		roundTdrMinRaw,
		roundTdrMaxRaw,
		roundQdrMinRaw,
		roundQdrMaxRaw,
	]);

	const filteredPlayers = useMemo(() => {
		const pq = playerQ.trim().toLowerCase();
		const smin = parseOptionalInt(playerScoreMinRaw);
		const smax = parseOptionalInt(playerScoreMaxRaw);
		const cmin = parseOptionalNonNegInt(playerCorrectMinRaw);
		const cmax = parseOptionalNonNegInt(playerCorrectMaxRaw);
		const wmin = parseOptionalNonNegInt(playerWrongMinRaw);
		const wmax = parseOptionalNonNegInt(playerWrongMaxRaw);
		const clkmin = parseOptionalNonNegInt(playerClicksMinRaw);
		const clkmax = parseOptionalNonNegInt(playerClicksMaxRaw);
		return sortedPlayers.filter((player) => {
			if (pq) {
				const un = player.user.username.toLowerCase();
				const nm = player.user.name.toLowerCase();
				if (!un.includes(pq) && !nm.includes(pq)) return false;
			}
			if (smin != null && player.score < smin) return false;
			if (smax != null && player.score > smax) return false;
			if (cmin != null && player.correctAnswers < cmin) return false;
			if (cmax != null && player.correctAnswers > cmax) return false;
			if (wmin != null && player.incorrectAnswers < wmin) return false;
			if (wmax != null && player.incorrectAnswers > wmax) return false;
			if (clkmin != null && player.totalClicks < clkmin) return false;
			if (clkmax != null && player.totalClicks > clkmax) return false;
			return true;
		});
	}, [
		sortedPlayers,
		playerQ,
		playerScoreMinRaw,
		playerScoreMaxRaw,
		playerCorrectMinRaw,
		playerCorrectMaxRaw,
		playerWrongMinRaw,
		playerWrongMaxRaw,
		playerClicksMinRaw,
		playerClicksMaxRaw,
	]);

	const clearRoundFilters = () => {
		setRoundQ("");
		setRoundOrder("");
		setRoundClicksMinRaw("");
		setRoundClicksMaxRaw("");
		setRoundTdrMinRaw("");
		setRoundTdrMaxRaw("");
		setRoundQdrMinRaw("");
		setRoundQdrMaxRaw("");
	};

	const clearPlayerFilters = () => {
		setPlayerQ("");
		setPlayerScoreMinRaw("");
		setPlayerScoreMaxRaw("");
		setPlayerCorrectMinRaw("");
		setPlayerCorrectMaxRaw("");
		setPlayerWrongMinRaw("");
		setPlayerWrongMaxRaw("");
		setPlayerClicksMinRaw("");
		setPlayerClicksMaxRaw("");
	};

	return (
		<div className="min-h-screen bg-muted/30">
			<div className="mx-auto max-w-5xl space-y-6 p-4 pb-16">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div className="space-y-1">
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="outline" className="font-mono">
								{recap.code}
							</Badge>
							{winner ? (
								<Badge variant="success" className="gap-1">
									<TrophyIcon className="size-3" />
									{winner.user.name}
								</Badge>
							) : null}
						</div>
						<h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
							{recap.pack.name}
						</h1>
						<p className="text-muted-foreground text-sm">
							{recap.startedAt && recap.finishedAt ? (
								<>
									{format(recap.startedAt, "MMM d, yyyy · HH:mm")} —{" "}
									{format(recap.finishedAt, "HH:mm")}
									<span className="mx-1.5">·</span>
								</>
							) : null}
							Duration {formatDurationSeconds(recap.durationSeconds)}
						</p>
					</div>
					<Button
						variant="outline"
						size="sm"
						render={<Link to="/g/$code" params={{ code }} />}
					>
						<ArrowLeftIcon />
						Back to game
					</Button>
				</div>

				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
					<SummaryStat label="Topics" value={recap.totals.totalTopics} />
					<SummaryStat label="Questions" value={recap.totals.totalQuestions} />
					<SummaryStat
						label="Unresolved Qs"
						value={recap.totals.totalUnresolvedQuestions}
					/>
					<SummaryStat
						label="Host skipped Qs"
						value={recap.totals.totalHostSkippedQuestions}
					/>
					<SummaryStat label="Players" value={recap.players.length} />
					<SummaryStat
						label="Pack difficulty"
						value={formatDifficultyDr(
							recap.pack.pdr,
							recap.pack.hasRatedDifficulty,
						)}
					/>
				</div>

				<div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
					<SummaryStat
						label="Total answers"
						value={recap.totals.totalAnswers}
					/>
					<SummaryStat
						label="Correct"
						value={recap.totals.totalCorrectAnswers}
					/>
					<SummaryStat
						label="Wrong"
						value={recap.totals.totalIncorrectAnswers}
					/>
					<SummaryStat
						label="Expired"
						value={recap.totals.totalExpiredAnswers}
					/>
					<SummaryStat
						label="Points +"
						value={recap.totals.totalPointsAwarded.toLocaleString()}
					/>
					<SummaryStat
						label="Points −"
						value={recap.totals.totalPointsDeducted.toLocaleString()}
					/>
				</div>

				<Tabs
					value={statTab}
					onValueChange={(value) => {
						void setStatTab(
							value as "overview" | "by-round" | "by-player" | "flow",
						);
					}}
				>
					<TabsList className="w-full min-w-0 flex-wrap justify-start sm:w-auto">
						<TabsTab value="overview">
							<BarChart3Icon className="size-4" />
							Overview
						</TabsTab>
						<TabsTab value="by-round">
							<LayoutListIcon className="size-4" />
							By round
						</TabsTab>
						<TabsTab value="by-player">
							<UsersIcon className="size-4" />
							By player
						</TabsTab>
						<TabsTab value="flow">
							<ActivityIcon className="size-4" />
							Flow
						</TabsTab>
					</TabsList>

					<TabsPanel value="overview" className="mt-4 space-y-6">
						<div className="grid gap-6 lg:grid-cols-2">
							<ScoresBarChart recap={recap} />
							<OutcomesPieChart recap={recap} />
						</div>
						<TopicDurationChart recap={recap} />
						<StreaksSummary recap={recap} />
					</TabsPanel>

					<TabsPanel value="flow" className="mt-4 min-w-0 space-y-6">
						<GameFlowSection key={recap.code} recap={recap} />
					</TabsPanel>

					<TabsPanel value="by-round" className="mt-4 space-y-6">
						<div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
							<div className="flex flex-wrap items-center gap-2">
								<FilterIcon className="size-4 text-muted-foreground" />
								<span className="font-medium text-sm">Round filters</span>
							</div>
							<div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
								<div className="grid gap-1.5 md:col-span-2 xl:col-span-2">
									<Label
										className="text-muted-foreground text-xs"
										htmlFor="stats-round-q"
									>
										Search topic name or round #
									</Label>
									<Input
										id="stats-round-q"
										onChange={(e) => setRoundQ(e.target.value)}
										placeholder="Filter by topic…"
										value={roundQ}
									/>
								</div>
								<div className="grid gap-1.5">
									<Label
										className="text-muted-foreground text-xs"
										htmlFor="stats-round-order"
									>
										Round
									</Label>
									<Select
										onValueChange={(v) =>
											setRoundOrder(v === "__all__" ? "" : v)
										}
										value={roundOrder === "" ? "__all__" : roundOrder}
									>
										<SelectTrigger id="stats-round-order">
											<SelectValue placeholder="All rounds" />
										</SelectTrigger>
										<SelectPopup>
											<SelectItem value="__all__">All rounds</SelectItem>
											{topicOrdersSorted.map((o) => (
												<SelectItem key={o} value={String(o)}>
													Round {o}
												</SelectItem>
											))}
										</SelectPopup>
									</Select>
								</div>
								<div className="grid gap-1.5">
									<Label
										className="text-muted-foreground text-xs"
										htmlFor="stats-round-clicks-min"
									>
										Min buzzes (topic)
									</Label>
									<Input
										id="stats-round-clicks-min"
										inputMode="numeric"
										onChange={(e) => setRoundClicksMinRaw(e.target.value)}
										placeholder="Any"
										value={roundClicksMinRaw}
									/>
								</div>
								<div className="grid gap-1.5">
									<Label
										className="text-muted-foreground text-xs"
										htmlFor="stats-round-clicks-max"
									>
										Max buzzes (topic)
									</Label>
									<Input
										id="stats-round-clicks-max"
										inputMode="numeric"
										onChange={(e) => setRoundClicksMaxRaw(e.target.value)}
										placeholder="Any"
										value={roundClicksMaxRaw}
									/>
								</div>
								<div className="grid gap-1.5">
									<Label
										className="text-muted-foreground text-xs"
										htmlFor="stats-round-tdr-min"
									>
										Min TDR
									</Label>
									<Input
										id="stats-round-tdr-min"
										inputMode="decimal"
										onChange={(e) => setRoundTdrMinRaw(e.target.value)}
										placeholder="Any"
										value={roundTdrMinRaw}
									/>
								</div>
								<div className="grid gap-1.5">
									<Label
										className="text-muted-foreground text-xs"
										htmlFor="stats-round-tdr-max"
									>
										Max TDR
									</Label>
									<Input
										id="stats-round-tdr-max"
										inputMode="decimal"
										onChange={(e) => setRoundTdrMaxRaw(e.target.value)}
										placeholder="Any"
										value={roundTdrMaxRaw}
									/>
								</div>
								<div className="grid gap-1.5">
									<Label
										className="text-muted-foreground text-xs"
										htmlFor="stats-round-qdr-min"
										title="Mean QDR across questions with at least one rated attempt"
									>
										Min avg QDR
									</Label>
									<Input
										id="stats-round-qdr-min"
										inputMode="decimal"
										onChange={(e) => setRoundQdrMinRaw(e.target.value)}
										placeholder="Any"
										value={roundQdrMinRaw}
									/>
								</div>
								<div className="grid gap-1.5">
									<Label
										className="text-muted-foreground text-xs"
										htmlFor="stats-round-qdr-max"
										title="Mean QDR across questions with at least one rated attempt"
									>
										Max avg QDR
									</Label>
									<Input
										id="stats-round-qdr-max"
										inputMode="decimal"
										onChange={(e) => setRoundQdrMaxRaw(e.target.value)}
										placeholder="Any"
										value={roundQdrMaxRaw}
									/>
								</div>
							</div>
							<p className="text-muted-foreground text-xs">
								Buzz counts use each topic’s total buzzes (rollup and
								per-question rows). Avg QDR uses only questions with difficulty
								data.
							</p>
							<div className="flex justify-end">
								<Button
									onClick={clearRoundFilters}
									type="button"
									variant="outline"
									size="sm"
								>
									Clear round filters
								</Button>
							</div>
						</div>

						{filteredTopics.length === 0 ? (
							<p className="text-muted-foreground text-sm">
								No rounds match these filters.
							</p>
						) : (
							filteredTopics.map((topic) => (
								<Card key={topic.order}>
									<CardHeader>
										<div className="flex flex-wrap items-center gap-2">
											<CardTitle className="text-base">
												Round {topic.order}: {topic.topicName}
											</CardTitle>
											<Badge
												variant="outline"
												className="gap-1 font-normal text-[11px]"
											>
												<BarChart2 className="size-3" />
												TDR{" "}
												{formatDifficultyDr(
													topic.tdr,
													topic.hasRatedDifficulty,
												)}
											</Badge>
										</div>
										<CardDescription className="flex flex-wrap gap-x-3 gap-y-1">
											<span>
												Time {formatDurationSeconds(topic.durationSeconds)}
											</span>
											<span>
												Topic difficulty{" "}
												{formatDifficultyDr(
													topic.tdr,
													topic.hasRatedDifficulty,
												)}
											</span>
											<span>
												Clicks {topic.totalClicks} · ✓{" "}
												{topic.totalCorrectAnswers} · ✗{" "}
												{topic.totalIncorrectAnswers} · exp{" "}
												{topic.totalExpiredClicks}
											</span>
											<span>
												Answered {topic.totalQuestionsAnswered} · skipped{" "}
												{topic.totalQuestionsSkipped}
											</span>
										</CardDescription>
									</CardHeader>
									<CardPanel className="space-y-4">
										{topic.questions.map((q) => (
											<QuestionBlock key={q.order} q={q} />
										))}
									</CardPanel>
								</Card>
							))
						)}
					</TabsPanel>

					<TabsPanel value="by-player" className="mt-4 space-y-6">
						<div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
							<div className="flex flex-wrap items-center gap-2">
								<FilterIcon className="size-4 text-muted-foreground" />
								<span className="font-medium text-sm">Player filters</span>
							</div>
							<div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
								<div className="grid gap-1.5 lg:col-span-2 xl:col-span-2">
									<Label
										className="text-muted-foreground text-xs"
										htmlFor="stats-player-q"
									>
										Search name or @username
									</Label>
									<Input
										id="stats-player-q"
										onChange={(e) => setPlayerQ(e.target.value)}
										placeholder="Filter players…"
										value={playerQ}
									/>
								</div>
								<div className="grid gap-1.5">
									<Label
										className="text-muted-foreground text-xs"
										htmlFor="stats-player-score-min"
									>
										Min score
									</Label>
									<Input
										id="stats-player-score-min"
										inputMode="numeric"
										onChange={(e) => setPlayerScoreMinRaw(e.target.value)}
										placeholder="Any"
										value={playerScoreMinRaw}
									/>
								</div>
								<div className="grid gap-1.5">
									<Label
										className="text-muted-foreground text-xs"
										htmlFor="stats-player-score-max"
									>
										Max score
									</Label>
									<Input
										id="stats-player-score-max"
										inputMode="numeric"
										onChange={(e) => setPlayerScoreMaxRaw(e.target.value)}
										placeholder="Any"
										value={playerScoreMaxRaw}
									/>
								</div>
								<div className="grid gap-1.5">
									<Label
										className="text-muted-foreground text-xs"
										htmlFor="stats-player-correct-min"
									>
										Min correct
									</Label>
									<Input
										id="stats-player-correct-min"
										inputMode="numeric"
										onChange={(e) => setPlayerCorrectMinRaw(e.target.value)}
										placeholder="Any"
										value={playerCorrectMinRaw}
									/>
								</div>
								<div className="grid gap-1.5">
									<Label
										className="text-muted-foreground text-xs"
										htmlFor="stats-player-correct-max"
									>
										Max correct
									</Label>
									<Input
										id="stats-player-correct-max"
										inputMode="numeric"
										onChange={(e) => setPlayerCorrectMaxRaw(e.target.value)}
										placeholder="Any"
										value={playerCorrectMaxRaw}
									/>
								</div>
								<div className="grid gap-1.5">
									<Label
										className="text-muted-foreground text-xs"
										htmlFor="stats-player-wrong-min"
									>
										Min wrong
									</Label>
									<Input
										id="stats-player-wrong-min"
										inputMode="numeric"
										onChange={(e) => setPlayerWrongMinRaw(e.target.value)}
										placeholder="Any"
										value={playerWrongMinRaw}
									/>
								</div>
								<div className="grid gap-1.5">
									<Label
										className="text-muted-foreground text-xs"
										htmlFor="stats-player-wrong-max"
									>
										Max wrong
									</Label>
									<Input
										id="stats-player-wrong-max"
										inputMode="numeric"
										onChange={(e) => setPlayerWrongMaxRaw(e.target.value)}
										placeholder="Any"
										value={playerWrongMaxRaw}
									/>
								</div>
								<div className="grid gap-1.5">
									<Label
										className="text-muted-foreground text-xs"
										htmlFor="stats-player-clicks-min"
									>
										Min buzzes
									</Label>
									<Input
										id="stats-player-clicks-min"
										inputMode="numeric"
										onChange={(e) => setPlayerClicksMinRaw(e.target.value)}
										placeholder="Any"
										value={playerClicksMinRaw}
									/>
								</div>
								<div className="grid gap-1.5">
									<Label
										className="text-muted-foreground text-xs"
										htmlFor="stats-player-clicks-max"
									>
										Max buzzes
									</Label>
									<Input
										id="stats-player-clicks-max"
										inputMode="numeric"
										onChange={(e) => setPlayerClicksMaxRaw(e.target.value)}
										placeholder="Any"
										value={playerClicksMaxRaw}
									/>
								</div>
							</div>
							<div className="flex justify-end">
								<Button
									onClick={clearPlayerFilters}
									type="button"
									variant="outline"
									size="sm"
								>
									Clear player filters
								</Button>
							</div>
						</div>

						{filteredPlayers.length === 0 ? (
							<p className="text-muted-foreground text-sm">
								No players match these filters.
							</p>
						) : (
							filteredPlayers.map((player) => {
								const clicks = collectClicksForPlayer(recap, player.id);
								const rankDisplay =
									player.rank ??
									sortedPlayers.findIndex((p) => p.id === player.id) + 1;
								return (
									<Card key={player.id}>
										<CardHeader>
											<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
												<div>
													<CardTitle className="text-base">
														<span className="me-2 inline-flex size-7 items-center justify-center rounded-lg bg-primary/12 font-semibold text-primary text-xs">
															{rankDisplay}
														</span>
														{player.user.name}
													</CardTitle>
													<CardDescription>
														@{player.user.username}
													</CardDescription>
												</div>
												<div className="text-left sm:text-right">
													<p className="text-muted-foreground text-xs uppercase tracking-wide">
														Score
													</p>
													<p className="font-bold text-2xl tabular-nums">
														{player.score.toLocaleString()}
													</p>
												</div>
											</div>
										</CardHeader>
										<CardPanel className="space-y-4">
											<div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
												<SummaryStat
													label="Correct"
													value={player.correctAnswers}
												/>
												<SummaryStat
													label="Wrong"
													value={player.incorrectAnswers}
												/>
												<SummaryStat
													label="Expired"
													value={player.expiredClicks}
												/>
												<SummaryStat
													label="1st buzz"
													value={player.firstClicks}
												/>
												<SummaryStat
													label="Fastest"
													value={formatReactionMs(player.fastestClickMs)}
												/>
												<SummaryStat
													label="Avg click"
													value={formatReactionMs(player.averageClickMs)}
												/>
											</div>
											<PlayerRecapBadges
												rows={badgesByPlayerId.get(player.id)}
												variant="compact"
											/>
											<StatsPlayerBuzzTable clicks={clicks} />
										</CardPanel>
									</Card>
								);
							})
						)}
					</TabsPanel>
				</Tabs>
			</div>
		</div>
	);
}

export function CompletedGameStatsPage({ code }: { code: string }) {
	const { data, isLoading, isError, error } = useQuery(
		orpc.game.getCompletedRecap.queryOptions({ input: { code } }),
	);

	if (isLoading) {
		return (
			<div className="flex min-h-[50vh] items-center justify-center">
				<Spinner />
			</div>
		);
	}

	if (isError || !data) {
		return (
			<div className="mx-auto max-w-lg space-y-4 p-6">
				<Button
					variant="outline"
					size="sm"
					render={<Link to="/g/$code" params={{ code }} />}
				>
					<ArrowLeftIcon />
					Back to game
				</Button>
				<Alert variant="error">
					<AlertTitle>Could not load stats</AlertTitle>
					<AlertDescription>
						{error?.message ??
							"This game may not exist, or it is not finished yet. Full stats are only available after completion."}
					</AlertDescription>
				</Alert>
			</div>
		);
	}

	return <CompletedGameStatsLoaded recap={data} code={code} />;
}
