import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "@xamsa/env/server";
import { PrismaClient } from "../prisma/generated/client";

export function createPrismaClient() {
	const adapter = new PrismaPg({
		connectionString: env.DATABASE_URL,
	});
	return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();

export type { Prisma } from "../prisma/generated/client";
export default prisma;
export type { PrismaClient };
