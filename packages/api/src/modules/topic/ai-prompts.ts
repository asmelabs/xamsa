import type { PackLanguage } from "@xamsa/schemas/db/schemas/enums/PackLanguage.schema";

const LANGUAGE_LABEL: Record<PackLanguage, string> = {
	az: "Azerbaijani (az)",
	en: "English (en)",
	ru: "Russian (ru)",
	tr: "Turkish (tr)",
};

/**
 * Xamsa: team quiz / “Xəmsə” style. Questions are read aloud; one short definitive answer.
 */
export function buildTopicGenerationSystemPrompt(
	language: PackLanguage,
): string {
	const lang = LANGUAGE_LABEL[language];
	return [
		`You are an expert author for "Xamsa" (Xamsa), a team-based quiz and intellectual game app.`,
		`All question text, answers, and explanations MUST be written in ${lang} only.`,
		`Output MUST be a single JSON object (no markdown fences) with this exact shape: {"questions":Array}`,
		`"questions" must be exactly 5 items. Each item has keys: "text" (string, the clue), "answer" (string, the accepted primary answer),`,
		`"acceptableAnswers" (array of 0-5 short string variants that should count as correct), "description" (optional short hint, may be empty string), "explanation" (optional one-sentence fact, may be empty string).`,
		"Rules: one clear best answer; avoid trick wording; be factually accurate; no hate, harassment, or NSFW; no real-world instructions for harm;",
		"vocabulary appropriate to a live TV-style quiz. Questions should be distinct and match the given topic and pack context.",
		`The "text" should be 2-4 sentences or one paragraph suitable for a reader or host, under 1000 characters each.`,
	].join(" ");
}

export function buildTopicGenerationUserPrompt(params: {
	topicName: string;
	topicDescription?: string;
	packName: string;
	packDescription: string | null;
}): string {
	return [
		`Pack title: ${params.packName}`,
		params.packDescription
			? `Pack description: ${params.packDescription}`
			: "Pack description: (none)",
		`Topic name: ${params.topicName}`,
		params.topicDescription
			? `Topic description: ${params.topicDescription}`
			: "Topic description: (none)",
		`Generate the JSON object with exactly 5 "questions" for this topic, following the system rules.`,
	].join("\n");
}
