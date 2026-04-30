import { env } from "@xamsa/env/server";

import { getImageRootPrefix } from "./paths";

/** Parse Delivery URL `https://res.cloudinary.com/<cloud>/<type>/upload/.../<public_id>`. */
export function extractPublicIdFromDeliveryUrl(
	urlStr: string,
	cloudName: string,
): string | null {
	try {
		const url = new URL(urlStr);
		if (url.hostname !== "res.cloudinary.com") {
			return null;
		}

		const segs = url.pathname.split("/").filter(Boolean);
		if (segs.length < 5) {
			return null;
		}

		const [first, resourceType, uploadSegment, ...rest] = segs;
		if (
			first !== cloudName ||
			resourceType !== "image" ||
			uploadSegment !== "upload"
		) {
			return null;
		}

		let i = 0;
		while (i < rest.length) {
			const seg = rest[i];
			if (seg?.includes(",")) {
				i++;
				continue;
			}
			break;
		}

		const versionSeg = rest[i];
		if (versionSeg?.match(/^v\d+$/)) {
			i++;
		}

		const pathPart = rest.slice(i).join("/");
		if (!pathPart.length) {
			return null;
		}

		const decoded = decodeURIComponent(pathPart.replace(/,/g, "%2C"));
		return decoded.replace(/\.(?:jpe?g|png|webp|gif)$/i, "") || null;
	} catch {
		return null;
	}
}

export function isManagedProfileImageUrl(imageUrl: string): boolean {
	const cloudName = env.CLOUDINARY_CLOUD_NAME;
	const publicId = extractPublicIdFromDeliveryUrl(imageUrl, cloudName);
	if (!publicId) {
		return false;
	}

	const root = getImageRootPrefix();
	return publicId.startsWith(`${root}/users/`);
}
