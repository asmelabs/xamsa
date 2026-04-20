import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Badge } from "@xamsa/ui/components/badge";
import { Button } from "@xamsa/ui/components/button";
import { LogOutIcon, SettingsIcon, ShieldCheckIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { LoadingButton } from "@/components/loading-button";
import { getUser } from "@/functions/get-user";
import { authClient } from "@/lib/auth-client";
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

	head: ({ loaderData }) => ({
		meta: [
			{
				title: loaderData
					? `${loaderData.profile.name} (@${loaderData.profile.username}) — Xamsa`
					: "User — Xamsa",
			},
			{
				name: "description",
				content: loaderData?.profile.name || "User profile",
			},
			{
				name: "og:title",
				content: loaderData
					? `${loaderData.profile.name} on Xamsa`
					: "User — Xamsa",
			},
		],
	}),
});

const roleConfig = {
	user: null,
	moderator: { label: "Moderator", variant: "info" as const },
	admin: { label: "Admin", variant: "success" as const },
};

function RouteComponent() {
	const { profile, isOwner } = Route.useLoaderData();
	const [isLoggingOut, setIsLoggingOut] = useState(false);

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

			{/* Placeholder for future sections: packs, stats, achievements */}
			<div className="rounded-xl border border-border border-dashed p-10 text-center">
				<p className="text-muted-foreground text-sm">
					Stats, packs, and game history will appear here soon.
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
