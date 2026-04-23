import { ORPCError } from "@orpc/server";
import prisma from "@xamsa/db";
import { RoleSchema } from "@xamsa/schemas/db/schemas/enums/Role.schema";
import type {
	GenerateTopicQuestionsInputType,
	GenerateTopicQuestionsOutputType,
	GetAiTopicQuotaOutputType,
} from "@xamsa/schemas/modules/topic";
import { GenerateTopicQuestionsOutputSchema } from "@xamsa/schemas/modules/topic";
import {
	getDailyAiGenerationLimit,
	startOfNextUtcDay,
	startOfUtcDay,
} from "@xamsa/utils/ai-limits";
import { generateTopicQuestionsJson, resolveGeminiApiKey } from "./llm-gemini";

type QuotaUser = {
	aiUseCount: number;
	aiUseWindowDate: Date | null;
	role: string;
};

function effectiveUsedThisUtcDay(user: QuotaUser, now: Date): number {
	const today = startOfUtcDay(now);
	if (!user.aiUseWindowDate || user.aiUseWindowDate < today) {
		return 0;
	}
	return user.aiUseCount;
}

export async function getAiTopicQuota(
	userId: string,
): Promise<GetAiTopicQuotaOutputType> {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: {
			aiUseCount: true,
			aiUseWindowDate: true,
			role: true,
		},
	});

	if (!user) {
		throw new ORPCError("NOT_FOUND", { message: "User not found" });
	}

	const now = new Date();
	const used = effectiveUsedThisUtcDay(
		{
			aiUseCount: user.aiUseCount,
			aiUseWindowDate: user.aiUseWindowDate,
			role: user.role,
		},
		now,
	);
	const limit = getDailyAiGenerationLimit(RoleSchema.parse(user.role));

	return {
		used,
		limit,
		resetsAt: startOfNextUtcDay(now).toISOString(),
	};
}

export async function generateTopicQuestionsWithAI(
	input: GenerateTopicQuestionsInputType,
	userId: string,
): Promise<GenerateTopicQuestionsOutputType> {
	if (!resolveGeminiApiKey()) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message:
				"AI topic generation is not configured. Set GEMINI_API_KEY in apps/web/.env (or the process environment) and restart the dev server.",
		});
	}

	const u1 = await prisma.user.findUnique({
		where: { id: userId },
		select: {
			aiUseCount: true,
			aiUseWindowDate: true,
			role: true,
		},
	});
	if (!u1) {
		throw new ORPCError("NOT_FOUND", { message: "User not found" });
	}

	const now1 = new Date();
	const used1 = effectiveUsedThisUtcDay(u1, now1);
	const limit1 = getDailyAiGenerationLimit(RoleSchema.parse(u1.role));
	if (used1 >= limit1) {
		throw new ORPCError("BAD_REQUEST", {
			message: `Daily AI generation limit reached (${String(limit1)} per UTC day). Resets at midnight UTC.`,
		});
	}

	const pack = await prisma.pack.findFirst({
		where: {
			slug: input.pack,
			authorId: userId,
			status: "draft",
		},
		select: {
			name: true,
			description: true,
			language: true,
		},
	});
	if (!pack) {
		throw new ORPCError("NOT_FOUND", {
			message: "Pack not found or not editable",
		});
	}

	const language = input.language ?? pack.language;

	let raw: unknown;
	try {
		const authorTrimmed = input.authorPrompt?.trim();
		raw = await generateTopicQuestionsJson({
			language,
			topicName: input.topicName,
			topicDescription: input.topicDescription,
			packName: pack.name,
			packDescription: pack.description,
			...(authorTrimmed ? { authorPrompt: authorTrimmed } : {}),
		});
	} catch (e) {
		const message =
			e instanceof Error ? e.message : "Failed to call AI provider";
		if (
			message ===
				"AI service is temporarily overloaded. Please try again in a moment." ||
			message.startsWith("All Gemini models are currently unavailable")
		) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", { message });
		}
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: `AI request failed: ${message}`,
		});
	}

	const parsed = GenerateTopicQuestionsOutputSchema.safeParse(raw);
	if (!parsed.success) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message:
				"The AI response could not be validated. Please try again or rephrase the topic.",
		});
	}

	const now2 = new Date();
	const today = startOfUtcDay(now2);

	await prisma.$transaction(async (tx) => {
		const u2 = await tx.user.findUnique({
			where: { id: userId },
			select: {
				aiUseCount: true,
				aiUseWindowDate: true,
				role: true,
			},
		});
		if (!u2) {
			throw new ORPCError("NOT_FOUND", { message: "User not found" });
		}
		const used2 = effectiveUsedThisUtcDay(u2, now2);
		const limit2 = getDailyAiGenerationLimit(RoleSchema.parse(u2.role));
		if (used2 >= limit2) {
			throw new ORPCError("BAD_REQUEST", {
				message:
					"Daily AI generation limit was reached. Please try again tomorrow.",
			});
		}

		const isNewWindow = !u2.aiUseWindowDate || u2.aiUseWindowDate < today;
		const nextCount = isNewWindow ? 1 : u2.aiUseCount + 1;

		await tx.user.update({
			where: { id: userId },
			data: {
				lastAiUsedAt: now2,
				aiUseWindowDate: today,
				aiUseCount: nextCount,
			},
		});
	});

	return parsed.data;
}
