import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getReleaseByCalverParam } from "@/data/app-releases-data";
import { formatCalver, formatProductVersionLabel } from "@/lib/app-release";
import { collectionPageJsonLd } from "@/lib/json-ld";
import { absoluteUrl, pageSeo } from "@/lib/seo";
import { ReleaseFrame } from "../-release-frame";

export const Route = createFileRoute("/whats-new/$version/")({
	component: WhatsNewVersionPage,
	loader: async ({ params }) => {
		const release = getReleaseByCalverParam(params.version);
		if (!release) {
			throw notFound();
		}
		return { release, calver: formatCalver(release) };
	},
	head: ({ loaderData }) => {
		if (!loaderData) {
			return pageSeo({
				title: "What’s new",
				description: "Xamsa release notes",
				path: "/whats-new/",
			});
		}
		const { release, calver } = loaderData;
		const path = `/whats-new/${calver}/`;
		const productLabel = formatProductVersionLabel(release);
		const titleLine = release.title
			? `${productLabel} — ${release.title}`
			: productLabel;
		const description =
			release.title ??
			`Xamsa release notes for v${calver}. User-facing changes and improvements.`;
		return pageSeo({
			title: titleLine,
			titleIsFull: true,
			description,
			path,
			ogType: "article",
			ogImagePath: `/api/og/whats-new/${calver}/og.png`,
			keywords: `Xamsa, changelog, ${calver}, release notes`,
			jsonLd: collectionPageJsonLd({
				path,
				title: titleLine,
				description,
			}),
		});
	},
});

function WhatsNewVersionPage() {
	const { release, calver } = Route.useLoaderData();

	return (
		<div className="container mx-auto max-w-2xl space-y-8 py-10">
			<h1 className="sr-only">{formatProductVersionLabel(release)}</h1>
			<div className="space-y-2">
				<p className="text-muted-foreground text-sm">
					<Link to="/whats-new" className="text-foreground hover:underline">
						What’s new
					</Link>
					{" / "}
					<span className="text-foreground">v{calver}</span>
				</p>
				<p className="text-muted-foreground text-xs">
					Share:{" "}
					<span className="select-all break-all text-foreground">
						{absoluteUrl(`/whats-new/${calver}/`)}
					</span>
				</p>
			</div>

			<ReleaseFrame release={release} linkVersionToDetail={false} />

			<p className="text-center text-muted-foreground text-xs">
				<Link
					to="/whats-new"
					className="underline decoration-muted-foreground/50 underline-offset-4 hover:decoration-foreground"
				>
					All releases
				</Link>
				{" · "}
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
