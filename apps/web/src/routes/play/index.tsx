import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import type { GetActiveGameOutputType } from "@xamsa/schemas/modules/user";
import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@xamsa/ui/components/alert";
import { Button } from "@xamsa/ui/components/button";
import { Spinner } from "@xamsa/ui/components/spinner";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@xamsa/ui/components/tabs";
import { MIN_TOPICS_PER_PACK_TO_PUBLISH } from "@xamsa/utils/constants";
import {
	KeyRoundIcon,
	LogInIcon,
	PackageIcon,
	PlusIcon,
	TrophyIcon,
} from "lucide-react";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { useEffect, useRef } from "react";
import { JoinGameForm } from "@/components/join-game-form";
import type { PackCard } from "@/components/pack-card";
import { getUser } from "@/functions/get-user";
import { pageSeo } from "@/lib/seo";
import { orpc } from "@/utils/orpc";

type PlayTab = "host" | "join";

export const Route = createFileRoute("/play/")({
	component: RouteComponent,

	beforeLoad: async () => {
		const session = await getUser();
		return { session };
	},

	loader: async ({ context }) => {
		const session = context.session;

		let activeGame: GetActiveGameOutputType | null = null;
		try {
			activeGame = session ? await orpc.user.getActiveGame.call({}) : null;
		} catch {
			activeGame = null;
		}

		return { isAuthenticated: !!session, activeGame };
	},

	head: () =>
		pageSeo({
			title: "Play",
			description:
				"Host a live quiz from your published packs or join a friend’s game with a short code. Xamsa runs real-time buzzer rounds for groups.",
			path: "/play/",
			keywords:
				"Xamsa play, host quiz, join game code, live trivia, buzzer game, multiplayer quiz",
		}),
});

function RouteComponent() {
	const { isAuthenticated, activeGame } = Route.useLoaderData();

	if (!isAuthenticated) {
		return <NotAuthenticatedView />;
	}

	if (activeGame) {
		return (
			<Navigate to="/g/$code" params={{ code: activeGame.code }} replace />
		);
	}

	return <PlayView />;
}

function NotAuthenticatedView() {
	return (
		<div className="container mx-auto max-w-md py-20">
			<div className="space-y-6 text-center">
				<div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10">
					<PackageIcon className="size-8 text-primary" />
				</div>
				<div className="space-y-2">
					<h1 className="font-bold text-2xl tracking-tight">
						Sign in to host or join
					</h1>
					<p className="text-muted-foreground text-sm">
						Hosting needs a published pack. Joining needs a code. Either way,
						sign in first.
					</p>
				</div>
				<div className="flex flex-col gap-2">
					<Button
						render={
							<Link to="/auth/login" search={{ redirect_url: "/play" }} />
						}
					>
						<LogInIcon />
						Sign in
					</Button>
					<Button
						variant="outline"
						render={
							<Link to="/auth/register" search={{ redirect_url: "/play" }} />
						}
					>
						Create an account
					</Button>
				</div>
				<p className="text-muted-foreground text-xs">
					You'll need at least one published pack with{" "}
					{MIN_TOPICS_PER_PACK_TO_PUBLISH}+ topics to host a game.
				</p>
			</div>
		</div>
	);
}

function PlayView() {
	// Tab persisted via nuqs so refreshes and back/forward keep the user on
	// the same panel. Default tab is "host" — pack authors hit /play most.
	const [tab, setTab] = useQueryState(
		"tab",
		parseAsStringEnum<PlayTab>(["host", "join"]).withDefault("host"),
	);

	return (
		<div className="container mx-auto max-w-4xl space-y-6 py-8">
			<div className="space-y-2">
				<h1 className="font-bold text-2xl tracking-tight">Play</h1>
				<p className="text-muted-foreground text-sm">
					Host a game from one of your packs, or join a friend's game with a
					code.
				</p>
				<p className="text-muted-foreground text-sm">
					<Link
						to="/games/history"
						className="font-medium text-primary underline-offset-4 hover:underline"
					>
						Recent public games
					</Link>{" "}
					— finished sessions anyone can browse.
				</p>
			</div>

			<Tabs value={tab} onValueChange={(v) => setTab(v as PlayTab)}>
				<TabsList className="w-full sm:w-auto">
					<TabsTrigger value="host">
						<TrophyIcon />
						Host
					</TabsTrigger>
					<TabsTrigger value="join">
						<KeyRoundIcon />
						Join
					</TabsTrigger>
				</TabsList>

				<TabsContent value="host" className="pt-4">
					<HostTab />
				</TabsContent>
				<TabsContent value="join" className="pt-4">
					<JoinTab />
				</TabsContent>
			</Tabs>
		</div>
	);
}

