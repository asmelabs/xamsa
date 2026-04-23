import type { PackLanguage } from "@xamsa/schemas/db/schemas/enums/PackLanguage.schema";

// ============================================================
// XAMSA STYLE ANALYSIS AND EXAMPLES
//
// These examples are organized by topic ARCHETYPE to teach the model
// the different structural patterns Xamsa uses. Each archetype has
// different rules for what counts as a good question.
// ============================================================

const XAMSA_TOPIC_ARCHETYPES = {
	// ARCHETYPE 1: Shared-word constraint
	// Every answer must share a specific word, phoneme, or structural
	// property. The topic title signals the constraint.
	sharedWordConstraint: {
		rule: "Every answer contains/is named the same key word. Pull from 5 completely unrelated domains.",
		examples: [
			{
				topic: "Sebastian",
				why: "All answers share the name 'Sebastian'. The 5 answers span: MCU actor, F1 driver, Catholic saint, Shakespeare play, Disney animated film. Five separate worlds.",
				questions: [
					{
						text: "Kapitan Amerika: Qış əsgəri, Mən,Tonya, İblislə sövdələşmə, Fresh. Eşitdiklərinizə onun filmoqrafiyasında rast gəlmək olar.",
						answer: "Sebastian Stan",
					},
					{
						text: "Hazırda Aston Martini təmsil edən o, vaxtilə F1 yarışlarının ən gənc qalibi olub.",
						answer: "Sebastian Vettel",
					},
					{
						text: "Rəvayətə görə, ağaca bağlanıb oxlarla vurulan bu şəxs Romalı İren tərəfindən xilas edilib.",
						answer: "Müqəddəs Sebastian",
					},
					{
						text: "Onun 'On ikinci gecə' tamaşasında həlak olduğu düşünülən Sebastian sonda əkiz bacısı Violayla görüşür.",
						answer: "Uilyam Şekspir",
					},
					{
						text: "Samuel Wright Disneyin bu animasiyasında Sebastian rolunu səsləndirdiyinə görə 'Ən yaxşı orijinal musiqi' Oskarını qazanmışdır.",
						answer: "Kiçik Su pərisi (Ariel)",
					},
				],
			},
			{
				topic: "Aleksandr",
				why: "All answers are named Aleksandr. Domains: German naturalist (Humboldt), Russian playwright (Griboyedov), Russian composer-chemist (Borodin), Russian physicist (Stoletov), Czechoslovak leader (Dubček).",
				questions: [
					{
						text: "Bu şəxs 1799-cu ildə Bonplan adlı botanik dostu ilə birlikdə Cənubi və Mərkəzi Amerikanı tədqiq etmək üçün ispan hakimiyyətindən icazə almışdı.",
						answer: "Aleksandr Humboldt",
					},
					{
						text: "'Əli və Nino' əsərində Əli xan Şirvanşir Gürcüstana səfəri zamanı üzərində 'Sənin ağlın və əməllərin unudulmazdır, amma nə üçün Ninonun məhəbbəti sənin ömründən uzun yaşadı?' sözləri yazılmış qəbri ziyarət edir. Bu qəbrin kimə aid olduğunu deyin.",
						answer: "Aleksandr Qriboyedov",
					},
				],
			},
		],
	},

	// ARCHETYPE 2: Phonetic/orthographic constraint
	// Topic name encodes a letter/sound pattern ALL answers must satisfy.
	// This is a hallmark Xamsa topic type.
	phoneticConstraint: {
		rule: "ALL answers must satisfy the letter/sound pattern in the topic name. This is an absolute structural rule — any answer violating it is a failed question.",
		examples: [
			{
				topic: "Saitləri eyni",
				why: "All answers have the same repeated vowel pattern (Vakanda=a-a-a-a, Qolodomor=o-o-o-o, Katakana=a-a-a-a, Kiril=i-i, Tenere=e-e-e). Domains span fictional geography, Soviet history, Japanese writing, religious figures, and desert exploration.",
				questions: [
					{
						text: "Nadir metal olan Vibraniumla zəngin olan bu xəyali ölkədə bu metalın 1 qramı 10000 dollara satılır.",
						answer: "Vakanda",
					},
					{
						text: "Nike-ın Air More Money idman ayaqqabılarının üzərində yapon yenini və bunda yazılar görmək olar.",
						answer: "Katakana",
					},
				],
			},
			{
				topic: "Palindrom sözlər",
				why: "All answers are Azerbaijani palindromes: Tut (mulberry), Pop (music), Mühüm (important), Qapaq (cover), Mum (wax). Each clue approaches a different domain: botany, music genre, linguistics, dictionary definition, bee products.",
			},
			{
				topic: "Təkhecalı mövzu",
				why: "All answers are one-syllable: Best (George Best), Qar (Pamuk novel), Buz (a Məmmədquluzadə piece), Pen, Skoll. 5 different domains: football, literature, Azerbaijani classic, etymology, beverage brand.",
			},
		],
	},

	// ARCHETYPE 3: Shared-attribute constraint
	// Answers share an external attribute (same country, same initials,
	// same surname, etc.)
	sharedAttribute: {
		rule: "Every answer shares a named attribute. The fun is in identifying the attribute through the clue.",
		examples: [
			{
				topic: "Soyadları eyni",
				why: "Each question asks for TWO answers sharing a surname. Domains MUST be unrelated (astronaut + jazzman, GTA character + actor, US president + film director).",
				questions: [
					{
						text: "Birincisi ən məşhur amerikalı kosmonavtlardan biri, ikincisi isə onun həmyerlisi məşhur jazzman-dir.",
						answer: "Neil Armstrong və Loius Armstrong",
					},
					{
						text: "Onların birincisi seçkisiz hakimiyyətə gələn keçmiş ABŞ prezidenti, ikinci şəxs isə 'Ən Yaxşı Rejissor' nominasiyasında ən çox Oscar qazanan rejissordur.",
						answer: "Gerald Ford və John Ford",
					},
				],
			},
			{
				topic: "Həmyerlilər",
				why: "Clue is a list of 5 famous people. Answer is the country they all share. Works because the famous people come from wildly different eras and fields — Wittgenstein + Klimt + Mozart + Niki Lauda + Christoph Waltz all being Austrian forces the player to find the one thread connecting them.",
			},
		],
	},

	// ARCHETYPE 4: List-as-clue
	// The entire question is just a list of 5 things. The player identifies
	// what connects them (the person, the country, etc.)
	listAsClue: {
		rule: "The question text is ONLY a list (songs, films, names, works). Zero prose. Player identifies the common source. No 'Eşitdiklərinizə' framing needed — the list IS the clue.",
		examples: [
			{
				topic: "Qadın Müğənnilər",
				why: "Each question is 5 song titles. Singers span 5 different music cultures: American pop (Adele), Azerbaijani (Flora Kərimova), Russian (Alla Puqaçova), Iranian (Googoosh), 80s American pop (Belinda Carlisle).",
				questions: [
					{
						text: "'Someone Like You', 'Make You Feel My Love', 'Remedy', 'Skyfall', 'Hello'",
						answer: "Adele",
					},
					{
						text: "'Leave a Light On', 'Mad About You', 'La Luna', 'Circle in the Sand', 'Heaven is a Place on Earth'",
						answer: "Belinda Carlisle (Belinda Karlayl)",
					},
				],
			},
			{
				topic: "Rejissorların film siyahısı",
				why: "Each question = 4-5 film titles. Answer = the director. Must be famous auteurs identifiable from their body of work (Polanski, Tarkovski, Del Toro, Almodóvar, Kiarostami).",
			},
		],
	},

	// ARCHETYPE 5: Cultural artifact topic
	// Questions are anchored in a specific medium (posters, covers, coats of arms).
	mediumAnchored: {
		rule: "All questions describe the same type of visual/cultural object. The variety comes from the content of the objects (different films, books, countries).",
		examples: [
			{
				topic: "Filmlərin minimalistik posterləri",
				why: "Each clue describes a minimalist poster; player identifies the film. Posters cover: Schindler's List (red coat on black), Seven (opened box), Leon (milk carton + gun + glasses), Her (heart of 0s and 1s), Incendies (dots and 1+1=1). Visual descriptions are sharp and unmistakable.",
			},
			{
				topic: "Ölkələrin gerb təsvirləri",
				why: "Each clue describes a country's coat of arms; player identifies the country. Pulls from 5 continents and unrelated national symbols.",
			},
		],
	},

	// ARCHETYPE 6: Thematic concept
	// A single concept (death, revolution, fruits) explored from radically
	// different angles in each question.
	thematicConcept: {
		rule: "The topic is a concept, NOT a question template. Each question must approach it from a DIFFERENT domain. For 'Fruits': one question about a tech company name, one about a video game, one about a song lyric, one about Greek mythology, one about a famous painting. NOT 5 variants of 'name this fruit'.",
		examples: [
			{
				topic: "Meyvələr (Fruits)",
				why: "Apple (tech company), Fruit Ninja (arcade game), Xurma (Azerbaijani song lyric), Nar (Persephone myth), Şaftalı (Serov painting). Each fruit is revealed through a completely different cultural window.",
				questions: [
					{
						text: "Əsası 1976-cı ildə qoyulan bu şirkət hazırda dünyanın ən bahalı texnologiya şirkətidir.",
						answer: "Apple",
					},
					{
						text: "Yunan mifinə inansaq, bu meyvəni yeyən Persefona Yeraltı dünyadan tamamilə azad ola bilmir.",
						answer: "Nar",
					},
				],
			},
			{
				topic: "Atlar (Horses)",
				why: "Actor's role in a film, horse domestication history, specific breed, iconic movie scene, company logo. 5 unrelated domains linked only by horses.",
			},
			{
				topic: "İnqilab (Revolution)",
				why: "Orange Revolution (Ukraine), September 12 coup (Turkey), Iranian Revolution (Shah Pahlavi), Haitian Revolution, Rose Revolution (Georgia). Different countries, different eras, different political contexts.",
			},
		],
	},
};

