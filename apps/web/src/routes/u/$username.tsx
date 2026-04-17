import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@xamsa/ui/components/button";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/u/$username")({
	component: RouteComponent,
});

function RouteComponent() {
	const { username } = Route.useParams();

	const handleLogout = async () => {
		await authClient.signOut();
	};

	return (
		<div>
			Profile: {username}
			<Button onClick={handleLogout}>Logout</Button>
		</div>
	);
}
