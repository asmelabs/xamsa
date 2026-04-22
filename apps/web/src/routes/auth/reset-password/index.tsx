import { createFileRoute } from "@tanstack/react-router";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { pageSeo } from "@/lib/seo";

export const Route = createFileRoute("/auth/reset-password/")({
	head: () =>
		pageSeo({
			title: "Reset password",
			description:
				"Choose a new password for your Xamsa account after opening the link from your email.",
			path: "/auth/reset-password/",
			noIndex: true,
			keywords: "Xamsa reset password, new password",
		}),
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div>
			<ResetPasswordForm />
		</div>
	);
}
