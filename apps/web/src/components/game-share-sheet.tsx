import { Button } from "@xamsa/ui/components/button";
import {
	Dialog,
	DialogDescription,
	DialogHeader,
	DialogPanel,
	DialogPopup,
	DialogTitle,
} from "@xamsa/ui/components/dialog";
import { CheckIcon, CopyIcon, Share2Icon } from "lucide-react";
import { type ReactNode, useCallback, useState } from "react";
import { toast } from "sonner";
import { HostLobbyQr } from "@/components/host-lobby-qr";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import {
	buildGameShareBody,
	type GameShareContext,
	getGameShareTargets,
} from "@/lib/game-share";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	context: GameShareContext;
};

function SocialButton({
	href,
	label,
	children,
}: {
	href: string;
	label: string;
	children: ReactNode;
}) {
	return (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			className="flex min-h-[3.25rem] items-center gap-3 rounded-xl border border-border/80 bg-card px-3 py-2.5 text-left transition-colors hover:bg-muted/50 active:bg-muted/60"
		>
			{children}
			<span className="font-medium text-sm">{label}</span>
		</a>
	);
}

export function GameShareSheet({ open, onOpenChange, context }: Props) {
	const { copy } = useCopyToClipboard();
	const body = buildGameShareBody(context);
	const targets = getGameShareTargets(context, body);
	const [copiedCode, setCopiedCode] = useState(false);
	const [copiedLink, setCopiedLink] = useState(false);

	const onCopyCode = useCallback(() => {
		copy(context.code);
		setCopiedCode(true);
		toast.success("Room code copied");
		window.setTimeout(() => setCopiedCode(false), 2000);
	}, [context.code, copy]);

	const onCopyLink = useCallback(() => {
		copy(context.inviteUrl);
		setCopiedLink(true);
		toast.success("Invite link copied");
		window.setTimeout(() => setCopiedLink(false), 2000);
	}, [context.inviteUrl, copy]);

	const onCopyForDiscord = useCallback(() => {
		copy(body);
		toast.success("Message copied — paste in Discord");
	}, [body, copy]);

	const onNativeShare = useCallback(async () => {
		if (!navigator.share) {
			copy(body);
			toast.info("Copied message — share anywhere you like");
			return;
		}
		try {
			await navigator.share({
				title: `Xamsa · ${context.packName}`,
				text: body,
				url: context.inviteUrl,
			});
			onOpenChange(false);
		} catch (e) {
			if ((e as Error).name === "AbortError") return;
			copy(body);
			toast.info("Copied message instead");
		}
	}, [body, context.inviteUrl, context.packName, copy, onOpenChange]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogPopup className="max-w-md p-0 sm:max-w-lg" showCloseButton>
				<DialogHeader className="border-border border-b px-4 pt-4 pb-3 text-left">
					<DialogTitle className="flex items-center gap-2">
						<Share2Icon className="size-5 text-primary" />
						Invite players
					</DialogTitle>
					<DialogDescription>
						Share the room code or invite link — friends open it to sign in and
						join in one step.
					</DialogDescription>
				</DialogHeader>
				<DialogPanel className="max-h-[min(70vh,520px)] space-y-4 overflow-y-auto px-4 pb-4">
					{typeof navigator !== "undefined" && "share" in navigator && (
						<Button
							type="button"
							className="h-12 w-full gap-2 text-base"
							onClick={() => void onNativeShare()}
						>
							<Share2Icon className="size-4" />
							Share…
						</Button>
					)}

					<div className="space-y-2">
						<p className="text-muted-foreground text-xs uppercase tracking-wide">
							Room code
						</p>
						<button
							type="button"
							onClick={onCopyCode}
							className="flex h-14 w-full items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-4 text-left transition-colors hover:bg-muted/50"
						>
							<span className="font-mono font-semibold text-2xl tracking-wider">
								{context.code}
							</span>
							{copiedCode ? (
								<CheckIcon className="size-5 shrink-0 text-green-600 dark:text-green-400" />
							) : (
								<CopyIcon className="size-5 shrink-0 text-muted-foreground" />
							)}
						</button>
					</div>

					<Button
						type="button"
						variant="outline"
						className="h-12 w-full justify-center gap-2"
						onClick={onCopyLink}
					>
						{copiedLink ? (
							<CheckIcon className="size-4 text-green-600 dark:text-green-400" />
						) : (
							<CopyIcon className="size-4" />
						)}
						Copy invite link
					</Button>

					<div className="flex flex-col items-center gap-1.5 rounded-xl border border-border/80 border-dashed bg-muted/20 px-4 py-4">
						<p className="font-medium text-foreground text-xs uppercase tracking-wide">
							Scan to join
						</p>
						<HostLobbyQr joinUrl={context.inviteUrl} />
					</div>

					<div className="space-y-2">
						<p className="text-muted-foreground text-xs uppercase tracking-wide">
							Share via
						</p>
						<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
							<SocialButton href={targets.whatsapp} label="WhatsApp">
								<span
									className="flex size-10 shrink-0 items-center justify-center rounded-full font-bold text-white text-xs"
									style={{ background: "#25D366" }}
									aria-hidden
								>
									WA
								</span>
							</SocialButton>
							<SocialButton href={targets.telegram} label="Telegram">
								<span
									className="flex size-10 shrink-0 items-center justify-center rounded-full font-bold text-white text-xs"
									style={{ background: "#229ED9" }}
									aria-hidden
								>
									TG
								</span>
							</SocialButton>
							<button
								type="button"
								onClick={onCopyForDiscord}
								className="flex min-h-[3.25rem] items-center gap-3 rounded-xl border border-border/80 bg-card px-3 py-2.5 text-left transition-colors hover:bg-muted/50 active:bg-muted/60"
							>
								<span
									className="flex size-10 shrink-0 items-center justify-center rounded-full font-bold text-white text-xs"
									style={{ background: "#5865F2" }}
									aria-hidden
								>
									DC
								</span>
								<span className="font-medium text-sm">
									Discord (copy message)
								</span>
							</button>
							<SocialButton href={targets.twitter} label="X / Twitter">
								<span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-zinc-900 font-bold text-white text-xs dark:bg-zinc-100 dark:text-zinc-900">
									X
								</span>
							</SocialButton>
							<SocialButton href={targets.facebook} label="Facebook">
								<span
									className="flex size-10 shrink-0 items-center justify-center rounded-full font-bold text-white text-xs"
									style={{ background: "#0866FF" }}
									aria-hidden
								>
									f
								</span>
							</SocialButton>
						</div>
						<p className="text-muted-foreground text-xs leading-snug">
							Discord has no universal share URL — we copy the full invite text
							so you can paste it in any channel or DM.
						</p>
					</div>
				</DialogPanel>
			</DialogPopup>
		</Dialog>
	);
}
