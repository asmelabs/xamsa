import { createFileRoute } from "@tanstack/react-router";
import { RegisterForm } from "@/components/register-form";
import { pageSeo } from "@/lib/seo";

export const Route = createFileRoute("/auth/register")({
	head: () =>
		pageSeo({
			title: "Create account",
			description:
				"Register for Xamsa to build question packs, host buzzer games, and track your stats on the leaderboard.",
			path: "/auth/register",
			noIndex: true,
			keywords: "Xamsa sign up, register, new account, trivia",
		}),
	component: RouteComponent,
});

function RouteComponent() {
	return <RegisterForm />;
}
