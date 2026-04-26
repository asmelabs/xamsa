import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Frame,
	FrameHeader,
	FramePanel,
	FrameTitle,
} from "@xamsa/ui/components/frame";
import { SparklesIcon } from "lucide-react";
import {
	getReleasesNewestFirst,
	releaseMatchesCurrent,
} from "@/data/app-releases-data";
import {
	formatProductVersionLabel,
	getCurrentProductVersionLabel,
} from "@/lib/app-release";
import { collectionPageJsonLd } from "@/lib/json-ld";
import { pageSeo } from "@/lib/seo";
import { ReleaseHighlightItem } from "./-release-highlight";

export const Route = createFileRoute("/whats-new/")({
	component: WhatsNewPage,
	head: () => {
		const description =
			"Read user-facing release notes for Xamsa: new features, improvements, and fixes in each CalVer update.";
		return pageSeo({
			title: "What’s new",
			description,
			path: "/whats-new/",
			keywords: "Xamsa changelog, updates, release notes, new features",
			jsonLd: collectionPageJsonLd({
				path: "/whats-new/",
				title: "What’s new",
				description,
			}),
		});
	},
});

function WhatsNewPage() {
	const releases = getReleasesNewestFirst();
	const latestLabel = getCurrentProductVersionLabel();

	return (
		<div className="container mx-auto max-w-2xl space-y-8 py-10">
			<div>
				<h1 className="font-bold text-2xl tracking-tight">What’s new</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Latest version:{" "}
					<span className="font-medium text-foreground">{latestLabel}</span>
				</p>
			</div>

			<div className="space-y-4">
				{releases.map((release) => {
					const label = formatProductVersionLabel(release);
					const isCurrent = releaseMatchesCurrent(release);

					return (
						<Frame key={`${release.year}-${release.month}-${release.patch}`}>
							<FrameHeader className="flex flex-row items-start justify-between gap-3">
								<div className="space-y-1">
									<FrameTitle className="flex flex-wrap items-center gap-2">
										{label}
										{isCurrent ? (
											<span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 font-normal text-primary text-xs">
												<SparklesIcon className="size-3" />
												Current
											</span>
										) : null}
									</FrameTitle>
									<div className="flex flex-row items-baseline gap-2">
										<p className="text-muted-foreground text-xs">
											{release.releasedAt}
										</p>
										{release.title ? (
											<p className="text-foreground text-sm">
												• {release.title}
											</p>
										) : null}
									</div>
								</div>
							</FrameHeader>
							<FramePanel>
								<ul className="list-inside list-disc space-y-2 text-muted-foreground text-sm">
									{release.highlights.map((item, index) => (
										<li
											key={`${release.year}-${release.month}-${release.patch}-${index}`}
											className="text-pretty [&_a]:text-foreground"
										>
											<ReleaseHighlightItem highlight={item} />
										</li>
									))}
								</ul>
							</FramePanel>
						</Frame>
					);
				})}
			</div>

			<p className="text-center text-muted-foreground text-xs">
				<Link
					to="/"
					className="underline decoration-muted-foreground/50 underline-offset-4 hover:decoration-foreground"
				>
					Back to home
				</Link>
			</p>
		</div>
	);
}
