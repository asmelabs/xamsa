import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Input } from "@xamsa/ui/components/input";
import { parseAsString, useQueryState } from "nuqs";
import { toast } from "sonner";
import { LoadingButton } from "@/components/loading-button";
import { orpc } from "@/utils/orpc";

interface JoinGameFormProps {
	/**
	 * Optional heading rendered above the form. Defaults to null because the
	 * caller (Play tab or /join page) usually provides its own framing.
	 */
	title?: string | null;
	description?: string | null;
	submitLabel?: string;
}

/**
 * Shared join-by-code form. Used on the /join route and inside the Join tab
 * of the /play page so there's only one source of truth for field behaviour
 * and nuqs state.
 */
export function JoinGameForm({
	title = null,
	description = "Ask the host for the code or invite link.",
	submitLabel = "Join game",
}: JoinGameFormProps) {
	const navigate = useNavigate();
	const [code, setCode] = useQueryState("code", parseAsString.withDefault(""));

	const { mutate: joinGame, isPending } = useMutation({
		...orpc.player.join.mutationOptions(),
		onSuccess(_, variables) {
			toast.success("Joined game");
			navigate({
				to: "/g/$code",
				params: { code: variables.code },
			});
		},
		onError(error) {
			toast.error(error.message || "Failed to join game");
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const normalized = code.trim().toUpperCase();
		if (!normalized) return;
		joinGame({ code: normalized });
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			{title && (
				<div className="space-y-1">
					<h2 className="font-semibold text-lg">{title}</h2>
					{description && (
						<p className="text-muted-foreground text-sm">{description}</p>
					)}
				</div>
			)}
			<div className="space-y-2">
				<label htmlFor="join-code" className="font-medium text-sm">
					Game code
				</label>
				<Input
					id="join-code"
					placeholder="XMS-A4F9K2"
					value={code}
					onChange={(e) => setCode(e.target.value.toUpperCase())}
					className="text-center font-mono text-lg tracking-wider"
					autoComplete="off"
					spellCheck={false}
				/>
				{!title && description && (
					<p className="text-muted-foreground text-xs">{description}</p>
				)}
			</div>
			<div className="flex justify-end">
				<LoadingButton
					type="submit"
					isLoading={isPending}
					loadingText="Joining..."
					disabled={!code.trim()}
				>
					{submitLabel}
				</LoadingButton>
			</div>
		</form>
	);
}
