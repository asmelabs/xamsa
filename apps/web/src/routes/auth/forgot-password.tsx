import { createFileRoute } from "@tanstack/react-router";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { pageSeo } from "@/lib/seo";

export const Route = createFileRoute("/auth/forgot-password")({
	head: () =>
		pageSeo({
			title: "Forgot password",
			description:
				"Reset your Xamsa password. We’ll email you a link to choose a new password and get back into your account.",
			path: "/auth/forgot-password",
			noIndex: true,
			keywords: "Xamsa password reset, forgot password",
		}),
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div>
			<ForgotPasswordForm />
		</div>
	);
}
