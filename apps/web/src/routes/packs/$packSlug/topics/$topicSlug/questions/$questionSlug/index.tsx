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
import {
	ArrowLeftIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	EyeIcon,
	EyeOffIcon,
	PencilIcon,
} from "lucide-react";
import { parseAsBoolean, useQueryState } from "nuqs";
import { PacksBreadcrumb, PacksSubpageContainer } from "@/components/packs";
import { pageSeo, truncateMeta } from "@/lib/seo";
import { orpc } from "@/utils/orpc";

type QuestionPageData = {
	question: Awaited<ReturnType<typeof orpc.question.findOne.call>>;
	neighborPrev: { slug: string } | null;
	neighborNext: { slug: string } | null;
};

export const Route = createFileRoute(
	"/packs/$packSlug/topics/$topicSlug/questions/$questionSlug/",
)({
	component: RouteComponent,
	loader: async ({ params }): Promise<QuestionPageData> => {
		try {
			const question = await orpc.question.findOne.call({
				pack: params.packSlug,
				topic: params.topicSlug,
				question: params.questionSlug,
			});
			let neighborPrev: { slug: string } | null = null;
			let neighborNext: { slug: string } | null = null;
			try {
				const topic = await orpc.topic.findOne.call({
					pack: params.packSlug,
					slug: params.topicSlug,
				});
				const ordered = topic.questions;
				const i = ordered.findIndex((q) => q.slug === question.slug);
				if (i > 0) {
					const p = ordered[i - 1];
					if (p) {
						neighborPrev = { slug: p.slug };
					}
				}
				if (i >= 0 && i < ordered.length - 1) {
					const n = ordered[i + 1];
					if (n) {
						neighborNext = { slug: n.slug };
					}
				}
			} catch {
				// topic fetch optional for nav
			}
			return { question, neighborPrev, neighborNext };
		} catch {
			throw notFound();
		}
	},
	head: ({ loaderData }) => {
		if (!loaderData) {
			return pageSeo({
				title: "Question",
				description: "A quiz question on Xamsa.",
			});
		}
		const q = loaderData.question;
		const preview = q.text?.trim() || "Quiz question";
		const desc = `Question ${q.order} in “${q.topic.name}” (${q.pack.name}) on Xamsa. ${truncateMeta(preview, 120)}`;
		return pageSeo({
			title: `Q${q.order} · ${q.topic.name}`,
			description: desc,
			path: `/packs/${q.pack.slug}/topics/${q.topic.slug}/questions/${q.slug}/`,
			ogType: "article",
			ogTitle: `Question ${q.order} · ${q.topic.name}`,
			ogDescription: truncateMeta(desc),
			keywords: `Xamsa, quiz question, ${q.topic.name}, ${q.pack.name}`,
		});
	},
});

function RouteComponent() {
	const { packSlug, topicSlug } = Route.useParams();
	const { question, neighborPrev, neighborNext } = Route.useLoaderData();
	const [answerVisible, setAnswerVisible] = useQueryState(
		"answer_visible",
		parseAsBoolean.withDefault(false),
	);

	const handleToggleAnswerVisible = () => {
		setAnswerVisible((prev) => !prev);
	};

	const points = question.order * 100;

	const toQuestion = (qslug: string) => ({
		to: "/packs/$packSlug/topics/$topicSlug/questions/$questionSlug" as const,
		params: { packSlug, topicSlug, questionSlug: qslug },
	});

	return (
		<PacksSubpageContainer className="space-y-6" variant="narrow">
			<PacksBreadcrumb
				items={[
					{ label: "Packs", to: "/packs" },
					{
						label: question.pack.name,
						to: "/packs/$packSlug",
						params: { packSlug },
					},
					{
						label: "Topics",
						to: "/packs/$packSlug/topics",
						params: { packSlug },
					},
					{
						label: question.topic.name,
						to: "/packs/$packSlug/topics/$topicSlug",
						params: { packSlug, topicSlug },
					},
					{ label: `Q${String(question.order)}`, current: true },
				]}
			/>

			<Button
				className="-mt-1 w-fit"
				size="sm"
				variant="ghost"
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

			<div className="space-y-4">
				<div className="flex flex-wrap items-center gap-2">
					<Badge className="font-mono" variant="secondary">
						Question {String(question.order)}
					</Badge>
					<Badge variant="outline">{String(points)} pts</Badge>
				</div>

				<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<h1 className="min-w-0 max-w-3xl font-bold text-2xl leading-snug tracking-tight sm:text-3xl">
						{question.text}
					</h1>
					{question.pack.status === "draft" && (
						<Button
							className="shrink-0"
							size="sm"
							variant="outline"
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

				{(neighborPrev != null || neighborNext != null) && (
					<div className="flex flex-wrap items-stretch justify-between gap-2 border-border border-y py-3">
						{neighborPrev != null ? (
							<Button
								className="min-w-0 flex-1 sm:flex-initial"
								size="sm"
								variant="outline"
								render={<Link {...toQuestion(neighborPrev.slug)} />}
							>
								<ChevronLeftIcon className="size-4" />
								Previous
							</Button>
						) : (
							<div className="min-h-9 flex-1 sm:w-32" />
						)}
						{neighborNext != null ? (
							<Button
								className="min-w-0 flex-1 sm:flex-initial"
								size="sm"
								variant="outline"
								render={<Link {...toQuestion(neighborNext.slug)} />}
							>
								Next
								<ChevronRightIcon className="size-4" />
							</Button>
						) : (
							<div className="min-h-9 flex-1 sm:w-32" />
						)}
					</div>
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
		</PacksSubpageContainer>
	);
}
