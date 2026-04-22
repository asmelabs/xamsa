import { useMutation } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	redirect,
	useRouter,
} from "@tanstack/react-router";
import { UpdateProfileInputSchema } from "@xamsa/schemas/modules/user";
import {
	Frame,
	FrameFooter,
	FrameHeader,
	FramePanel,
	FrameTitle,
} from "@xamsa/ui/components/frame";
import { Input } from "@xamsa/ui/components/input";
import { toast } from "sonner";
import { getUser } from "@/functions/get-user";
import { useAppForm } from "@/hooks/use-app-form";
import { getCurrentProductVersionLabel } from "@/lib/app-release";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/settings/")({
	component: RouteComponent,

	beforeLoad: async () => {
		const session = await getUser();

		if (!session?.user) {
			throw redirect({
				to: "/auth/login",
				search: { redirect_url: "/settings" },
			});
		}

		return { session };
	},
	loader: async ({ context }) => {
		// biome-ignore lint/style/noNonNullAssertion: we know the user is authenticated
		return { user: context.session!.user };
	},

	head: () => ({
		meta: [
			{ title: "Settings — Xamsa" },
			{
				name: "description",
				content: "Manage your account settings",
			},
		],
	}),
});

function RouteComponent() {
	const router = useRouter();
	const { user } = Route.useLoaderData();
	const appVersionLabel = getCurrentProductVersionLabel();

	const form = useAppForm({
		schema: UpdateProfileInputSchema,
		defaultValues: {
			name: user.name,
		},
	});

	const { mutate: updateProfile, isPending } = useMutation({
		...orpc.user.update.mutationOptions(),
		onSuccess() {
			toast.success("Profile updated successfully");
			router.invalidate();
		},
		onError(error) {
			toast.error(
				error.message || "An unknown error occurred. Please try again.",
			);
		},
	});

	const onSubmit = form.handleSubmit(async (values) => {
		updateProfile(values);
	});

	return (
		<div className="container mx-auto max-w-2xl space-y-6 py-10">
			<div>
				<h1 className="font-bold text-2xl tracking-tight">Settings</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Manage your account information and preferences.
				</p>
			</div>

			<Frame>
				<FrameHeader>
					<FrameTitle>Profile</FrameTitle>
				</FrameHeader>
				<form onSubmit={onSubmit}>
					<FramePanel className="space-y-4">
						<form.Input
							name="name"
							label="Name"
							description="This is the name displayed to other users."
						>
							{(field) => (
								<Input
									{...field}
									placeholder="Enter your name"
									maxLength={100}
								/>
							)}
						</form.Input>
					</FramePanel>

					<FrameFooter>
						<div className="flex justify-end">
							<form.Submit isLoading={isPending} loadingText="Saving...">
								Save changes
							</form.Submit>
						</div>
					</FrameFooter>
				</form>
			</Frame>

			<Frame>
				<FrameHeader>
					<FrameTitle>Account</FrameTitle>
				</FrameHeader>
				<FramePanel>
					<dl className="space-y-3 text-sm">
						<div className="flex items-center justify-between">
							<dt className="text-muted-foreground">Username</dt>
							<dd className="font-medium">@{user.username}</dd>
						</div>
						<div className="flex items-center justify-between">
							<dt className="text-muted-foreground">Email</dt>
							<dd className="font-medium">{user.email}</dd>
						</div>
					</dl>
				</FramePanel>
			</Frame>

			<Frame>
				<FrameHeader>
					<FrameTitle>App</FrameTitle>
				</FrameHeader>
				<FramePanel className="space-y-3">
					<div className="flex items-center justify-between gap-3 text-sm">
						<span className="text-muted-foreground">Version</span>
						<span className="font-medium">{appVersionLabel}</span>
					</div>
					<p className="text-muted-foreground text-xs">
						<Link
							to="/whats-new"
							className="font-medium text-foreground underline decoration-muted-foreground/50 underline-offset-4 hover:decoration-foreground"
						>
							See what’s new
						</Link>{" "}
						for user-facing updates in each release.
					</p>
				</FramePanel>
			</Frame>
		</div>
	);
}