function HostTab() {
	const {
		data,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isLoading,
		isError,
	} = useInfiniteQuery({
		...orpc.pack.list.infiniteOptions({
			input: (pageParam: string | undefined) => ({
				cursor: pageParam,
				limit: 10,
				onlyMyPacks: true,
				statuses: ["published"],
				sort: "newest",
				dir: "desc",
			}),
			getNextPageParam: (lastPage) => lastPage.metadata.nextCursor ?? undefined,
			initialPageParam: undefined as string | undefined,
		}),
	});

	const packs = data?.pages.flatMap((page) => page.items) ?? [];
	const sentinelRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!sentinelRef.current) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
					fetchNextPage();
				}
			},
			{ threshold: 0 },
		);

		observer.observe(sentinelRef.current);
		return () => observer.disconnect();
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	if (isLoading) {
		return (
			<div className="flex justify-center py-12">
				<Spinner />
			</div>
		);
	}

	if (isError) {
		return (
			<Alert variant="error">
				<AlertTitle>Failed to load your packs</AlertTitle>
				<AlertDescription>
					Something went wrong. Please try refreshing the page.
				</AlertDescription>
			</Alert>
		);
	}

	if (packs.length === 0) {
		return <NoPublishedPacksView />;
	}

	return (
		<div className="space-y-4">
			<div className="grid gap-4 sm:grid-cols-2">
				{packs.map((pack) => (
					<PlayablePackCard key={pack.slug} pack={pack} />
				))}
			</div>

			<div ref={sentinelRef} className="h-1" />

			{isFetchingNextPage && (
				<div className="flex justify-center py-4">
					<Spinner />
				</div>
			)}
		</div>
	);
}

function JoinTab() {
	return (
		<div className="mx-auto max-w-md rounded-xl border border-border bg-background p-6">
			<JoinGameForm
				title="Join a game"
				description="Enter the code your host shared with you."
			/>
		</div>
	);
}

function NoPublishedPacksView() {
	return (
		<div className="rounded-xl border border-border border-dashed py-12 text-center">
			<div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-muted">
				<PackageIcon className="size-5 text-muted-foreground" />
			</div>
			<h2 className="mt-4 font-semibold">No published packs yet</h2>
			<p className="mx-auto mt-1 max-w-sm text-muted-foreground text-sm">
				To host a game, you need to publish a pack with at least{" "}
				{MIN_TOPICS_PER_PACK_TO_PUBLISH} topics.
			</p>
			<Button className="mt-4" render={<Link to="/packs/new" />}>
				<PlusIcon />
				Create your first pack
			</Button>
		</div>
	);
}

function PlayablePackCard({
	pack,
}: {
	pack: Parameters<typeof PackCard>[0]["pack"];
}) {
	return (
		<Link
			to="/play/new/$packSlug"
			params={{ packSlug: pack.slug }}
			className="group flex flex-col gap-3 rounded-xl border border-border p-4 text-left transition-colors hover:border-primary/30 hover:bg-primary/3"
		>
			<div className="space-y-1">
				<h3 className="truncate font-semibold text-base">{pack.name}</h3>
				{pack.description && (
					<p className="line-clamp-2 text-muted-foreground text-sm">
						{pack.description}
					</p>
				)}
			</div>
			<div className="flex items-center justify-between text-muted-foreground text-xs">
				<span>
					{pack._count.topics} {pack._count.topics === 1 ? "topic" : "topics"}
				</span>
				<span className="font-medium text-primary group-hover:underline">
					Start game →
				</span>
			</div>
		</Link>
	);
}
