import { env } from "@xamsa/env/server";
import * as Ably from "ably";

export const ablyRest = new Ably.Rest({ key: env.ABLY_API_KEY });

export async function createTokenRequest(userId: string) {
	return await ablyRest.auth.createTokenRequest({
		clientId: userId,
		capability: JSON.stringify({
			"game:*": ["subscribe", "publish", "presence"],
		}),
	});
}
