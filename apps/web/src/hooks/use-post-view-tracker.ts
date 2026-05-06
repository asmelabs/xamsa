import { useMutation } from "@tanstack/react-query";
import { type RefObject, useEffect, useRef } from "react";
import { orpc } from "@/utils/orpc";

const SESSION_KEY = "xamsa.viewedPosts.v1";
/** ≥50% of the post must be in the viewport to count. */
const VIEW_THRESHOLD = 0.5;
/** Continuous visibility required before we record (ms). */
const VIEW_DWELL_MS = 1000;

function readSeenSet(): Set<string> {
	if (typeof window === "undefined") return new Set();
	try {
		const raw = window.sessionStorage.getItem(SESSION_KEY);
		if (!raw) return new Set();
		const arr = JSON.parse(raw);
		if (!Array.isArray(arr)) return new Set();
		return new Set(arr.filter((x): x is string => typeof x === "string"));
	} catch {
		return new Set();
	}
}

function persistSeen(set: Set<string>): void {
	if (typeof window === "undefined") return;
	try {
		window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(Array.from(set)));
	} catch {
		// quota or private mode — fall back to in-memory only
	}
}

/**
 * Records a single `post.recordView` for `postId` when the referenced element
 * stays at ≥50% visible for ≥1s. Dedupes per session via `sessionStorage` so
 * scrolling past the same post twice in one tab does not inflate counts.
 */
export function usePostViewTracker(
	ref: RefObject<HTMLElement | null>,
	postId: string,
): void {
	const hasRecordedRef = useRef(false);

	const { mutate } = useMutation({
		...orpc.post.recordView.mutationOptions(),
	});

	useEffect(() => {
		if (typeof window === "undefined") return;
		if (typeof IntersectionObserver === "undefined") return;
		if (hasRecordedRef.current) return;

		const seen = readSeenSet();
		if (seen.has(postId)) {
			hasRecordedRef.current = true;
			return;
		}

		const target = ref.current;
		if (!target) return;

		let dwellTimer: ReturnType<typeof setTimeout> | null = null;
		const clearDwell = () => {
			if (dwellTimer !== null) {
				clearTimeout(dwellTimer);
				dwellTimer = null;
			}
		};

		const recordOnce = () => {
			if (hasRecordedRef.current) return;
			hasRecordedRef.current = true;
			const next = readSeenSet();
			next.add(postId);
			persistSeen(next);
			mutate({ id: postId });
			clearDwell();
			observer.disconnect();
		};

		const observer = new IntersectionObserver(
			(entries) => {
				const entry = entries[0];
				if (!entry) return;

				if (entry.isIntersecting && entry.intersectionRatio >= VIEW_THRESHOLD) {
					if (dwellTimer === null) {
						dwellTimer = setTimeout(recordOnce, VIEW_DWELL_MS);
					}
				} else {
					clearDwell();
				}
			},
			{ threshold: [VIEW_THRESHOLD] },
		);

		observer.observe(target);

		return () => {
			clearDwell();
			observer.disconnect();
		};
	}, [postId, ref, mutate]);
}
