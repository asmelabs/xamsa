"use client";

import type {
	PackAnalyticsOutputType,
	QuestionAnalyticsOutputType,
	TopicAnalyticsOutputType,
} from "@xamsa/schemas/modules/public-analytics";
import {
	Card,
	CardDescription,
	CardHeader,
	CardPanel,
	CardTitle,
} from "@xamsa/ui/components/card";
import {
	Frame,
	FrameHeader,
	FramePanel,
	FrameTitle,
} from "@xamsa/ui/components/frame";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@xamsa/ui/components/select";
import { Spinner } from "@xamsa/ui/components/spinner";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@xamsa/ui/components/table";
import { format } from "date-fns";
import { BarChart2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
	Bar,
	BarChart,
	Cell,
	Legend,
	Pie,
	PieChart,
	Tooltip as RechartsTooltip,
	ResponsiveContainer,
	XAxis,
	YAxis,
} from "recharts";
import { StatCard } from "@/components/stat-card";

export type PublicAnalyticsPayload =
	| PackAnalyticsOutputType
	| TopicAnalyticsOutputType
	| QuestionAnalyticsOutputType;

type PlayerLeaderboardKind = "buzz" | "correct" | "incorrect" | "played";

const PLAYER_LEADERBOARD_OPTIONS: {
	id: PlayerLeaderboardKind;
	label: string;
	description: string;
	empty: string;
}[] = [
	{
		id: "buzz",
		label: "Top buzzers",
		description: "Most clicks across sessions (any outcome)",
		empty: "No clicks yet.",
	},
	{
		id: "correct",
		label: "Top correct answers",
		description: "Most correct buzzes",
		empty: "No correct buzzes yet.",
	},
	{
		id: "incorrect",
		label: "Top incorrect answers",
		description: "Most wrong buzzes (expired excluded)",
		empty: "No incorrect buzzes yet.",
	},
	{
		id: "played",
		label: "Top played",
		description: "Most completed games joined in this scope",
		empty: "No completed sessions yet.",
	},
];

function playerRowsForKind(
	data: PublicAnalyticsPayload,
	kind: PlayerLeaderboardKind,
): { username: string; name: string; count: number }[] {
	switch (kind) {
		case "buzz":
			return data.topBuzzers;
		case "correct":
			return data.topCorrectAnswers;
		case "incorrect":
			return data.topIncorrectAnswers;
		case "played":
			return data.topPlayed;
		default:
			return data.topBuzzers;
	}
}

function isPackAnalytics(
	a: PublicAnalyticsPayload,
): a is PackAnalyticsOutputType {
	return "totalPlays" in a;
}

