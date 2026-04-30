import { getCloudinaryEnvSegment } from "./env-segment";

export function getImageRootPrefix(): string {
	return `xamsa/${getCloudinaryEnvSegment()}/images`;
}

/** Stable avatar asset id: `…/users/<username>/avatar` (username is immutable in Xamsa). */
export function getUserAvatarPublicId(username: string): string {
	return `${getImageRootPrefix()}/users/${username}/avatar`;
}
