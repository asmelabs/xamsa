import { useMutation, useQueryClient } from "@tanstack/react-query";
import { channels, GAME_EVENTS } from "@xamsa/ably/channels";
import { Badge } from "@xamsa/ui/components/badge";
import { Button } from "@xamsa/ui/components/button";
import {
	Frame,
	FrameHeader,
	FramePanel,
	FrameTitle,
} from "@xamsa/ui/components/frame";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import {
	applyQuestionRevealToGame,
	type QuestionRevealedData,
} from "@/hooks/use-game-channel";
import { getAblyClient } from "@/lib/ably";
import type { GameData } from "@/lib/game-types";
import { toastOrpcMutationFailure } from "@/lib/orpc-email-verification-error";
import { orpc } from "@/utils/orpc";

interface CurrentQuestionCardProps {
	game: GameData;
	isHostView: boolean;
}

export function CurrentQuestionCard({
	game,
	isHostView,
}: CurrentQuestionCardProps) {
	const queryClient = useQueryClient();
	const queryKey = orpc.game.findOne.queryKey({ input: { code: game.code } });
	const hostQuestion = game.hostData?.currentQuestion;
	const publicQuestion = game.currentQuestion;

	const { mutate: reveal, isPending: isRevealing } = useMutation({
		...orpc.game.revealQuestion.mutationOptions(),
		onError(error) {
			toastOrpcMutationFailure(error, "Failed to reveal question");
			queryClient.invalidateQueries({ queryKey });
		},
	});

	const handleReveal = () => {
		if (game.isQuestionRevealed || isRevealing || !hostQuestion) return;

		const optimistic: QuestionRevealedData = {
			order: hostQuestion.order,
			text: hostQuestion.text,
			answer: hostQuestion.answer,
			explanation: hostQuestion.explanation ?? null,
			acceptableAnswers: hostQuestion.acceptableAnswers,
			isAuthoritative: false,
		};

		queryClient.setQueryData<GameData | undefined>(queryKey, (old) =>
			applyQuestionRevealToGame(old, optimistic),
		);

		try {
			const client = getAblyClient();
			const channel = client.channels.get(channels.game(game.code));
			channel
				.publish(GAME_EVENTS.QUESTION_REVEAL_INTENT, optimistic)
				.catch(() => {});
		} catch {
			// server broadcast will cover
		}

		reveal({ code: game.code });
	};

	if (!hostQuestion && !publicQuestion) {
		return (
			<Frame>
				<FrameHeader>
					<FrameTitle>Current question</FrameTitle>
				</FrameHeader>
				<FramePanel>
					<p className="py-6 text-center text-muted-foreground text-sm">
						No active question.
					</p>
				</FramePanel>
			</Frame>
		);
	}

	// Host always sees the full question details
	const question = isHostView && hostQuestion ? hostQuestion : null;
	const points = (publicQuestion?.order ?? 0) * 100;

	if (!question) return null;

	return (
		<Frame>
			<FrameHeader className="flex items-center justify-between">
				<FrameTitle>
					Current question
					<Badge variant="outline" className="ml-2">
						{points} pts
					</Badge>
				</FrameTitle>
				<div className="text-right">
					{game.currentTopic && (
						<p className="text-muted-foreground text-xs">
							{game.currentTopic.name}
						</p>
					)}
					{isHostView && hostQuestion ? (
						<p className="text-muted-foreground text-xs">
							Question difficulty:{" "}
							{hostQuestion.qdrScoredAttempts > 0
								? hostQuestion.qdr.toFixed(2)
								: "—"}
						</p>
					) : null}
				</div>
			</FrameHeader>

			<FramePanel className="space-y-4">
				<div className="space-y-3">
					<p className="text-muted-foreground text-xs uppercase tracking-wide">
						Question
					</p>
					<p className="font-medium text-lg leading-snug">{question.text}</p>
					<Button
						variant={game.isQuestionRevealed ? "outline" : "secondary"}
						size="default"
						className="w-full gap-2 border border-primary/20 shadow-sm sm:w-auto sm:min-w-[12rem]"
						disabled={game.isQuestionRevealed || isRevealing}
						onClick={handleReveal}
					>
						{game.isQuestionRevealed ? (
							<>
								<EyeIcon className="size-4" />
								Revealed to players
							</>
						) : (
							<>
								<EyeOffIcon className="size-4" />
								Reveal to players
							</>
						)}
					</Button>
				</div>

				<div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
					<p className="text-green-700 text-xs uppercase tracking-wide dark:text-green-400">
						Answer
					</p>
					<p className="mt-1 font-semibold text-green-700 dark:text-green-400">
						{question.answer}
					</p>
					{question.acceptableAnswers.length > 0 && (
						<div className="mt-2 flex flex-wrap gap-1">
							{question.acceptableAnswers.map((alt) => (
								<Badge key={alt} variant="outline" className="text-[10px]">
									{alt}
								</Badge>
							))}
						</div>
					)}
				</div>

				{question.explanation && (
					<div className="rounded-lg border border-border/60 bg-muted/30 p-3">
						<p className="text-muted-foreground text-xs uppercase tracking-wide">
							Explanation
						</p>
						<p className="mt-1.5 text-sm leading-relaxed">
							{question.explanation}
						</p>
					</div>
				)}
			</FramePanel>
		</Frame>
	);
}
