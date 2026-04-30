import type { AvatarImageMimeTypeSchema } from "@xamsa/schemas/modules/user";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogPanel,
	DialogTitle,
} from "@xamsa/ui/components/dialog";
import { Slider } from "@xamsa/ui/components/slider";
import type * as React from "react";
import { useCallback, useState } from "react";
import type { Area } from "react-easy-crop";
import Cropper from "react-easy-crop";
import type z from "zod";
import { LoadingButton } from "@/components/loading-button";
import { squareCropToJpegBase64 } from "@/lib/square-avatar-canvas";

type AvatarMime = z.infer<typeof AvatarImageMimeTypeSchema>;

type ProfileAvatarCropDialogProps = {
	open: boolean;
	imageSrc: string | null;
	onOpenChange: (open: boolean) => void;
	onConfirm: (payload: {
		imageBase64: string;
		mimeType: AvatarMime;
	}) => void | Promise<void>;
};

export function ProfileAvatarCropDialog({
	open,
	imageSrc,
	onOpenChange,
	onConfirm,
}: ProfileAvatarCropDialogProps): React.ReactElement | null {
	const [crop, setCrop] = useState({ x: 0, y: 0 });
	const [zoom, setZoom] = useState(1);
	const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
	const [busy, setBusy] = useState(false);

	const onCropComplete = useCallback(
		(_area: Area, areaPixels: Area) => setCroppedAreaPixels(areaPixels),
		[],
	);

	const resetState = () => {
		setCrop({ x: 0, y: 0 });
		setZoom(1);
		setCroppedAreaPixels(null);
		setBusy(false);
	};

	const handleSubmit = async () => {
		if (!imageSrc || !croppedAreaPixels) return;
		setBusy(true);
		try {
			const { imageBase64, mimeType } = await squareCropToJpegBase64(
				imageSrc,
				croppedAreaPixels,
				512,
				0.9,
			);
			await onConfirm({
				imageBase64,
				mimeType,
			});
			onOpenChange(false);
			resetState();
		} finally {
			setBusy(false);
		}
	};

	if (!open || !imageSrc) {
		return null;
	}

	return (
		<Dialog
			onOpenChange={(next) => {
				if (!next) {
					resetState();
				}
				onOpenChange(next);
			}}
			open={open}
		>
			<DialogContent className="sm:max-w-md" showCloseButton>
				<DialogHeader>
					<DialogTitle>Adjust profile photo</DialogTitle>
					<DialogDescription>
						Drag to frame your face in the square crop. Zoom as needed — we
						upload this as a JPEG.
					</DialogDescription>
				</DialogHeader>
				<DialogPanel className="space-y-4" scrollFade={false}>
					<div className="relative -mx-1 mx-auto h-[260px] w-full max-w-sm overflow-hidden rounded-lg bg-muted md:h-[280px]">
						<Cropper
							aspect={1}
							crop={crop}
							image={imageSrc}
							onCropChange={setCrop}
							onCropComplete={onCropComplete}
							onZoomChange={setZoom}
							zoom={zoom}
						/>
					</div>
					<div className="space-y-2">
						<span className="text-muted-foreground text-xs leading-none">
							Zoom
						</span>
						<Slider
							aria-label="Zoom"
							max={3}
							min={1}
							onValueChange={(v) => {
								const first = Array.isArray(v) ? v[0] : v;
								setZoom(
									typeof first === "number" && !Number.isNaN(first) ? first : 1,
								);
							}}
							step={0.02}
							value={[zoom]}
						/>
					</div>
				</DialogPanel>
				<DialogFooter>
					<LoadingButton
						type="button"
						disabled={!croppedAreaPixels || busy}
						isLoading={busy}
						loadingText="Saving…"
						onClick={() => void handleSubmit()}
					>
						Use this photo
					</LoadingButton>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
