import {
	GoogleGenerativeAI,
	GoogleGenerativeAIFetchError,
} from "@google/generative-ai";
import { env } from "@xamsa/env/server";
import type { PackLanguage } from "@xamsa/schemas/db/schemas/enums/PackLanguage.schema";
import {
	buildTopicGenerationSystemPrompt,
	buildTopicGenerationUserPrompt,
	buildTopicSeedingSystemPrompt,
	buildTopicSeedingUserPrompt,
} from "./ai-prompts";

/** Tried in order: best quality first, then lighter models when Pro/Flash are saturated. */
const MODEL_CHAIN = [
	"gemini-2.5-pro",
	"gemini-2.5-flash",
	"gemini-2.5-flash-lite",
] as const;

const TEMPERATURE = 0.28;
const RETRY_DELAY_MS = 2000;
const MAX_ATTEMPTS_PER_MODEL = 2;

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Reads validated env, then `process.env` (after dotenv), trimmed. */
export function resolveGeminiApiKey(): string | undefined {
	const raw = env.GEMINI_API_KEY ?? process.env.GEMINI_API_KEY;
	if (raw == null || raw === "") {
		return undefined;
	}
	const t = raw.trim();
	return t.length > 0 ? t : undefined;
}

function isRetryableGeminiError(error: unknown): boolean {
	if (error instanceof GoogleGenerativeAIFetchError) {
		const s = error.status;
		if (s === 503 || s === 429) {
			return true;
		}
		const msg = error.message;
		if (
			/RESOURCE_EXHAUSTED|rate limit|quota|Service Unavailable|try again later|high demand/i.test(
				msg,
			)
		) {
			return true;
		}
		return false;
	}
	if (error && typeof error === "object" && "message" in error) {
		return /\[(503|429)\b|Service Unavailable|RESOURCE_EXHAUSTED|try again later|high demand|rate limit|quota/i.test(
			String((error as { message?: unknown }).message),
		);
	}
	return false;
}

function isOverloadStyleError(error: unknown): boolean {
	if (error instanceof GoogleGenerativeAIFetchError && error.status === 503) {
		return true;
	}
	const msg = error instanceof Error ? error.message : String(error);
	return /503|Service Unavailable|high demand|try again later|overloaded|temporarily unavailable/i.test(
		msg,
	);
}

async function callGeminiModel(
	apiKey: string,
	model: string,
	systemInstruction: string,
	userText: string,
): Promise<unknown> {
	const genAI = new GoogleGenerativeAI(apiKey);
	const m = genAI.getGenerativeModel({
		model,
		systemInstruction,
		generationConfig: {
			temperature: TEMPERATURE,
			responseMimeType: "application/json",
		},
	});
	const result = await m.generateContent(userText);
	const text = result.response.text();
	if (text == null || text.trim() === "") {
		throw new Error("Empty response from Gemini");
	}
	return JSON.parse(text) as unknown;
}

/**
 * Walk the Gemini model chain (best → lightest) with bounded retries.
 * Caller validates the parsed JSON with Zod.
 */
async function callWithFallbackChain(
	system: string,
	user: string,
): Promise<unknown> {
	const apiKey = resolveGeminiApiKey();
	if (!apiKey) {
		throw new Error("GEMINI_API_KEY is not set");
	}

	let lastError: unknown;
	for (const modelName of MODEL_CHAIN) {
		for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_MODEL; attempt++) {
			try {
				return await callGeminiModel(apiKey, modelName, system, user);
			} catch (e) {
				lastError = e;
				if (!isRetryableGeminiError(e)) {
					const msg = e instanceof Error ? e.message : String(e);
					throw new Error(
						`Gemini API error (${modelName}): ${msg.slice(0, 500)}`,
					);
				}
				if (attempt < MAX_ATTEMPTS_PER_MODEL - 1) {
					await sleep(RETRY_DELAY_MS);
				}
			}
		}
	}

	if (lastError !== undefined) {
		const isQuotaOrCapacity =
			isOverloadStyleError(lastError) ||
			(lastError instanceof GoogleGenerativeAIFetchError &&
				(lastError.status === 429 || lastError.status === 503));
		if (isQuotaOrCapacity) {
			throw new Error(
				"AI service is temporarily overloaded. Please try again in a moment.",
			);
		}
	}
	const msg =
		lastError instanceof Error ? lastError.message : String(lastError);
	throw new Error(
		`All Gemini models are currently unavailable. ${msg.slice(0, 240)}`,
	);
}

/**
 * @returns parsed JSON (unknown) — caller must validate with Zod
 */
export async function generateTopicQuestionsJson(params: {
	language: PackLanguage;
	topicName: string;
	topicDescription?: string;
	packName: string;
	packDescription: string | null;
	authorPrompt?: string;
}): Promise<unknown> {
	const system = buildTopicGenerationSystemPrompt(params.language);
	const user = buildTopicGenerationUserPrompt({
		topicName: params.topicName,
		topicDescription: params.topicDescription,
		packName: params.packName,
		packDescription: params.packDescription,
		authorPrompt: params.authorPrompt,
	});
	return callWithFallbackChain(system, user);
}

/**
 * Generate ONE topic seed (name + 1-sentence description) for an existing pack.
 * The model is given the existing topic names so it never duplicates.
 *
 * @returns parsed JSON (unknown) — caller must validate with Zod
 */
export async function generateTopicJson(params: {
	language: PackLanguage;
	packName: string;
	packDescription: string | null;
	seed?: string;
	authorPrompt?: string;
	existingTopicNames: string[];
}): Promise<unknown> {
	const system = buildTopicSeedingSystemPrompt(params.language);
	const user = buildTopicSeedingUserPrompt({
		packName: params.packName,
		packDescription: params.packDescription,
		seed: params.seed,
		authorPrompt: params.authorPrompt,
		existingTopicNames: params.existingTopicNames,
	});
	return callWithFallbackChain(system, user);
}
