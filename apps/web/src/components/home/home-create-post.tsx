import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@xamsa/ui/components/button";
import { Card } from "@xamsa/ui/components/card";
import { cn } from "@xamsa/ui/lib/utils";
import { ImageIcon, Loader2Icon, SendIcon, XIcon } from "lucide-react";
import { forwardRef, useEffect, useState } from "react";

import { MentionTextarea } from "@/components/home/mention-textarea";
import { invalidateHomePostFeed } from "@/lib/home-post-feed-query";
import { orpc } from "@/utils/orpc";

export type CreatePostComposerProps = {
	onPosted?: () => void;
	/** `embedded` = bordered card in the feed; `dialog` = borderless for modal */
	variant?: "embedded" | "dialog";
};

export const CreatePostComposer = forwardRef<
	HTMLDivElement,
	CreatePostComposerProps
>(function CreatePostComposerInner({ onPosted, variant = "embedded" }, ref) {
	const qc = useQueryClient();
	const [body, setBody] = useState("");
	const [file, setFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);

	const isDialog = variant === "dialog";

	useEffect(() => {
		if (file == null) {
			setPreviewUrl(null);
			return;
		}
		const url = URL.createObjectURL(file);
		setPreviewUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [file]);

	const create = useMutation(
		orpc.post.create.mutationOptions({
			onSuccess: async () => {
				setBody("");
				setFile(null);
				await invalidateHomePostFeed(qc);
				onPosted?.();
			},
		}),
	);

	const canSubmit =
		(body.trim().length > 0 || file != null) && !create.isPending;

	const onSubmit = async () => {
		const trimmed = body.trim();
		let imageBase64: string | undefined;
		let imageMimeType: "image/jpeg" | "image/png" | "image/webp" | undefined;

		if (file != null) {
			const mime = file.type;
			if (
				mime !== "image/jpeg" &&
				mime !== "image/png" &&
				mime !== "image/webp"
			)
				return;
			imageMimeType = mime as typeof imageMimeType;
			const dataUrl = await new Promise<string>((resolve, reject) => {
				const fr = new FileReader();
				fr.onload = () =>
					typeof fr.result === "string"
						? resolve(fr.result)
						: reject(new Error("Unexpected read result"));
				fr.onerror = () => reject(new Error("Could not read image"));
				fr.readAsDataURL(file);
			});
			const comma = dataUrl.indexOf(",");
			if (comma >= 0) imageBase64 = dataUrl.slice(comma + 1);
		}

		create.mutate({
			body: trimmed.length ? trimmed : undefined,
			imageBase64,
			imageMimeType,
		});
	};

	const inner = (
		<>
			{!isDialog ? (
				<div className="flex items-start justify-between gap-2">
					<p className="font-medium text-sm">Create a post</p>
				</div>
			) : null}
			<MentionTextarea
				placeholder="Share something with the lobby…"
				value={body}
				onValueChange={setBody}
				onKeyDown={(e) => {
					if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canSubmit) {
						e.preventDefault();
						void onSubmit();
					}
				}}
				rows={isDialog ? 4 : 3}
				disabled={create.isPending}
				className={cn(
					"min-h-[4.5rem] resize-none",
					isDialog &&
						"border-0 bg-transparent shadow-none focus-visible:ring-0",
				)}
			/>

			{previewUrl ? (
				<div className="relative overflow-hidden rounded-lg border bg-muted/40">
					<img
						src={previewUrl}
						alt=""
						className="max-h-64 w-full object-contain"
					/>
					<button
						type="button"
						className="absolute top-2 right-2 inline-flex size-9 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm hover:bg-muted"
						onClick={() => setFile(null)}
						disabled={create.isPending}
						aria-label="Remove image"
					>
						<XIcon className="size-4" />
					</button>
				</div>
			) : null}

			<div
				className={cn(
					"flex flex-wrap items-center gap-2 pt-3",
					!isDialog && "border-border border-t",
				)}
			>
				<label className="cursor-pointer">
					<span className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-muted-foreground text-sm transition-colors hover:bg-muted/50">
						<ImageIcon className="size-4 shrink-0" strokeWidth={1.75} />
						Photo
					</span>
					<input
						className="sr-only"
						type="file"
						accept="image/jpeg,image/png,image/webp"
						onChange={(e) => setFile(e.target.files?.[0] ?? null)}
						disabled={create.isPending}
					/>
				</label>
				{file && !previewUrl ? (
					<span className="truncate text-muted-foreground text-xs">
						{file.name}
					</span>
				) : null}

				<Button
					type="button"
					className="ml-auto gap-2"
					size="sm"
					disabled={!canSubmit}
					onClick={() => void onSubmit()}
				>
					{create.isPending ? (
						<Loader2Icon className="size-4 animate-spin" />
					) : (
						<SendIcon className="size-4" />
					)}
					Post
				</Button>
			</div>

			<p className="text-[10px] text-muted-foreground">
				Tip: press ⌘ Enter / Ctrl Enter to post.
			</p>
		</>
	);

	return (
		<div ref={ref} className={cn(isDialog && "space-y-3")}>
			{isDialog ? inner : <Card className="space-y-3 border p-4">{inner}</Card>}
		</div>
	);
});
