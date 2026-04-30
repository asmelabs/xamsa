import { Readable } from "node:stream";
import { env } from "@xamsa/env/server";
import { v2 as cloudinary } from "cloudinary";

/** Max decoded image payload for profile avatars (after client crop). */
export const PROFILE_AVATAR_MAX_BYTES = Math.floor(1.75 * 1024 * 1024);

const MIME_FORMAT: Record<string, string> = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
};

export type AvatarImageMimeType = keyof typeof MIME_FORMAT;

function ensure_cloudinary(): void {
	cloudinary.config({
		cloud_name: env.CLOUDINARY_CLOUD_NAME,
		api_key: env.CLOUDINARY_API_KEY,
		api_secret: env.CLOUDINARY_API_SECRET,
		secure: true,
	});
}

function assert_magic_matches_mime(
	buffer: Buffer,
	mime: AvatarImageMimeType,
): void {
	if (buffer.byteLength < 12) {
		throw new Error("Image file is too small");
	}
	const b = buffer;

	if (
		mime === "image/jpeg" &&
		!(b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff)
	) {
		throw new Error("File is not a valid JPEG image");
	}
	if (
		mime === "image/png" &&
		!(
			b[0] === 0x89 &&
			b[1] === 0x50 &&
			b[2] === 0x4e &&
			b[3] === 0x47 &&
			b[4] === 0x0d &&
			b[5] === 0x0a &&
			b[6] === 0x1a &&
			b[7] === 0x0a
		)
	) {
		throw new Error("File is not a valid PNG image");
	}
	if (mime === "image/webp") {
		const riffOk = Buffer.from("RIFF").equals(b.subarray(0, 4));
		const webpOk = Buffer.from("WEBP").equals(b.subarray(8, 12));
		if (!riffOk || !webpOk) {
			throw new Error("File is not a valid WebP image");
		}
	}
}

export type UploadProfileImageOpts = {
	buffer: Buffer;
	mimeType: AvatarImageMimeType;
	/** Full logical public id without extension (e.g. …/users/name/avatar). */
	publicId: string;
};

/**
 * Cloudinary Media Library folders map from the Upload API `folder` parameter.
 * Passing a single long `public_id` can show the asset under "Home"; splitting
 * into `folder` + short `public_id` keeps hierarchy visible in the console.
 */
function split_cloudinary_folder_and_asset_id(fullPublicId: string): {
	folder?: string;
	public_id: string;
} {
	const i = fullPublicId.lastIndexOf("/");
	if (i <= 0) {
		return { public_id: fullPublicId };
	}
	const folder = fullPublicId.slice(0, i);
	const leaf = fullPublicId.slice(i + 1);
	if (!leaf) {
		return { public_id: fullPublicId };
	}
	return { folder, public_id: leaf };
}

/**
 * Validates bytes + MIME (magic numbers), uploads a single image asset.
 */
export async function uploadProfileImage(
	opts: UploadProfileImageOpts,
): Promise<{ secureUrl: string; publicId: string }> {
	if (opts.buffer.byteLength > PROFILE_AVATAR_MAX_BYTES) {
		throw new Error(
			`Avatar image is too large (max ${String(Math.round(PROFILE_AVATAR_MAX_BYTES / (1024 * 1024)))}MB decoded)`,
		);
	}

	assert_magic_matches_mime(opts.buffer, opts.mimeType);

	ensure_cloudinary();

	const format = MIME_FORMAT[opts.mimeType];
	const pathParts = split_cloudinary_folder_and_asset_id(opts.publicId);

	const result = await new Promise<{ secure_url?: string; public_id?: string }>(
		(resolve, reject) => {
			const stream = cloudinary.uploader.upload_stream(
				{
					...pathParts,
					resource_type: "image",
					overwrite: true,
					format,
					fetch_format: "auto",
					quality: "auto",
				},
				(error, uploaded) => {
					if (error) {
						reject(error);
						return;
					}
					if (!uploaded?.secure_url || !uploaded?.public_id) {
						reject(new Error("Cloudinary upload did not return a URL"));
						return;
					}
					resolve({
						secure_url: uploaded.secure_url,
						public_id: uploaded.public_id,
					});
				},
			);
			Readable.from(opts.buffer).pipe(stream);
		},
	);

	const secureUrl = result.secure_url;
	const publicIdResult = result.public_id;
	if (!secureUrl || !publicIdResult) {
		throw new Error("Cloudinary upload did not return a URL");
	}
	return { secureUrl, publicId: publicIdResult };
}
