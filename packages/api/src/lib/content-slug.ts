import { ORPCError } from "@orpc/server";
import { isReservedContentSlug } from "@xamsa/utils/reserved-content-slugs";

export function assertNonReservedContentSlug(slug: string): void {
	if (isReservedContentSlug(slug)) {
		throw new ORPCError("BAD_REQUEST", {
			message:
				"This name resolves to a URL segment reserved by the site. Pick a slightly different title or name.",
		});
	}
}