export function PublicAnalyticsSection({
	title = "Analytics",
	data,
	isLoading,
	errorMessage,
}: {
	title?: string;
	data: PublicAnalyticsPayload | undefined;
	isLoading: boolean;
	errorMessage?: string | null;
}) {
	const [playerBoard, setPlayerBoard] = useState<PlayerLeaderboardKind>("buzz");
	const boardMeta = useMemo(
		() => PLAYER_LEADERBOARD_OPTIONS.find((o) => o.id === playerBoard),
		[playerBoard],
	);

	if (isLoading) {
		return (
			<Frame className="overflow-hidden">
				<FrameHeader>
					<FrameTitle className="flex items-center gap-2">
						<BarChart2 className="size-4" />
						{title}
					</FrameTitle>
				</FrameHeader>
				<FramePanel className="flex justify-center py-10">
					<Spinner />
				</FramePanel>
			</Frame>
		);
	}

	if (errorMessage) {
		return (
			<Frame className="overflow-hidden">
				<FrameHeader>
					<FrameTitle className="flex items-center gap-2">
						<BarChart2 className="size-4" />
						{title}
					</FrameTitle>
				</FrameHeader>
				<FramePanel>
					<p className="text-destructive text-sm" role="alert">
						{errorMessage}
					</p>
				</FramePanel>
			</Frame>
		);
	}

	if (!data) return null;

	const { clicks } = data;
	const pieRaw = [
		{
			name: "Correct",
			value: clicks.correct,
			fill: "var(--success)",
		},
		{
			name: "Wrong",
			value: clicks.wrong,
			fill: "var(--destructive)",
		},
		{
			name: "Expired",
			value: clicks.expired,
			fill: "var(--warning)",
		},
	];
	const pieData = pieRaw.filter((d) => d.value > 0);

	const barData = [
		{ name: "Correct", n: clicks.correct, fill: "var(--success)" },
		{ name: "Wrong", n: clicks.wrong, fill: "var(--destructive)" },
		{ name: "Expired", n: clicks.expired, fill: "var(--warning)" },
	];

	const playsLabel = isPackAnalytics(data)
		? data.totalPlays.toLocaleString()
		: null;

	return (
		<Frame className="overflow-hidden">
			<FrameHeader>
				<FrameTitle className="flex items-center gap-2">
					<BarChart2 className="size-4" />
					{title}
				</FrameTitle>
			</FrameHeader>
			<FramePanel className="space-y-6">
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
					<StatCard
						icon={<BarChart2 className="size-4" />}
						label="Completed games"
						value={data.completedGamesCount.toLocaleString()}
						sub="Games finished with this scope"
					/>
					{playsLabel !== null ? (
						<StatCard
							icon={<BarChart2 className="size-4" />}
							label="Total plays"
							value={playsLabel}
							sub="Stored pack counter"
						/>
					) : "topicOrder" in data ? (
						<StatCard
							icon={<BarChart2 className="size-4" />}
							label="Topic order"
							value={`#${String(data.topicOrder)}`}
							sub="In pack sequence"
						/>
					) : (
						<StatCard
							icon={<BarChart2 className="size-4" />}
							label="Question order"
							value={`#${String((data as QuestionAnalyticsOutputType).questionOrder)}`}
							sub="Within topic"
						/>
					)}
					<StatCard
						icon={<BarChart2 className="size-4" />}
						label="Distinct hosts"
						value={data.hostsDistinct.toLocaleString()}
						sub="Hosts of completed games"
					/>
					<StatCard
						icon={<BarChart2 className="size-4" />}
						label="Resolved buzzes"
						value={clicks.resolvedTotal.toLocaleString()}
						sub="Correct + wrong + expired"
					/>
				</div>

				{(data.firstPlayedAt || data.lastPlayedAt) && (
					<p className="text-muted-foreground text-sm">
						First completed session started{" "}
						{data.firstPlayedAt
							? format(data.firstPlayedAt, "yyyy-MM-dd")
							: "—"}
						{" · "}last finished{" "}
						{data.lastPlayedAt
							? format(data.lastPlayedAt, "yyyy-MM-dd HH:mm")
							: "—"}
					</p>
				)}

				<div className="grid gap-4 lg:grid-cols-2">
					{pieData.length === 0 ? (
						<Card>
							<CardHeader>
								<CardTitle className="text-base">Buzz outcomes</CardTitle>
								<CardDescription>
									No resolved clicks recorded yet
								</CardDescription>
							</CardHeader>
						</Card>
					) : (
						<Card>
							<CardHeader>
								<CardTitle className="text-base">Buzz outcomes</CardTitle>
								<CardDescription>
									Share of resolved clicks (correct / wrong / expired)
								</CardDescription>
							</CardHeader>
							<CardPanel className="pb-4">
								<div className="h-[240px] w-full min-w-0">
									<ResponsiveContainer width="100%" height="100%">
										<PieChart>
											<Pie
												data={pieData}
												dataKey="value"
												nameKey="name"
												cx="50%"
												cy="50%"
												innerRadius={48}
												outerRadius={88}
												paddingAngle={2}
												label={({ name, percent }) =>
													`${String(name)} ${((percent ?? 0) * 100).toFixed(0)}%`
												}
											>
												{pieData.map((entry, index) => (
													<Cell
														key={`slice-${entry.name}-${index.toString()}`}
														fill={entry.fill}
													/>
												))}
											</Pie>
											<RechartsTooltip
												content={({ active, payload }) => {
													if (!active || !payload?.length) return null;
													const p = payload[0];
													const v = Number(p?.value ?? 0);
													return (
														<div className="rounded-lg border bg-popover px-3 py-2 text-popover-foreground text-sm shadow-md">
															<p className="font-medium">{String(p?.name)}</p>
															<p className="text-muted-foreground tabular-nums">
																{v.toLocaleString()} clicks
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
					)}

					<Card>
						<CardHeader>
							<CardTitle className="text-base">Click volume</CardTitle>
							<CardDescription>
								Resolved buzzes only (correct, wrong, expired)
							</CardDescription>
						</CardHeader>
						<CardPanel className="pb-4">
							<div className="h-[240px] w-full min-w-0">
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={barData} margin={{ left: 8, right: 8 }}>
										<XAxis dataKey="name" tick={{ fontSize: 11 }} />
										<YAxis allowDecimals={false} width={40} />
										<Bar dataKey="n" radius={[6, 6, 0, 0]}>
											{barData.map((e, i) => (
												<Cell
													key={`bar-${e.name}-${i.toString()}`}
													fill={e.fill}
												/>
											))}
										</Bar>
										<RechartsTooltip
											content={({ active, payload }) => {
												if (!active || !payload?.length) return null;
												const row = payload[0]?.payload as {
													name: string;
													n: number;
												};
												return (
													<div className="rounded-lg border bg-popover px-3 py-2 text-popover-foreground text-sm shadow-md">
														<p className="font-medium">{row?.name}</p>
														<p className="text-muted-foreground tabular-nums">
															{(row?.n ?? 0).toLocaleString()}
														</p>
													</div>
												);
											}}
										/>
									</BarChart>
								</ResponsiveContainer>
							</div>
						</CardPanel>
					</Card>
				</div>

				<div className="grid gap-4 lg:grid-cols-2">
					<PlayerLeaderboardCard
						kind={playerBoard}
						onKindChange={setPlayerBoard}
						meta={boardMeta ?? PLAYER_LEADERBOARD_OPTIONS[0]}
						rows={playerRowsForKind(data, playerBoard)}
					/>
					<RankedTable
						title="Top hosts"
						description="Most completed games hosted"
						rows={data.topHostsByGames}
						empty="No completed games yet."
					/>
				</div>
			</FramePanel>
		</Frame>
	);
}

function PlayerLeaderboardCard({
	kind,
	onKindChange,
	meta,
	rows,
}: {
	kind: PlayerLeaderboardKind;
	onKindChange: (k: PlayerLeaderboardKind) => void;
	meta: (typeof PLAYER_LEADERBOARD_OPTIONS)[number];
	rows: { username: string; name: string; count: number }[];
}) {
	const countHeader = kind === "played" ? "Games" : "Count";

	return (
		<Card>
			<CardHeader className="space-y-3">
				<div className="space-y-3">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
						<CardTitle className="shrink-0 text-base">Players</CardTitle>
						<Select
							value={kind}
							onValueChange={(v) => onKindChange(v as PlayerLeaderboardKind)}
						>
							<SelectTrigger
								className="w-full sm:min-w-[12rem] sm:max-w-[14rem] sm:shrink-0"
								size="sm"
							>
								<SelectValue placeholder="Leaderboard">
									{meta.label}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								{PLAYER_LEADERBOARD_OPTIONS.map((o) => (
									<SelectItem key={o.id} value={o.id}>
										{o.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<CardDescription className="text-pretty">
						{meta.description}
					</CardDescription>
				</div>
			</CardHeader>
			<CardPanel className="px-0 pb-2">
				{rows.length === 0 ? (
					<p className="px-6 pb-4 text-muted-foreground text-sm">
						{meta.empty}
					</p>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Player</TableHead>
								<TableHead className="text-right">{countHeader}</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{rows.map((r) => (
								<TableRow key={r.username}>
									<TableCell>
										<span className="font-medium">{r.name}</span>
										<span className="block text-muted-foreground text-xs">
											@{r.username}
										</span>
									</TableCell>
									<TableCell className="text-right tabular-nums">
										{r.count.toLocaleString()}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</CardPanel>
		</Card>
	);
}

function RankedTable({
	title,
	description,
	rows,
	empty,
}: {
	title: string;
	description: string;
	rows: { username: string; name: string; count: number }[];
	empty: string;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardPanel className="px-0 pb-2">
				{rows.length === 0 ? (
					<p className="px-6 pb-4 text-muted-foreground text-sm">{empty}</p>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Player</TableHead>
								<TableHead className="text-right">Count</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{rows.map((r, idx) => (
								<TableRow key={`${r.username}-${idx.toString()}`}>
									<TableCell>
										<span className="font-medium">{r.name}</span>
										<span className="block text-muted-foreground text-xs">
											@{r.username}
										</span>
									</TableCell>
									<TableCell className="text-right tabular-nums">
										{r.count.toLocaleString()}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</CardPanel>
		</Card>
	);
}
