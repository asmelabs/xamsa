import { faker } from "@faker-js/faker";
import prisma from "./client";

function slugify(text: string): string {
	return text
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s-]/g, "")
		.replace(/[\s-]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

const PACK_COUNT = 8;
const TOPICS_PER_PACK = { min: 5, max: 12 };
const QUESTIONS_PER_TOPIC = 5;

const LANGUAGES = ["en", "az", "ru", "tr"] as const;

const TRIVIA_CATEGORIES = [
	"World History",
	"Pop Culture",
	"Science & Nature",
	"Geography",
	"Literature",
	"Music",
	"Sports",
	"Technology",
	"Movies & TV",
	"Food & Drink",
	"Art & Design",
	"Animals",
	"Space & Astronomy",
	"Mathematics",
	"Mythology",
	"Language & Grammar",
	"Famous People",
	"Inventions",
	"Holidays & Traditions",
	"Board Games & Puzzles",
];

function pickRandom<T>(arr: T[], count: number): T[] {
	const shuffled = [...arr].sort(() => Math.random() - 0.5);
	return shuffled.slice(0, count);
}

function generateQuestion(order: number) {
	const text = faker.lorem.sentence().replace(/\.$/, "?");
	return {
		slug: slugify(text).slice(0, 60) || `question-${order}`,
		order,
		text,
		answer: faker.lorem.words({ min: 1, max: 3 }),
		acceptableAnswers: Array.from(
			{ length: faker.number.int({ min: 0, max: 3 }) },
			() => faker.lorem.words({ min: 1, max: 2 }),
		),
		description: faker.datatype.boolean() ? faker.lorem.sentence() : null,
		explanation: faker.datatype.boolean()
			? faker.lorem.sentences({ min: 1, max: 2 })
			: null,
	};
}

function generateTopic(order: number, name: string) {
	return {
		slug: slugify(name) || `topic-${order}`,
		order,
		name,
		description: faker.datatype.boolean() ? faker.lorem.sentence() : null,
		questions: {
			create: Array.from({ length: QUESTIONS_PER_TOPIC }, (_, i) =>
				generateQuestion(i + 1),
			),
		},
	};
}

async function seedPacks() {
	const users = await prisma.user.findMany({ select: { id: true } });

	if (users.length === 0) {
		console.error("No users found. Run seed-users first.");
		process.exit(1);
	}

	let created = 0;
	let skipped = 0;

	for (let i = 0; i < PACK_COUNT; i++) {
		const name = faker.lorem.words({ min: 2, max: 4 });
		const slug = slugify(name);

		if (!slug) continue;

		const exists = await prisma.pack.findUnique({ where: { slug } });
		if (exists) {
			skipped++;
			continue;
		}

		const topicCount = faker.number.int(TOPICS_PER_PACK);
		const topicNames = pickRandom(TRIVIA_CATEGORIES, topicCount);
		const author = faker.helpers.arrayElement(users);

		await prisma.pack.create({
			data: {
				slug,
				name,
				description: faker.lorem.sentences({ min: 1, max: 3 }),
				image: faker.image.urlPicsumPhotos({ width: 640, height: 480 }),
				language: faker.helpers.arrayElement(LANGUAGES),
				visibility: "public",
				status: "published",
				authorId: author.id,
				allowOthersHost: faker.datatype.boolean(),
				showTopicsInfo: true,
				topics: {
					create: topicNames.map((name, idx) => generateTopic(idx + 1, name)),
				},
			},
		});

		created++;
	}

	console.log(
		`Seeded ${created} packs (with topics & questions), skipped ${skipped} duplicates`,
	);
}

seedPacks()
	.catch((err) => {
		console.error("Failed to seed packs:", err);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
