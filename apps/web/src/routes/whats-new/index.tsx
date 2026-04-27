import { createFileRoute, Link } from "@tanstack/react-router";
import { getReleasesNewestFirst } from "@/data/app-releases-data";
import { getCurrentProductVersionLabel } from "@/lib/app-release";
import { collectionPageJsonLd } from "@/lib/json-ld";
import { pageSeo } from "@/lib/seo";
import { ReleaseFrame } from "./-release-frame";

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
				{releases.map((release) => (
					<ReleaseFrame
						key={`${release.year}-${release.month}-${release.patch}`}
						release={release}
					/>
				))}
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
