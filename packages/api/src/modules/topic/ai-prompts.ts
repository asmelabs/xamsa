import type { PackLanguage } from "@xamsa/schemas/db/schemas/enums/PackLanguage.schema";

const exampleTopicsAndQuestionsArray = [
	{
		topic: "Adı dəyişdirilmiş ölkələr",
		questions: [
			{
				text: "Zəngin təbiəti ilə məşhur olan bu ölkə adını yaxın illərdə dəyişmişdir. Yox, onlar hind toyuğu ilə düşmən deyildilər.",
				answer: "Türkiyə",
			},
			{
				text: "Rəsmi olaraq 2020-ci ildə adı dəyişdirilmiş bu ölkədə velosipdelərin sayı insanların sayından daha çoxdur. 23 Milyon!",
				answer: "Hollandiya",
			},
			{
				text: "BU ölkənin bayrağında ön pəncəsi ilə qılınc tutmuş şiri xatırlamaq olar. Seylon Çayı onların ən məşhur bitkisidir.",
				answer: "Şri-Lanka",
			},
			{
				text: "Swaizerlandın adının İsveçrə ilə oxşarlığı səbəbindən dəyişilməsini təklif edən BU kral, elə də dərindən fikirləşməmişdi.",
				answer: "Kral Msvat",
				explanation:
					"Kral Msvat ölkənin adını Esvatini etmişdi. Esvatini və Msvat adları arasındakı əlaqə olduqca diqqətəlayiqdir.",
			},
			{
				text: 'Keçmiş adı Daqomeya olan BU ölkə "Afrikanın Venesiyası" olaraq tanınan və su üzərində yerləşən Ganvia kəndinə sahiblik edir.',
				answer: "Benin",
			},
		],
	},
	{
		topic: "Meyvələr",
		questions: [
			{
				text: "Əsası 1976-cı ildə qoyulan bu şirkət hazırda dünyanın ən bahalı texnologiya şirkətidir.",
				answer: "Apple",
			},
			{
				text: "Arkade janrında olan bu oyunda oyunçu müxtəlif meyvələri doğramalıdır.",
				answer: "Fruit Ninja",
			},
			{
				text: "Azər Zeynalovun ifa etdiyi mahnıda Gəncədən gələn şəxsin yükü bu meyvədir.",
				answer: "Xurma",
			},
			{
				text: "Yunan mifinə inansaq, bu meyvəni yeyən Persefona Yeraltı dünyadan tamamilə azad ola bilmir.",
				answer: "Nar",
				explanation:
					"Kral Msvat ölkənin adını Esvatini etmişdi. Esvatini və Msvat adları arasındakı əlaqə olduqca diqqətəlayiqdir.",
			},
			{
				text: "Valentin Serovun məşhur rəsm əsərində 11 yaşlı Vera bunlarla təsvir edilmişdir.",
				answer: "Şaftalı",
			},
		],
	},
	{
		topic: "XIX əsr rəssamlığı",
		questions: [
			{
				text: "XIX əsrdə yaranmış bu janr öz adını Klod Monenin bir rəsm əsərindən almışdır.",
				answer: "Impressionizm",
			},
			{
				text: '"Ofeliya" və bir çox rəsmlərin modeli olmuş bu ingilis qadın özü də rəssam olmuşdur.',
				answer: "Elizabeth Siddal",
			},
			{
				text: "Titianın bir əsərindən ilhamlanan bu rəsm XIX əsrin ən gözlənilməz əsərlərindən sayılır. Arxa fondakı zənci qadın isə irqçiliklə bağlı etirazlara səbəb olmuşdur.",
				answer: "Olimpia",
				acceptableAnswers: ["Eduard Mane"],
			},
			{
				text: "XIX əsrin sonlarında yaranan bu Amerikan cərəyan adını rəssamların gündəlik həyatda təsvir etdiyi kül qabılarından almışdır.",
				answer: "Ashcan School",
			},
			{
				text: "Baci şokoladlarının qutusu İtalyan rəssamlığının bu nümunəsindən ilhamlanaraq yaradılmışdır.",
				answer: "Öpüş",
				explanation:
					"İl Bacio italyancadan öpüş deməkdir. 1859-cu ildə çəkilən rəsmdə cütlüyün öpüşü təsvir olunur.",
			},
		],
	},
	{
		topic: "Saitləri eyni",
		questions: [
			{
				text: "Nadir metal olan Vibraniumla zəngin olan bu xəyali ölkədə bu metalın 1 qramı 10000 dollara satılır.",
				answer: "Vakanda",
			},
			{
				text: "Ötən əsrin 30-cu illərini əhatə edən bunun simvollarından biri qara lentlə bağlanmış buğda dəstəsidir.",
				answer: "Qolodomor",
			},
			{
				text: "Nike-ın Air More Money idman ayaqqabılarının üzərində yapon yenini və bunda yazılar görmək olar.",
				answer: "Katakana",
			},
			{
				text: "Xristian təriqətlər arasında olan qarşıdurma səbəbilə baş verən qadın filosof Hypatia-nın qətlində bu müqəddəsi günahlandırırlar.",
				answer: "Kiril",
			},
			{
				text: "Thierry Sabine 1976-ci ildə bu səhrada itkin düşəndən sonra Paris-Dakar rallisinin yaranmasında böyük rolu olmuşdur.",
				answer: "Tenere",
			},
		],
	},
];

