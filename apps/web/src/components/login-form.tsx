import { Link } from "@tanstack/react-router";
import { LoginInputSchema } from "@xamsa/schemas/modules/auth/login";
import {
	Frame,
	FrameFooter,
	FrameHeader,
	FramePanel,
	FrameTitle,
} from "@xamsa/ui/components/frame";
import { Input } from "@xamsa/ui/components/input";
import { Separator } from "@xamsa/ui/components/separator";
import { parseAsString, useQueryState } from "nuqs";
import posthog from "posthog-js";
import { useState } from "react";
import { toast } from "sonner";
import { useAppForm } from "@/hooks/use-app-form";
import { authClient } from "@/lib/auth-client";
import { assignPostAuthRedirect } from "@/lib/auth-redirect";
import { ContinueWithGoogleButton } from "./continue-with-google-button";
import { PasswordInput } from "./password-input";

export function LoginForm() {
	const [isLoading, setIsLoading] = useState(false);

	const [defaultEmail] = useQueryState("email", parseAsString.withDefault(""));
	const [callbackURL] = useQueryState("redirect_url");

	const form = useAppForm({
		schema: LoginInputSchema,
		defaultValues: {
			rememberMe: true,
			email: defaultEmail,
			password: "",
		},
	});

	const onSubmit = form.handleSubmit(async (values) => {
		setIsLoading(true);

		try {
			const result = await authClient.signIn.email({
				...values,
				callbackURL: callbackURL || undefined,
			});

			if (result.error) {
				form.resetField("password");
				const err = result.error;
				const unverifiedHint =
					err.status === 403 ||
					String(err.code ?? "") === "EMAIL_NOT_VERIFIED" ||
					/email.+not.+verified/i.test(err.message ?? "");
				if (unverifiedHint) {
					toast.error(err.message || "Verify your email before signing in.", {
						duration: 15_000,
						action: {
							label: "Resend email",
							onClick: () => {
								void (async () => {
									try {
										const r = await authClient.sendVerificationEmail({
											email: values.email,
											callbackURL:
												callbackURL ||
												`${window.location.origin}/settings/security`,
										});
										if (r.error) {
											throw new Error(r.error.message || r.error.statusText);
										}
										toast.success("Verification email sent");
									} catch (e) {
										toast.error((e as Error).message || "Could not send");
									}
								})();
							},
						},
					});
				} else {
					toast.error(err.message || "An unknown error occurred");
				}
				return;
			}

			const {
				user: { id, email, username, name },
			} = result.data;
			posthog.identify(id, { email, username, name });

			assignPostAuthRedirect(callbackURL);
		} catch (error) {
			form.resetField("password");
			toast.error((error as Error).message || "An unknown error occurred");
		} finally {
			setIsLoading(false);
		}
	});

	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-3">
			<Frame className="w-full max-w-lg">
				<FrameHeader>
					<FrameTitle>Login to your account</FrameTitle>
				</FrameHeader>
				<form onSubmit={onSubmit}>
					<FramePanel className="space-y-4">
						<div className="flex flex-col gap-3">
							<ContinueWithGoogleButton
								redirectUrl={callbackURL}
								disabled={isLoading}
							/>
							<div className="relative py-1">
								<div className="absolute inset-x-0 top-1/2">
									<Separator />
								</div>
								<span className="relative mx-auto flex w-fit bg-popover px-3 text-muted-foreground text-xs">
									Or continue with email
								</span>
							</div>
						</div>
						<form.Input name="email" label="Email">
							{(field) => <Input {...field} placeholder="Enter your email" />}
						</form.Input>
						<form.Input
							name="password"
							label={
								<div className="flex w-full items-center justify-between">
									<p>Password</p>
									<Link
										to="/auth/forgot-password"
										search={{
											email: form.watch("email") || undefined,
											redirect_url: callbackURL || undefined,
										}}
										className="text-muted-foreground text-xs underline"
									>
										Forgot password?
									</Link>
								</div>
							}
						>
							{(field) => (
								<PasswordInput {...field} placeholder="Enter your password" />
							)}
						</form.Input>
					</FramePanel>

					<FrameFooter>
						<div className="flex justify-end">
							<form.Submit isLoading={isLoading}>Login</form.Submit>
						</div>
					</FrameFooter>
				</form>
			</Frame>
			<p className="max-w-lg px-2 text-center text-muted-foreground text-xs leading-snug">
				By signing in you agree to the{" "}
				<Link
					className="text-foreground underline underline-offset-2"
					to="/legal/terms-of-service"
				>
					Terms of Service
				</Link>{" "}
				and{" "}
				<Link
					className="text-foreground underline underline-offset-2"
					to="/legal/privacy-policy"
				>
					Privacy Policy
				</Link>
				.
			</p>
			<Link
				to="/auth/register"
				search={{ redirect_url: callbackURL || undefined }}
				className="text-muted-foreground text-sm hover:underline"
			>
				Don't have an account? Register
			</Link>
		</div>
	);
}
