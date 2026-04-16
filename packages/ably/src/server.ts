import { env } from "@xamsa/env/server";
import * as Ably from "ably";

export const ablyRest = new Ably.Rest({ key: env.ABLY_API_KEY });

export async function createTokenRequest(clientId: string) {
	return ablyRest.auth.createTokenRequest({
		clientId,
	});
}