const LANGUAGE_LABEL: Record<PackLanguage, string> = {
	az: "Azerbaijani (az)",
	en: "English (en)",
	ru: "Russian (ru)",
	tr: "Turkish (tr)",
};

/** Compact few-shot in system prompt; keeps token use lower than pretty-printed JSON. */
const REAL_SHOW_EXAMPLES_JSON = JSON.stringify(exampleTopicsAndQuestionsArray);

/**
 * Xamsa: team quiz / “Xəmsə” style. Questions are read aloud; one short definitive answer.
 */
export function buildTopicGenerationSystemPrompt(
	language: PackLanguage,
): string {
	const lang = LANGUAGE_LABEL[language];
	return [
		`You are an expert author for "Xamsa" (Xamsa), a team-based quiz and intellectual game app.`,
		`All question text, answers, explanations, and acceptable variants MUST be written in ${lang} only. Do not mix other languages in the same field.`,
		`Output MUST be a single JSON object (no markdown fences) with this exact shape: {"questions":Array}.`,
		`"questions" must be exactly 5 items. Each item has keys: "text" (string, the clue), "answer" (string, the primary short answer players type),`,
		`"acceptableAnswers" (array of 0-5 short strings: alternate spellings, transliterations, articles, common synonyms—only if truly equivalent), "description" (optional, may be ""), "explanation" (optional one-sentence fact, may be "").`,
		`Answer rules: "answer" is the canonical form you expect; fill "acceptableAnswers" so scoring is not picky about minor spelling differences where appropriate.`,
		`Clue quality (Xamsa style): each "text" should feel like a live quiz clue—layered, not a dry encyclopedia lead. Prefer: a vivid hook, then a concrete fact or two that narrows to one name or short phrase. Avoid: pure dictionary definitions, trivia that depends on trick grammar, or unverifiable claims.`,
		"Vary the five questions across sub-themes of the topic; do not repeat the same kind of fact five times. Prefer facts a host can read with emphasis; reward careful listening over speed-reading one keyword.",
		`Be factually accurate. No hate, harassment, or NSFW. No instructions for real-world harm. Vocabulary is appropriate for a general-audience TV-style quiz in ${lang}.`,
		`The "text" field: about 2-4 short sentences (or one tight paragraph), under 1000 characters each; one clear best answer; avoid “gotcha” wording unless the topic demands it and it remains fair.`,
		"As you know each topic has 5 questions, questions should get harder and harder as you go on. Make sure to vary the questions so that they are not all the same type of question. So 1st question of the topic must be the easiest (but not that easy), and 5th should be the hardest. That is not always possible sometimes, but the rule must be followed.",
		`Example of tone and structure from a real Xamsa topic (match energy and defensibility, not necessarily the same subject): ${REAL_SHOW_EXAMPLES_JSON}`,
	].join(" ");
}

export function buildTopicGenerationUserPrompt(params: {
	topicName: string;
	topicDescription?: string;
	packName: string;
	packDescription: string | null;
	/** Optional; appended as a separate labeled block. */
	authorPrompt?: string;
}): string {
	const base = [
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

	const extra = params.authorPrompt?.trim();
	if (!extra) {
		return base;
	}

	return `${base}\n\nAdditional author instructions (apply if compatible with content safety and factual plausibility):\n${extra}`;
}
