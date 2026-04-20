import { Link, useNavigate } from "@tanstack/react-router";
import { ResetPasswordInputSchema } from "@xamsa/schemas/modules/auth/reset-password";
import {
	Frame,
	FrameFooter,
	FrameHeader,
	FramePanel,
	FrameTitle,
} from "@xamsa/ui/components/frame";
import { parseAsString, useQueryState } from "nuqs";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAppForm } from "@/hooks/use-app-form";
import { authClient } from "@/lib/auth-client";
import { PasswordInput } from "./password-input";

export function ResetPasswordForm() {
	const navigate = useNavigate();

	const [isLoading, setIsLoading] = useState(false);
	const [token] = useQueryState("token");
	const [errorParam] = useQueryState("error");
	const [defaultEmail] = useQueryState("email", parseAsString.withDefault(""));
	const [redirectURL] = useQueryState("redirect_url");

	useEffect(() => {
		if (errorParam === "INVALID_TOKEN") {
			toast.error(
				"Your password reset link is invalid or has expired. Please request a new one.",
			);
		}
	}, [errorParam]);

	const form = useAppForm({
		schema: ResetPasswordInputSchema.omit({ token: true }),
		defaultValues: {
			password: "",
			confirmPassword: "",
		},
	});

	const onSubmit = form.handleSubmit(async (values) => {
		if (!token) {
			toast.error(
				"Missing reset token. Please request a new password reset link.",
			);
			return;
		}

		if (values.password !== values.confirmPassword) {
			form.setError("confirmPassword", {
				message: "Passwords do not match",
			});

			return;
		}

		setIsLoading(true);

		try {
			const result = await authClient.resetPassword({
				token,
				newPassword: values.password,
			});

			if (result.error) {
				throw new Error(result.error.message || result.error.statusText);
			}

			toast.success("Password reset successfully");
			navigate({
				to: "/auth/login",
				search: {
					redirect_url: redirectURL || undefined,
					email: defaultEmail || undefined,
				},
			});
		} catch (error) {
			toast.error((error as Error).message || "An unknown error occurred");
		} finally {
			setIsLoading(false);
		}
	});

	const tokenMissing = !token || errorParam === "INVALID_TOKEN";

	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-3">
			<Frame className="w-full max-w-lg">
				<FrameHeader>
					<FrameTitle>Reset your password</FrameTitle>
				</FrameHeader>
				{tokenMissing ? (
					<FramePanel className="space-y-4">
						<p className="text-muted-foreground text-sm">
							Your password reset link is invalid or has expired. Please
							request a new one.
						</p>
					</FramePanel>
				) : (
					<form onSubmit={onSubmit}>
						<FramePanel className="space-y-4">
							<form.Input name="password" label="Password">
								{(field) => (
									<PasswordInput {...field} placeholder="Enter your password" />
								)}
							</form.Input>
							<form.Input name="confirmPassword" label="Confirm Password">
								{(field) => (
									<PasswordInput
										{...field}
										placeholder="Confirm your password"
									/>
								)}
							</form.Input>
						</FramePanel>

						<FrameFooter>
							<div className="flex justify-end">
								<form.Submit isLoading={isLoading} loadingText="Resetting...">
									Reset
								</form.Submit>
							</div>
						</FrameFooter>
					</form>
				)}
			</Frame>
			<Link
				to="/auth/forgot-password"
				search={{
					redirect_url: redirectURL || undefined,
					email: defaultEmail || undefined,
				}}
				className="text-muted-foreground text-sm hover:underline"
			>
				{tokenMissing
					? "Request a new password reset email"
					: "Back to reset password email"}
			</Link>
		</div>
	);
}