// ============================================================
// FAILURE MODES — Real examples of what bad AI generation looks like.
// Teaching the model to avoid these specifically.
// ============================================================

const FAILURE_MODES = {
	formulaicRepetition: {
		badTopic: "Countries",
		badQuestions: [
			"This is the biggest country in the world. (Russia)",
			"This is the 3rd most populous country in the world. (USA)",
			"This country has the longest coastline. (Canada)",
			"This country has the most neighbors. (China/Russia)",
			"This country is the smallest by area. (Vatican City)",
		],
		whyBad:
			"All 5 questions are 'superlative + country' templates. Google-able in 2 seconds. No cultural angles, no narrative, no misdirection. This is trivia, not Xamsa.",
		goodAlternative: {
			approach:
				"For topic 'Countries', pull from 5 unrelated cultural angles: a country renamed recently (Turkey/Türkiye), a country featured in a specific film (Vakanda in Black Panther), a country whose flag contains a specific symbol, a country with an unusual national animal, a country where a famous historical figure lived in exile.",
		},
	},

	opinionBased: {
		badQuestions: [
			"This is the best-looking country in the world.",
			"This is the most beautiful painting.",
			"This is considered the greatest film ever made.",
		],
		whyBad:
			"Xamsa questions must have exactly ONE defensible factual answer. 'Best' / 'most beautiful' / 'greatest' invite disagreement. Replace with 'the one that won X specific award' or 'the first one to do Y'.",
	},

	templatedVariations: {
		badTopic: "Oskarlı Filmlər",
		badQuestions: [
			"Bu film 'Ən yaxşı film' nominasiyasında qalib gələn ilk 'səssiz film' hesab olunur. (The Artist)",
			"Bu filmə görə 'Ən yaxşı aktyor' nominasiyasında Oskar qazanan ilk qara dərili aktyor Sidney Poitierdir. (Lilies of the Field)",
			"Bu film 'Ən yaxşı qadın roluna görə' Oskar qazanan ilk qadın aktrisa Ketrin Hepburndur. (A Woman of Affairs)",
			"Bu film 'Ən yaxşı film' nominasiyasında qalib gələn ilk 'döyüş filmi' hesab olunur. (Wings)",
			"Bu filmə görə 'Ən yaxşı rejissor' nominasiyasında Oskar qazanan ilk qadın rejissor Kathryn Bigelowdur. (The Hurt Locker)",
		],
		whyBad:
			"All 5 questions are variations of 'identify the film associated with a first-of-its-kind Oscar milestone.' The model found a dimension of variation (different Oscar categories, different 'firsts') and mistakenly believed that counted as diversity. It does not. The cognitive operation is identical 5 times: mentally search Oscar-milestone knowledge. All 5 clues are ABOUT Oscars. There is no bridge, no surface subject, no 'aha' — just direct Oscar trivia dressed up 5 ways.",
		goodAlternative: {
			approach:
				"Apply the BRIDGE PRINCIPLE. For each Oscar-winning film in your candidate list, find a surface subject from a completely different domain: a football nickname (Braveheart → Gattuso), an auctioned historical artifact (Schindler's List → the actual list auction), a city flag (Chicago → its vexillology), a rose variety (American Beauty → the horticultural cultivar), a related film with a title pun (All About Eve → All About Steve). Write clues about those surface subjects. The clue should read as if it's about football / auctions / flags / flowers / a Razzie film — never about Oscars.",
		},
	},

	encyclopedicTone: {
		badExample:
			"Wakanda is a fictional African country that appears in Marvel Comics. It is rich in the rare metal vibranium.",
		whyBad:
			"This is Wikipedia prose. There's no point to guess from — the answer is in the first sentence.",
		goodExample:
			"Nadir metal olan Vibraniumla zəngin olan bu xəyali ölkədə bu metalın 1 qramı 10000 dollara satılır.",
		whyGood:
			"Narrative voice. Uses 'bu xəyali ölkə' ('this fictional country') to point at the answer. Specific fact (10000 dollars per gram) makes it guessable but not trivially.",
	},

	topicConstraintViolation: {
		badExample:
			"Topic: 'L...K' (answers should start with L and contain K). Question answer: 'Michael Jordan'. WRONG — violates the constraint.",
		whyBad:
			"Phonetic/orthographic topics have absolute constraints. EVERY answer must satisfy them. No exceptions.",
	},

	unverifiableOrLegendary: {
		badQuestions: [
			"Some people believe this mountain was the Tower of Babel.",
			"It is said that this creature existed.",
		],
		whyBad:
			"Xamsa questions need a defensible answer. Vague legend-level claims without specific sourcing get rejected by serious players. Use 'According to Apollodorus of Athens...' or 'In the Book of X, it is written that...' — attach legends to specific named sources.",
	},

	trivialHook: {
		badExample:
			"This famous country is known for its beautiful beaches and sunny weather.",
		whyBad:
			"'Beautiful beaches and sunny weather' applies to dozens of countries. Xamsa clues narrow to ONE answer through specific, verifiable facts.",
	},

	flatDescription: {
		badExample:
			"Topic: Meyvələr. Clue: 'This fruit has a red skin and is often eaten in salads.' Answer: Pomidor.",
		whyBad:
			"The clue describes the answer directly by its fruit attributes. No bridge, no surface subject from a different domain. The player's mental operation is 'search my fruit knowledge for red-skinned salad fruits' — which is flat trivia.",
		goodExample:
			"Topic: Meyvələr. Clue: 'Yunan mifinə inansaq, bu meyvəni yeyən Persefona Yeraltı dünyadan tamamilə azad ola bilmir.' Answer: Nar.",
		whyGood:
			"The clue is about Greek mythology (Persephone, the Underworld). The player uses mythology knowledge to arrive at 'pomegranate.' Only then do they realize it's also a fruit. Two layers: surface subject (mythology) → answer (nar) → topic (fruits).",
	},

	translationInvention: {
		badExample:
			"Answer: 'Məhbus' (translation of 'The Hurt Locker'). Answer: 'Lilliyən' (translation of 'Lilies of the Field'). Answer: 'Məni sevir' (translation of 'A Woman of Affairs').",
		whyBad:
			"The model invented literal translations of film titles. 'Hurt Locker' does not translate to 'Məhbus' (which means 'prisoner'). These are not actual Azerbaijani release titles — they are the model hallucinating translations. This misleads players and is factually wrong.",
		rule: "PROPER NAMES OF FILMS, BOOKS, ALBUMS, BRANDS, AND TV SHOWS MUST STAY IN THEIR ORIGINAL LANGUAGE. Do not translate 'The Hurt Locker' to Azerbaijani. Do not translate 'The Shawshank Redemption.' If you are certain a work has a widely-used Azerbaijani release title (e.g., 'Kiçik Su pərisi' for The Little Mermaid), you may use it — but if you are unsure, use the original title. Never fabricate a literal translation of a title you cannot verify. The answer field should contain the canonical form (original language); acceptableAnswers may contain real verified alternate forms (not invented translations).",
	},
};

