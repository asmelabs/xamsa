"use client";

import { Link } from "@tanstack/react-router";
import { Button } from "@xamsa/ui/components/button";
import {
	Frame,
	FrameHeader,
	FramePanel,
	FrameTitle,
} from "@xamsa/ui/components/frame";
import { Link2Icon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";
import type { AppRelease } from "@/data/app-releases-data";
import { releaseMatchesCurrent } from "@/data/app-releases-data";
import { formatCalver, formatProductVersionLabel } from "@/lib/app-release";
import { absoluteUrl } from "@/lib/seo";
import { ReleaseHighlightItem } from "./-release-highlight";

type ReleaseFrameProps = {
	release: AppRelease;
	/** When set, the version title links to this release’s shareable URL. */
	linkVersionToDetail?: boolean;
};

export function ReleaseFrame({
	release,
	linkVersionToDetail = true,
}: ReleaseFrameProps) {
	const label = formatProductVersionLabel(release);
	const calver = formatCalver(release);
	const shareUrl = absoluteUrl(`/whats-new/${calver}/`);

	const handleCopyShare = () => {
		void navigator.clipboard.writeText(shareUrl).then(
			() => {
				toast.success(`Copied · whats-new:${calver}`);
			},
			() => {
				toast.error("Could not copy");
			},
		);
	};
	const isCurrent = releaseMatchesCurrent(release);
	const versionTitle = linkVersionToDetail ? (
		<Link
			to="/whats-new/$version"
			params={{ version: calver }}
			className="rounded-sm underline decoration-muted-foreground/50 underline-offset-4 transition-colors hover:decoration-foreground"
		>
			{label}
		</Link>
	) : (
		label
	);

	return (
		<Frame>
			<FrameHeader className="flex flex-row items-start justify-between gap-3">
				<div className="min-w-0 space-y-1">
					<FrameTitle className="flex flex-wrap items-center gap-2">
						{versionTitle}
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
							<p className="text-foreground text-sm">• {release.title}</p>
						) : null}
					</div>
				</div>
				<div className="flex shrink-0 flex-col items-end gap-1">
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="gap-1.5"
						onClick={handleCopyShare}
					>
						<Link2Icon className="size-3.5" aria-hidden />
						Copy link
					</Button>
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
}
