import { Link } from "@tanstack/react-router";
import { RegisterInputSchema } from "@xamsa/schemas/modules/auth/register";
import {
	Frame,
	FrameFooter,
	FrameHeader,
	FramePanel,
	FrameTitle,
} from "@xamsa/ui/components/frame";
import { Input } from "@xamsa/ui/components/input";
import { parseAsString, useQueryState } from "nuqs";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAppForm } from "@/hooks/use-app-form";
import { authClient } from "@/lib/auth-client";
import { LoadingButton } from "./loading-button";
import { PasswordInput } from "./password-input";

export function RegisterForm() {
	const [showVerificationEmailSent, setShowVerificationEmailSent] =
		useState(false);
	const [resendCountdown, setResendCountdown] = useState(5);

	useEffect(() => {
		if (resendCountdown > 0) {
			const interval = setInterval(() => {
				setResendCountdown((prev) => prev - 1);
			}, 1000);

			return () => clearInterval(interval);
		}
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

		setIsLoading(true);

		try {
			const result = await authClient.signUp.email({
				...data,
				callbackURL: callbackURL || undefined,
			});

			if (result.error) {
				throw new Error(result.error.message || result.error.statusText);
			}

			setShowVerificationEmailSent(true);
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
		return (
			<div className="flex min-h-screen flex-col items-center justify-center gap-3">
				<Frame className="w-full max-w-lg">
					<FrameHeader>
						<FrameTitle>Verify your email</FrameTitle>
					</FrameHeader>
					<FramePanel>
						<p>
							We've sent a verification email to your email address. Please
							click the link in the email to verify your account.
						</p>
					</FramePanel>
					<FrameFooter>
						<div className="flex justify-end">
							<LoadingButton
								isLoading={isResending}
								loadingText="Resending..."
								disabled={resendCountdown > 0}
								onClick={onResendVerificationEmail}
							>
								{resendCountdown > 0
									? `Resend in ${resendCountdown} seconds`
									: "Resend verification email"}
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
							<form.Submit
								disabled={isLoading || !form.formState.isValid}
								isLoading={isLoading}
							>
								Register
							</form.Submit>
						</div>
					</FrameFooter>
				</form>
			</Frame>
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
