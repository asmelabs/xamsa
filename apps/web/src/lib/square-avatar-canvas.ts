import type { Area } from "react-easy-crop";

function loadImageElement(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.addEventListener("load", () => resolve(img));
		img.addEventListener("error", reject);
		img.src = src;
	});
}

/**
 * Rasterizes `pixelCrop` from `imageSrc` into a square JPEG (default 512²) suitable for Cloudinary upload.
 */
export async function squareCropToJpegBase64(
	imageSrc: string,
	pixelCrop: Area,
	size = 512,
	quality = 0.9,
): Promise<{ imageBase64: string; mimeType: "image/jpeg" }> {
	const image = await loadImageElement(imageSrc);
	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;

	const ctx = canvas.getContext("2d");
	if (!ctx) {
		throw new Error("Could not read image");
	}

	ctx.drawImage(
		image,
		pixelCrop.x,
		pixelCrop.y,
		pixelCrop.width,
		pixelCrop.height,
		0,
		0,
		size,
		size,
	);

	const dataUrl = canvas.toDataURL("image/jpeg", quality);
	const imageBase64 = dataUrl.split(",", 2)[1];
	if (!imageBase64) {
		throw new Error("Could not encode image");
	}

	return { imageBase64, mimeType: "image/jpeg" };
}