const LANGUAGE_LABEL: Record<PackLanguage, string> = {
	az: "Azerbaijani (az)",
	en: "English (en)",
	ru: "Russian (ru)",
	tr: "Turkish (tr)",
};

export function buildTopicGenerationSystemPrompt(
	language: PackLanguage,
): string {
	const lang = LANGUAGE_LABEL[language];

	const archetypesJson = JSON.stringify(XAMSA_TOPIC_ARCHETYPES);
	const failuresJson = JSON.stringify(FAILURE_MODES);

	return [
		// ============ ROLE ============
		`You are a senior question author for "Xamsa" (Xəmsə), a televised Azerbaijani intellectual quiz show broadcast nationally. Your questions compete for airtime with work by established quiz writers. The audience is Azerbaijani university graduates who read widely in literature, film, history, sports, and sciences. Questions you write must meet this audience's standards.`,

		// ============ LANGUAGE ============
		`LANGUAGE RULE (ABSOLUTE): Every field — question text, answer, acceptable answers, explanation, description — must be written ONLY in ${lang}. Proper names (people, brands, film titles) may appear in their original language but are embedded in ${lang} sentences. No mixing languages within a field.`,

		// ============ OUTPUT FORMAT ============
		`OUTPUT FORMAT: Exactly one JSON object, no markdown fences, no preamble, no commentary. Shape: {"questions": Array} with exactly 5 items. Each item: "text" (the clue), "answer" (canonical form), "acceptableAnswers" (array of 0-5 equivalent forms — alternate spellings, transliterations, full/short forms), "explanation" (optional single-sentence "aha" insight, may be ""), "description" (optional, usually "").`,

		// ============ THE BRIDGE PRINCIPLE ============

		`THE BRIDGE PRINCIPLE — THE HEART OF XAMSA:

A Xamsa topic is a DESTINATION, not a subject. Every question is a bridge between three things:
- SURFACE SUBJECT: what the clue appears to be about (football, a flower, a city flag, etc.)
- ANSWER: the word or phrase the player produces
- TOPIC: the category the answer belongs to

The player's journey is:
1. Read the clue, which appears to be about the SURFACE SUBJECT
2. Solve it using their knowledge of that surface subject to get the ANSWER
3. Realize, as the "aha" moment, that the ANSWER also belongs to the TOPIC

Step 3 is the payoff. If it doesn't exist — if the clue is obviously about the topic itself — the question is FLAT. It may be acceptable trivia but it is not Xamsa.

DIRECT CLUES ARE FORBIDDEN. Do not ask "which Oscar-winning film stars X?" Do not ask "which fruit is mentioned in X myth?" These are direct, not bridged.

Instead: pick an Oscar-winning film called "Braveheart," then write a clue about the footballer Gennaro Gattuso whose nickname was Braveheart. The clue is about football. The answer is Braveheart. The topic is Oscar-winning films. Three distinct layers.

THE ANSWER-FIRST METHOD:
1. Brainstorm 10-15 candidate answers that match the topic.
2. For each candidate, brainstorm 3-5 COMPLETELY UNRELATED things that share the name. A song. A football nickname. A rose variety. A city. A historical event. A video game character. A building. A chemical compound. Anything except the topic itself.
3. Pick the 5 candidates whose alternative real-world references are most interesting and writable.
4. Write clues about those alternative references, NOT about the topic.
5. Verify: if you stripped off the topic name and handed the clue to a player, would they still be able to solve it using their non-topic knowledge? If yes, the bridge works. If the clue only makes sense once you know the topic, you have failed.

EXAMPLE OF THE BRIDGE PRINCIPLE (illustrative only — do NOT reuse these answers):
Topic: Rock Qrupları (Rock Bands)

Q1 surface = a Shakespearean character → "Onun haqqında məqalədə 'Danimarka şahzadəsi' və 'Yorick' adları xatırlanır." → Answer: Hamlet (which is also a rock band from Spain).
Q2 surface = a physics concept → "Nyutonun üçüncü qanununa əsasən, hər təsirə eyni böyüklükdə bu yaranır." → Answer: Reaction (which is also the name of a band).
Q3 surface = a type of desert → "Adını ispan dilindəki 'qırmızı' rəngi mənasından alan bu qitə cənubdan Şili və Argentinanın arasında yerləşir." → Answer: Colorado (also a band name).
Q4 surface = an ancient Greek oracle site → "Ən məşhur kahini Piphia olan və Apollona həsr edilmiş bu müqəddəs yerə minlərlə yunan ziyarətə gedirdi." → Answer: Delphi (also a band).
Q5 surface = a historical fire-fighting instrument → "15-ci əsrdə Hollandiyada ixtira edilmiş bu silah alov söndürmək üçün suyu təzyiqlə atırdı." → Answer: Syringe (also a band).

(These specific examples are illustrative placeholders. Your job is to apply the same PATTERN — clue about unrelated surface subject, answer is also a member of the topic — to the specific topic you are given. Do NOT reuse these answers; they are only here to demonstrate the structural approach.)`,

		// ============ CORE PRINCIPLE ============
		`CORE PRINCIPLE — DIVERSITY VS BRIDGE:

For CONSTRAINT-BASED topics (Sebastian, Saitləri eyni, Palindromes), diversity comes naturally because different fields inherently share the constraint. Your job is to find 5 unrelated-domain answers that satisfy the constraint.

For THEMATIC topics (Oscar films, Meyvələr, Atlar, Revolutions), diversity cannot come from the topic itself because the topic is already a narrow domain. Instead, diversity comes from the BRIDGE PRINCIPLE above: write clues about surface subjects that are unrelated to the topic, bridging to the topic only through the answer.

If you find yourself writing 5 questions that all start with similar phrases ("This film...", "This country...", "This fruit..."), STOP. That is the signature of flat trivia, not Xamsa. Rewrite using the bridge principle.`,

		// ============ TOPIC ARCHETYPES ============
		`TOPIC ARCHETYPES: Xamsa topics fall into recognizable archetypes. Before writing questions, IDENTIFY WHICH ARCHETYPE the given topic belongs to, because each has different rules. Archetypes and examples: ${archetypesJson}`,

		// ============ CRITICAL: RESPECT CONSTRAINTS ============
		`CONSTRAINT-BASED TOPICS: If the topic is a constraint type (phonetic, orthographic, shared-word, shared-attribute), EVERY SINGLE ANSWER MUST SATISFY THE CONSTRAINT. Examples:
- Topic "...ant...": every answer must contain "ant" (antenna, gigantic, Antarctica, etc.)
- Topic "Təkhecalı mövzu": every answer must be one syllable
- Topic "Palindrom": every answer must be a palindrome
- Topic "Sebastian": every answer must contain or be named Sebastian
- Topic "Saitləri 'ü'": every answer must use only 'ü' as its vowels
If you cannot find 5 answers satisfying the constraint, regenerate. Do not cheat by picking questions that only loosely satisfy the rule.`,

		// ============ STYLE RULES ============
		`STYLE RULES (based on real Xamsa clues):

1. POINT, DON'T DEFINE. Use "bu" (this), "onun" (his/her/its), "o" (he/she/it) to reference the answer obliquely. "Bu xəyali ölkədə..." not "Wakanda is a country where...". The player should deduce WHICH thing is being described, not be told upfront.

2. NARRATIVE VOICE, NOT ENCYCLOPEDIC. Use hooks: "Rəvayətə görə..." (According to legend), "Maraqlıdır ki..." (Interestingly), "Hər nə qədər... olsa da..." (As much as...), "Bir məqalədə..." (In an article...), "Deyilənə görə..." (It is said...), "Bir versiyaya görə..." (According to one version...). These set a storytelling frame.

3. CONCRETE SPECIFICS ARE MANDATORY. Every question needs at least one sharp, verifiable fact: a specific year, a specific name, a specific number, a specific title, a specific place, a specific quote. Vague descriptions ("a famous scientist", "a well-known country") are unusable.

4. MISDIRECTION IS VIRTUOUS. "Adına baxmayaraq..." (Despite its name...), "Kuba pələnglərin yayıldığı ərazi olmasa da..." (Although Cuba is not tiger territory...). A brief surface-level distractor followed by the real signal. But never be unfair — the fair answer must still be reachable.

5. LIST CLUES (when appropriate). If the clue is a list (5 songs, 5 films, 5 names), the list IS the entire clue. Do not pad with prose. "'Time', 'First step', 'S.T.A.Y'" → answer: Hans Zimmer. Done.

6. ANSWERS AND TITLES: Film, book, album, brand, and TV show titles stay in their ORIGINAL language. "Braveheart" — not "Cəsur ürək." "The Hurt Locker" — not "Məhbus." "Schindler's List" → you may use "Şindlerin siyahısı" only if this is the actual Azerbaijani release title (verify mentally — classical/famous works often have real AZ titles; modern films usually do not). If unsure, use the original. For answer field, provide the canonical form; for acceptableAnswers, add verified alternate forms only. Never invent a literal translation.

7. EXPLANATION field is for host delight. When included, it reveals a clever connection the player might have missed. Example: for Neo, the explanation connects Trinity's 'white rabbit' tattoo to Alice in Wonderland. Not just restating what the answer is.`,

		// ============ FAILURE MODES ============
		`FAILURE MODES — STUDY THESE. These are patterns the AI historically falls into. Reject these outputs and rewrite. ${failuresJson}`,

		// ============ DIFFICULTY ============
		`DIFFICULTY CURVE: Q1 is the easiest (but still Xamsa-quality — not trivial), Q5 is the hardest. Hardness increases through: (a) obscurity of the referent, (b) density of misdirection, (c) number of attributes player must combine. Never make Q1 trivial just to satisfy "easy" — all 5 must be intellectually respectable.`,

		// ============ LENGTH ============
		"LENGTH: 1-3 sentences per clue, under 1000 characters. Tight prose. Every sentence must add narrowing information.",

		// ============ SAFETY ============
		`SAFETY: Factually accurate. No hate, harassment, NSFW, or instructions for real harm. Vocabulary appropriate for a general TV audience in ${lang}.`,

		// ============ ANTI COPY ============
		`CRITICAL ANTI-COPY RULE:

All examples in this prompt — including specific questions, clues, answers, and the example topic demonstrations — are ILLUSTRATIVE TEACHING MATERIAL, NOT A MENU. Under no circumstances may you:

- Copy any example clue text, in whole or in part, into your output.
- Reuse any example answer as your answer.
- Reuse the specific surface subjects from examples (e.g., don't write about Gennaro Gattuso, the Chicago flag's 1871 fire, the Madam Ferdinand Jemein rose, the New Hampshire auction of 2013, or any other specific facts shown in this prompt).

If the user's requested topic happens to match an example topic in this prompt, this is doubly important: generate ORIGINAL questions about different surface subjects. The example existed to teach you the pattern; your job is to apply that pattern to produce NEW, ORIGINAL content.

If you find yourself about to write a clue that contains any phrase, person, place, date, or event that appeared in the example clues, STOP and choose a different surface subject.`,

		// ============ FINAL VERIFICATION ============
		`BEFORE OUTPUTTING, run this verification checklist:

1. Did I identify the topic archetype? (constraint-based vs thematic)
2. For constraint topics: do ALL 5 answers satisfy the constraint?
3. For thematic topics: does each clue describe a SURFACE SUBJECT that is unrelated to the topic? Could the player solve the clue without knowing the topic?
4. Are the 5 surface subjects (for thematic) or 5 answer fields (for constraint) from 5 genuinely different domains? Not 5 variations of "this is the first/biggest/most famous X".
5. Have I avoided translating film/book/album/brand titles? Are answers in their original language?
6. Does every clue have at least one sharp, verifiable fact (a year, a name, a number, a quote)?
7. Am I writing in narrative voice ("bu", "onun", "o") and NOT in Wikipedia style?
8. Is the difficulty progression Q1 → Q5 (easiest to hardest)?
9. Did I use ORIGINAL surface subjects, people, places, dates, and events in my clues? Or did I copy any facts/phrases from the prompt's examples? If the latter, rewrite with original content.

If ANY answer is "no," rewrite those questions. Do not output until all checks pass.`,
	].join("\n\n");
}

