import { Link } from "@tanstack/react-router";
import { emailPasswordAuthConfig } from "@xamsa/auth/email-password-config";
import { RegisterInputSchema } from "@xamsa/schemas/modules/auth/register";
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
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAppForm } from "@/hooks/use-app-form";
import { useCapture } from "@/hooks/use-capture";
import { authClient } from "@/lib/auth-client";
import { assignPostAuthRedirect } from "@/lib/auth-redirect";
import { ContinueWithGoogleButton } from "./continue-with-google-button";
import { LoadingButton } from "./loading-button";
import { PasswordInput } from "./password-input";

export function RegisterForm() {
	const { capture } = useCapture();

	const [showVerificationEmailSent, setShowVerificationEmailSent] =
		useState(false);
	const [resendCountdown, setResendCountdown] = useState(0);

	useEffect(() => {
		if (resendCountdown <= 0) return;

		const interval = setInterval(() => {
			setResendCountdown((prev) => prev - 1);
		}, 1000);

		return () => clearInterval(interval);
	}, [resendCountdown]);

	const [isLoading, setIsLoading] = useState(false);
	const [isResending, setIsResending] = useState(false);

	const [defaultEmail] = useQueryState("email", parseAsString.withDefault(""));
	const [defaultUsername] = useQueryState(
		"username",
		parseAsString.withDefault(""),
	);
	const [defaultName] = useQueryState("name", parseAsString.withDefault(""));
	const [callbackURL] = useQueryState("redirect_url");

	const form = useAppForm({
		schema: RegisterInputSchema,
		mode: "onBlur",
		defaultValues: {
			name: defaultName,
			email: defaultEmail,
			username: defaultUsername,
			password: "",
		},
	});

	const onSubmit = form.handleSubmit(async (values) => {
		const { confirmPassword, ...data } = values;

		if (data.password !== confirmPassword) {
			form.setError("confirmPassword", {
				message: "Passwords do not match",
			});
			return;
		}

		capture("register_attempt", {
			email: values.email,
			provider: "credentials",
			callbackURL: callbackURL || undefined,
			name: values.name,
			username: values.username,
		});

		setIsLoading(true);

		try {
			const result = await authClient.signUp.email({
				...data,
				callbackURL: callbackURL || undefined,
			});

			if (result.error) {
				throw new Error(result.error.message || result.error.statusText);
			}

			if (!emailPasswordAuthConfig.requireEmailVerification) {
				assignPostAuthRedirect(callbackURL);
				return;
			}

			setShowVerificationEmailSent(true);
			setResendCountdown(60);
		} catch (error) {
			form.resetField("password");
			form.resetField("confirmPassword");

			toast.error((error as Error).message || "An unknown error occurred");
		} finally {
			setIsLoading(false);
		}
	});

	const onResendVerificationEmail = async () => {
		setIsResending(true);
		try {
			const result = await authClient.sendVerificationEmail({
				email: form.getValues("email"),
				callbackURL: callbackURL || undefined,
			});

			if (result.error) {
				throw new Error(result.error.message || result.error.statusText);
			}

			toast.success("Verification email sent");

			setShowVerificationEmailSent(true);
			setResendCountdown(120);
		} catch (error) {
			toast.error((error as Error).message || "An unknown error occurred");
		} finally {
			setIsResending(false);
		}
	};

	if (showVerificationEmailSent) {
		const email = form.getValues("email");

		return (
			<div className="flex min-h-screen flex-col items-center justify-center gap-3">
				<Frame className="w-full max-w-lg">
					<FrameHeader>
						<FrameTitle>Check your inbox</FrameTitle>
					</FrameHeader>
					<FramePanel className="space-y-3">
						<p>
							We've sent a verification link to{" "}
							<span className="font-medium text-foreground">{email}</span>
						</p>
						<p className="text-muted-foreground text-sm">
							Open the link in that message to finish signing up. Check spam and
							wait a minute or two.
						</p>
						<p className="text-muted-foreground text-sm">
							If nothing arrives, tap{" "}
							<span className="font-medium text-foreground">Resend email</span>.
							If it still doesn't show up, we couldn't deliver mail right
							now—try again later or use a different address.
						</p>
					</FramePanel>
					<FrameFooter>
						<div className="flex items-center justify-between">
							<button
								type="button"
								onClick={() => setShowVerificationEmailSent(false)}
								className="text-muted-foreground text-sm hover:underline"
							>
								Wrong email?
							</button>
							<LoadingButton
								isLoading={isResending}
								loadingText="Sending..."
								disabled={resendCountdown > 0}
								onClick={onResendVerificationEmail}
							>
								{resendCountdown > 0
									? `Resend in ${resendCountdown}s`
									: "Resend email"}
							</LoadingButton>
						</div>
					</FrameFooter>
				</Frame>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-3">
			<Frame className="w-full max-w-lg">
				<FrameHeader>
					<FrameTitle>Create a new account</FrameTitle>
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
						<form.Input name="name" label="Name">
							{(field) => (
								<Input
									{...field}
									placeholder="Enter your first and last name"
									maxLength={100}
									onChange={(e) => {
										field.onChange(e.target.value);

										if (!form.formState.touchedFields.username) {
											form.setValue(
												"username",
												normalizeUsername(e.target.value),
											);
										}
									}}
								/>
							)}
						</form.Input>
						<form.Input name="username" label="Username">
							{(field) => (
								<Input
									{...field}
									placeholder="Enter your username"
									onChange={(e) => {
										field.onChange(normalizeUsername(e.target.value));
									}}
									maxLength={30}
								/>
							)}
						</form.Input>
						<form.Input name="email" label="Email">
							{(field) => <Input {...field} placeholder="Enter your email" />}
						</form.Input>
						<form.Input name="password" label="Password">
							{(field) => (
								<PasswordInput {...field} placeholder="Enter your password" />
							)}
						</form.Input>
						<form.Input name="confirmPassword" label="Confirm Password">
							{(field) => (
								<PasswordInput {...field} placeholder="Confirm your password" />
							)}
						</form.Input>
					</FramePanel>

					<FrameFooter>
						<div className="flex justify-end">
							<form.Submit isLoading={isLoading}>Register</form.Submit>
						</div>
					</FrameFooter>
				</form>
			</Frame>
			<p className="max-w-lg px-2 text-center text-muted-foreground text-xs leading-snug">
				By continuing you agree to the{" "}
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
				to="/auth/login"
				search={{ redirect_url: callbackURL || undefined }}
				className="text-muted-foreground text-sm hover:underline"
			>
				Already have an account? Login
			</Link>
		</div>
	);
}

function normalizeUsername(text: string) {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "")
		.replace(/^[0-9]/, "");
}
