"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@xamsa/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@xamsa/ui/components/dialog";
import { cn } from "@xamsa/ui/lib/utils";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { orpc } from "@/utils/orpc";

type TopicBulkJobDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** oRPC job id from `startBulkCreateJob` */
	jobId: string | null;
	/** Shown in copy */
	totalTopics: number;
	title?: string;
	/** After server marks job completed. */
	onCompleted: (packSlug: string) => void;
	packSlug: string;
};

/**
 * Modal: polls `topic.getBulkCreateJob` until the bulk finishes (async path).
 */
export function TopicBulkJobDialog({
	open,
	onOpenChange,
	jobId,
	totalTopics,
	title = "Saving topics",
	onCompleted,
	packSlug,
}: TopicBulkJobDialogProps) {
	const completedRef = useRef(false);
	const canPoll = open && jobId != null && jobId.length > 0;

	const { data, error, isError } = useQuery({
		...orpc.topic.getBulkCreateJob.queryOptions({
			input: { jobId: jobId ?? "00000000-0000-0000-0000-000000000000" },
		}),
		enabled: canPoll,
		refetchInterval: (q) => {
			const s = q.state.data?.status;
			if (s === "pending" || s === "running") {
				return 1_200;
			}
			return false;
		},
	});

	const handleClose = useCallback(() => {
		completedRef.current = false;
		onOpenChange(false);
	}, [onOpenChange]);

	useEffect(() => {
		if (!data || completedRef.current) {
			return;
		}
		if (data.status === "completed") {
			completedRef.current = true;
			onCompleted(packSlug);
		}
	}, [data, onCompleted, packSlug]);

	const failed = data?.status === "failed";
	const inFlight =
		canPoll &&
		(data == null || data.status === "pending" || data.status === "running");

	return (
		<Dialog
			onOpenChange={(next) => {
				if (!next && inFlight && !failed) {
					return;
				}
				if (!next) {
					handleClose();
				}
			}}
			open={open}
		>
			<DialogContent
				className="sm:max-w-md"
				showCloseButton={!inFlight || failed}
			>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						{inFlight && !failed && (
							<Loader2
								aria-hidden
								className="size-5 shrink-0 animate-spin text-muted-foreground"
							/>
						)}
						{title}
					</DialogTitle>
					<DialogDescription
						className={cn(
							"text-pretty",
							(failed && data?.errorMessage) || (isError && error != null)
								? "text-destructive"
								: "text-muted-foreground",
						)}
					>
						{failed && data?.errorMessage
							? data.errorMessage
							: isError && error != null
								? error.message
								: inFlight && !failed
									? `Creating ${String(totalTopics)} topic${totalTopics === 1 ? "" : "s"}. Large imports can take several minutes — keep this page open.`
									: data?.status === "completed"
										? "Finishing up…"
										: null}
					</DialogDescription>
				</DialogHeader>

				{inFlight && !failed && (
					<div
						aria-hidden
						className="h-1.5 w-full overflow-hidden rounded-full bg-input"
					>
						<div className="h-full w-1/3 max-w-[45%] animate-[pulse_1.4s_ease-in-out_infinite] rounded-full bg-primary" />
					</div>
				)}

				{failed && (
					<Button onClick={handleClose} type="button" variant="secondary">
						Close
					</Button>
				)}
			</DialogContent>
		</Dialog>
	);
}
