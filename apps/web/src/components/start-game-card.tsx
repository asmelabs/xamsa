import { useMutation, useQuery } from "@tanstack/react-query";
import type { DuplicateQuestionPolicy } from "@xamsa/schemas/db/schemas/enums/DuplicateQuestionPolicy.schema";
import { Button } from "@xamsa/ui/components/button";
import { Checkbox } from "@xamsa/ui/components/checkbox";
import { Label } from "@xamsa/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@xamsa/ui/components/select";
import {
	MIN_PLAYERS_PER_GAME_TO_START,
	MIN_TOPICS_PER_GAME_SUBSET,
} from "@xamsa/utils/constants";
import { PlayIcon, UsersIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { DuplicatePolicyExplainerLink } from "@/components/duplicate-policy-explainer";
import { formatDifficultyDr } from "@/lib/difficulty-display";
import { DUPLICATE_POLICY_OPTIONS } from "@/lib/duplicate-policy-options";
import type { GameData, GamePlayer } from "@/lib/game-types";
import { toastOrpcMutationFailure } from "@/lib/orpc-email-verification-error";
import { orpc } from "@/utils/orpc";
import { LoadingButton } from "./loading-button";

interface StartGameCardProps {
	game: GameData;
	activePlayers: GamePlayer[];
}

export function StartGameCard({ game, activePlayers }: StartGameCardProps) {
	const [duplicateQuestionPolicy, setDuplicateQuestionPolicy] =
		useState<DuplicateQuestionPolicy>("none");
	const [pickerOpen, setPickerOpen] = useState(false);
	const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set());

	const topicsQuery = useQuery({
		...orpc.topic.list.queryOptions({
			input: {
				packs: [game.pack.slug],
				page: 1,
				limit: 100,
				sort: "default",
			},
		}),
		enabled: pickerOpen,
	});

	const topicItems = topicsQuery.data?.items ?? [];
	const topicCount = topicItems.length;
	const canPickSubset = topicCount >= MIN_TOPICS_PER_GAME_SUBSET;

	useEffect(() => {
		const items = topicsQuery.data?.items;
		if (!pickerOpen || !items?.length) return;
		setSelectedOrders(new Set(items.map((t) => t.order)));
	}, [pickerOpen, topicsQuery.data?.items]);

	const toggleOrder = useCallback((order: number, checked: boolean) => {
		setSelectedOrders((prev) => {
			const next = new Set(prev);
			if (checked) next.add(order);
			else next.delete(order);
			return next;
		});
	}, []);

	const selectionValid =
		selectedOrders.size >= MIN_TOPICS_PER_GAME_SUBSET &&
		selectedOrders.size <= topicCount;

	const selectedList = useMemo(
		() => [...selectedOrders].sort((a, b) => a - b),
		[selectedOrders],
	);

	const { mutate: startGame, isPending } = useMutation({
		...orpc.game.start.mutationOptions(),
		onSuccess() {
			toast.success("Game started");
			setPickerOpen(false);
		},
		onError(error) {
			toastOrpcMutationFailure(error, "Failed to start game");
		},
	});

	const canStart = activePlayers.length >= MIN_PLAYERS_PER_GAME_TO_START;

	const runStart = (topicPackOrders?: number[]) => {
		startGame({
			code: game.code,
			duplicateQuestionPolicy,
			...(topicPackOrders != null && topicPackOrders.length > 0
				? { topicPackOrders: topicPackOrders }
				: {}),
		});
	};

	const handleOpenPicker = () => {
		if (!canStart) return;
		setPickerOpen(true);
	};

	const handleConfirmPicker = () => {
		if (!selectionValid || !canPickSubset) return;
		runStart(selectedList);
	};

	return (
		<>
			{pickerOpen ? (
				<div className="fixed inset-0 z-50 flex flex-col bg-background">
					<div className="flex items-center justify-between border-b px-4 py-3">
						<h2 className="font-semibold text-lg">Topics in this game</h2>
						<Button
							type="button"
							size="icon"
							variant="ghost"
							aria-label="Close"
							onClick={() => setPickerOpen(false)}
						>
							<XIcon className="size-5" />
						</Button>
					</div>
					<div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
						{topicsQuery.isLoading ? (
							<p className="text-muted-foreground text-sm">Loading topics…</p>
						) : topicsQuery.isError ? (
							<p className="text-destructive text-sm" role="alert">
								{topicsQuery.error?.message ?? "Could not load topics."}
							</p>
						) : !canPickSubset ? (
							<p className="text-muted-foreground text-sm">
								This pack has fewer than {MIN_TOPICS_PER_GAME_SUBSET} topics, so
								the full pack will be played. Close and use Start game below.
							</p>
						) : (
							<>
								<p className="mb-4 text-muted-foreground text-sm">
									Select at least {MIN_TOPICS_PER_GAME_SUBSET} topics. Topics
									play in pack order ({selectedOrders.size} selected).
								</p>
								<ul className="space-y-2">
									{topicItems.map((t) => {
										const locked = topicCount === MIN_TOPICS_PER_GAME_SUBSET;
										const checked = selectedOrders.has(t.order);
										return (
											<li
												key={t.slug}
												className="flex items-start gap-3 rounded-xl border border-border/80 p-3"
											>
												<Checkbox
													id={`topic-${String(t.order)}`}
													checked={checked}
													disabled={locked}
													onCheckedChange={(c) =>
														toggleOrder(t.order, c === true)
													}
												/>
												<label
													htmlFor={`topic-${String(t.order)}`}
													className="min-w-0 flex-1 cursor-pointer text-left text-sm leading-snug"
												>
													<span className="font-medium text-foreground">
														#{String(t.order)} {t.name}
													</span>
													{t.description ? (
														<span className="mt-0.5 block text-muted-foreground">
															{t.description}
														</span>
													) : null}
													<span className="mt-1 block text-muted-foreground text-xs">
														TDR{" "}
														{formatDifficultyDr(t.tdr, t.hasRatedDifficulty)}
													</span>
												</label>
											</li>
										);
									})}
								</ul>
							</>
						)}
					</div>
					<div className="border-t bg-background px-4 py-4">
						<div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
							<Button
								type="button"
								variant="outline"
								onClick={() => setPickerOpen(false)}
							>
								Cancel
							</Button>
							{canPickSubset ? (
								<LoadingButton
									type="button"
									isLoading={isPending}
									loadingText="Starting…"
									disabled={!selectionValid || topicsQuery.isLoading}
									onClick={handleConfirmPicker}
								>
									<PlayIcon />
									Start with {String(selectedOrders.size)} topics
								</LoadingButton>
							) : (
								<LoadingButton
									type="button"
									isLoading={isPending}
									loadingText="Starting…"
									onClick={() => runStart()}
								>
									<PlayIcon />
									Start full pack
								</LoadingButton>
							)}
						</div>
					</div>
				</div>
			) : null}

			<div className="flex flex-col items-center gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center">
				<div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
					<PlayIcon className="size-7 fill-primary text-primary" />
				</div>

				<div className="space-y-1">
					<h2 className="font-bold text-xl">Ready to host?</h2>
					<p className="text-muted-foreground text-sm">
						Use <span className="font-medium text-foreground">Share</span> in
						the header to copy the room code or invite link, open
						WhatsApp/Telegram/X/Facebook, or use your device&apos;s native share
						sheet. When everyone&apos;s in, choose topics and start.
					</p>
				</div>

				<div className="flex items-center gap-2 text-sm">
					<UsersIcon className="size-4 text-muted-foreground" />
					<span className="font-medium">
						{activePlayers.length}{" "}
						{activePlayers.length === 1 ? "player" : "players"} joined
					</span>
				</div>

				{activePlayers.length < MIN_PLAYERS_PER_GAME_TO_START && (
					<p className="text-muted-foreground text-xs">
						Waiting for at least {MIN_PLAYERS_PER_GAME_TO_START} players...
					</p>
				)}

				<div className="w-full max-w-md space-y-2 text-left">
					<div className="flex items-center justify-between gap-2">
						<Label
							className="text-muted-foreground text-xs"
							htmlFor="duplicate-policy"
						>
							Replay / duplicate questions
						</Label>
						<DuplicatePolicyExplainerLink
							current={duplicateQuestionPolicy}
							variant="link"
							label="How modes differ"
						/>
					</div>
					<Select
						value={duplicateQuestionPolicy}
						onValueChange={(v) =>
							setDuplicateQuestionPolicy(v as DuplicateQuestionPolicy)
						}
					>
						<SelectTrigger id="duplicate-policy" className="w-full">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{DUPLICATE_POLICY_OPTIONS.map((opt) => (
								<SelectItem key={opt.value} value={opt.value}>
									<span className="font-medium">{opt.label}</span>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<p className="text-[11px] text-muted-foreground leading-snug">
						{
							DUPLICATE_POLICY_OPTIONS.find(
								(o) => o.value === duplicateQuestionPolicy,
							)?.description
						}
					</p>
				</div>

				<LoadingButton
					size="lg"
					className="w-full max-w-md"
					disabled={!canStart}
					isLoading={isPending}
					loadingText="Starting..."
					onClick={handleOpenPicker}
				>
					<PlayIcon />
					Start game
				</LoadingButton>
			</div>
		</>
	);
}
