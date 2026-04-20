import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Badge } from "@xamsa/ui/components/badge";
import { Button } from "@xamsa/ui/components/button";
import {
	Frame,
	FrameHeader,
	FramePanel,
	FrameTitle,
} from "@xamsa/ui/components/frame";
import { cn } from "@xamsa/ui/lib/utils";
import { ArrowLeftIcon, EyeIcon, EyeOffIcon, PencilIcon } from "lucide-react";
import { parseAsBoolean, useQueryState } from "nuqs";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute(
	"/packs/$packSlug/topics/$topicSlug/questions/$questionSlug/",
)({
	component: RouteComponent,
	loader: async ({ params }) => {
		try {
			const question = await orpc.question.findOne.call({
				pack: params.packSlug,
				topic: params.topicSlug,
				question: params.questionSlug,
			});
			return question;
		} catch {
			throw notFound();
		}
	},
	head: ({ loaderData }) => ({
		meta: [
			{
				title: loaderData
					? `Question ${loaderData.order} — ${loaderData.topic.name} — Xamsa`
					: "Question — Xamsa",
			},
			{
				name: "description",
				content: loaderData?.text || "A quiz question",
			},
		],
	}),
});

function RouteComponent() {
	const { packSlug, topicSlug } = Route.useParams();
	const question = Route.useLoaderData();
	const [answerVisible, setAnswerVisible] = useQueryState(
		"answer_visible",
		parseAsBoolean.withDefault(false),
	);

	const handleToggleAnswerVisible = () => {
		setAnswerVisible((prev) => !prev);
	};

	const points = question.order * 100;

	return (
		<div className="container mx-auto max-w-3xl space-y-6 py-10">
			<Button
				variant="ghost"
				size="sm"
				render={
					<Link
						to="/packs/$packSlug/topics/$topicSlug"
						params={{ packSlug, topicSlug }}
					/>
				}
			>
				<ArrowLeftIcon />
				{question.topic.name}
			</Button>

			<div className="space-y-3">
				<div className="flex flex-wrap items-center gap-1.5">
					<Badge variant="outline">Question #{question.order}</Badge>
					<Badge variant="outline">{points} points</Badge>
					<Badge variant="outline">{question.pack.name}</Badge>
				</div>

				<div className="flex items-start justify-between gap-3">
					<h1 className="font-bold text-2xl leading-snug tracking-tight">
						{question.text}
					</h1>
					{question.pack.status === "draft" && (
						<Button
							variant="outline"
							size="sm"
							render={
								<Link
									to="/packs/$packSlug/topics/$topicSlug/questions/$questionSlug/edit"
									params={{
										packSlug,
										topicSlug,
										questionSlug: question.slug,
									}}
								/>
							}
						>
							<PencilIcon />
							Edit
						</Button>
					)}
				</div>

				{question.description && (
					<p className="text-muted-foreground">{question.description}</p>
				)}
			</div>

			<Frame>
				<FrameHeader>
					<div className="flex items-center justify-between gap-3">
						<FrameTitle>Answer</FrameTitle>
						<Button
							title={answerVisible ? "Hide answer" : "Show answer"}
							variant="outline"
							size="icon"
							onClick={handleToggleAnswerVisible}
						>
							{answerVisible ? <EyeOffIcon /> : <EyeIcon />}
						</Button>
					</div>
				</FrameHeader>
				<FramePanel
					className={cn("space-y-4", answerVisible ? "block" : "hidden")}
				>
					<div className="rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3">
						<p className="font-medium text-green-700 dark:text-green-400">
							{question.answer}
						</p>
					</div>

					{question.acceptableAnswers.length > 0 && (
						<div className="space-y-2">
							<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
								Also accepted
							</p>
							<div className="flex flex-wrap gap-1.5">
								{question.acceptableAnswers.map((alt) => (
									<Badge key={alt} variant="outline">
										{alt}
									</Badge>
								))}
							</div>
						</div>
					)}

					{question.explanation && (
						<div className="space-y-2">
							<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
								Host note
							</p>
							<p className="text-sm">{question.explanation}</p>
						</div>
					)}
				</FramePanel>
			</Frame>
		</div>
	);
}
