import { useMutation } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	redirect,
	useRouter,
} from "@tanstack/react-router";
import { UpdateProfileInputSchema } from "@xamsa/schemas/modules/user";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@xamsa/ui/components/avatar";
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
import type { ChangeEventHandler } from "react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ProfileAvatarCropDialog } from "@/components/profile-avatar-crop-dialog";
import { SettingsNav } from "@/components/settings-nav";
import { getUser } from "@/functions/get-user";
import { useAppForm } from "@/hooks/use-app-form";
import { getCurrentProductVersionLabel } from "@/lib/app-release";
import { authClient } from "@/lib/auth-client";
import { toastOrpcMutationFailure } from "@/lib/orpc-email-verification-error";
import { pageSeo } from "@/lib/seo";
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

	head: () =>
		pageSeo({
			title: "Settings",
			description:
				"Update your Xamsa profile and account overview. Manage sign-in methods, password, sessions, and email under Security.",
			path: "/settings/",
			noIndex: true,
			keywords: "Xamsa settings, account, profile, app version",
		}),
});

function RouteComponent() {
	const router = useRouter();
	const { user } = Route.useLoaderData();
	const appVersionLabel = getCurrentProductVersionLabel();
	const { data: session, refetch: refetchSession } = authClient.useSession();

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

	const fileInputRef = useRef<HTMLInputElement>(null);
	const [avatarCropOpen, setAvatarCropOpen] = useState(false);
	const [avatarCropSrc, setAvatarCropSrc] = useState<string | null>(null);

	const avatarInitials = useMemo(() => {
		const n = (liveUser.name ?? "").trim();
		const email = liveUser.email ?? "?";
		const parts = n.split(/\s+/u).filter(Boolean);
		if (parts.length >= 2) {
			const a = parts[0]?.[0];
			const b = parts[1]?.[0];
			if (a && b) return `${a}${b}`.toUpperCase();
		}
		if (n.length >= 1) return n.slice(0, 2).toUpperCase();
		return email.slice(0, 1).toUpperCase() || "?";
	}, [liveUser.email, liveUser.name]);

	const { mutateAsync: setAvatarAsync, isPending: setAvatarBusy } = useMutation(
		{
			...orpc.user.setAvatar.mutationOptions(),
			async onSuccess() {
				toast.success("Profile photo updated");
				await refetchSession();
				await router.invalidate();
			},
			onError(err) {
				toastOrpcMutationFailure(err, "Could not upload profile photo.");
			},
		},
	);

	const removeAvatarMutation = useMutation({
		...orpc.user.removeAvatar.mutationOptions(),
		async onSuccess() {
			toast.success("Profile photo removed");
			await refetchSession();
			await router.invalidate();
		},
		onError(err) {
			toastOrpcMutationFailure(err, "Could not remove profile photo.");
		},
	});

	const closeAvatarCrop = () => {
		setAvatarCropOpen(false);
		setAvatarCropSrc((prev) => {
			if (prev) URL.revokeObjectURL(prev);
			return null;
		});
	};

	const onAvatarFile: ChangeEventHandler<HTMLInputElement> = (e) => {
		const file = e.target.files?.[0];
		e.target.value = "";
		if (!file) return;
		const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
		if (!allowed.has(file.type)) {
			toast.error("Use a JPEG, PNG, or WebP image.");
			return;
		}
		if (file.size > 8 * 1024 * 1024) {
			toast.error("Image is too large (max 8MB).");
			return;
		}
		setAvatarCropSrc((prev) => {
			if (prev) URL.revokeObjectURL(prev);
			return URL.createObjectURL(file);
		});
		setAvatarCropOpen(true);
	};

	return (
		<div className="container mx-auto max-w-2xl space-y-6 py-10">
			<div>
				<h1 className="font-bold text-2xl tracking-tight">Settings</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Manage your account information and preferences.
				</p>
				<div className="mt-5">
					<SettingsNav active="profile" />
				</div>
			</div>

			<Frame>
				<FrameHeader>
					<FrameTitle>Profile</FrameTitle>
				</FrameHeader>
				<form onSubmit={onSubmit}>
					<FramePanel className="space-y-4">
						<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
							<Avatar className="size-20 text-lg">
								{liveUser.image ? (
									<AvatarImage alt="" src={liveUser.image} />
								) : null}
								<AvatarFallback className="text-lg">
									{avatarInitials}
								</AvatarFallback>
							</Avatar>
							<div className="flex flex-col gap-2">
								<p className="font-medium text-sm">Profile photo</p>
								<p className="text-muted-foreground text-xs">
									Square crop, optimized for delivery. Your photo appears on
									your profile and anywhere we show your avatar.
								</p>
								<div className="flex flex-wrap gap-2">
									<input
										accept="image/jpeg,image/png,image/webp"
										className="sr-only"
										onChange={onAvatarFile}
										ref={fileInputRef}
										type="file"
									/>
									<Button
										disabled={setAvatarBusy}
										onClick={() => fileInputRef.current?.click()}
										size="sm"
										type="button"
										variant="outline"
									>
										Change photo
									</Button>
									{liveUser.image ? (
										<Button
											disabled={removeAvatarMutation.isPending || setAvatarBusy}
											onClick={() => removeAvatarMutation.mutate({})}
											size="sm"
											type="button"
											variant="ghost"
										>
											Remove
										</Button>
									) : null}
								</div>
							</div>
						</div>
						<form.Input
							description="This is the name displayed to other users."
							label="Name"
							name="name"
						>
							{(field) => (
								<Input
									{...field}
									maxLength={100}
									placeholder="Enter your name"
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

			<ProfileAvatarCropDialog
				imageSrc={avatarCropSrc}
				onConfirm={async (payload) => {
					await setAvatarAsync(payload);
				}}
				onOpenChange={(next) => {
					if (!next) {
						closeAvatarCrop();
					}
				}}
				open={avatarCropOpen}
			/>

			<Frame>
				<FrameHeader>
					<FrameTitle>Account</FrameTitle>
				</FrameHeader>
				<FramePanel className="space-y-4">
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
							</div>
						</div>
					</dl>
					<p className="border-border border-t pt-4 text-muted-foreground text-sm">
						Email, password, connected accounts, and active sessions are in{" "}
						<Link
							className="font-medium text-foreground underline decoration-muted-foreground/50 underline-offset-4 hover:decoration-foreground"
							to="/settings/security"
						>
							Security
						</Link>
						.
					</p>
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
							className="font-medium text-foreground underline decoration-muted-foreground/50 underline-offset-4 hover:decoration-foreground"
							to="/whats-new"
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
