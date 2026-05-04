import { createFileRoute, Link } from "@tanstack/react-router";
import { Badge } from "@xamsa/ui/components/badge";
import { collectionPageJsonLd } from "@/lib/json-ld";
import {
	ROADMAP_INTRO_PARAGRAPHS,
	ROADMAP_VERSIONS,
	roadmapVersionAnchorId,
} from "@/lib/roadmap-content";
import { pageSeo } from "@/lib/seo";

const PAGE_PATH = "/roadmap/";

export const Route = createFileRoute("/roadmap/")({
	component: RoadmapPage,
	head: () => {
		const description =
			"Planned Xamsa features and improvements by CalVer release (May 2026). Social quiz roadmap: mentions, feed, packs, live play, notifications, and platform polish.";
		return pageSeo({
			title: "Roadmap",
			description,
			path: PAGE_PATH,
			keywords:
				"Xamsa roadmap, quiz features, trivia app plans, product direction, social quiz",
			jsonLd: collectionPageJsonLd({
				path: PAGE_PATH,
				title: "Roadmap — Xamsa",
				description,
			}),
		});
	},
});

function RoadmapPage() {
	return (
		<div className="container mx-auto max-w-3xl py-10">
			<header className="border-border border-b pb-8">
				<h1 className="font-bold text-2xl tracking-tight md:text-3xl">
					Product roadmap
				</h1>
				<p className="mt-2 text-muted-foreground text-sm">
					May 2026 · CalVer <span className="font-mono">26.05.xx</span>
				</p>
				<div className="mt-4 space-y-3 text-muted-foreground text-sm leading-relaxed">
					{ROADMAP_INTRO_PARAGRAPHS.map((p) => (
						<p key={p} className="text-pretty">
							{p}
						</p>
					))}
				</div>
			</header>

			<nav
				aria-label="Release versions on this page"
				className="scroll-mt-24 py-8"
			>
				<h2 className="font-semibold text-foreground text-sm uppercase tracking-wide">
					On this page
				</h2>
				<ol className="mt-3 grid gap-1.5 sm:grid-cols-2">
					{ROADMAP_VERSIONS.map((block) => {
						const id = roadmapVersionAnchorId(block.version);
						return (
							<li key={block.version}>
								<span className="flex flex-wrap items-center gap-2">
									<a
										className="text-muted-foreground text-sm underline decoration-muted-foreground/40 underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground"
										href={`#${id}`}
									>
										{block.version}
									</a>
									{block.implemented ? (
										<Badge variant="success" size="sm" title="Shipped and live">
											Live
										</Badge>
									) : null}
								</span>
							</li>
						);
					})}
				</ol>
			</nav>

			<div className="space-y-16">
				{ROADMAP_VERSIONS.map((block) => {
					const id = roadmapVersionAnchorId(block.version);
					return (
						<section
							key={block.version}
							aria-labelledby={`${id}-heading`}
							className="scroll-mt-24"
							id={id}
						>
							<h2
								className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold text-foreground text-xl tracking-tight md:text-2xl"
								id={`${id}-heading`}
							>
								<span>{block.version}</span>
								{block.implemented ? (
									<Badge variant="success" size="sm" title="Shipped and live">
										Live now
									</Badge>
								) : null}
							</h2>
							<ul className="mt-6 space-y-8 border-border border-l-2 pl-5 md:pl-6">
								{block.items.map((item, itemIdx) => (
									<li key={`${block.version}-${itemIdx}`} className="relative">
										<span
											aria-hidden
											className="absolute top-1.5 -left-[calc(1.25rem+5px)] size-2.5 bg-primary md:-left-[calc(1.5rem+5px)]"
										/>
										<h3 className="font-medium text-base text-foreground leading-snug">
											{item.title}
										</h3>
										<p className="mt-2 text-pretty text-muted-foreground text-sm leading-relaxed">
											{item.description}
										</p>
									</li>
								))}
							</ul>
						</section>
					);
				})}
			</div>

			<footer className="mt-14 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-border border-t pt-8 text-center text-muted-foreground text-xs">
				<Link
					className="underline decoration-muted-foreground/50 underline-offset-4 hover:decoration-foreground"
					to="/whats-new"
				>
					What&apos;s new
				</Link>
				<span aria-hidden className="text-border">
					·
				</span>
				<Link
					className="underline decoration-muted-foreground/50 underline-offset-4 hover:decoration-foreground"
					to="/"
				>
					Home
				</Link>
			</footer>
		</div>
	);
}
