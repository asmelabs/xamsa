import { env } from "@xamsa/env/server";
import type { PackLanguage } from "@xamsa/schemas/db/schemas/enums/PackLanguage.schema";
import {
	buildTopicGenerationSystemPrompt,
	buildTopicGenerationUserPrompt,
} from "./ai-prompts";

const GROQ_CHAT_COMPLETIONS = "https://api.groq.com/openai/v1/chat/completions";

const MODEL = "llama-3.3-70b-versatile";

type GroqMessage = { role: "system" | "user" | "assistant"; content: string };

/** Reads validated env, then `process.env` (after dotenv), trimmed. */
export function resolveGroqApiKey(): string | undefined {
	const raw = env.GROQ_API_KEY ?? process.env.GROQ_API_KEY;
	if (raw == null || raw === "") {
		return undefined;
	}
	const t = raw.trim();
	return t.length > 0 ? t : undefined;
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
}): Promise<unknown> {
	const apiKey = resolveGroqApiKey();
	if (!apiKey) {
		throw new Error("GROQ_API_KEY is not set");
	}

	const system = buildTopicGenerationSystemPrompt(params.language);
	const user = buildTopicGenerationUserPrompt({
		topicName: params.topicName,
		topicDescription: params.topicDescription,
		packName: params.packName,
		packDescription: params.packDescription,
	});

	const messages: GroqMessage[] = [
		{ role: "system", content: system },
		{ role: "user", content: user },
	];

	const res = await fetch(GROQ_CHAT_COMPLETIONS, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
			model: MODEL,
			messages,
			temperature: 0.35,
			response_format: { type: "json_object" },
		}),
	});

	if (!res.ok) {
		const errText = await res.text();
		throw new Error(`Groq API error ${res.status}: ${errText.slice(0, 500)}`);
	}

	const data = (await res.json()) as {
		choices?: { message?: { content?: string } }[];
	};

	const content = data.choices?.[0]?.message?.content;
	if (!content) {
		throw new Error("Empty response from Groq");
	}

	return JSON.parse(content) as unknown;
}
