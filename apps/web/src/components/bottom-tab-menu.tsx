import type { LinkProps } from "@tanstack/react-router";
import { Link, useLocation } from "@tanstack/react-router";
import { Home, Package, Play, Trophy, User } from "lucide-react";
import type { ReactNode } from "react";
import { authClient } from "@/lib/auth-client";

interface TabLinkProps extends LinkProps {
	label: string;
	children: ReactNode;
}

function TabLink({ to, label, children, ...props }: TabLinkProps) {
	return (
		<Link
			to={to}
			className="group relative flex flex-col items-center justify-center gap-1 px-3 py-1.5 transition-all duration-200"
			activeProps={{
				className:
					"[&>span]:text-foreground [&>div]:text-foreground [&>div]:bg-primary/10 [&_.indicator]:scale-x-100",
			}}
			inactiveProps={{
				className:
					"[&>span]:text-muted-foreground/70 [&>div]:text-muted-foreground/70",
			}}
			{...props}
		>
			<div className="relative flex size-10 items-center justify-center rounded-xl transition-all duration-200 group-active:scale-90">
				{children}
			</div>
			{/* active indicator dot */}
			<div className="indicator absolute -bottom-0.5 h-0.5 w-4 origin-center scale-x-0 rounded-full bg-primary transition-transform duration-300" />
		</Link>
	);
}

export function BottomTabMenu() {
	const { data: session } = authClient.useSession();
	const location = useLocation();

	const redirectUrl = location.pathname.startsWith("/auth")
		? undefined
		: location.pathname;

	return (
		<nav className="fixed right-0 bottom-0 left-0 z-50 flex justify-center pb-[env(safe-area-inset-bottom)]">
			<div className="flex w-full max-w-lg items-center justify-around border-border/50 border-t bg-background/80 px-2 py-1 backdrop-blur-xl backdrop-saturate-150 md:mx-4 md:mb-3 md:rounded-2xl md:border md:border-border/30 md:shadow-black/5 md:shadow-lg">
				<TabLink to="/" label="Home" activeOptions={{ exact: true }}>
					<Home className="size-6" strokeWidth={1.75} />
				</TabLink>

				<TabLink to="/packs" label="Packs">
					<Package className="size-6" strokeWidth={1.75} />
				</TabLink>

				{/* center play button */}
				<Link
					to="/play"
					className="group relative -mt-4 flex flex-col items-center"
					activeProps={{
						className: "size-16",
					}}
				>
					<div className="relative flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-background transition-all duration-200 group-hover:shadow-primary/40 group-hover:shadow-xl group-active:scale-90">
						<Play className="size-6 fill-current" />
					</div>
				</Link>

				<TabLink to="/leaderboard" label="Board">
					<Trophy className="size-6" strokeWidth={1.75} />
				</TabLink>

				{session?.user ? (
					<TabLink
						to="/u/$username"
						params={{ username: session.user.username }}
						label="Profile"
					>
						{session.user.image ? (
							<img
								src={session.user.image}
								alt=""
								className="size-5 rounded-full object-cover ring-1 ring-border"
							/>
						) : (
							<User className="size-6" strokeWidth={1.75} />
						)}
					</TabLink>
				) : (
					<TabLink
						to="/auth/login"
						search={{ redirect_url: redirectUrl }}
						label="Authenticate"
					>
						<User className="size-6" strokeWidth={1.75} />
					</TabLink>
				)}
			</div>
		</nav>
	);
}
