import { createFileRoute } from "@tanstack/react-router";
import { ResetPasswordForm } from "@/components/reset-password-form";

export const Route = createFileRoute("/auth/reset-password/")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div>
			<ResetPasswordForm />
		</div>
	);
}
