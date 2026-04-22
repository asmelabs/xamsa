import { ORPCError } from "@orpc/server";
import prisma from "@xamsa/db";
import type {
	FindOnePackageInput,
	ListTsualPackagesInput,
} from "@xamsa/schemas/modules/tsual";
import {
	FindOnePackageInputSchema,
	FindOnePackageOutputSchema,
	ListTsualPackagesInputSchema,
	ListTsualPackagesResponseSchema,
	PreviewTsualImportInputSchema,
	PreviewTsualImportOutputSchema,
	parseTsualPackageIdFromRaw,
	TSUAL_IMPORT_ALLOWED_GAME_NAMES,
} from "@xamsa/schemas/modules/tsual";
import type { z } from "zod";
import {
	mapForUseToXamsaTopicPayloads,
	TsualMapError,
} from "./map-foruse-to-topics";

const TSUAL_BASE = "https://api.3sual.az/api";

const ALLOWED_GAMES = new Set<string>(TSUAL_IMPORT_ALLOWED_GAME_NAMES);

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

function assertGameAllowedForImport(gameName: string): void {
	if (!ALLOWED_GAMES.has(gameName.trim())) {
		throw new ORPCError("BAD_REQUEST", {
			message: `Yalnız bu oyun tiplərindən pakedlər import oluna bilər: ${TSUAL_IMPORT_ALLOWED_GAME_NAMES.join(", ")}. Bu paked: "${gameName}".`,
		});
	}
}

/**
 * Serves `topic.bulkCreate` with `importedFromTsualPackageId`: 3sual paketinin mövcud
 * oyun tipini və (user, tsualId) cütlüyün unikallığını yoxlayır.
 */
export async function assertUserCanCommitTsualImport(
	authorId: string,
	tsualPackageId: number,
): Promise<void> {
	const existing = await prisma.userTsualPackageImport.findUnique({
		where: {
			userId_tsualPackageId: {
				userId: authorId,
				tsualPackageId,
			},
		},
	});
	if (existing) {
		throw new ORPCError("CONFLICT", {
			message:
				"Bu 3sual pakedi artıq sizin hesabınıza import olunub; eyni pakedi təkrar yaddaşa yazmaq olmaz.",
		});
	}
	const data = await getTsualForUse({ id: tsualPackageId });
	if (data.package.id !== tsualPackageId) {
		throw new ORPCError("BAD_REQUEST", {
			message: "3sual cavabı gözlənilən pakedlə üst-üstə düşmədi.",
		});
	}
	assertGameAllowedForImport(data.package.game.name ?? "");
}

export async function previewTsualImport(
	input: z.infer<typeof PreviewTsualImportInputSchema>,
	userId: string,
): Promise<z.infer<typeof PreviewTsualImportOutputSchema>> {
	const { raw } = PreviewTsualImportInputSchema.parse(input);
	const id = parseTsualPackageIdFromRaw(raw);
	if (id === null) {
		throw new ORPCError("BAD_REQUEST", {
			message:
				"Düzgün paked ID daxil edin (rəqəm) və ya 3sual.az paked səhifəsinin linkini yapışdırın (məs. .../package/3946).",
		});
	}

	const already = await prisma.userTsualPackageImport.findUnique({
		where: {
			userId_tsualPackageId: { userId, tsualPackageId: id },
		},
	});
	if (already) {
		throw new ORPCError("CONFLICT", {
			message:
				"Bu 3sual pakedini artıq import etmisiniz; təkrar import mümkün deyil.",
		});
	}

	const data = await getTsualForUse({ id });

	assertGameAllowedForImport(data.package.game.name ?? "");
	if (data.package.id !== id) {
		throw new ORPCError("BAD_REQUEST", {
			message: "3sual cavabı gözlənilən pakedlə üst-üstə düşmədi.",
		});
	}

	let topics: ReturnType<typeof mapForUseToXamsaTopicPayloads>;
	try {
		topics = mapForUseToXamsaTopicPayloads(data);
	} catch (e) {
		if (e instanceof TsualMapError) {
			throw new ORPCError("BAD_REQUEST", { message: e.message });
		}
		throw e;
	}

	if (topics.length === 0) {
		throw new ORPCError("BAD_REQUEST", {
			message:
				"Bu pakedda import üçün mövzu yoxdur (ərazi və mövzularda 5 suallı mövzu tapılmadı).",
		});
	}

	const sourceName =
		data.package.name != null && String(data.package.name).trim() !== ""
			? String(data.package.name).trim()
			: `3sual #${String(data.package.id)}`;

	return PreviewTsualImportOutputSchema.parse({
		topics,
		sourceName,
		tsualPackageId: data.package.id,
	});
}
