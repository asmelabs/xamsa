const AUTH_API_PREFIX = "/api/auth";

function joinPath(segment: string): string {
	const s = segment.startsWith("/") ? segment : `/${segment}`;
	return `${AUTH_API_PREFIX}${s}`;
}

function readErrorMessage(data: unknown, fallback: string): string {
	if (data && typeof data === "object" && "message" in data) {
		const msg = (data as { message?: unknown }).message;
		if (typeof msg === "string" && msg.length > 0) return msg;
	}
	return fallback;
}

export async function betterAuthJson<T>(
	pathSegment: string,
	init?: RequestInit,
): Promise<T> {
	const res = await fetch(joinPath(pathSegment), {
		credentials: "include",
		...init,
		headers: {
			...(init?.body ? { "Content-Type": "application/json" } : {}),
			...init?.headers,
		},
	});
	const text = await res.text();
	let data: unknown;
	try {
		data = text ? JSON.parse(text) : null;
	} catch {
		data = text;
	}
	if (!res.ok) {
		throw new Error(readErrorMessage(data, res.statusText));
	}
	return data as T;
}
