import { ORPCError } from "@orpc/server";
import type { PreviewStructuredImportFromUrlInputType } from "@xamsa/schemas/modules/topic";
import { previewStructuredImportFromBody } from "./structured-import";

const FETCH_TIMEOUT_MS = 15_000;
const MAX_BYTES = 2 * 1024 * 1024;

function isBlockedHost(hostname: string): boolean {
	const h = hostname.replace(/^\[|\]$/g, "").toLowerCase();
	if (h === "localhost") return true;
	if (h === "0.0.0.0") return true;
	if (h === "metadata.google.internal") return true;
	if (h === "169.254.169.254") return true;
	const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
	if (m) {
		const a = Number(m[1]);
		const b = Number(m[2]);
		const c = Number(m[3]);
		const d = Number(m[4]);
		if (a === 10) return true;
		if (a === 127) return true;
		if (a === 0) return true;
		if (a === 169 && b === 254) return true;
		if (a === 172 && b >= 16 && b <= 31) return true;
		if (a === 192 && b === 168) return true;
		if (a === 100 && b >= 64 && b <= 127) return true;
		void c;
		void d;
	}
	if (h.includes(":")) {
		if (h === "::1") return true;
		if (h.startsWith("fe80:")) return true;
		if (h.startsWith("fc") || h.startsWith("fd")) return true;
	}
	return false;
}

function assertHttpsUrlAllowed(urlStr: string): URL {
	let u: URL;
	try {
		u = new URL(urlStr);
	} catch {
		throw new ORPCError("BAD_REQUEST", { message: "Invalid URL" });
	}
	if (u.protocol !== "https:") {
		throw new ORPCError("BAD_REQUEST", {
			message: "Only HTTPS URLs are allowed",
		});
	}
	if (isBlockedHost(u.hostname)) {
		throw new ORPCError("BAD_REQUEST", {
			message: "This URL host is not allowed",
		});
	}
	return u;
}

function pathnameToHint(pathname: string): string {
	const seg = pathname.split("/").pop() ?? "";
	return seg.length > 0 ? seg : "";
}

async function fetchTextFromImportUrl(urlStr: string): Promise<{
	text: string;
	filenameHint: string;
}> {
	const u = assertHttpsUrlAllowed(urlStr);
	const ac = new AbortController();
	const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
	try {
		const res = await fetch(u.toString(), {
			signal: ac.signal,
			redirect: "follow",
			headers: { Accept: "text/*, application/json, application/xml, */*" },
		});
		if (!res.ok) {
			throw new ORPCError("BAD_REQUEST", {
				message: `URL returned ${String(res.status)}`,
			});
		}
		const reader = res.body?.getReader();
		if (!reader) {
			const text = await res.text();
			if (text.length > MAX_BYTES) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Downloaded file is too large (max 2MB)",
				});
			}
			return { text, filenameHint: pathnameToHint(u.pathname) };
		}
		const chunks: Buffer[] = [];
		let total = 0;
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			if (!value) continue;
			total += value.byteLength;
			if (total > MAX_BYTES) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Downloaded file is too large (max 2MB)",
				});
			}
			chunks.push(Buffer.from(value));
		}
		const buf = Buffer.concat(chunks);
		const text = buf.toString("utf8");
		return { text, filenameHint: pathnameToHint(u.pathname) };
	} catch (e) {
		if (e instanceof ORPCError) throw e;
		if (e instanceof Error && e.name === "AbortError") {
			throw new ORPCError("BAD_REQUEST", { message: "Download timed out" });
		}
		throw new ORPCError("BAD_REQUEST", {
			message: e instanceof Error ? e.message : "Failed to fetch URL",
		});
	} finally {
		clearTimeout(timer);
	}
}

export async function previewStructuredImportFromRemoteUrl(
	input: PreviewStructuredImportFromUrlInputType,
) {
	const { text, filenameHint } = await fetchTextFromImportUrl(input.url);
	return previewStructuredImportFromBody({
		raw: text,
		filenameHint: filenameHint || undefined,
	});
}
