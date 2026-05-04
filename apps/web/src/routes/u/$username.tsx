import {
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	notFound,
	Outlet,
	useMatch,
} from "@tanstack/react-router";
import { Badge } from "@xamsa/ui/components/badge";
import { Button } from "@xamsa/ui/components/button";
import {
	Card,
	CardDescription,
	CardHeader,
	CardPanel,
	CardTitle,
} from "@xamsa/ui/components/card";
import {
	Dialog,
	DialogHeader,
	DialogPanel,
	DialogPopup,
	DialogTitle,
} from "@xamsa/ui/components/dialog";
import { Spinner } from "@xamsa/ui/components/spinner";
import { getLevelProgress } from "@xamsa/utils/levels";
import { format, parse } from "date-fns";
import {
	BarChart3Icon,
	BookOpenIcon,
	ChartNoAxesColumnIcon,
	ChevronRightIcon,
	ClockIcon,
	CrownIcon,
	FlameIcon,
	GamepadIcon,
	LayoutDashboardIcon,
	LogOutIcon,
	Package,
	SettingsIcon,
	ShieldCheckIcon,
	TargetIcon,
	TimerOffIcon,
	TrophyIcon,
	UserMinusIcon,
	UserPlusIcon,
	XCircleIcon,
	ZapIcon,
} from "lucide-react";
import { parseAsStringEnum, parseAsStringLiteral, useQueryState } from "nuqs";
import posthog from "posthog-js";
import { useEffect, useRef, useState } from "react";
import {
	Bar,
	BarChart,
	Cell,
	Legend,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { toast } from "sonner";
import { PostCard } from "@/components/home/home-feed";
import { RecentGameRowItem } from "@/components/home/recent-game-row";
import { StatTile } from "@/components/home/stat-tile";
import { TrendingPackTile } from "@/components/home/trending-pack-tile";
import { LoadingButton } from "@/components/loading-button";
import { ProfileBadgesSection } from "@/components/profile-badges-section";
import { ProfileImageLightbox } from "@/components/profile-image-lightbox";
import { getUser } from "@/functions/get-user";
import { authClient } from "@/lib/auth-client";
import {
	bookmarkedPostsInfiniteOptions,
	profilePostsInfiniteOptions,
} from "@/lib/home-post-feed-query";
import { profilePageJsonLd } from "@/lib/json-ld";
import { pageSeo } from "@/lib/seo";
import { isStaffRole } from "@/lib/staff";
import { orpc } from "@/utils/orpc";

const HISTORY_PAGE = 15;
const FOLLOW_LIST_PAGE = 20;

export const Route = createFileRoute("/u/$username")({
	component: RouteComponent,

	beforeLoad: async () => {
		const session = await getUser();
		return { session };
	},
	loader: async ({ params, context }) => {
		try {
			const profile = await orpc.user.findOne.call({
				username: params.username,
			});

			const user = context.session?.user;
			const isOwner = user?.username === params.username;

			return { profile, user, isOwner };
		} catch {
			throw notFound();
		}
	},

	head: ({ loaderData }) => {
		if (!loaderData) {
			return pageSeo({
				title: "Profile",
				description:
					"View a player’s public profile on Xamsa: display name, level, XP, and Elo rating.",
			});
		}
		const { profile } = loaderData;
		const desc = `Public profile for ${profile.name} (@${profile.username}) on Xamsa. Level ${profile.level}, ${profile.xp.toLocaleString()} XP, Elo ${profile.elo.toLocaleString()}. See quiz progress and competitive stats.`;
		return pageSeo({
			title: `${profile.name} (@${profile.username})`,
			description: desc,
			path: `/u/${profile.username}/`,
			ogTitle: `${profile.name} on Xamsa`,
			ogDescription: desc,
			ogImagePath: `/api/og/user/${profile.username}/og.png`,
			keywords: `Xamsa, quiz profile, ${profile.username}, ${profile.name}, trivia stats, Elo, XP`,
			jsonLd: profilePageJsonLd(profile),
		});
	},
});

const roleConfig = {
	user: null,
	moderator: { label: "Moderator", variant: "info" as const },
	admin: { label: "Admin", variant: "success" as const },
};

const OUTCOME_PIE_COLORS = {
	correct: "var(--success)",
	wrong: "var(--destructive)",
	expired: "var(--warning)",
} as const;

function formatPlayTimeSeconds(totalSeconds: number): string {
	if (totalSeconds < 60) return `${totalSeconds}s`;
	const h = Math.floor(totalSeconds / 3600);
	const m = Math.floor((totalSeconds % 3600) / 60);
	if (h >= 48) {
		const d = Math.floor(h / 24);
		return `${d}d ${h % 24}h`;
	}
	if (h > 0) return `${h}h ${m}m`;
	return `${m}m`;
}

function RouteComponent() {
	const postChildMatch = useMatch({
		from: "/u/$username/p/$postSlug",
		shouldThrow: false,
	});
	if (postChildMatch) {
		return <Outlet />;
	}

	const { username } = Route.useParams();
	const { profile: loaderProfile, user, isOwner } = Route.useLoaderData();
	const qc = useQueryClient();
	const showStaffDashboard = isOwner && isStaffRole(user?.role);
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	const [followTab, setFollowTab] = useQueryState(
		"follow",
		parseAsStringLiteral(["followers", "following"] as const),
	);
	const [profileTab, setProfileTab] = useQueryState(
		"tab",
		parseAsStringEnum([
			"feed",
			"saved",
			"badges",
			"stats",
			"packs",
			"games",
		] as const).withDefault("feed"),
	);

	const activeProfileTab =
		!isOwner && profileTab === "saved" ? "feed" : profileTab;

	const { data: profile } = useQuery({
		...orpc.user.findOne.queryOptions({ input: { username } }),
		initialData: loaderProfile,
	});

	const { data: publicStats, isPending: publicStatsPending } = useQuery({
		...orpc.user.getPublicStats.queryOptions({ input: { username } }),
		enabled: activeProfileTab === "stats",
	});
	const { data: gameActivity } = useQuery({
		...orpc.user.getPublicGameActivity.queryOptions({ input: { username } }),
		enabled: activeProfileTab === "stats",
	});

	const {
		data: gamesData,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isLoading: gamesLoading,
	} = useInfiniteQuery({
		...orpc.user.getPublicRecentGames.infiniteOptions({
			input: (pageParam: string | undefined) => ({
				username,
				cursor: pageParam,
				limit: HISTORY_PAGE,
			}),
			getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
			initialPageParam: undefined as string | undefined,
		}),
		enabled: activeProfileTab === "games",
	});

	const { data: packsData, isLoading: packsLoading } = useQuery({
		...orpc.pack.list.queryOptions({
			input: {
				authors: [username],
				statuses: ["published"],
				limit: 24,
				sort: "newest",
				dir: "desc",
			},
		}),
		enabled: activeProfileTab === "packs",
	});

	const profileFeedQuery = useInfiniteQuery({
		...profilePostsInfiniteOptions(username),
		enabled: activeProfileTab === "feed",
	});

	const savedPostsQuery = useInfiniteQuery({
		...bookmarkedPostsInfiniteOptions(),
		enabled: Boolean(isOwner && user && activeProfileTab === "saved"),
	});

	const profilePosts =
		profileFeedQuery.data?.pages.flatMap((p) => p.items) ?? [];
	const savedPostRows =
		savedPostsQuery.data?.pages.flatMap((p) => p.items) ?? [];

	const profileFeedSentinelRef = useRef<HTMLDivElement>(null);
	const savedFeedSentinelRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (activeProfileTab !== "feed") return;
		const el = profileFeedSentinelRef.current;
		if (!el) return;
		const obs = new IntersectionObserver(
			([e]) => {
				if (
					e?.isIntersecting &&
					profileFeedQuery.hasNextPage &&
					!profileFeedQuery.isFetchingNextPage
				) {
					void profileFeedQuery.fetchNextPage();
				}
			},
			{ threshold: 0 },
		);
		obs.observe(el);
		return () => obs.disconnect();
	}, [
		activeProfileTab,
		profileFeedQuery.hasNextPage,
		profileFeedQuery.isFetchingNextPage,
		profileFeedQuery.fetchNextPage,
	]);

	useEffect(() => {
		if (!(isOwner && activeProfileTab === "saved")) return;
		const el = savedFeedSentinelRef.current;
		if (!el) return;
		const obs = new IntersectionObserver(
			([e]) => {
				if (
					e?.isIntersecting &&
					savedPostsQuery.hasNextPage &&
					!savedPostsQuery.isFetchingNextPage
				) {
					void savedPostsQuery.fetchNextPage();
				}
			},
			{ threshold: 0 },
		);
		obs.observe(el);
		return () => obs.disconnect();
	}, [
		isOwner,
		activeProfileTab,
		savedPostsQuery.hasNextPage,
		savedPostsQuery.isFetchingNextPage,
		savedPostsQuery.fetchNextPage,
	]);

	const { data: followState } = useQuery({
		...orpc.user.getFollowState.queryOptions({ input: { username } }),
		enabled: Boolean(user && !isOwner),
	});

	const {
		data: followersPages,
		fetchNextPage: fetchNextFollowers,
		hasNextPage: hasNextFollowers,
		isFetchingNextPage: isFetchingNextFollowers,
		isLoading: followersLoading,
	} = useInfiniteQuery({
		...orpc.user.listFollowers.infiniteOptions({
			input: (pageParam: string | undefined) => ({
				username,
				cursor: pageParam,
				limit: FOLLOW_LIST_PAGE,
			}),
			getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
			initialPageParam: undefined as string | undefined,
		}),
		enabled: followTab === "followers",
	});

	const {
		data: followingPages,
		fetchNextPage: fetchNextFollowing,
		hasNextPage: hasNextFollowing,
		isFetchingNextPage: isFetchingNextFollowing,
		isLoading: followingLoading,
	} = useInfiniteQuery({
		...orpc.user.listFollowing.infiniteOptions({
			input: (pageParam: string | undefined) => ({
				username,
				cursor: pageParam,
				limit: FOLLOW_LIST_PAGE,
			}),
			getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
			initialPageParam: undefined as string | undefined,
		}),
		enabled: followTab === "following",
	});

	const invalidateFollowRelated = () => {
		void qc.invalidateQueries({
			queryKey: orpc.user.findOne.queryKey({ input: { username } }),
		});
		void qc.invalidateQueries({
			queryKey: orpc.user.getFollowState.queryKey({ input: { username } }),
		});
		void qc.invalidateQueries({
			predicate: ({ queryKey }) => {
				const s = JSON.stringify(queryKey);
				return (
					s.includes("listFollowers") && s.includes(`"username":"${username}"`)
				);
			},
		});
		void qc.invalidateQueries({
			predicate: ({ queryKey }) => {
				const s = JSON.stringify(queryKey);
				return (
					s.includes("listFollowing") && s.includes(`"username":"${username}"`)
				);
			},
		});
	};

	const {
		mutate: followMut,
		isPending: isFollowPending,
		variables: followVariables,
	} = useMutation({
		...orpc.user.follow.mutationOptions(),
		onSuccess() {
			invalidateFollowRelated();
			toast.success("You are now following this player");
		},
		onError(error) {
			toast.error(error.message || "Could not follow");
		},
	});

	const {
		mutate: unfollowMut,
		isPending: isUnfollowPending,
		variables: unfollowVariables,
	} = useMutation({
		...orpc.user.unfollow.mutationOptions(),
		onSuccess() {
			invalidateFollowRelated();
			toast.success("Unfollowed");
		},
		onError(error) {
			toast.error(error.message || "Could not unfollow");
		},
	});

	const rowFollowBusy = (uname: string) =>
		isFollowPending && followVariables?.username === uname;
	const rowUnfollowBusy = (uname: string) =>
		isUnfollowPending && unfollowVariables?.username === uname;

	const gameRows = gamesData?.pages.flatMap((p) => p.items) ?? [];
	const packRows = packsData?.items ?? [];
	const sentinelRef = useRef<HTMLDivElement>(null);
	const followSentinelRef = useRef<HTMLDivElement>(null);

	const followerRows = followersPages?.pages.flatMap((p) => p.items) ?? [];
	const followingRows = followingPages?.pages.flatMap((p) => p.items) ?? [];

	useEffect(() => {
		if (activeProfileTab !== "games") return;
		if (!sentinelRef.current) return;
		const el = sentinelRef.current;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
					fetchNextPage();
				}
			},
			{ threshold: 0 },
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, [activeProfileTab, hasNextPage, isFetchingNextPage, fetchNextPage]);

	useEffect(() => {
		if (followTab !== "followers" && followTab !== "following") return;
		const el = followSentinelRef.current;
		if (!el) return;
		const hasNext =
			followTab === "followers" ? hasNextFollowers : hasNextFollowing;
		const isFetching =
			followTab === "followers"
				? isFetchingNextFollowers
				: isFetchingNextFollowing;
		const fetchNext =
			followTab === "followers" ? fetchNextFollowers : fetchNextFollowing;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting && hasNext && !isFetching) {
					fetchNext();
				}
			},
			{ threshold: 0 },
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, [
		followTab,
		hasNextFollowers,
		hasNextFollowing,
		isFetchingNextFollowers,
		isFetchingNextFollowing,
		fetchNextFollowers,
		fetchNextFollowing,
	]);
	const levelProgress = getLevelProgress(profile.xp);
	const xpToNext =
		!levelProgress.isMaxLevel && levelProgress.xpForCurrentLevel > 0
			? levelProgress.xpForCurrentLevel - levelProgress.xpIntoLevel
			: null;

	const role = roleConfig[profile.role];
	const initials = profile.name
		.split(" ")
		.map((part) => part[0])
		.slice(0, 2)
		.join("")
		.toUpperCase();

	const handleLogout = async () => {
		setIsLoggingOut(true);

		try {
			await authClient.signOut();
			posthog.reset();
			toast.success("Signed out");
			window.location.href = "/";
		} catch {
			toast.error("Failed to sign out. Please try again.");
			setIsLoggingOut(false);
		}
	};

	return (
		<div className="container mx-auto max-w-3xl space-y-8 py-10">
			{/* Profile header */}
			<div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
				<ProfileImageLightbox
					name={profile.name}
					image={profile.image}
					initials={initials}
					triggerClassName="size-24 shrink-0 overflow-hidden rounded-2xl border border-border bg-muted"
				>
					{profile.image ? (
						<img
							src={profile.image}
							alt=""
							className="size-full object-cover"
						/>
					) : (
						<div className="flex size-full items-center justify-center bg-linear-to-br from-primary/20 to-primary/5 font-bold text-2xl text-primary">
							{initials}
						</div>
					)}
				</ProfileImageLightbox>

				<div className="flex-1 space-y-2">
					<div className="flex flex-wrap items-center gap-2">
						<h1 className="font-bold text-2xl tracking-tight">
							{profile.name}
						</h1>
						{role && (
							<Badge variant={role.variant}>
								<ShieldCheckIcon className="size-3" />
								{role.label}
							</Badge>
						)}
					</div>
					<p className="text-muted-foreground">@{profile.username}</p>
					<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
						<button
							type="button"
							className="text-left text-muted-foreground transition-colors hover:text-foreground"
							onClick={() => void setFollowTab("followers")}
						>
							<span className="font-semibold text-foreground tabular-nums">
								{profile.totalFollowers.toLocaleString()}
							</span>{" "}
							Followers
						</button>
						<button
							type="button"
							className="text-left text-muted-foreground transition-colors hover:text-foreground"
							onClick={() => void setFollowTab("following")}
						>
							<span className="font-semibold text-foreground tabular-nums">
								{profile.totalFollowing.toLocaleString()}
							</span>{" "}
							Following
						</button>
					</div>
				</div>

				{isOwner ? (
					<div className="flex flex-wrap items-center gap-2 sm:ml-auto">
						{showStaffDashboard ? (
							<Button
								variant="outline"
								size="sm"
								render={<Link to="/dashboard" />}
							>
								<LayoutDashboardIcon />
								Staff dashboard
							</Button>
						) : null}
						<Button
							variant="outline"
							size="sm"
							render={<Link to="/settings" />}
						>
							<SettingsIcon />
							Settings
						</Button>
					</div>
				) : user ? (
					<div className="flex shrink-0 flex-wrap items-center gap-2 sm:ml-auto">
						{followState === undefined ? (
							<Button disabled size="sm" variant="outline">
								<Spinner className="size-4" />
							</Button>
						) : followState.isFollowing ? (
							<LoadingButton
								variant="outline"
								size="sm"
								isLoading={isUnfollowPending}
								onClick={() => unfollowMut({ username })}
							>
								<UserMinusIcon className="size-4" />
								Unfollow
							</LoadingButton>
						) : (
							<LoadingButton
								size="sm"
								isLoading={isFollowPending}
								onClick={() => followMut({ username })}
							>
								<UserPlusIcon className="size-4" />
								Follow
							</LoadingButton>
						)}
					</div>
				) : null}
			</div>

			<section className="space-y-4">
				<h2 className="font-semibold text-muted-foreground text-sm uppercase tracking-wider">
					Progress
				</h2>
				<div className="grid gap-3 sm:grid-cols-2">
					<div className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4 sm:col-span-2">
						<div className="flex flex-wrap items-end justify-between gap-2">
							<div>
								<div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
									<ZapIcon className="size-3.5" strokeWidth={1.75} />
									<span>Level {levelProgress.level}</span>
								</div>
								<p className="font-semibold text-foreground text-lg leading-tight">
									{levelProgress.name}
								</p>
							</div>
							<p className="text-muted-foreground text-sm tabular-nums">
								{profile.xp.toLocaleString()} XP
							</p>
						</div>
						<div className="space-y-1.5">
							<div className="h-2 overflow-hidden rounded-full bg-muted">
								<div
									className="h-full rounded-full bg-primary transition-[width]"
									style={{
										width: `${Math.round(levelProgress.pct * 100)}%`,
									}}
								/>
							</div>
							{xpToNext !== null && (
								<p className="text-muted-foreground text-xs">
									{xpToNext.toLocaleString()} XP to next level
								</p>
							)}
							{levelProgress.isMaxLevel && (
								<p className="text-muted-foreground text-xs">Max level</p>
							)}
						</div>
					</div>
					<StatTile
						icon={BarChart3Icon}
						label="Elo"
						value={profile.elo.toLocaleString()}
						hint={`Peak ${profile.peakElo.toLocaleString()} · Low ${profile.lowestElo.toLocaleString()}`}
					/>
				</div>
			</section>

			<div className="flex flex-wrap gap-1.5 border-border border-b pb-2">
				<Button
					type="button"
					size="sm"
					variant={activeProfileTab === "feed" ? "secondary" : "ghost"}
					onClick={() => void setProfileTab("feed")}
				>
					Feed
				</Button>
				{isOwner ? (
					<Button
						type="button"
						size="sm"
						variant={activeProfileTab === "saved" ? "secondary" : "ghost"}
						onClick={() => void setProfileTab("saved")}
					>
						Saved
					</Button>
				) : null}
				<Button
					type="button"
					size="sm"
					variant={activeProfileTab === "badges" ? "secondary" : "ghost"}
					onClick={() => void setProfileTab("badges")}
				>
					Badges
				</Button>
				<Button
					type="button"
					size="sm"
					variant={activeProfileTab === "stats" ? "secondary" : "ghost"}
					onClick={() => void setProfileTab("stats")}
				>
					Stats
				</Button>
				<Button
					type="button"
					size="sm"
					variant={activeProfileTab === "packs" ? "secondary" : "ghost"}
					onClick={() => void setProfileTab("packs")}
				>
					Packs
				</Button>
				<Button
					type="button"
					size="sm"
					variant={activeProfileTab === "games" ? "secondary" : "ghost"}
					onClick={() => void setProfileTab("games")}
				>
					Games
				</Button>
			</div>

			<div className="space-y-10 pt-4">
				{activeProfileTab === "feed" ? (
					<section className="space-y-4">
						{profileFeedQuery.isLoading ? (
							<div className="flex justify-center py-12">
								<Spinner />
							</div>
						) : profilePosts.length === 0 ? (
							<p className="text-muted-foreground text-sm">No posts yet.</p>
						) : (
							<div className="space-y-6">
								{profilePosts.map((p) => (
									<PostCard key={p.id} post={p} sessionUserId={user?.id} />
								))}
							</div>
						)}
						<div ref={profileFeedSentinelRef} className="h-2 w-full" />
						{profileFeedQuery.isFetchingNextPage ? (
							<p className="text-center text-muted-foreground text-xs">
								Loading…
							</p>
						) : null}
					</section>
				) : null}

				{activeProfileTab === "saved" && isOwner ? (
					<section className="space-y-4">
						{!user ? (
							<p className="text-muted-foreground text-sm">
								Sign in to see saved posts.
							</p>
						) : savedPostsQuery.isLoading ? (
							<div className="flex justify-center py-12">
								<Spinner />
							</div>
						) : savedPostRows.length === 0 ? (
							<p className="text-muted-foreground text-sm">
								Nothing saved yet.
							</p>
						) : (
							<div className="space-y-6">
								{savedPostRows.map((p) => (
									<PostCard key={p.id} post={p} sessionUserId={user?.id} />
								))}
							</div>
						)}
						<div ref={savedFeedSentinelRef} className="h-2 w-full" />
						{savedPostsQuery.isFetchingNextPage ? (
							<p className="text-center text-muted-foreground text-xs">
								Loading…
							</p>
						) : null}
					</section>
				) : null}

				{activeProfileTab === "badges" ? (
					<ProfileBadgesSection username={username} />
				) : null}

				{activeProfileTab === "packs" && isOwner ? (
					<section className="space-y-3">
						<h2 className="font-semibold text-muted-foreground text-sm uppercase tracking-wider">
							My packs
						</h2>
						<Link
							to="/packs"
							search={{ only_my_packs: true }}
							className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-xs/5 transition-colors hover:border-primary/30 hover:bg-primary/5"
						>
							<div className="flex min-w-0 items-center gap-3">
								<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
									<Package className="size-5 text-muted-foreground" />
								</div>
								<div className="min-w-0">
									<p className="font-medium text-sm">Open your packs</p>
									<p className="text-muted-foreground text-xs">
										Drafts and published packs you created — same filters as on
										the packs directory.
									</p>
								</div>
							</div>
							<ChevronRightIcon className="size-5 shrink-0 text-muted-foreground" />
						</Link>
					</section>
				) : null}

				{activeProfileTab === "stats" && !publicStats && publicStatsPending ? (
					<div className="flex justify-center py-12">
						<Spinner />
					</div>
				) : null}

				{activeProfileTab === "stats" && publicStats && (
					<section className="space-y-4">
						<h2 className="font-semibold text-muted-foreground text-sm uppercase tracking-wider">
							Stats
						</h2>
						<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
							<StatTile
								icon={GamepadIcon}
								label="Played"
								value={publicStats.totalGamesPlayed}
							/>
							<StatTile
								icon={TrophyIcon}
								label="Wins"
								value={publicStats.totalWins}
							/>
							<StatTile
								icon={CrownIcon}
								label="Podiums"
								value={publicStats.totalPodiums}
							/>
							<StatTile
								icon={FlameIcon}
								label="Hosted"
								value={publicStats.totalGamesHosted}
							/>
							<StatTile
								icon={TargetIcon}
								label="Correct"
								value={publicStats.totalCorrectAnswers}
							/>
							<StatTile
								icon={ZapIcon}
								label="Points"
								value={publicStats.totalPointsEarned.toLocaleString()}
							/>
						</div>
						<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
							<StatTile
								icon={XCircleIcon}
								label="Wrong"
								value={publicStats.totalIncorrectAnswers}
							/>
							<StatTile
								icon={TimerOffIcon}
								label="Expired"
								value={publicStats.totalExpiredAnswers}
							/>
							<StatTile
								icon={ZapIcon}
								label="1st buzz"
								value={publicStats.totalFirstClicks}
							/>
							<StatTile
								icon={ChartNoAxesColumnIcon}
								label="Last place"
								value={publicStats.totalLastPlaces}
							/>
							<StatTile
								icon={BookOpenIcon}
								label="Topics seen"
								value={publicStats.totalTopicsPlayed}
							/>
						</div>
						<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
							<StatTile
								icon={TargetIcon}
								label="Questions"
								value={publicStats.totalQuestionsPlayed}
							/>
							<StatTile
								icon={ClockIcon}
								label="Time playing"
								value={formatPlayTimeSeconds(publicStats.totalTimeSpentPlaying)}
							/>
							<StatTile
								icon={ClockIcon}
								label="Time hosting"
								value={formatPlayTimeSeconds(publicStats.totalTimeSpentHosting)}
							/>
						</div>
						{publicStats.totalPacksPublished > 0 ? (
							<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
								<StatTile
									icon={Package}
									label="Packs published"
									value={publicStats.totalPacksPublished}
								/>
							</div>
						) : null}

						{(() => {
							const c = publicStats.totalCorrectAnswers;
							const w = publicStats.totalIncorrectAnswers;
							const e = publicStats.totalExpiredAnswers;
							const totalBuzz = c + w + e;
							const pieData = [
								{
									name: "Correct",
									value: c,
									fill: OUTCOME_PIE_COLORS.correct,
								},
								{ name: "Wrong", value: w, fill: OUTCOME_PIE_COLORS.wrong },
								{
									name: "Expired",
									value: e,
									fill: OUTCOME_PIE_COLORS.expired,
								},
							].filter((d) => d.value > 0);
							return (
								<div className="grid gap-4 min-[900px]:grid-cols-2">
									<Card>
										<CardHeader>
											<CardTitle className="text-base">Buzz outcomes</CardTitle>
											<CardDescription>
												Share of resolved buzzes (career)
											</CardDescription>
										</CardHeader>
										<CardPanel>
											{totalBuzz === 0 ? (
												<p className="text-muted-foreground text-sm">
													No buzz outcomes recorded yet.
												</p>
											) : (
												<div className="mx-auto h-[220px] w-full min-w-0 max-w-[280px]">
													<ResponsiveContainer width="100%" height="100%">
														<PieChart>
															<Pie
																data={pieData}
																dataKey="value"
																nameKey="name"
																innerRadius={50}
																outerRadius={80}
																paddingAngle={2}
															>
																{pieData.map((d) => (
																	<Cell key={d.name} fill={d.fill} />
																))}
															</Pie>
															<Tooltip
																formatter={(value) => {
																	const v = Number(value);
																	const safe = Number.isFinite(v) ? v : 0;
																	return [
																		`${safe.toLocaleString()} (${totalBuzz > 0 ? Math.round((safe / totalBuzz) * 100) : 0}%)`,
																		"Count",
																	];
																}}
															/>
															<Legend />
														</PieChart>
													</ResponsiveContainer>
												</div>
											)}
										</CardPanel>
									</Card>
									<Card>
										<CardHeader>
											<CardTitle className="text-base">
												Games by month
											</CardTitle>
											<CardDescription>
												Completed games you played or hosted (last 12 months)
											</CardDescription>
										</CardHeader>
										<CardPanel>
											{!gameActivity ? (
												<div className="flex justify-center py-8">
													<Spinner className="size-6" />
												</div>
											) : (
												<div className="h-[220px] w-full min-w-0">
													<ResponsiveContainer width="100%" height="100%">
														<BarChart
															data={gameActivity.months.map((m) => ({
																...m,
																label: format(
																	parse(m.month, "yyyy-MM", new Date()),
																	"MMM ''yy",
																),
															}))}
															margin={{ left: 0, right: 4, top: 8, bottom: 4 }}
														>
															<XAxis
																dataKey="label"
																tick={{ fontSize: 10 }}
																interval="preserveStartEnd"
															/>
															<YAxis
																allowDecimals={false}
																width={28}
																tick={{ fontSize: 10 }}
															/>
															<Tooltip
																formatter={(value) => {
																	const v = Number(value);
																	return [Number.isFinite(v) ? v : 0, "Games"];
																}}
															/>
															<Bar
																dataKey="games"
																fill="var(--chart-2)"
																radius={[3, 3, 0, 0]}
															/>
														</BarChart>
													</ResponsiveContainer>
												</div>
											)}
										</CardPanel>
									</Card>
								</div>
							);
						})()}
					</section>
				)}

				{activeProfileTab === "packs" ? (
					<section className="space-y-4">
						<h2 className="font-semibold text-muted-foreground text-sm uppercase tracking-wider">
							Published packs
						</h2>
						{packsLoading ? (
							<div className="flex justify-center py-8">
								<Spinner />
							</div>
						) : packRows.length === 0 ? (
							<div className="rounded-xl border border-border border-dashed p-8 text-center text-muted-foreground text-sm">
								<Package className="mx-auto mb-2 size-6 opacity-50" />
								No published packs yet.
							</div>
						) : (
							<div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
								{packRows.map((pack) => (
									<TrendingPackTile key={pack.slug} pack={pack} />
								))}
							</div>
						)}
					</section>
				) : null}

				{activeProfileTab === "games" ? (
					<section className="space-y-4">
						<h2 className="font-semibold text-muted-foreground text-sm uppercase tracking-wider">
							Recent games
						</h2>
						{gamesLoading ? (
							<div className="flex justify-center py-8">
								<Spinner />
							</div>
						) : gameRows.length === 0 ? (
							<div className="rounded-xl border border-border border-dashed p-8 text-center text-muted-foreground text-sm">
								No completed games to show yet.
							</div>
						) : (
							<div className="grid gap-2">
								{gameRows.map((row) => (
									<RecentGameRowItem key={row.code} row={row} />
								))}
								<div ref={sentinelRef} className="h-2" />
								{isFetchingNextPage ? (
									<div className="flex justify-center py-2">
										<Spinner className="size-5" />
									</div>
								) : null}
							</div>
						)}
					</section>
				) : null}
			</div>

			{/* Owner-only logout */}
			{isOwner && (
				<div className="flex justify-center">
					<LoadingButton
						variant="ghost"
						size="sm"
						onClick={handleLogout}
						isLoading={isLoggingOut}
						loadingText="Signing out..."
					>
						<LogOutIcon />
						Sign out
					</LoadingButton>
				</div>
			)}

			<Dialog
				open={followTab === "followers" || followTab === "following"}
				onOpenChange={(open) => {
					if (!open) void setFollowTab(null);
				}}
			>
				<DialogPopup className="max-w-md" showCloseButton>
					<DialogHeader>
						<DialogTitle>
							{followTab === "followers"
								? "Followers"
								: followTab === "following"
									? "Following"
									: ""}
						</DialogTitle>
					</DialogHeader>
					<DialogPanel className="max-h-[min(60vh,440px)] space-y-2 overflow-y-auto px-6 in-[[data-slot=dialog-popup]:has([data-slot=dialog-header])]:pt-1 pb-6">
						{followTab === "followers" || followTab === "following"
							? (() => {
									const rows =
										followTab === "followers" ? followerRows : followingRows;
									const loading =
										followTab === "followers"
											? followersLoading
											: followingLoading;
									const fetchingNext =
										followTab === "followers"
											? isFetchingNextFollowers
											: isFetchingNextFollowing;

									if (loading && rows.length === 0) {
										return (
											<div className="flex justify-center py-10">
												<Spinner />
											</div>
										);
									}

									if (rows.length === 0) {
										return (
											<p className="text-muted-foreground text-sm">
												{followTab === "followers"
													? "No followers yet."
													: "Not following anyone yet."}
											</p>
										);
									}

									return (
										<>
											<ul className="space-y-2">
												{rows.map((row) => {
													const rowInitials = row.name
														.split(" ")
														.map((part) => part[0])
														.slice(0, 2)
														.join("")
														.toUpperCase();
													const showRowFollow =
														Boolean(user) && row.username !== user?.username;

													return (
														<li
															key={row.username}
															className="flex items-center gap-2 rounded-lg px-1 py-1"
														>
															<ProfileImageLightbox
																name={row.name}
																image={row.image}
																initials={rowInitials}
																triggerClassName="size-10 shrink-0 overflow-hidden rounded-lg border border-border bg-muted"
															>
																{row.image ? (
																	<img
																		src={row.image}
																		alt=""
																		className="size-full object-cover"
																	/>
																) : (
																	<div className="flex size-full items-center justify-center font-semibold text-primary text-xs">
																		{rowInitials}
																	</div>
																)}
															</ProfileImageLightbox>
															<Link
																to="/u/$username"
																params={{ username: row.username }}
																search={{}}
																className="min-w-0 flex-1 rounded-lg px-2 py-1 transition-colors hover:bg-muted/60"
															>
																<p className="truncate font-medium text-sm">
																	{row.name}
																</p>
																<p className="truncate text-muted-foreground text-xs">
																	@{row.username}
																</p>
															</Link>
															{showRowFollow ? (
																row.viewerFollows ? (
																	<LoadingButton
																		variant="outline"
																		size="sm"
																		className="shrink-0"
																		isLoading={rowUnfollowBusy(row.username)}
																		loadingText="…"
																		onClick={() =>
																			unfollowMut({ username: row.username })
																		}
																	>
																		<UserMinusIcon className="size-3.5" />
																		Unfollow
																	</LoadingButton>
																) : (
																	<LoadingButton
																		size="sm"
																		className="shrink-0"
																		isLoading={rowFollowBusy(row.username)}
																		loadingText="…"
																		onClick={() =>
																			followMut({ username: row.username })
																		}
																	>
																		<UserPlusIcon className="size-3.5" />
																		Follow
																	</LoadingButton>
																)
															) : null}
														</li>
													);
												})}
											</ul>
											<div ref={followSentinelRef} className="h-2" />
											{fetchingNext ? (
												<div className="flex justify-center py-2">
													<Spinner className="size-5" />
												</div>
											) : null}
										</>
									);
								})()
							: null}
					</DialogPanel>
				</DialogPopup>
			</Dialog>
		</div>
	);
}
