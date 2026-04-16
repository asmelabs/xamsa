import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Button } from "@xamsa/ui/components/button";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@xamsa/ui/components/card";
import { Package, Play, Trophy, User } from "lucide-react";
import type { ReactNode } from "react";
import { getUser } from "@/functions/get-user";

export const Route = createFileRoute("/")({
	head: () => ({
		meta: [{ title: "Xamsa" }],
	}),
	beforeLoad: async () => {
		const session = await getUser();
		return { session };
	},
	loader: async ({ context }) => {
		if (!context.session) {
			throw redirect({
				to: "/auth/login",
			});
		}

		return context.session.user;
	},
	component: HomeComponent,
});

interface NavCardProps {
	to: string;
	params?: Record<string, string>;
	icon: ReactNode;
	title: string;
	description: string;
}

function NavCard({ to, params, icon, title, description }: NavCardProps) {
	return (
		<Card
			className="group transition-colors hover:border-primary/30 hover:bg-primary/3"
			render={<Link to={to} params={params} />}
		>
			<CardHeader className="flex-row items-center gap-4">
				<div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
					{icon}
				</div>
				<div className="grid gap-0.5">
					<CardTitle className="text-base">{title}</CardTitle>
					<CardDescription>{description}</CardDescription>
				</div>
			</CardHeader>
		</Card>
	);
}

function HomeComponent() {
	const user = Route.useLoaderData();

	return (
		<div className="flex flex-col gap-8 py-10">
			<div className="space-y-2">
				<h1 className="font-bold text-2xl tracking-tight">
					Welcome back, {user.name}
				</h1>
				<p className="text-muted-foreground">
					Pick up where you left off or explore something new.
				</p>
			</div>

			<Button
				size="xl"
				className="w-full"
				render={<Link to="/play" />}
			>
				<Play className="size-5 fill-current" />
				Start Playing
			</Button>

			<div className="space-y-3">
				<h2 className="font-semibold text-muted-foreground text-sm uppercase tracking-wider">
					Explore
				</h2>
				<div className="grid gap-3">
					<NavCard
						to="/packs"
						icon={<Package className="size-5" strokeWidth={1.75} />}
						title="Packs"
						description="Browse question packs created by the community."
					/>
					<NavCard
						to="/leaderboard"
						icon={<Trophy className="size-5" strokeWidth={1.75} />}
						title="Leaderboard"
						description="See who's on top and compete for the best scores."
					/>
					<NavCard
						to="/u/$username"
						params={{ username: user.username }}
						icon={<User className="size-5" strokeWidth={1.75} />}
						title="Your Profile"
						description="View your stats, packs, and account settings."
					/>
				</div>
			</div>
		</div>
	);
}
