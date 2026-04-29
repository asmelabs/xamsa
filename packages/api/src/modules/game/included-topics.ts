import type { Prisma } from "@xamsa/db";
import prisma from "@xamsa/db";

/**
 * Resolves sorted, unique pack topic `order` values for a game.
 * Legacy games without JSON use every topic order in the pack.
 */
export async function resolveSessionTopicPackOrders(
	packId: string,
	includedTopicPackOrders: Prisma.JsonValue | null | undefined,
): Promise<number[]> {
	if (
		includedTopicPackOrders != null &&
		Array.isArray(includedTopicPackOrders)
	) {
		const nums = includedTopicPackOrders.filter(
			(x): x is number =>
				typeof x === "number" && Number.isFinite(x) && Number.isInteger(x),
		);
		const uniq = [...new Set(nums.map((x) => Math.trunc(x)))];
		uniq.sort((a, b) => a - b);
		return uniq;
	}
	const topics = await prisma.topic.findMany({
		where: { packId },
		select: { order: true },
		orderBy: { order: "asc" },
	});
	return topics.map((t) => t.order);
}
