import { createFileRoute } from "@tanstack/react-router";
import { LoginForm } from "@/components/login-form";
import { pageSeo } from "@/lib/seo";

export const Route = createFileRoute("/auth/login")({
	head: () =>
		pageSeo({
			title: "Log in",
			description:
				"Sign in to your Xamsa account to host live quiz games, manage packs, and join friends with a game code.",
			path: "/auth/login",
			noIndex: true,
			keywords: "Xamsa login, sign in, quiz account",
		}),
	component: LoginComponent,
});

function LoginComponent() {
	return (
		<div>
			<LoginForm />
		</div>
	);
}
