import { ORPCError } from "@orpc/server";
import prisma from "@xamsa/db";
import type {
	ExportTopicInputType,
	ExportTopicOutputType,
} from "@xamsa/schemas/modules/topic";
import {
	buildExportFilename,
	EXPORT_MIME_TYPE,
	serializeTopics,
} from "./structured-export";

/**
 * Author + staff (moderator/admin) can download a single topic in any of the
 * supported formats. The exported file shape matches the import payload so it
 * can be re-imported into a different pack.
 */
export async function exportTopic(
	input: ExportTopicInputType,
	userId: string,
): Promise<ExportTopicOutputType> {
	const viewer = await prisma.user.findUnique({
		where: { id: userId },
		select: { role: true },
	});

	const topic = await prisma.topic.findFirst({
		where: {
			slug: input.slug,
			pack: { slug: input.packSlug },
		},
		select: {
			slug: true,
			name: true,
			description: true,
			pack: { select: { authorId: true } },
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
	});

	if (!topic) {
		throw new ORPCError("NOT_FOUND", {
			message: `Topic ${input.slug} not found in pack ${input.packSlug}`,
		});
	}

	const isAuthor = topic.pack.authorId === userId;
	const isStaff = viewer?.role === "admin" || viewer?.role === "moderator";
	if (!isAuthor && !isStaff) {
		throw new ORPCError("FORBIDDEN", {
			message: "Only the pack author can export this topic.",
		});
	}

	const payload = [
		{
			name: topic.name,
			description: topic.description ?? "",
			questions: topic.questions.map((q) => ({
				text: q.text,
				answer: q.answer,
				acceptableAnswers: q.acceptableAnswers,
				description: q.description ?? "",
				explanation: q.explanation ?? "",
			})),
		},
	];

	const body = serializeTopics(payload, input.format);
	const filename = buildExportFilename("topic", topic.slug, input.format);
	const mimeType = EXPORT_MIME_TYPE[input.format];

	return { filename, mimeType, body };
}
