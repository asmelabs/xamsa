import { ORPCError } from "@orpc/server";
import prisma from "@xamsa/db";
import {
	BulkCreateTopicsInputSchema,
	type BulkCreateTopicsInputType,
	BulkCreateTopicsOutputSchema,
} from "@xamsa/schemas/modules/topic";
import { scheduleWhenResponseSent } from "../../lib/schedule-when-response-sent";
import { bulkCreateTopics } from "./service";

/**
 * Enqueues async bulk create; returns immediately. Processing runs in the background
 * (Vercel: `waitUntil` keeps the function alive after the response).
 */
export async function startBulkCreateJob(
	input: BulkCreateTopicsInputType,
	userId: string,
): Promise<{ jobId: string }> {
	const parsed = BulkCreateTopicsInputSchema.parse(input);

	const job = await prisma.topicBulkJob.create({
		data: {
			userId,
			packSlug: parsed.pack,
			status: "pending",
			payload: parsed as object,
			totalTopics: parsed.topics.length,
		},
		select: { id: true },
	});

	scheduleWhenResponseSent(() => processTopicBulkJob(job.id));

	return { jobId: job.id };
}

export async function getBulkCreateJob(jobId: string, userId: string) {
	const job = await prisma.topicBulkJob.findFirst({
		where: { id: jobId, userId },
		select: {
			status: true,
			totalTopics: true,
			errorMessage: true,
			result: true,
			updatedAt: true,
		},
	});

	if (!job) {
		throw new ORPCError("NOT_FOUND", {
			message: "Job not found",
		});
	}

	let result: { created: { slug: string }[] } | null = null;
	if (job.result != null) {
		const p = BulkCreateTopicsOutputSchema.safeParse(job.result);
		if (p.success) {
			result = p.data;
		}
	}

	return {
		status: job.status as "pending" | "running" | "completed" | "failed",
		totalTopics: job.totalTopics,
		errorMessage: job.errorMessage,
		result,
		updatedAt: job.updatedAt,
	};
}

export async function processTopicBulkJob(jobId: string): Promise<void> {
	const claim = await prisma.topicBulkJob.updateMany({
		where: {
			id: jobId,
			status: "pending",
		},
		data: {
			status: "running",
		},
	});

	if (claim.count === 0) {
		return;
	}

	const job = await prisma.topicBulkJob.findUniqueOrThrow({
		where: { id: jobId },
		select: { payload: true, userId: true },
	});

	let input: BulkCreateTopicsInputType;
	try {
		input = BulkCreateTopicsInputSchema.parse(job.payload);
	} catch (e) {
		const message =
			e instanceof Error ? e.message : "Invalid job payload in database";
		await prisma.topicBulkJob.update({
			where: { id: jobId },
			data: {
				status: "failed",
				errorMessage: message.slice(0, 2000),
			},
		});
		return;
	}

	try {
		const out = await bulkCreateTopics(input, job.userId);
		await prisma.topicBulkJob.update({
			where: { id: jobId },
			data: {
				status: "completed",
				result: out as object,
				errorMessage: null,
			},
		});
	} catch (e) {
		const message =
			e instanceof Error
				? e.message
				: typeof e === "object" && e !== null && "message" in e
					? String((e as { message: unknown }).message)
					: String(e);
		await prisma.topicBulkJob.update({
			where: { id: jobId },
			data: {
				status: "failed",
				errorMessage: message.slice(0, 2000),
			},
		});
	}
}
