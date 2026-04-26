import type { FindOneGameOutputType } from "@xamsa/schemas/modules/game";
import type { FindOnePackOutputType } from "@xamsa/schemas/modules/pack";
import type { FindOneQuestionOutputType } from "@xamsa/schemas/modules/question";
import type { FindOneTopicOutputType } from "@xamsa/schemas/modules/topic";
import type { FindOneProfileOutputType } from "@xamsa/schemas/modules/user";
import { absoluteUrl, DEFAULT_DESCRIPTION, SITE_NAME } from "@/lib/seo";

const CTX = "https://schema.org" as const;

export function siteJsonLd(): Record<string, unknown> {
	const origin = absoluteUrl("/").replace(/\/$/, "");
	return {
		"@context": CTX,
		"@graph": [
			{
				"@type": "WebSite",
				"@id": `${origin}/#website`,
				name: SITE_NAME,
				url: `${origin}/`,
				description: DEFAULT_DESCRIPTION,
				publisher: { "@id": `${origin}/#organization` },
			},
			{
				"@type": "Organization",
				"@id": `${origin}/#organization`,
				name: SITE_NAME,
				url: `${origin}/`,
			},
		],
	};
}

function packLanguageToInLanguage(
	code: FindOnePackOutputType["language"],
): string {
	return code;
}

function breadcrumbList(
	itemListElement: Array<{ name: string; path: string }>,
): Record<string, unknown> {
	return {
		"@type": "BreadcrumbList",
		itemListElement: itemListElement.map((item, i) => ({
			"@type": "ListItem",
			position: i + 1,
			name: item.name,
			item: absoluteUrl(item.path),
		})),
	};
}

export function packPageJsonLd(
	pack: FindOnePackOutputType,
): Record<string, unknown> {
	const packUrl = `/packs/${pack.slug}/`;
	const packAbs = absoluteUrl(packUrl);
	const authorUrl = absoluteUrl(`/u/${pack.author.username}/`);
	const desc =
		pack.description?.trim() ||
		`“${pack.name}” by ${pack.author.name}: a Xamsa question pack for live buzzer games.`;

	const author: Record<string, unknown> = {
		"@type": "Person",
		name: pack.author.name,
		url: authorUrl,
	};

	const learningResource: Record<string, unknown> = {
		"@type": "LearningResource",
		"@id": `${packAbs}#pack`,
		name: pack.name,
		description: desc,
		url: packAbs,
		inLanguage: packLanguageToInLanguage(pack.language),
		author,
		...(pack.publishedAt
			? { datePublished: new Date(pack.publishedAt).toISOString() }
			: {}),
		...(pack.totalRatings > 0
			? {
					aggregateRating: {
						"@type": "AggregateRating",
						ratingValue: pack.averageRating,
						ratingCount: pack.totalRatings,
						bestRating: 5,
						worstRating: 0,
					},
				}
			: {}),
	};

	return {
		"@context": CTX,
		"@graph": [
			breadcrumbList([
				{ name: "Home", path: "/" },
				{ name: "Question packs", path: "/packs/" },
				{ name: pack.name, path: packUrl },
			]),
			learningResource,
		],
	};
}

export function topicPageJsonLd(
	topic: FindOneTopicOutputType,
): Record<string, unknown> {
	const packPath = `/packs/${topic.pack.slug}/`;
	const topicPath = `/packs/${topic.pack.slug}/topics/${topic.slug}/`;
	const topicAbs = absoluteUrl(topicPath);
	const desc =
		topic.description?.trim() ||
		`“${topic.name}” in pack “${topic.pack.name}” on Xamsa — quiz questions for live games.`;

	return {
		"@context": CTX,
		"@graph": [
			breadcrumbList([
				{ name: "Home", path: "/" },
				{ name: "Question packs", path: "/packs/" },
				{ name: topic.pack.name, path: packPath },
				{ name: topic.name, path: topicPath },
			]),
			{
				"@type": "LearningResource",
				"@id": `${topicAbs}#topic`,
				name: topic.name,
				description: desc,
				url: topicAbs,
				isPartOf: { "@id": `${absoluteUrl(packPath)}#pack` },
			},
		],
	};
}

