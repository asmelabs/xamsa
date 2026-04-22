/**
 * Serializable release bullet — rendered in What’s new with `Link` etc.
 * Add new `kind` variants when you need buttons or richer UI; handle them in `ReleaseHighlightItem`.
 */
export type ReleaseHighlight =
	| { kind: "text"; text: string }
	| {
			kind: "routerLink";
			before?: string;
			to: string;
			label: string;
			after?: string;
	  };

export type AppRelease = {
	releasedAt: string;
	year: number;
	month: number;
	patch: number;
	title?: string;
	highlights: ReleaseHighlight[];
};

export type AppReleasesManifest = {
	productName: string;
	current: Pick<AppRelease, "year" | "month" | "patch">;
	releases: AppRelease[];
};
