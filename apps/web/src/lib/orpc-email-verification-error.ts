import { ORPC_ERROR_EMAIL_NOT_VERIFIED } from "@xamsa/schemas/orpc/errors";
import { toast } from "sonner";

/** ORPC client errors may include `data.code` from the server. */
export function isOrpcEmailNotVerifiedError(error: unknown): boolean {
	if (typeof error !== "object" || error === null) return false;
	const data = (error as { data?: { code?: unknown } }).data;
	return data?.code === ORPC_ERROR_EMAIL_NOT_VERIFIED;
}

/**
 * Shows a dedicated toast for gated features. Returns true when handled (caller should not emit a generic toast).
 */
export function tryToastOrpcEmailVerificationError(error: unknown): boolean {
	if (!isOrpcEmailNotVerifiedError(error)) {
		return false;
	}
	toast.error("Verify your email to use this feature.", {
		duration: 12_000,
		action: {
			label: "Open settings",
			onClick: () => {
				window.location.assign("/settings");
			},
		},
	});
	return true;
}

export function toastOrpcMutationFailure(
	error: unknown,
	fallbackMessage: string,
): void {
	if (tryToastOrpcEmailVerificationError(error)) return;
	toast.error(
		error instanceof Error && error.message ? error.message : fallbackMessage,
	);
}
