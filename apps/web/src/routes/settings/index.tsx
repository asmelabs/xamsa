import { useMutation } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	redirect,
	useRouter,
} from "@tanstack/react-router";
import { UpdateProfileInputSchema } from "@xamsa/schemas/modules/user";
import { Badge } from "@xamsa/ui/components/badge";
import { Button } from "@xamsa/ui/components/button";
import {
	Frame,
	FrameFooter,
	FrameHeader,
	FramePanel,
	FrameTitle,
} from "@xamsa/ui/components/frame";
import { Input } from "@xamsa/ui/components/input";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LoadingButton } from "@/components/loading-button";
import { getUser } from "@/functions/get-user";
import { useAppForm } from "@/hooks/use-app-form";
import { getCurrentProductVersionLabel } from "@/lib/app-release";
import { authClient } from "@/lib/auth-client";
import { pageSeo } from "@/lib/seo";
import { orpc } from "@/utils/orpc";

/** Better Auth exposes `POST /change-email` on the client instance (dynamic proxy — not in minimal TS defs). */
type ChangeEmailClient = {
	changeEmail: (args: { newEmail: string; callbackURL?: string }) => Promise<{
		error?: { message?: string; statusText?: string; code?: string } | null;
	}>;
};

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

	head: () =>
		pageSeo({
			title: "Settings",
			description:
				"Update your Xamsa profile, email, and account details. See the current app version and release notes from here.",
			path: "/settings/",
			noIndex: true,
			keywords: "Xamsa settings, account, profile, app version",
		}),
});

function RouteComponent() {
	const router = useRouter();
	const { user } = Route.useLoaderData();
	const appVersionLabel = getCurrentProductVersionLabel();
	const { data: session } = authClient.useSession();

	const liveUser = session?.user ?? user;

	const emailVerified =
		(liveUser as { emailVerified?: boolean }).emailVerified === true;

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

	const [resendCooldown, setResendCooldown] = useState(0);

	useEffect(() => {
		if (resendCooldown <= 0) return;
		const id = window.setInterval(() => {
			setResendCooldown((c) => c - 1);
		}, 1000);
		return () => window.clearInterval(id);
	}, [resendCooldown]);

	const [newEmailDraft, setNewEmailDraft] = useState("");
	const [changeEmailBusy, setChangeEmailBusy] = useState(false);

	const sendVerifyEmail = async () => {
		if (resendCooldown > 0) return;

		try {
			const result = await authClient.sendVerificationEmail({
				email: liveUser.email,
				callbackURL: `${window.location.origin}/settings`,
			});
			if (result.error) {
				throw new Error(result.error.message || result.error.statusText);
			}
			toast.success("Verification email sent");
			setResendCooldown(60);
		} catch (error) {
			toast.error((error as Error).message || "Could not send email");
		}
	};

	const submitChangeEmail = async () => {
		const trimmed = newEmailDraft.trim().toLowerCase();
		if (!trimmed || trimmed === liveUser.email.toLowerCase()) {
			toast.error("Enter a new email address");
			return;
		}
		setChangeEmailBusy(true);
		try {
			const api = authClient as unknown as ChangeEmailClient;
			const result = await api.changeEmail({
				newEmail: trimmed,
				callbackURL: `${window.location.origin}/settings`,
			});
			if (result.error) {
				throw new Error(
					result.error.message ||
						result.error.statusText ||
						"Could not update email",
				);
			}
			toast.success(
				"We sent instructions to your inbox. Confirm your new email to finish the change.",
			);
			setNewEmailDraft("");
			void router.invalidate();
		} catch (error) {
			toast.error((error as Error).message || "Could not update email");
		} finally {
			setChangeEmailBusy(false);
		}
	};

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
				<FramePanel className="space-y-6">
					<dl className="space-y-3 text-sm">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<dt className="text-muted-foreground">Username</dt>
							<dd className="font-medium">@{liveUser.username}</dd>
						</div>
						<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
							<div className="min-w-0">
								<dt className="text-muted-foreground">Email</dt>
								<dd className="wrap-break-word font-medium">
									{liveUser.email}
								</dd>
							</div>
							<div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
								{emailVerified ? (
									<Badge variant="success">Verified</Badge>
								) : (
									<Badge variant="warning">Unverified</Badge>
								)}
								{!emailVerified && (
									<Button
										type="button"
										size="sm"
										variant="outline"
										disabled={resendCooldown > 0}
										onClick={() => void sendVerifyEmail()}
									>
										{resendCooldown > 0
											? `Resend (${String(resendCooldown)}s)`
											: "Verify email"}
									</Button>
								)}
							</div>
						</div>
					</dl>

					<div className="space-y-3 border-border border-t pt-4">
						<p className="font-medium text-sm">Change email</p>
						<p className="text-muted-foreground text-xs">
							You will receive a confirmation link at the new address. Until you
							confirm, your sign-in email stays the same.
						</p>
						<div className="flex flex-col gap-2 sm:flex-row sm:items-end">
							<div className="min-w-0 flex-1">
								<Input
									type="email"
									autoComplete="email"
									placeholder="you@example.com"
									value={newEmailDraft}
									onChange={(e) => setNewEmailDraft(e.target.value)}
								/>
							</div>
							<LoadingButton
								type="button"
								variant="secondary"
								size="sm"
								className="w-full shrink-0 sm:w-auto"
								onClick={() => void submitChangeEmail()}
								disabled={
									changeEmailBusy ||
									!newEmailDraft.trim() ||
									newEmailDraft.trim().toLowerCase() ===
										liveUser.email.toLowerCase()
								}
								isLoading={changeEmailBusy}
								loadingText="Sending..."
							>
								Update email
							</LoadingButton>
						</div>
					</div>
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
