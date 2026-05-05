import { ORPCError } from "@orpc/server";
import prisma from "@xamsa/db";
import type {
	ExportPackInputType,
	ExportPackOutputType,
} from "@xamsa/schemas/modules/pack";
import {
	buildExportFilename,
	EXPORT_MIME_TYPE,
	serializeTopics,
} from "../topic/structured-export";

/**
 * Author + staff (moderator/admin) can download a pack as JSON / YAML / XML /
 * CSV / TXT. Output is a `CreateTopicPayload[]`-compatible payload so the same
 * file can be re-imported by anyone with edit rights.
 */
export async function exportPack(
	input: ExportPackInputType,
	userId: string,
): Promise<ExportPackOutputType> {
	const viewer = await prisma.user.findUnique({
		where: { id: userId },
		select: { role: true },
	});

	const pack = await prisma.pack.findUnique({
		where: { slug: input.slug },
		select: {
			id: true,
			slug: true,
			authorId: true,
			topics: {
				orderBy: { order: "asc" },
				select: {
					name: true,
					description: true,
					questions: {
						orderBy: { order: "asc" },
						select: {
							text: true,
							answer: true,
							acceptableAnswers: true,
							description: true,
							explanation: true,
						},
					},
				},
			},
		},
	});

	if (!pack) {
		throw new ORPCError("NOT_FOUND", {
			message: `Pack with slug ${input.slug} not found`,
		});
	}

	const isAuthor = pack.authorId === userId;
	const isStaff = viewer?.role === "admin" || viewer?.role === "moderator";
	if (!isAuthor && !isStaff) {
		throw new ORPCError("FORBIDDEN", {
			message: "Only the author can export this pack.",
		});
	}

	const topics = pack.topics.map((t) => ({
		name: t.name,
		description: t.description ?? "",
		questions: t.questions.map((q) => ({
			text: q.text,
			answer: q.answer,
			acceptableAnswers: q.acceptableAnswers,
			description: q.description ?? "",
			explanation: q.explanation ?? "",
		})),
	}));

	const body = serializeTopics(topics, input.format);
	const filename = buildExportFilename("pack", pack.slug, input.format);
	const mimeType = EXPORT_MIME_TYPE[input.format];

	return { filename, mimeType, body };
}
