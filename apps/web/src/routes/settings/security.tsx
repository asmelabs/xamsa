import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { AccountSchema } from "@xamsa/schemas/db/schemas/models/index";
import { Badge } from "@xamsa/ui/components/badge";
import { Button } from "@xamsa/ui/components/button";
import { Checkbox } from "@xamsa/ui/components/checkbox";
import {
	Frame,
	FrameHeader,
	FramePanel,
	FrameTitle,
} from "@xamsa/ui/components/frame";
import { Input } from "@xamsa/ui/components/input";
import { Label } from "@xamsa/ui/components/label";
import { formatDistanceToNow } from "date-fns";
import { Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import z from "zod";
import { LoadingButton } from "@/components/loading-button";
import { PasswordInput } from "@/components/password-input";
import { SettingsNav } from "@/components/settings-nav";
import { getUser } from "@/functions/get-user";
import { authClient } from "@/lib/auth-client";
import { betterAuthJson } from "@/lib/better-auth-rpc";
import { pageSeo } from "@/lib/seo";

type ChangeEmailClient = {
	changeEmail: (args: { newEmail: string; callbackURL?: string }) => Promise<{
		error?: { message?: string; statusText?: string; code?: string } | null;
	}>;
};

type AccountRow = {
	id: string;
	providerId: string;
	accountId: string;
	createdAt?: string;
};

type SessionRow = {
	id: string;
	createdAt: string;
	expiresAt: string;
	userAgent?: string | null;
	ipAddress?: string | null;
};

const passwordFieldSchema = AccountSchema.shape.password.unwrap().unwrap();

const changePasswordSchema = z
	.object({
		currentPassword: z.string().min(1, "Current password is required"),
		newPassword: passwordFieldSchema,
		confirm: z.string().min(1),
		revokeOthers: z.boolean(),
	})
	.refine((d) => d.newPassword === d.confirm, {
		message: "Passwords must match",
		path: ["confirm"],
	});

const setPasswordSchema = z
	.object({
		newPassword: passwordFieldSchema,
		confirm: z.string().min(1),
	})
	.refine((d) => d.newPassword === d.confirm, {
		message: "Passwords must match",
		path: ["confirm"],
	});

export const Route = createFileRoute("/settings/security")({
	component: RouteComponent,

	beforeLoad: async () => {
		const session = await getUser();

		if (!session?.user) {
			throw redirect({
				to: "/auth/login",
				search: { redirect_url: "/settings/security" },
			});
		}

		return { session };
	},
	loader: async ({ context }) => {
		// biome-ignore lint/style/noNonNullAssertion: guarded by identical beforeLoad redirect
		return { user: context.session!.user };
	},

	head: () =>
		pageSeo({
			title: "Security",
			description:
				"Manage sign-in methods, active sessions, password, and email for your Xamsa account.",
			path: "/settings/security",
			noIndex: true,
			keywords: "Xamsa settings, security, password, OAuth, sessions",
		}),
});

function providerLabel(providerId: string): string {
	if (providerId === "credential") return "Email & password";
	if (providerId === "google") return "Google";
	return providerId;
}

function maskAccountId(accountId: string): string {
	const t = accountId.trim();
	if (t.length <= 6) return "••••";
	return `••••${t.slice(-4)}`;
}

function RouteComponent() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { user: loaderUser } = Route.useLoaderData();
	const { data: sessionData, refetch: refetchSession } =
		authClient.useSession();
	const liveUser = sessionData?.user ?? loaderUser;
	const currentSessionId = sessionData?.session?.id;

	const emailVerified =
		(liveUser as { emailVerified?: boolean }).emailVerified === true;

	const securityCallback = `${window.location.origin}/settings/security`;

	const accountsQuery = useQuery({
		queryKey: ["better-auth", "list-accounts"],
		queryFn: () =>
			betterAuthJson<AccountRow[]>("/list-accounts", { method: "GET" }),
	});

	const sessionsQuery = useQuery({
		queryKey: ["better-auth", "list-sessions"],
		queryFn: () =>
			betterAuthJson<SessionRow[]>("/list-sessions", { method: "GET" }),
	});

	const invalidateAuthLists = () =>
		void queryClient.invalidateQueries({ queryKey: ["better-auth"] });

	const hasCredentialPassword = Boolean(
		accountsQuery.data?.some((a) => a.providerId === "credential"),
	);
	const hasGoogle = Boolean(
		accountsQuery.data?.some((a) => a.providerId === "google"),
	);

	const [linkGoogleBusy, setLinkGoogleBusy] = useState(false);
	const [unlinkBusyKey, setUnlinkBusyKey] = useState<string | null>(null);

	const linkGoogle = async () => {
		setLinkGoogleBusy(true);
		try {
			const data = await betterAuthJson<{ url: string; redirect: boolean }>(
				"/link-social",
				{
					method: "POST",
					body: JSON.stringify({
						provider: "google",
						callbackURL: securityCallback,
						errorCallbackURL: securityCallback,
					}),
				},
			);
			if (data.redirect && data.url) window.location.assign(data.url);
		} catch (error) {
			toast.error((error as Error).message || "Could not start Google linking");
		} finally {
			setLinkGoogleBusy(false);
		}
	};

	const unlinkProvider = async (row: AccountRow) => {
		const key = `${row.providerId}:${row.accountId}`;
		setUnlinkBusyKey(key);
		try {
			await betterAuthJson("/unlink-account", {
				method: "POST",
				body: JSON.stringify({
					providerId: row.providerId,
					accountId: row.accountId,
				}),
			});
			toast.success("Account unlinked");
			invalidateAuthLists();
			void refetchSession();
		} catch (error) {
			const msg = (error as Error).message;
			if (/fresh|re-?authenticate|recent login/i.test(msg)) {
				toast.error(
					"Sign out and sign in again, then try unlinking—for your safety we only allow this on a freshly signed-in session.",
					{ duration: 9000 },
				);
				return;
			}
			toast.error(msg || "Could not unlink account");
		} finally {
			setUnlinkBusyKey(null);
		}
	};

	const revokeOtherMutation = useMutation({
		mutationFn: () =>
			betterAuthJson("/revoke-other-sessions", {
				method: "POST",
				body: "{}",
			}),
		async onSuccess() {
			toast.success("Signed out other sessions");
			invalidateAuthLists();
		},
		onError(error) {
			toast.error(error.message || "Could not revoke sessions");
		},
	});

	const revokeAllMutation = useMutation({
		mutationFn: async () => {
			await betterAuthJson("/revoke-sessions", {
				method: "POST",
				body: "{}",
			});
			await authClient.signOut();
			window.location.assign("/auth/login");
		},
		onError(error) {
			toast.error(error.message || "Could not sign out everywhere");
		},
	});

	const [cpValues, setCpValues] = useState({
		currentPassword: "",
		newPassword: "",
		confirm: "",
		revokeOthers: true,
	});
	const [spValues, setSpValues] = useState({ newPassword: "", confirm: "" });
	const [passwordBusy, setPasswordBusy] = useState(false);

	const submitChangePassword = async () => {
		const parsed = changePasswordSchema.safeParse(cpValues);
		if (!parsed.success) {
			toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
			return;
		}
		setPasswordBusy(true);
		try {
			await betterAuthJson("/change-password", {
				method: "POST",
				body: JSON.stringify({
					currentPassword: parsed.data.currentPassword,
					newPassword: parsed.data.newPassword,
					revokeOtherSessions: parsed.data.revokeOthers,
				}),
			});
			toast.success("Password updated");
			setCpValues({
				currentPassword: "",
				newPassword: "",
				confirm: "",
				revokeOthers: true,
			});
			invalidateAuthLists();
		} catch (error) {
			toast.error((error as Error).message || "Could not update password");
		} finally {
			setPasswordBusy(false);
		}
	};

	const submitSetPassword = async () => {
		const parsed = setPasswordSchema.safeParse(spValues);
		if (!parsed.success) {
			toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
			return;
		}
		setPasswordBusy(true);
		try {
			await betterAuthJson("/set-password", {
				method: "POST",
				body: JSON.stringify({ newPassword: parsed.data.newPassword }),
			});
			toast.success(
				"Password saved — you can sign in with email and password.",
			);
			setSpValues({ newPassword: "", confirm: "" });
			invalidateAuthLists();
			void router.invalidate();
		} catch (error) {
			toast.error((error as Error).message || "Could not set password");
		} finally {
			setPasswordBusy(false);
		}
	};

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
				callbackURL: securityCallback,
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
				callbackURL: securityCallback,
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
			await router.invalidate();
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
					Signing in, devices, password, and email.
				</p>
				<div className="mt-5">
					<SettingsNav active="security" />
				</div>
			</div>

			<Frame>
				<FrameHeader>
					<FrameTitle>Connected accounts</FrameTitle>
				</FrameHeader>
				<FramePanel className="space-y-4">
					{accountsQuery.isLoading ? (
						<p className="flex items-center gap-2 text-muted-foreground text-sm">
							<Loader2Icon className="size-4 animate-spin" aria-hidden />{" "}
							Loading…
						</p>
					) : accountsQuery.isError ? (
						<p className="text-destructive text-sm">
							{(accountsQuery.error as Error).message ||
								"Could not load accounts."}
						</p>
					) : (
						<ul className="divide-y divide-border rounded-md border text-sm">
							{accountsQuery.data?.map((a) => (
								<li
									className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
									key={`${a.providerId}:${a.accountId}`}
								>
									<div>
										<p className="font-medium">{providerLabel(a.providerId)}</p>
										{a.providerId !== "credential" ? (
											<p className="text-muted-foreground text-xs">
												ID {maskAccountId(a.accountId)}
											</p>
										) : null}
									</div>
									{a.providerId !== "credential" ? (
										<Button
											disabled={
												unlinkBusyKey === `${a.providerId}:${a.accountId}`
											}
											onClick={() => unlinkProvider(a)}
											size="sm"
											type="button"
											variant="outline"
										>
											{unlinkBusyKey === `${a.providerId}:${a.accountId}`
												? "Unlinking…"
												: "Unlink"}
										</Button>
									) : null}
								</li>
							))}
						</ul>
					)}
					{!hasGoogle ? (
						<Button
							disabled={linkGoogleBusy}
							onClick={() => void linkGoogle()}
							size="sm"
							type="button"
							variant="secondary"
						>
							Link Google account
						</Button>
					) : null}
					<p className="text-muted-foreground text-xs">
						Unlink requires a fresh sign-in. You cannot remove your last sign-in
						method if unlinking everything is disabled — keep email/password or
						link another provider first.
					</p>
				</FramePanel>
			</Frame>

			<Frame>
				<FrameHeader>
					<FrameTitle>Active sessions</FrameTitle>
				</FrameHeader>
				<FramePanel className="space-y-4">
					{sessionsQuery.isLoading ? (
						<p className="flex items-center gap-2 text-muted-foreground text-sm">
							<Loader2Icon className="size-4 animate-spin" aria-hidden />{" "}
							Loading…
						</p>
					) : sessionsQuery.isError ? (
						<p className="text-destructive text-sm">
							{(sessionsQuery.error as Error).message ||
								"Could not load sessions."}
						</p>
					) : sessionsQuery.data && sessionsQuery.data.length > 0 ? (
						<ul className="divide-y divide-border rounded-md border text-sm">
							{sessionsQuery.data.map((s) => (
								<li className="space-y-0.5 px-3 py-2.5" key={s.id}>
									<div className="flex flex-wrap items-center gap-2">
										<span className="font-medium">
											{s.userAgent
												? s.userAgent.length > 96
													? `${s.userAgent.slice(0, 93)}…`
													: s.userAgent
												: "Unknown device"}
										</span>
										{s.id === currentSessionId ? (
											<Badge variant="outline">This device</Badge>
										) : null}
									</div>
									<p className="text-muted-foreground text-xs">
										Last active {(() => {
											try {
												return formatDistanceToNow(new Date(s.createdAt), {
													addSuffix: true,
												});
											} catch {
												return "—";
											}
										})()}
										{", expires "}
										{(() => {
											try {
												return new Date(s.expiresAt).toLocaleString();
											} catch {
												return "—";
											}
										})()}
									</p>
								</li>
							))}
						</ul>
					) : (
						<p className="text-muted-foreground text-sm">No active sessions.</p>
					)}
					<div className="flex flex-wrap gap-2">
						<Button
							disabled={
								revokeOtherMutation.isPending ||
								sessionsQuery.isLoading ||
								(sessionsQuery.data?.length ?? 0) < 2
							}
							onClick={() => revokeOtherMutation.mutate()}
							size="sm"
							type="button"
							variant="outline"
						>
							Sign out everywhere else
						</Button>
						<Button
							disabled={revokeAllMutation.isPending}
							onClick={() => {
								if (
									window.confirm(
										"Sign out on every device including this one? You will need to log in again.",
									)
								) {
									revokeAllMutation.mutate();
								}
							}}
							size="sm"
							type="button"
							variant="destructive"
						>
							Sign out everywhere
						</Button>
					</div>
				</FramePanel>
			</Frame>

			{hasCredentialPassword ? (
				<Frame>
					<FrameHeader>
						<FrameTitle>Change password</FrameTitle>
					</FrameHeader>
					<FramePanel className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="current-password">Current password</Label>
							<PasswordInput
								autoComplete="current-password"
								id="current-password"
								onChange={(e) =>
									setCpValues((v) => ({
										...v,
										currentPassword: e.target.value,
									}))
								}
								value={cpValues.currentPassword}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="new-password">New password</Label>
							<PasswordInput
								autoComplete="new-password"
								id="new-password"
								onChange={(e) =>
									setCpValues((v) => ({ ...v, newPassword: e.target.value }))
								}
								value={cpValues.newPassword}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="confirm-new-password">Confirm new password</Label>
							<PasswordInput
								autoComplete="new-password"
								id="confirm-new-password"
								onChange={(e) =>
									setCpValues((v) => ({ ...v, confirm: e.target.value }))
								}
								value={cpValues.confirm}
							/>
						</div>
						<div className="flex items-center gap-2">
							<Checkbox
								checked={cpValues.revokeOthers}
								id="revoke-other"
								onCheckedChange={(c) =>
									setCpValues((v) => ({ ...v, revokeOthers: c === true }))
								}
							/>
							<Label htmlFor="revoke-other" className="font-normal">
								Revoke sessions on other devices after change
							</Label>
						</div>
						<div className="flex justify-end">
							<LoadingButton
								disabled={passwordBusy}
								isLoading={passwordBusy}
								loadingText="Saving…"
								onClick={() => void submitChangePassword()}
								type="button"
								variant="default"
							>
								Update password
							</LoadingButton>
						</div>
					</FramePanel>
				</Frame>
			) : (
				<Frame>
					<FrameHeader>
						<FrameTitle>Set a password</FrameTitle>
					</FrameHeader>
					<FramePanel className="space-y-4">
						<p className="text-muted-foreground text-sm">
							You currently sign in with Google or another provider. Adding a
							password lets you use email login as well. Passwords must include
							upper and lower case letters and at least one number (Has I Been
							Pwned is checked on save).
						</p>
						<div className="space-y-2">
							<Label htmlFor="set-new-password">New password</Label>
							<PasswordInput
								autoComplete="new-password"
								id="set-new-password"
								onChange={(e) =>
									setSpValues((v) => ({ ...v, newPassword: e.target.value }))
								}
								value={spValues.newPassword}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="set-confirm-password">Confirm password</Label>
							<PasswordInput
								autoComplete="new-password"
								id="set-confirm-password"
								onChange={(e) =>
									setSpValues((v) => ({ ...v, confirm: e.target.value }))
								}
								value={spValues.confirm}
							/>
						</div>
						<div className="flex justify-end">
							<LoadingButton
								disabled={passwordBusy}
								isLoading={passwordBusy}
								loadingText="Saving…"
								onClick={() => void submitSetPassword()}
								type="button"
							>
								Set password
							</LoadingButton>
						</div>
					</FramePanel>
				</Frame>
			)}

			<Frame>
				<FrameHeader>
					<FrameTitle>Email</FrameTitle>
				</FrameHeader>
				<FramePanel className="space-y-6">
					<dl className="space-y-3 text-sm">
						<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
							<div className="min-w-0">
								<dt className="text-muted-foreground">Current email</dt>
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
										disabled={resendCooldown > 0}
										onClick={() => void sendVerifyEmail()}
										size="sm"
										type="button"
										variant="outline"
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
									autoComplete="email"
									onChange={(e) => setNewEmailDraft(e.target.value)}
									placeholder="you@example.com"
									type="email"
									value={newEmailDraft}
								/>
							</div>
							<LoadingButton
								className="w-full shrink-0 sm:w-auto"
								disabled={
									changeEmailBusy ||
									!newEmailDraft.trim() ||
									newEmailDraft.trim().toLowerCase() ===
										liveUser.email.toLowerCase()
								}
								isLoading={changeEmailBusy}
								loadingText="Sending…"
								onClick={() => void submitChangeEmail()}
								size="sm"
								type="button"
								variant="secondary"
							>
								Update email
							</LoadingButton>
						</div>
					</div>
				</FramePanel>
			</Frame>
		</div>
	);
}
