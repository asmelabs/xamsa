import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@xamsa/ui/components/avatar";
import { Button } from "@xamsa/ui/components/button";
import { Card } from "@xamsa/ui/components/card";
import { cn } from "@xamsa/ui/lib/utils";
import { ImageIcon, Loader2Icon, SendIcon, XIcon } from "lucide-react";
import { forwardRef, useEffect, useState } from "react";

import { MentionTextarea } from "@/components/home/mention-textarea";
import { authClient } from "@/lib/auth-client";
import { invalidateHomePostFeed } from "@/lib/home-post-feed-query";
import { orpc } from "@/utils/orpc";

const MAX_BODY = 1000;

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
	const { data: session } = authClient.useSession();
	const [body, setBody] = useState("");
	const [file, setFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);

	const isDialog = variant === "dialog";
	const user = session?.user;
	const initials = user?.name
		? user.name.slice(0, 2).toUpperCase()
		: user?.email
			? user.email.slice(0, 2).toUpperCase()
			: "U";

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

	const trimmed = body.trim();
	const overLimit = trimmed.length > MAX_BODY;
	const canSubmit =
		(trimmed.length > 0 || file != null) && !overLimit && !create.isPending;

	const onSubmit = async () => {
		if (!canSubmit) return;
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

	const remaining = MAX_BODY - trimmed.length;
	const showCount = trimmed.length > MAX_BODY * 0.7;

	const inner = (
		<>
			<div className="flex items-start gap-3">
				<Avatar className="size-10 shrink-0">
					<AvatarImage src={user?.image ?? undefined} alt="" />
					<AvatarFallback className="font-medium text-xs">
						{initials}
					</AvatarFallback>
				</Avatar>
				<div className="min-w-0 flex-1">
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
						rows={isDialog ? 3 : 2}
						disabled={create.isPending}
						className={cn(
							"[&_textarea]:max-h-72 [&_textarea]:min-h-12 [&_textarea]:py-2.5 [&_textarea]:text-[15px] [&_textarea]:max-sm:min-h-12",
							isDialog &&
								"border-0 bg-transparent shadow-none focus-visible:ring-0 [&_textarea]:px-0",
						)}
					/>
				</div>
			</div>

			{previewUrl ? (
				<div className="relative flex max-h-[20rem] min-h-[10rem] items-center justify-center overflow-hidden border border-border bg-muted/20">
					<img
						src={previewUrl}
						alt=""
						className="max-h-[20rem] max-w-full object-contain"
					/>
					<button
						type="button"
						className="absolute top-2 right-2 inline-flex size-8 items-center justify-center rounded-md border border-border bg-background/95 text-muted-foreground shadow-sm transition-colors hover:bg-background hover:text-foreground"
						onClick={() => setFile(null)}
						disabled={create.isPending}
						aria-label="Remove image"
					>
						<XIcon className="size-4" />
					</button>
				</div>
			) : null}

			<div className="flex flex-wrap items-center gap-2 border-border border-t pt-3">
				<label className="cursor-pointer">
					<span className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-muted-foreground text-sm transition-colors hover:border-primary/40 hover:bg-muted/50 hover:text-foreground">
						<ImageIcon className="size-4 shrink-0" strokeWidth={1.75} />
						{file ? "Change photo" : "Add photo"}
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

				<div className="ml-auto flex items-center gap-3">
					{showCount ? (
						<span
							className={cn(
								"text-xs tabular-nums",
								overLimit
									? "font-medium text-destructive"
									: remaining < 100
										? "text-amber-600 dark:text-amber-500"
										: "text-muted-foreground",
							)}
						>
							{remaining}
						</span>
					) : (
						<span className="hidden text-[11px] text-muted-foreground sm:inline">
							⌘ Enter to post
						</span>
					)}
					<Button
						type="button"
						className="gap-2"
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
			</div>
		</>
	);

	return (
		<div ref={ref} className={cn(isDialog && "space-y-4")}>
			{isDialog ? inner : <Card className="space-y-4 border p-4">{inner}</Card>}
		</div>
	);
});
