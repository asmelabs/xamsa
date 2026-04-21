import type { Prisma } from "@xamsa/db";

export function generateGameCode(prefix = "XMS"): string {
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	const length = 6;

	let code = "";
	for (let i = 0; i < length; i++) {
		const index = Math.floor(Math.random() * charset.length);
		code += charset[index];
	}

	return `${prefix}-${code}`;
}

export async function generateUniqueGameCode(
	tx: Prisma.TransactionClient,
	prefix = "XMS",
): Promise<string> {
	let code = generateGameCode(prefix);

	while (
		(await tx.game.findUnique({ where: { code }, select: { id: true } })) !==
		null
	) {
		code = generateGameCode(prefix);
	}

	return code;
}
