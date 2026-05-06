import { Link } from "@tanstack/react-router";
import { cn } from "@xamsa/ui/lib/utils";

export type SettingsNavSection = "profile" | "security" | "notifications";

export function SettingsNav({ active }: { active: SettingsNavSection }) {
	return (
		<nav
			aria-label="Settings sections"
			className="flex flex-wrap gap-2 border-border border-b pb-3"
		>
			<Link
				className={cn(
					"rounded-md px-3 py-1.5 font-medium text-sm transition-colors",
					active === "profile"
						? "bg-secondary text-secondary-foreground"
						: "text-muted-foreground hover:text-foreground",
				)}
				to="/settings"
			>
				Profile
			</Link>
			<Link
				className={cn(
					"rounded-md px-3 py-1.5 font-medium text-sm transition-colors",
					active === "notifications"
						? "bg-secondary text-secondary-foreground"
						: "text-muted-foreground hover:text-foreground",
				)}
				to="/settings/notifications"
			>
				Notifications
			</Link>
			<Link
				className={cn(
					"rounded-md px-3 py-1.5 font-medium text-sm transition-colors",
					active === "security"
						? "bg-secondary text-secondary-foreground"
						: "text-muted-foreground hover:text-foreground",
				)}
				to="/settings/security"
			>
				Security
			</Link>
		</nav>
	);
}
