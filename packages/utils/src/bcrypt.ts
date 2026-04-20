import { env } from "@xamsa/env/server";
import * as bcrypt from "bcryptjs";

const rounds = env.NODE_ENV === "development" ? 1 : env.BCRYPT_SALT_ROUNDS;

export async function hash(password: string) {
	return await bcrypt.hash(password, rounds);
}

export async function verify(password: string, hash: string) {
	return await bcrypt.compare(password, hash);
}
