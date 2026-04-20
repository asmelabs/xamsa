import { createFileRoute } from "@tanstack/react-router";
import { LoginForm } from "@/components/login-form";

export const Route = createFileRoute("/auth/login")({
	component: LoginComponent,
});

function LoginComponent() {
	return (
		<div>
			<LoginForm />
		</div>
	);
}
