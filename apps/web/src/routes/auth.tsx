import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getUser } from "@/functions/get-user";

export const Route = createFileRoute("/auth")({
	component: AuthLayout,

	beforeLoad: async () => {
		const session = await getUser();

		if (session) {
			throw redirect({
				to: "/",
			});
		}

		return { session };
	},
});

function AuthLayout() {
	return <Outlet />;
}
