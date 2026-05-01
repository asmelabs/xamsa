import { getCloudinaryEnvSegment } from "./env-segment";

export function getImageRootPrefix(): string {
	return `xamsa/${getCloudinaryEnvSegment()}/images`;
}

/** Post image logical public id leaf `1`: `…/posts/<username>/<postSlug>/1` (room for future `2`, …). */
export function getPostImagePublicId(
	username: string,
	postSlug: string,
	imageIndex = 1,
): string {
	return `${getImageRootPrefix()}/posts/${username}/${postSlug}/${String(imageIndex)}`;
}

/** Stable avatar asset id: `…/users/<username>/avatar` (username is immutable in Xamsa). */
export function getUserAvatarPublicId(username: string): string {
	return `${getImageRootPrefix()}/users/${username}/avatar`;
}