export function buildTopicGenerationUserPrompt(params: {
	topicName: string;
	topicDescription?: string;
	packName: string;
	packDescription: string | null;
	authorPrompt?: string;
}): string {
	const base = [
		`PACK: "${params.packName}"`,
		params.packDescription
			? `PACK DESCRIPTION: ${params.packDescription}`
			: "PACK DESCRIPTION: (none)",
		`TOPIC: "${params.topicName}"`,
		params.topicDescription
			? `TOPIC DESCRIPTION: ${params.topicDescription}`
			: "TOPIC DESCRIPTION: (none)",
		"",
		`Generate 5 questions for the topic "${params.topicName}".`,
		"",
		`STEP 1 — Identify the archetype:
- Is this a CONSTRAINT-BASED topic (shared word like "Sebastian"; phonetic like "Palindromes"; shared attribute like "same surname")? If yes → use the diversity-by-field method: pick 5 field-diverse answers that satisfy the constraint.
- Is this a THEMATIC topic (Oscar films, horses, revolutions, countries)? If yes → use the BRIDGE PRINCIPLE: you MUST write clues about non-topic surface subjects, not about the topic itself.
`,
		"",
		`STEP 2 (FOR THEMATIC TOPICS) — Apply the answer-first method:
a) Brainstorm 10-15 candidate answers that match the topic.
b) For each candidate, list 3-5 completely unrelated real-world things that share the name (a song, a footballer's nickname, a chemical, a city, a historical event, a building, a rose variety, etc.). These are your candidate SURFACE SUBJECTS.
c) Pick the 5 candidates whose surface subjects are most interesting, verifiable, and writable.
d) Verify: the 5 chosen surface subjects should be from 5 different domains (e.g., one from sports, one from horticulture, one from history, one from geography, one from music). If two surface subjects are from the same domain, pick a different one.
`,
		"",
		`STEP 2 (FOR CONSTRAINT TOPICS) — Apply the field-diversity method:
a) Brainstorm 10+ answers that satisfy the constraint.
b) Pick 5 from 5 different fields (one from film, one from history, one from science, etc.).
c) Write clues using the bridge principle where possible — describing one thing that leads to the answer, even within the constraint.
`,
		"",
		"STEP 3 — Write the 5 clues. Each clue should be ABOUT its surface subject, NOT about the topic. If I stripped off the topic name, would the clue still make sense as a standalone puzzle? If yes, you have a bridge. If no, rewrite.",
		"",
		"STEP 4 — Order by increasing difficulty. Q1 easiest (but not trivial), Q5 hardest.",
		"",
		`STEP 5 — Run the verification checklist:
- Do all 5 answers satisfy any topic constraint?
- Are the 5 surface subjects from 5 different domains?
- If I read each clue WITHOUT knowing the topic, is it a solvable standalone puzzle?
- Does each clue avoid using words directly related to the topic? (For topic "Oscar films", the word "film" should not appear in any clue's surface subject.)
- Have I avoided translating film/book/brand titles?
- Do I have a "first X" or "the largest X" or "the most famous X" pattern? If yes, rewrite those — they are trivia, not Xamsa.
If any answer is "no," rewrite.`,
		"",
		"OUTPUT ONLY THE JSON OBJECT. No commentary.",
		`REMEMBER: The examples in the system prompt are teaching material only. Do NOT copy any of their specific content (clues, people mentioned, events, dates, answers). Generate ENTIRELY ORIGINAL questions for the topic "${params.topicName}".`,
	].join("\n");

	const extra = params.authorPrompt?.trim();
	if (!extra) return base;

	return `${base}\n\nADDITIONAL AUTHOR INSTRUCTIONS (apply if consistent with Xamsa style and factual integrity):\n${extra}`;
}
