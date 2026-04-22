import { Link } from "@tanstack/react-router";
import type { ReleaseHighlight } from "@/data/app-releases-types";

export function ReleaseHighlightItem({
	highlight,
}: {
	highlight: ReleaseHighlight;
}) {
	if (highlight.kind === "text") {
		return highlight.text;
	}

	return (
		<>
			{highlight.before}
			<Link
				to={highlight.to}
				className="font-medium text-foreground underline underline-offset-4 hover:decoration-primary"
			>
				{highlight.label}
			</Link>
			{highlight.after}
		</>
	);
}
