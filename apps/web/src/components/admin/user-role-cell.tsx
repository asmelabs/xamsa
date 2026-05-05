import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	AlertDialog,
	AlertDialogClose,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@xamsa/ui/components/alert-dialog";
import { Button } from "@xamsa/ui/components/button";
import {
	Select,
	SelectItem,
	SelectPopup,
	SelectTrigger,
	SelectValue,
} from "@xamsa/ui/components/select";
import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

type Role = "user" | "moderator" | "admin";

interface UserRoleCellProps {
	userId: string;
	username: string;
	role: Role;
}

const ROLE_OPTIONS: { value: Role; label: string }[] = [
	{ value: "user", label: "User" },
	{ value: "moderator", label: "Moderator" },
	{ value: "admin", label: "Admin" },
];

const ROLE_LABEL: Record<Role, string> = {
	user: "User",
	moderator: "Moderator",
	admin: "Admin",
};

/**
 * Inline role editor for the staff users table. Disabled when the actor is
 * looking at themselves or a fellow admin: the server enforces the same rules
 * but we don't even let the request leave the client. Picking a new role
 * opens a confirmation dialog before the mutation actually runs.
 */
export function UserRoleCell({ userId, username, role }: UserRoleCellProps) {
	const { data: session } = authClient.useSession();
	const queryClient = useQueryClient();
	const [pendingRole, setPendingRole] = useState<Role | null>(null);

	const isSelf = session?.user?.id === userId;
	const actorIsAdmin =
		(session?.user as { role?: Role } | undefined)?.role === "admin";
	const targetIsAdmin = role === "admin";
	const disabled = !actorIsAdmin || isSelf || targetIsAdmin;

	const mutation = useMutation(
		orpc.admin.updateUserRole.mutationOptions({
			onSuccess: (result) => {
				toast.success(
					result.sessionsRevoked > 0
						? `@${username} is now ${result.role}. Active sessions revoked.`
						: `@${username} is now ${result.role}.`,
				);
				void queryClient.invalidateQueries({
					queryKey: orpc.admin.listUsers.key(),
				});
				setPendingRole(null);
			},
			onError: (error) => {
				toast.error(error.message ?? "Failed to update role.");
				setPendingRole(null);
			},
		}),
	);

	if (disabled) {
		return <span className="text-muted-foreground">{role}</span>;
	}

	return (
		<>
			<Select
				value={role}
				onValueChange={(next) => {
					const nextRole = next as Role;
					if (nextRole === role) return;
					setPendingRole(nextRole);
				}}
				disabled={mutation.isPending}
			>
				<SelectTrigger className="h-8 min-w-[120px]">
					<SelectValue placeholder="Role">{ROLE_LABEL[role]}</SelectValue>
				</SelectTrigger>
				<SelectPopup>
					{ROLE_OPTIONS.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectPopup>
			</Select>
			<AlertDialog
				open={pendingRole !== null}
				onOpenChange={(open) => {
					if (!open && !mutation.isPending) setPendingRole(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Change @{username} to {pendingRole ?? role}?
						</AlertDialogTitle>
						<AlertDialogDescription>
							This will update <span className="font-medium">@{username}</span>
							's role from{" "}
							<span className="font-medium">{ROLE_LABEL[role]}</span> to{" "}
							<span className="font-medium">
								{pendingRole ? ROLE_LABEL[pendingRole] : ""}
							</span>{" "}
							and revoke all active sessions for that account, forcing them to
							sign in again with the new permissions.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogClose>
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={mutation.isPending}
							>
								Cancel
							</Button>
						</AlertDialogClose>
						<Button
							type="button"
							size="sm"
							disabled={mutation.isPending || pendingRole == null}
							onClick={() => {
								if (pendingRole == null) return;
								mutation.mutate({ userId, role: pendingRole });
							}}
						>
							{mutation.isPending ? (
								<Loader2Icon className="size-4 animate-spin" />
							) : null}
							Confirm change
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
