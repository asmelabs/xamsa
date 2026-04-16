import { useMutation } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { CreatePackRatingInputSchema } from "@xamsa/schemas/modules/pack-rating";
import { Button } from "@xamsa/ui/components/button";
import { Rating } from "@xamsa/ui/components/rating";
import { StarIcon } from "lucide-react";
import { parseAsBoolean, useQueryState } from "nuqs";
import { toast } from "sonner";
import { useAppForm } from "@/hooks/use-app-form";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";
import { BetterDialog } from "./better-dialog";
import { LoadingButton } from "./loading-button";

interface RatePackDialogProps {
	packSlug: string;
}

export function RatePackDialog({ packSlug }: RatePackDialogProps) {
	const { data: session } = authClient.useSession();
	const user = session?.user;
	const router = useRouter();

	const [opened, setOpened] = useQueryState(
		"rate-pack",
		parseAsBoolean.withDefault(false),
	);

	const form = useAppForm({
		schema: CreatePackRatingInputSchema.omit({ pack: true }),
		defaultValues: {
			rating: 0,
		},
	});

	const { mutate: createPackRating, isPending } = useMutation({
		...orpc.packRating.create.mutationOptions(),
		onSuccess() {
			toast.success("Pack rated successfully");
			setOpened(false);
			router.invalidate({
				filter: (r) => r.pathname.startsWith("/packs/$packSlug/"),
			});
			form.reset();
		},
		onError(error) {
			toast.error(
				error.message || "An unknown error occurred. Please try again.",
			);
		},
	});

	const onSubmit = form.handleSubmit(
		async (values) => {
			createPackRating({ ...values, pack: packSlug });
		},
		(e) => {
			console.error(e);
		},
	);

	return (
		<BetterDialog
			opened={opened}
			setOpened={(open) => setOpened(open ?? false)}
			trigger={
				<Button size="icon" variant="outline">
					<StarIcon />
				</Button>
			}
			title="Rate this pack"
			description="How would you rate this pack from 1 to 5?"
			submit={
				<LoadingButton
					isLoading={isPending}
					loadingText="Rating..."
					onClick={onSubmit}
				>
					Submit
				</LoadingButton>
			}
		>
			{user ? (
				<form onSubmit={onSubmit}>
					<form.Input name="rating">
						{(field) => <Rating {...field} />}
					</form.Input>
				</form>
			) : (
				<div>
					<p>You must be logged in to rate a pack</p>
					<Link
						to="/auth/login"
						search={{
							redirect_url: `/packs/${packSlug}?rate-pack=true`,
						}}
					>
						Click here to login
					</Link>
				</div>
			)}
		</BetterDialog>
	);
}
