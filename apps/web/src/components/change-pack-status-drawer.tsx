import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import type { PackStatus } from "@xamsa/schemas/db/schemas/enums/PackStatus.schema";
import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@xamsa/ui/components/alert";
import { useQueryState } from "nuqs";
import type React from "react";
import { toast } from "sonner";
import { orpc } from "@/utils/orpc";
import { BetterDialog } from "./better-dialog";
import { LoadingButton } from "./loading-button";

interface ChangePackStatusDrawerProps {
	slug: string;
	status: Exclude<PackStatus, "draft">;
	children: React.ReactElement;
}

const statusData: Record<
	Exclude<PackStatus, "draft">,
	{
		title: string;
		description: string;
		warning: string;
		label: string;
	}
> = {
	published: {
		title: "Publish this pack",
		description: "Are you sure you want to publish this pack?",
		warning:
			"When you publish a pack, you will no longer be able to add or edit topics. Make sure everything is ready.",
		label: "Publish",
	},
	archived: {
		title: "Archive this pack",
		description: "Are you sure you want to archive this pack?",
		warning: "When you archive a pack, it will no longer be playable.",
		label: "Archive",
	},
};

export function ChangePackStatusDrawer({
	slug,
	status,
	children,
}: ChangePackStatusDrawerProps) {
	const [opened, setOpened] = useQueryState("change-pack-status");
	const data = statusData[status];
	const router = useRouter();

	const { mutate: updatePackStatus, isPending } = useMutation({
		...orpc.pack.updateStatus.mutationOptions(),
		onSuccess() {
			toast.success("Pack status updated successfully");
			router.invalidate({
				filter: (r) => r.pathname.startsWith("/packs/$packSlug/"),
			});
			setOpened(null);
		},
		onError(error) {
			toast.error(
				error.message || "An unknown error occurred. Please try again.",
			);
		},
	});

	return (
		<BetterDialog
			opened={opened === slug}
			setOpened={() => setOpened(opened === slug ? null : slug)}
			trigger={children}
			title={data.title}
			description={data.description}
			submit={
				<LoadingButton
					type="button"
					onClick={() => updatePackStatus({ slug, status })}
					isLoading={isPending}
					loadingText="Updating..."
				>
					{data.label}
				</LoadingButton>
			}
		>
			<Alert variant="warning">
				<AlertTitle>Warning</AlertTitle>
				<AlertDescription>{data.warning}</AlertDescription>
			</Alert>
		</BetterDialog>
	);
}
