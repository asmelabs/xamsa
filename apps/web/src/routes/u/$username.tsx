import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Badge } from "@xamsa/ui/components/badge";
import { Button } from "@xamsa/ui/components/button";
import { getLevelProgress } from "@xamsa/utils/levels";
import {
	BarChart3Icon,
	LogOutIcon,
	SettingsIcon,
	ShieldCheckIcon,
	ZapIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { StatTile } from "@/components/home/stat-tile";
import { LoadingButton } from "@/components/loading-button";
import { getUser } from "@/functions/get-user";
import { authClient } from "@/lib/auth-client";
import { pageSeo } from "@/lib/seo";
import { orpc } from "@/utils/orpc";

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
			keywords: `Xamsa, quiz profile, ${profile.username}, ${profile.name}, trivia stats, Elo, XP`,
		});
	},
});

const roleConfig = {
	user: null,
	moderator: { label: "Moderator", variant: "info" as const },
	admin: { label: "Admin", variant: "success" as const },
};

function RouteComponent() {
	const { profile, isOwner } = Route.useLoaderData();
	const [isLoggingOut, setIsLoggingOut] = useState(false);
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
				<div className="relative size-24 shrink-0 overflow-hidden rounded-2xl border border-border bg-muted">
					{profile.image ? (
						<img
							src={profile.image}
							alt={profile.name}
							className="size-full object-cover"
						/>
					) : (
						<div className="flex size-full items-center justify-center bg-linear-to-br from-primary/20 to-primary/5 font-bold text-2xl text-primary">
							{initials}
						</div>
					)}
				</div>

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
				</div>

				{isOwner && (
					<div className="flex items-center gap-2 sm:ml-auto">
						<Button
							variant="outline"
							size="sm"
							render={<Link to="/settings" />}
						>
							<SettingsIcon />
							Settings
						</Button>
					</div>
				)}
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

			<div className="rounded-xl border border-border border-dashed p-10 text-center">
				<p className="text-muted-foreground text-sm">
					Packs and game history will appear here soon.
				</p>
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
		</div>
	);
}
