import { env } from "@xamsa/env/server";
import { v2 as cloudinary } from "cloudinary";

function ensure_cloudinary(): void {
	cloudinary.config({
		cloud_name: env.CLOUDINARY_CLOUD_NAME,
		api_key: env.CLOUDINARY_API_KEY,
		api_secret: env.CLOUDINARY_API_SECRET,
		secure: true,
	});
}

/**
 * Deletes an asset by `public_id`. Cloudinary responds with `"not_found"` when it is already gone; that is treated as success.
 */
export async function destroyImageByPublicId(publicId: string): Promise<void> {
	ensure_cloudinary();

	await new Promise<void>((resolve, reject) => {
		cloudinary.uploader.destroy(
			publicId,
			{ resource_type: "image", invalidate: true },
			(error) => {
				if (error) {
					reject(error);
					return;
				}
				resolve();
			},
		);
	});
}
