import { Link, useNavigate } from "@tanstack/react-router";
import { ForgotPasswordInputSchema } from "@xamsa/schemas/modules/auth/forgot-password";
import {
	Frame,
	FrameFooter,
	FrameHeader,
	FramePanel,
	FrameTitle,
} from "@xamsa/ui/components/frame";
import { Input } from "@xamsa/ui/components/input";
import { parseAsString, useQueryState } from "nuqs";
import { useState } from "react";
import { toast } from "sonner";
import { useAppForm } from "@/hooks/use-app-form";
import { authClient } from "@/lib/auth-client";

export function ForgotPasswordForm() {
	const [defaultEmail] = useQueryState("email", parseAsString.withDefault(""));
	const [redirectURL] = useQueryState("redirect_url");
	const navigate = useNavigate();
	const [isLoading, setIsLoading] = useState(false);

	const form = useAppForm({
		schema: ForgotPasswordInputSchema,
		defaultValues: {
			email: defaultEmail,
		},
	});

	const onSubmit = form.handleSubmit(async (values) => {
		setIsLoading(true);

		try {
			const resetPasswordURL = new URL(
				"/auth/reset-password",
				window.location.origin,
			);
			if (redirectURL) {
				resetPasswordURL.searchParams.set("redirect_url", redirectURL);
			}
			if (values.email) {
				resetPasswordURL.searchParams.set("email", values.email);
			}

			const result = await authClient.requestPasswordReset({
				email: values.email,
				redirectTo: resetPasswordURL.toString(),
			});

			if (result.error) {
				throw new Error(result.error.message || result.error.statusText);
			}

			toast.success(
				"Password reset email sent. Check your email for the reset link. If you don't see it, check your spam folder.",
			);

			navigate({
				to: "/auth/login",
				search: {
					redirect_url: redirectURL || undefined,
					email: values.email || undefined,
				},
			});
		} catch (error) {
			toast.error((error as Error).message || "An unknown error occurred");
		} finally {
			setIsLoading(false);
		}
	});

	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-3">
			<Frame className="w-full max-w-lg">
				<FrameHeader>
					<FrameTitle>Send a password reset email</FrameTitle>
				</FrameHeader>
				<form onSubmit={onSubmit}>
					<FramePanel className="space-y-4">
						<form.Input name="email" label="Email">
							{(field) => <Input {...field} placeholder="Enter your email" />}
						</form.Input>
					</FramePanel>

					<FrameFooter>
						<div className="flex justify-end">
							<form.Submit isLoading={isLoading} loadingText="Sending...">
								Send
							</form.Submit>
						</div>
					</FrameFooter>
				</form>
			</Frame>
			<Link
				to="/auth/login"
				search={{ redirect_url: redirectURL || undefined }}
				className="text-muted-foreground text-sm hover:underline"
			>
				Back to login
			</Link>
		</div>
	);
}
