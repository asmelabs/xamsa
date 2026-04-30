import { Button } from "@xamsa/ui/components/button";
import { type ReactElement, type SVGAttributes, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { getSafePostAuthRedirect } from "@/lib/auth-redirect";

function GoogleMark({
	className,
	...svgProps
}: SVGAttributes<SVGElement>): ReactElement {
	return (
		<svg
			className={className}
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 48 48"
			aria-hidden="true"
			{...svgProps}
		>
			<path
				fill="#FFC107"
				d="M43.611 20.083H42V20H24v8h11.303C33.52 32.657 29.115 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
			/>
			<path
				fill="#FF3D00"
				d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 7.337 6.306 14.691z"
			/>
			<path
				fill="#4CAF50"
				d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.105 0-9.499-3.335-11.051-7.919l-6.562 5.056C9.51 39.556 16.227 44 24 44z"
			/>
			<path
				fill="#1976D2"
				d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
			/>
		</svg>
	);
}

type ContinueWithGoogleButtonProps = {
	redirectUrl: string | null | undefined;
	disabled?: boolean;
};

export function ContinueWithGoogleButton({
	redirectUrl,
	disabled,
}: ContinueWithGoogleButtonProps): ReactElement {
	const [loading, setLoading] = useState(false);

	const onClick = async () => {
		setLoading(true);
		try {
			const path = getSafePostAuthRedirect(redirectUrl);
			const safePath = path.startsWith("/") ? path : "/";
			const callbackURL = `${window.location.origin}${safePath}`;

			const result = await authClient.signIn.social({
				provider: "google",
				callbackURL,
			});

			if (result.error) {
				toast.error(result.error.message || "Could not start Google sign-in");
			}
		} catch (e) {
			toast.error((e as Error).message || "Could not start Google sign-in");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Button
			type="button"
			variant="outline"
			className="w-full"
			loading={loading}
			disabled={disabled}
			onClick={() => void onClick()}
		>
			<GoogleMark className="size-4.5 sm:size-4" />
			Continue with Google
		</Button>
	);
}
