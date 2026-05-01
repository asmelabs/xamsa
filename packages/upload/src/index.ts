export {
	extractPublicIdFromDeliveryUrl,
	isManagedPostImageUrl,
	isManagedProfileImageUrl,
} from "./cloudinary-url";
export { destroyImageByPublicId } from "./destroy-image";
export { getCloudinaryEnvSegment } from "./env-segment";
export {
	getImageRootPrefix,
	getPostImagePublicId,
	getUserAvatarPublicId,
} from "./paths";
export type { PostImageMimeType } from "./upload-post-image";
export {
	POST_IMAGE_MAX_BYTES,
	uploadPostImage,
} from "./upload-post-image";
export type { AvatarImageMimeType } from "./upload-profile-image";
/** Generic name matching product docs; delegates to validated profile avatar upload. */
export {
	PROFILE_AVATAR_MAX_BYTES,
	uploadProfileImage,
	uploadProfileImage as uploadImage,
} from "./upload-profile-image";
