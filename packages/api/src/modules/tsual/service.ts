import { ORPCError } from "@orpc/server";
import type {
	FindOnePackageInput,
	ListTsualPackagesInput,
} from "@xamsa/schemas/modules/tsual";
import {
	FindOnePackageInputSchema,
	FindOnePackageOutputSchema,
	ListTsualPackagesInputSchema,
	ListTsualPackagesResponseSchema,
	PreviewTsualImportOutputSchema,
} from "@xamsa/schemas/modules/tsual";
import type { z } from "zod";
import { mapForUseToXamsaTopicPayloads } from "./map-foruse-to-topics";

const TSUAL_BASE = "https://api.3sual.az/api";

function buildForHomeUrl(input: ListTsualPackagesInput): string {
	const sp = new URLSearchParams();
	sp.set("page", String(input.page));
	sp.set("games", input.games);
	sp.set("word", input.word ?? "");
	return `${TSUAL_BASE}/packages/forhome?${sp.toString()}`;
}

export async function listTsualForHome(
	input: ListTsualPackagesInput,
): Promise<z.infer<typeof ListTsualPackagesResponseSchema>> {
	const parsed = ListTsualPackagesInputSchema.parse(input);
	const res = await fetch(buildForHomeUrl(parsed), {
		headers: { Accept: "application/json" },
	});
	if (!res.ok) {
		throw new ORPCError("BAD_REQUEST", {
			message: `3sual list failed: HTTP ${String(res.status)}`,
		});
	}
	const json: unknown = await res.json();
	return ListTsualPackagesResponseSchema.parse(json);
}

export async function getTsualForUse(input: FindOnePackageInput) {
	const { id } = FindOnePackageInputSchema.parse(input);
	const url = new URL(`${TSUAL_BASE}/packages/foruse`);
	url.searchParams.set("id", String(id));
	const res = await fetch(url, {
		headers: { Accept: "application/json" },
	});
	if (!res.ok) {
		throw new ORPCError("NOT_FOUND", {
			message: `3sual package not found (HTTP ${String(res.status)})`,
		});
	}
	const json: unknown = await res.json();
	return FindOnePackageOutputSchema.parse(json);
}

export async function previewTsualImport(
	input: FindOnePackageInput,
): Promise<z.infer<typeof PreviewTsualImportOutputSchema>> {
	const data = await getTsualForUse(input);
	const topics = mapForUseToXamsaTopicPayloads(data);
	return PreviewTsualImportOutputSchema.parse({
		topics,
		sourceName: data.package.name,
	});
}
