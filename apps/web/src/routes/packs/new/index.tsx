import { createFileRoute, redirect } from "@tanstack/react-router";
import { CreatePackForm } from "@/components/create-pack-form";
import { getUser } from "@/functions/get-user";

const title = "Create a new pack";
const description =
	"Create a new pack on Xamsa. With packs you can create topics and questions, then have fun games with your friends.";

export const Route = createFileRoute("/packs/new/")({
	component: RouteComponent,
	beforeLoad: async () => {
		const session = await getUser();
		return { session };
	},
	loader: async ({ context }) => {
		if (!context.session) {
			throw redirect({
				to: "/auth/login",
				search: {
					redirect_url: "/packs/new",
				},
			});
		}

		return context.session.user;
	},
	head: () => ({
		meta: [
			{ title },
			{
				name: "description",
				content: description,
			},
			{
				name: "keywords",
				content:
					"xamsa, create pack, create topic, create question, pack, topic, question, game, fun, friends",
			},
			{
				name: "og:title",
				content: title,
			},
			{
				name: "og:description",
				content: description,
			},
		],
	}),
});

function RouteComponent() {
	return (
		<div className="container mx-auto max-w-5xl py-10">
			<CreatePackForm />
		</div>
	);
}
