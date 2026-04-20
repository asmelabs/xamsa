import * as Ably from "ably";
import { getAblyToken } from "@/functions/get-ably-token";

let client: Ably.Realtime | null = null;

export function getAblyClient() {
	if (client) return client;

	client = new Ably.Realtime({
		authCallback: async (_tokenParams, callback) => {
			try {
				const tokenRequest = await getAblyToken();
				callback(null, tokenRequest);
			} catch (error) {
				callback(error as string, null);
			}
		},
	});

	return client;
}

export function closeAblyClient() {
	if (client) {
		client.close();
		client = null;
	}
}
