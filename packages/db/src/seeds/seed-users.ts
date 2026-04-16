import { faker } from "@faker-js/faker";
import * as bcrypt from "bcryptjs";
import prisma from "./client";

const SEED_PASSWORD = "Password1";
const USER_COUNT = 10;

async function seedUsers() {
	const hashedPassword = await bcrypt.hash(SEED_PASSWORD, 1);

	const users = Array.from({ length: USER_COUNT }, () => {
		const firstName = faker.person.firstName();
		const lastName = faker.person.lastName();

		return {
			username: faker.internet
				.username({ firstName, lastName })
				.toLowerCase()
				.replace(/[^a-z0-9]/g, "")
				.replace(/^[0-9]+/, "")
				.slice(0, 30)
				.padEnd(3, "x"),
			email: faker.internet.email({ firstName, lastName }).toLowerCase(),
			name: `${firstName} ${lastName}`,
			image: faker.image.avatar(),
			emailVerified: true,
		};
	});

	let created = 0;
	let skipped = 0;

	for (const userData of users) {
		const exists = await prisma.user.findFirst({
			where: {
				OR: [{ email: userData.email }, { username: userData.username }],
			},
		});

		if (exists) {
			skipped++;
			continue;
		}

		await prisma.user.create({
			data: {
				...userData,
				accounts: {
					create: {
						accountId: userData.username,
						providerId: "credential",
						password: hashedPassword,
					},
				},
			},
		});

		created++;
	}

	console.log(
		`Seeded ${created} users, skipped ${skipped} duplicates (password: "${SEED_PASSWORD}")`,
	);
}

seedUsers()
	.catch((err) => {
		console.error("Failed to seed users:", err);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
