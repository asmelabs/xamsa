import { env } from "@xamsa/env/server";

/** Stable folder segment for Cloudinary paths: `xamsa/<segment>/images/…`. */
export function getCloudinaryEnvSegment(): string {
	switch (env.NODE_ENV) {
		case "production":
			return "prod";
		case "test":
			return "test";
		default:
			return "dev";
	}
}
