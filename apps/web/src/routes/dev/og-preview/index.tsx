"use client";

import { createFileRoute, notFound } from "@tanstack/react-router";
import {
	Dialog,
	DialogDescription,
	DialogHeader,
	DialogPanel,
	DialogPopup,
	DialogTitle,
} from "@xamsa/ui/components/dialog";
import { useState } from "react";
import {
	OG_PREVIEW_DESCRIPTIONS,
	OG_PREVIEW_KINDS,
	OG_PREVIEW_LABELS,
	type OgPreviewKind,
} from "@/lib/og/dev-mocks";
import { OG_HEIGHT, OG_WIDTH } from "@/lib/og/dimensions";

/** Bust caches for preview PNGs (service worker / disk) while iterating on OG assets. */
const OG_PREVIEW_IMG_QUERY = "?v=geistmono-2";

export const Route = createFileRoute("/dev/og-preview/")({
	beforeLoad: () => {
		if (!import.meta.env.DEV) {
			throw notFound();
		}
	},
	component: OgPreviewPage,
});

function OgPreviewPage() {
	const [focusKind, setFocusKind] = useState<OgPreviewKind | null>(null);
	const imgQuery = import.meta.env.DEV ? OG_PREVIEW_IMG_QUERY : "";

	return (
		<div className="min-h-screen bg-zinc-950 p-8 text-zinc-100">
			<div className="mx-auto max-w-7xl">
				<h1 className="font-semibold text-2xl tracking-tight">
					OG image preview
				</h1>
				<p className="mt-2 max-w-2xl text-sm text-zinc-400">
					Development only (
					<code className="rounded bg-zinc-800 px-1">vite dev</code> /{" "}
					<code className="rounded bg-zinc-800 px-1">import.meta.env.DEV</code>
					). Mock data — same templates as production. Canvas {OG_WIDTH}×
					{OG_HEIGHT}.
				</p>

				<ul className="mt-6 list-inside list-disc text-sm text-zinc-500">
					<li>
						PNG URLs:{" "}
						<code className="text-zinc-400">
							/api/dev/og-preview/&lt;kind&gt;/og.png
						</code>
					</li>
					<li>
						Edit mocks in{" "}
						<code className="text-zinc-400">src/lib/og/dev-mocks.ts</code>
					</li>
					<li>Click an image to open a full-screen style preview.</li>
				</ul>

				<div className="mt-10 grid gap-10 sm:grid-cols-1 lg:grid-cols-2">
					{OG_PREVIEW_KINDS.map((kind) => (
						<PreviewCard
							key={kind}
							kind={kind}
							imgQuery={imgQuery}
							onOpen={() => setFocusKind(kind)}
						/>
					))}
				</div>
			</div>

			<Dialog
				open={focusKind !== null}
				onOpenChange={(open) => {
					if (!open) setFocusKind(null);
				}}
			>
				<DialogPopup
					className="flex max-h-[92vh] w-full max-w-[min(1240px,calc(100vw-1.5rem))] flex-col overflow-hidden border-zinc-700 bg-zinc-900 p-0 text-zinc-100 shadow-2xl"
					showCloseButton
					bottomStickOnMobile={false}
				>
					{focusKind !== null ? (
						<>
							<DialogHeader className="shrink-0 border-zinc-800 border-b bg-zinc-900/95">
								<DialogTitle className="text-zinc-50">
									{OG_PREVIEW_LABELS[focusKind]}
								</DialogTitle>
								<DialogDescription className="text-zinc-400">
									{OG_PREVIEW_DESCRIPTIONS[focusKind]}
								</DialogDescription>
								<code className="mt-2 block truncate font-mono text-xs text-zinc-500">
									/api/dev/og-preview/{focusKind}/og.png
								</code>
							</DialogHeader>
							<DialogPanel className="min-h-0 flex-1 overflow-y-auto bg-zinc-950 p-4 sm:p-6">
								<div className="flex min-h-[min(78vh,900px)] items-center justify-center">
									<img
										key={focusKind}
										src={`/api/dev/og-preview/${focusKind}/og.png${imgQuery}`}
										alt={`${OG_PREVIEW_LABELS[focusKind]} — Open Graph preview (${OG_WIDTH}×${OG_HEIGHT})`}
										width={OG_WIDTH}
										height={OG_HEIGHT}
										className="h-auto max-h-[min(78vh,900px)] w-full max-w-full object-contain shadow-xl"
									/>
								</div>
							</DialogPanel>
						</>
					) : null}
				</DialogPopup>
			</Dialog>
		</div>
	);
}

function PreviewCard({
	kind,
	imgQuery,
	onOpen,
}: {
	kind: OgPreviewKind;
	imgQuery: string;
	onOpen: () => void;
}) {
	const label = OG_PREVIEW_LABELS[kind];
	const src = `/api/dev/og-preview/${kind}/og.png${imgQuery}`;

	return (
		<section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
			<h2 className="font-medium text-zinc-200">{label}</h2>
			<p className="mt-1 truncate font-mono text-xs text-zinc-500">{src}</p>
			<div className="mt-4 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
				<button
					type="button"
					onClick={onOpen}
					className="group block w-full cursor-zoom-in text-left outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
					aria-label={`Open full-screen preview: ${label}`}
				>
					<img
						src={src}
						alt={`OG preview: ${label}`}
						width={OG_WIDTH}
						height={OG_HEIGHT}
						className="h-auto w-full max-w-full transition-opacity group-hover:opacity-95"
						loading="lazy"
					/>
				</button>
			</div>
		</section>
	);
}
