import { createFileRoute } from "@tanstack/react-router";
import { RegisterForm } from "@/components/register-form";

export const Route = createFileRoute("/auth/register")({
	component: RouteComponent,
});

function RouteComponent() {
	return <RegisterForm />;
}
