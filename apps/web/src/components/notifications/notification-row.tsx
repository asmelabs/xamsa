import { useNavigate } from "@tanstack/react-router";
import type {
	NotificationActorType,
	NotificationGroupRowType,
} from "@xamsa/schemas/modules/notification";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@xamsa/ui/components/avatar";
import { cn } from "@xamsa/ui/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
	AtSignIcon,
	BellIcon,
	HeartIcon,
	MessageSquareIcon,
	PackageIcon,
	PlayIcon,
	ReplyIcon,
	TrophyIcon,
	UserPlusIcon,
} from "lucide-react";
import type { ComponentType, ReactNode, SVGProps } from "react";

const TYPE_ICON: Record<
	NotificationGroupRowType["type"],
	ComponentType<SVGProps<SVGSVGElement>>
> = {
	mention_post: AtSignIcon,
	mention_comment: AtSignIcon,
	reaction_post: HeartIcon,
	reaction_comment: HeartIcon,
	comment_on_post: MessageSquareIcon,
	reply_to_comment: ReplyIcon,
	follow: UserPlusIcon,
	pack_published: PackageIcon,
	game_started: PlayIcon,
	game_finished: TrophyIcon,
	system: BellIcon,
};

function actorDisplay(actor: NotificationActorType): string {
	return actor.name.trim().length > 0 ? actor.name : `@${actor.username}`;
}

function actorsLabel(
	actors: NotificationActorType[],
	totalActors: number,
): ReactNode {
	if (actors.length === 0) {
		return <span className="font-medium text-foreground">Xamsa</span>;
	}
	const [first, second, third] = actors;
	const extra = totalActors - actors.length;

	if (totalActors === 1 && first) {
		return (
			<span className="font-medium text-foreground">{actorDisplay(first)}</span>
		);
	}
	if (totalActors === 2 && first && second) {
		return (
			<>
				<span className="font-medium text-foreground">
					{actorDisplay(first)}
				</span>
				<span> and </span>
				<span className="font-medium text-foreground">
					{actorDisplay(second)}
				</span>
			</>
		);
	}
	if (totalActors === 3 && first && second && third) {
		return (
			<>
				<span className="font-medium text-foreground">
					{actorDisplay(first)}
				</span>
				<span>, </span>
				<span className="font-medium text-foreground">
					{actorDisplay(second)}
				</span>
				<span> and </span>
				<span className="font-medium text-foreground">
					{actorDisplay(third)}
				</span>
			</>
		);
	}
	if (first) {
		return (
			<>
				<span className="font-medium text-foreground">
					{actorDisplay(first)}
				</span>
				<span> and {extra + (actors.length - 1)} others</span>
			</>
		);
	}
	return (
		<span className="font-medium text-foreground">{totalActors} others</span>
	);
}

function actionPhrase(row: NotificationGroupRowType): string {
	switch (row.type) {
		case "mention_post":
			return "mentioned you in a post";
		case "mention_comment":
			return "mentioned you in a comment";
		case "reaction_post":
			return "reacted to your post";
		case "reaction_comment":
			return "reacted to your comment";
		case "comment_on_post":
			return "commented on your post";
		case "reply_to_comment":
			return "replied to your comment";
		case "follow":
			return "started following you";
		case "pack_published":
			return "published a new pack";
		case "game_started":
			return "started a game";
		case "game_finished":
			return "your game finished";
		case "system":
			return "Xamsa";
	}
}

function previewLine(row: NotificationGroupRowType): string | null {
	const subject = row.subject;
	switch (row.type) {
		case "mention_comment":
		case "reply_to_comment":
		case "comment_on_post":
		case "reaction_comment":
			return subject.commentBodyExcerpt ?? subject.postBodyExcerpt;
		case "mention_post":
		case "reaction_post":
			return subject.postBodyExcerpt;
		case "pack_published":
			return subject.packName;
		case "game_started":
		case "game_finished":
			return subject.gameCode ? `Game ${subject.gameCode}` : null;
		default:
			return null;
	}
}

function StackedAvatars({ actors }: { actors: NotificationActorType[] }) {
	if (actors.length === 0) {
		return null;
	}
	const [a] = actors;
	if (actors.length === 1 && a) {
		return (
			<Avatar className="size-9">
				{a.image ? <AvatarImage src={a.image} alt={a.name} /> : null}
				<AvatarFallback>{a.name.charAt(0).toUpperCase()}</AvatarFallback>
			</Avatar>
		);
	}
	return (
		<div className="flex -space-x-2">
			{actors.slice(0, 3).map((a) => (
				<Avatar key={a.id} className="size-7 ring-2 ring-popover">
					{a.image ? <AvatarImage src={a.image} alt={a.name} /> : null}
					<AvatarFallback className="text-[10px]">
						{a.name.charAt(0).toUpperCase()}
					</AvatarFallback>
				</Avatar>
			))}
		</div>
	);
}

export type NotificationRowProps = {
	row: NotificationGroupRowType;
	onMarkRead?: (groupKey: string) => void;
	className?: string;
};

export function NotificationRow({
	row,
	onMarkRead,
	className,
}: NotificationRowProps) {
	const navigate = useNavigate();
	const Icon = TYPE_ICON[row.type];
	const isUnread = row.readAt == null;
	const href = row.subject.href;

	const body = (
		<div
			className={cn(
				"flex w-full items-start gap-3 px-3 py-3 transition-colors hover:bg-muted/40",
				isUnread && "bg-primary/5",
				className,
			)}
		>
			<div className="relative shrink-0">
				<StackedAvatars actors={row.actors} />
				<div className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full border border-border bg-background text-muted-foreground">
					<Icon className="size-3" strokeWidth={1.75} />
				</div>
			</div>

			<div className="min-w-0 flex-1 space-y-1">
				<p className="text-sm leading-snug">
					{actorsLabel(row.actors, row.totalActors)}{" "}
					<span className="text-muted-foreground">{actionPhrase(row)}</span>
					{row.count > 1 ? (
						<span className="ml-1 text-muted-foreground text-xs">
							· {row.count}×
						</span>
					) : null}
				</p>
				{previewLine(row) ? (
					<p className="line-clamp-2 text-muted-foreground text-xs">
						“{previewLine(row)}”
					</p>
				) : null}
				<p className="text-muted-foreground text-xs">
					{formatDistanceToNow(new Date(row.latestAt), { addSuffix: true })}
				</p>
			</div>

			{isUnread ? (
				<span
					aria-hidden
					className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
				/>
			) : null}
		</div>
	);

	const handleClick = (
		e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>,
	) => {
		if (isUnread) {
			onMarkRead?.(row.groupKey);
		}
		if (href?.startsWith("/")) {
			e.preventDefault();
			void navigate({ to: href as never });
		}
	};

	if (href) {
		return (
			<a
				href={href}
				onClick={handleClick}
				className="block focus-visible:bg-muted/60 focus-visible:outline-none"
			>
				{body}
			</a>
		);
	}

	return (
		<button
			type="button"
			onClick={handleClick}
			className="block w-full text-left focus-visible:bg-muted/60 focus-visible:outline-none"
		>
			{body}
		</button>
	);
}