export function questionPageJsonLd(
	q: FindOneQuestionOutputType,
): Record<string, unknown> {
	const packPath = `/packs/${q.pack.slug}/`;
	const topicPath = `/packs/${q.pack.slug}/topics/${q.topic.slug}/`;
	const questionPath = `/packs/${q.pack.slug}/topics/${q.topic.slug}/questions/${q.slug}/`;
	const questionAbs = absoluteUrl(questionPath);
	const preview = q.text?.trim() || "Quiz question";
	const desc =
		q.description?.trim() ||
		`Question ${q.order} in “${q.topic.name}” (${q.pack.name}) on Xamsa.`;

	const authorUrl = absoluteUrl(`/u/${q.author.username}/`);

	return {
		"@context": CTX,
		"@graph": [
			breadcrumbList([
				{ name: "Home", path: "/" },
				{ name: "Question packs", path: "/packs/" },
				{ name: q.pack.name, path: packPath },
				{ name: q.topic.name, path: topicPath },
				{ name: `Question ${q.order}`, path: questionPath },
			]),
			{
				"@type": "Question",
				"@id": `${questionAbs}#question`,
				name: `Question ${q.order} · ${q.topic.name}`,
				description: desc,
				url: questionAbs,
				text: preview,
				acceptedAnswer: {
					"@type": "Answer",
					text: q.answer,
				},
				isPartOf: {
					"@type": "LearningResource",
					"@id": `${absoluteUrl(topicPath)}#topic`,
					name: q.topic.name,
					url: absoluteUrl(topicPath),
				},
				author: {
					"@type": "Person",
					name: q.author.name,
					url: authorUrl,
				},
			},
		],
	};
}

export function profilePageJsonLd(
	profile: FindOneProfileOutputType,
): Record<string, unknown> {
	const profilePath = `/u/${profile.username}/`;
	const profileAbs = absoluteUrl(profilePath);
	const desc = `Xamsa player ${profile.name} (@${profile.username}). Level ${profile.level}, ${profile.xp.toLocaleString()} XP, Elo ${profile.elo.toLocaleString()}.`;

	const person: Record<string, unknown> = {
		"@type": "Person",
		"@id": `${profileAbs}#person`,
		name: profile.name,
		url: profileAbs,
		description: desc,
		...(profile.image ? { image: profile.image } : {}),
	};

	if (profile.role === "moderator" || profile.role === "admin") {
		person.jobTitle = profile.role === "admin" ? "Administrator" : "Moderator";
	}

	return {
		"@context": CTX,
		"@graph": [
			breadcrumbList([
				{ name: "Home", path: "/" },
				{ name: profile.name, path: profilePath },
			]),
			person,
		],
	};
}

function gameEventStatus(status: FindOneGameOutputType["status"]): string {
	switch (status) {
		case "active":
			return "https://schema.org/EventMovedOnline";
		case "paused":
			return "https://schema.org/EventPostponed";
		case "completed":
			return "https://schema.org/EventScheduled";
		default:
			return "https://schema.org/EventScheduled";
	}
}

export function gameRoomPageJsonLd(
	game: FindOneGameOutputType,
): Record<string, unknown> {
	const pagePath = `/g/${game.code}/`;
	const pageAbs = absoluteUrl(pagePath);
	const packAbs = absoluteUrl(`/packs/${game.pack.slug}/`);
	const desc = `Live Xamsa game room (code ${game.code}) using the pack “${game.pack.name}”.`;

	const event: Record<string, unknown> = {
		"@type": "Event",
		"@id": `${pageAbs}#game`,
		name: `${game.pack.name} · Game ${game.code}`,
		description: desc,
		url: pageAbs,
		eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
		eventStatus: gameEventStatus(game.status),
		location: {
			"@type": "VirtualLocation",
			url: pageAbs,
		},
		about: {
			"@type": "LearningResource",
			name: game.pack.name,
			url: packAbs,
		},
	};

	if (game.startedAt) {
		event.startDate = new Date(game.startedAt).toISOString();
	}
	if (game.finishedAt) {
		event.endDate = new Date(game.finishedAt).toISOString();
	}

	return {
		"@context": CTX,
		"@graph": [event],
	};
}

export function collectionPageJsonLd(input: {
	path: string;
	title: string;
	description: string;
}): Record<string, unknown> {
	const pageAbs = absoluteUrl(input.path);
	return {
		"@context": CTX,
		"@graph": [
			{
				"@type": "CollectionPage",
				"@id": `${pageAbs}#webpage`,
				name: input.title,
				description: input.description,
				url: pageAbs,
				isPartOf: { "@id": `${absoluteUrl("/").replace(/\/$/, "")}/#website` },
			},
		],
	};
}
