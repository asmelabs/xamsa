import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import type { NotificationDeliveryLevel } from "@xamsa/schemas/db/schemas/enums/NotificationDeliveryLevel.schema";
import type {
	NotificationPreferenceOutputType,
	UpdateNotificationPreferenceInputType,
} from "@xamsa/schemas/modules/notification";
import { Button } from "@xamsa/ui/components/button";
import {
	Frame,
	FrameHeader,
	FramePanel,
	FrameTitle,
} from "@xamsa/ui/components/frame";
import { Label } from "@xamsa/ui/components/label";
import {
	Select,
	SelectItem,
	SelectPopup,
	SelectTrigger,
	SelectValue,
} from "@xamsa/ui/components/select";
import { Skeleton } from "@xamsa/ui/components/skeleton";
import { Switch } from "@xamsa/ui/components/switch";
import { Loader2Icon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { SettingsNav } from "@/components/settings-nav";
import { getUser } from "@/functions/get-user";
import { pageSeo } from "@/lib/seo";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/settings/notifications")({
	component: RouteComponent,

	beforeLoad: async () => {
		const session = await getUser();
		if (!session?.user) {
			throw redirect({
				to: "/auth/login",
				search: { redirect_url: "/settings/notifications" },
			});
		}
		return { session };
	},

	head: () =>
		pageSeo({
			title: "Notifications",
			description:
				"Choose what gets your bell, what gets an email, and silence it all during quiet hours.",
			path: "/settings/notifications",
			noIndex: true,
			keywords:
				"Xamsa notifications settings, notification preferences, quiet hours",
		}),
});

type DraftPrefs = NotificationPreferenceOutputType;

type LevelKey =
	| "mention"
	| "reactionOnPost"
	| "reactionOnComment"
	| "commentOnPost"
	| "replyToComment";
type BinaryKey = "follow" | "packPublished" | "gameStarted" | "gameFinished";

const LEVEL_ROWS: {
	key: LevelKey;
	title: string;
	description: string;
}[] = [
	{
		key: "mention",
		title: "Mentions",
		description: "When someone @-mentions you in a post or comment.",
	},
	{
		key: "reactionOnPost",
		title: "Reactions on your posts",
		description:
			"Hearts, laughs, and the rest landing on something you posted.",
	},
	{
		key: "reactionOnComment",
		title: "Reactions on your comments",
		description: "Reactions to comments and replies you wrote.",
	},
	{
		key: "commentOnPost",
		title: "Comments on your posts",
		description: "When someone leaves a top-level comment on a post you wrote.",
	},
	{
		key: "replyToComment",
		title: "Replies to your comments",
		description: "When someone responds in a thread you started.",
	},
];

const BINARY_ROWS: {
	key: BinaryKey;
	title: string;
	description: string;
}[] = [
	{
		key: "follow",
		title: "New followers",
		description: "Someone followed your profile.",
	},
	{
		key: "packPublished",
		title: "Pack publishes",
		description: "A creator you follow ships a new pack.",
	},
	{
		key: "gameStarted",
		title: "Games starting",
		description:
			"A host you follow starts a live game (skipped if you're already in the lobby).",
	},
	{
		key: "gameFinished",
		title: "Games finishing",
		description: "Final results of a game you played in or hosted.",
	},
];

const LEVEL_OPTIONS: { value: NotificationDeliveryLevel; label: string }[] = [
	{ value: "all", label: "Everyone" },
	{ value: "followers", label: "People I follow" },
	{ value: "none", label: "Off" },
];

function levelInAppKey(k: LevelKey) {
	return `${k}InApp` as keyof DraftPrefs;
}
function levelEmailKey(k: LevelKey) {
	return `${k}Email` as keyof DraftPrefs;
}
function binaryInAppKey(k: BinaryKey) {
	return `${k}InApp` as keyof DraftPrefs;
}
function binaryEmailKey(k: BinaryKey) {
	return `${k}Email` as keyof DraftPrefs;
}

function diffPrefs(
	original: DraftPrefs,
	draft: DraftPrefs,
): UpdateNotificationPreferenceInputType {
	const out: Record<string, unknown> = {};
	for (const key of Object.keys(draft) as (keyof DraftPrefs)[]) {
		if (original[key] !== draft[key]) {
			out[key] = draft[key];
		}
	}
	return out as UpdateNotificationPreferenceInputType;
}

function pad2(n: number) {
	return n.toString().padStart(2, "0");
}
function minutesToHHMM(m: number) {
	return `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
}
function HHMMToMinutes(hhmm: string): number | null {
	const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
	if (!match) return null;
	const hh = Number(match[1]);
	const mm = Number(match[2]);
	if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
	return hh * 60 + mm;
}

function RouteComponent() {
	const queryClient = useQueryClient();
	const { data, isLoading } = useQuery({
		...orpc.notification.getPreferences.queryOptions({ input: {} }),
	});

	const [draft, setDraft] = useState<DraftPrefs | null>(null);

	useEffect(() => {
		if (data && !draft) {
			setDraft(data);
		}
	}, [data, draft]);

	const original = data ?? null;
	const dirty = useMemo(() => {
		if (!original || !draft) return false;
		return Object.keys(draft).some(
			(k) => original[k as keyof DraftPrefs] !== draft[k as keyof DraftPrefs],
		);
	}, [original, draft]);

	const update = useMutation(
		orpc.notification.updatePreferences.mutationOptions({
			onSuccess: (next) => {
				queryClient.setQueryData(
					orpc.notification.getPreferences.queryKey({ input: {} }),
					next,
				);
				setDraft(next);
				toast.success("Notification settings saved");
			},
			onError: (err) => {
				toast.error(err.message || "Failed to save settings");
			},
		}),
	);

	const handleSave = () => {
		if (!original || !draft) return;
		const patch = diffPrefs(original, draft);
		if (Object.keys(patch).length === 0) return;
		update.mutate(patch);
	};

	const handleReset = () => {
		if (original) {
			setDraft(original);
		}
	};

	if (isLoading || !draft) {
		return (
			<div className="container mx-auto max-w-2xl space-y-6 py-10">
				<div>
					<h1 className="font-bold text-2xl tracking-tight">Settings</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						Decide what reaches your bell, what hits your inbox, and when to
						stay silent.
					</p>
					<div className="mt-5">
						<SettingsNav active="notifications" />
					</div>
				</div>
				<Skeleton className="h-40 w-full rounded-xl" />
				<Skeleton className="h-60 w-full rounded-xl" />
			</div>
		);
	}

	const muted = draft.muteAllExceptSecurity;

	return (
		<div className="container mx-auto max-w-2xl space-y-6 py-10">
			<div>
				<h1 className="font-bold text-2xl tracking-tight">Settings</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Decide what reaches your bell, what hits your inbox, and when to stay
					silent.
				</p>
				<div className="mt-5">
					<SettingsNav active="notifications" />
				</div>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-2">
				<div>
					<h2 className="font-semibold text-lg tracking-tight">
						Notification preferences
					</h2>
					<p className="text-muted-foreground text-xs">
						Updates apply across every signed-in tab.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={handleReset}
						disabled={!dirty || update.isPending}
					>
						Reset
					</Button>
					<Button
						type="button"
						size="sm"
						onClick={handleSave}
						disabled={!dirty || update.isPending}
					>
						{update.isPending ? (
							<>
								<Loader2Icon className="size-4 animate-spin" />
								Saving…
							</>
						) : (
							"Save changes"
						)}
					</Button>
				</div>
			</div>

			<Frame>
				<FrameHeader>
					<FrameTitle>Master switch</FrameTitle>
				</FrameHeader>
				<FramePanel className="space-y-3">
					<RowToggle
						title="Pause everything"
						description="Only critical security messages get through. Existing notifications stay where they are."
						checked={muted}
						onCheckedChange={(v) =>
							setDraft((prev) =>
								prev ? { ...prev, muteAllExceptSecurity: v } : prev,
							)
						}
					/>
				</FramePanel>
			</Frame>

			<Frame>
				<FrameHeader>
					<FrameTitle>Activity on your content</FrameTitle>
				</FrameHeader>
				<FramePanel className="space-y-5">
					{LEVEL_ROWS.map((row) => (
						<LevelRow
							key={row.key}
							title={row.title}
							description={row.description}
							inAppValue={
								draft[levelInAppKey(row.key)] as NotificationDeliveryLevel
							}
							emailValue={
								draft[levelEmailKey(row.key)] as NotificationDeliveryLevel
							}
							disabled={muted}
							onChangeInApp={(v) =>
								setDraft((prev) =>
									prev ? { ...prev, [levelInAppKey(row.key)]: v } : prev,
								)
							}
							onChangeEmail={(v) =>
								setDraft((prev) =>
									prev ? { ...prev, [levelEmailKey(row.key)]: v } : prev,
								)
							}
						/>
					))}
				</FramePanel>
			</Frame>

			<Frame>
				<FrameHeader>
					<FrameTitle>People & gameplay</FrameTitle>
				</FrameHeader>
				<FramePanel className="space-y-5">
					{BINARY_ROWS.map((row) => (
						<BinaryRow
							key={row.key}
							title={row.title}
							description={row.description}
							inAppValue={Boolean(draft[binaryInAppKey(row.key)])}
							emailValue={Boolean(draft[binaryEmailKey(row.key)])}
							disabled={muted}
							onChangeInApp={(v) =>
								setDraft((prev) =>
									prev ? { ...prev, [binaryInAppKey(row.key)]: v } : prev,
								)
							}
							onChangeEmail={(v) =>
								setDraft((prev) =>
									prev ? { ...prev, [binaryEmailKey(row.key)]: v } : prev,
								)
							}
						/>
					))}
				</FramePanel>
			</Frame>

			<Frame>
				<FrameHeader>
					<FrameTitle>Email quiet hours</FrameTitle>
				</FrameHeader>
				<FramePanel className="space-y-4">
					<RowToggle
						title="Pause emails between"
						description="Mentions, reactions, replies and follows still land in your bell — emails just wait until the window ends."
						checked={draft.emailQuietHoursEnabled}
						onCheckedChange={(v) =>
							setDraft((prev) =>
								prev ? { ...prev, emailQuietHoursEnabled: v } : prev,
							)
						}
					/>

					<div className="grid gap-3 sm:grid-cols-3">
						<TimeField
							label="Start"
							value={minutesToHHMM(draft.emailQuietHoursStartMin)}
							disabled={!draft.emailQuietHoursEnabled}
							onChange={(s) => {
								const min = HHMMToMinutes(s);
								if (min == null) return;
								setDraft((prev) =>
									prev ? { ...prev, emailQuietHoursStartMin: min } : prev,
								);
							}}
						/>
						<TimeField
							label="End"
							value={minutesToHHMM(draft.emailQuietHoursEndMin)}
							disabled={!draft.emailQuietHoursEnabled}
							onChange={(s) => {
								const min = HHMMToMinutes(s);
								if (min == null) return;
								setDraft((prev) =>
									prev ? { ...prev, emailQuietHoursEndMin: min } : prev,
								);
							}}
						/>
						<TimezoneField
							value={draft.emailQuietHoursTimezone}
							disabled={!draft.emailQuietHoursEnabled}
							onChange={(tz) =>
								setDraft((prev) =>
									prev ? { ...prev, emailQuietHoursTimezone: tz } : prev,
								)
							}
						/>
					</div>

					{draft.emailQuietHoursEnabled &&
						draft.emailQuietHoursStartMin > draft.emailQuietHoursEndMin && (
							<p className="text-muted-foreground text-xs">
								The window wraps past midnight (
								{minutesToHHMM(draft.emailQuietHoursStartMin)} →{" "}
								{minutesToHHMM(draft.emailQuietHoursEndMin)} the next day).
							</p>
						)}
				</FramePanel>
			</Frame>
		</div>
	);
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

function RowToggle(props: {
	title: string;
	description: string;
	checked: boolean;
	onCheckedChange: (v: boolean) => void;
	disabled?: boolean;
}) {
	return (
		<div className="flex items-start justify-between gap-4">
			<div className="min-w-0">
				<Label className="font-medium text-sm">{props.title}</Label>
				<p className="text-muted-foreground text-xs">{props.description}</p>
			</div>
			<Switch
				checked={props.checked}
				onCheckedChange={props.onCheckedChange}
				disabled={props.disabled}
			/>
		</div>
	);
}

function LevelRow(props: {
	title: string;
	description: string;
	inAppValue: NotificationDeliveryLevel;
	emailValue: NotificationDeliveryLevel;
	disabled?: boolean;
	onChangeInApp: (v: NotificationDeliveryLevel) => void;
	onChangeEmail: (v: NotificationDeliveryLevel) => void;
}) {
	return (
		<div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
			<div>
				<Label className="font-medium text-sm">{props.title}</Label>
				<p className="text-muted-foreground text-xs">{props.description}</p>
			</div>
			<div className="grid gap-3 sm:grid-cols-2">
				<LevelSelect
					label="In-app"
					value={props.inAppValue}
					disabled={props.disabled}
					onChange={props.onChangeInApp}
				/>
				<LevelSelect
					label="Email"
					value={props.emailValue}
					disabled={props.disabled}
					onChange={props.onChangeEmail}
				/>
			</div>
		</div>
	);
}

function LevelSelect(props: {
	label: string;
	value: NotificationDeliveryLevel;
	disabled?: boolean;
	onChange: (v: NotificationDeliveryLevel) => void;
}) {
	const current =
		LEVEL_OPTIONS.find((o) => o.value === props.value)?.label ?? props.value;
	return (
		<div className="space-y-1">
			<Label className="text-muted-foreground text-xs">{props.label}</Label>
			<Select
				value={props.value}
				onValueChange={(v) => {
					if (typeof v === "string") {
						props.onChange(v as NotificationDeliveryLevel);
					}
				}}
				disabled={props.disabled}
			>
				<SelectTrigger className="h-9 w-full">
					<SelectValue>{current}</SelectValue>
				</SelectTrigger>
				<SelectPopup>
					{LEVEL_OPTIONS.map((opt) => (
						<SelectItem key={opt.value} value={opt.value}>
							{opt.label}
						</SelectItem>
					))}
				</SelectPopup>
			</Select>
		</div>
	);
}

function BinaryRow(props: {
	title: string;
	description: string;
	inAppValue: boolean;
	emailValue: boolean;
	disabled?: boolean;
	onChangeInApp: (v: boolean) => void;
	onChangeEmail: (v: boolean) => void;
}) {
	return (
		<div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
			<div>
				<Label className="font-medium text-sm">{props.title}</Label>
				<p className="text-muted-foreground text-xs">{props.description}</p>
			</div>
			<div className="grid gap-3 sm:grid-cols-2">
				<RowToggle
					title="In-app"
					description="Bell + inbox row"
					checked={props.inAppValue}
					onCheckedChange={props.onChangeInApp}
					disabled={props.disabled}
				/>
				<RowToggle
					title="Email"
					description="Sends to your verified address"
					checked={props.emailValue}
					onCheckedChange={props.onChangeEmail}
					disabled={props.disabled}
				/>
			</div>
		</div>
	);
}

function TimeField(props: {
	label: string;
	value: string;
	disabled?: boolean;
	onChange: (v: string) => void;
}) {
	return (
		<div className="space-y-1">
			<Label className="text-muted-foreground text-xs">{props.label}</Label>
			<input
				type="time"
				step={60}
				disabled={props.disabled}
				value={props.value}
				onChange={(e) => props.onChange(e.target.value)}
				className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm shadow-xs disabled:opacity-60"
			/>
		</div>
	);
}

const COMMON_TIMEZONES = [
	"UTC",
	"Europe/London",
	"Europe/Paris",
	"Europe/Berlin",
	"Europe/Istanbul",
	"Asia/Baku",
	"Asia/Dubai",
	"Asia/Kolkata",
	"Asia/Tokyo",
	"Australia/Sydney",
	"America/New_York",
	"America/Chicago",
	"America/Denver",
	"America/Los_Angeles",
	"America/Sao_Paulo",
];

function TimezoneField(props: {
	value: string;
	disabled?: boolean;
	onChange: (v: string) => void;
}) {
	const options = useMemo(() => {
		const set = new Set(COMMON_TIMEZONES);
		set.add(props.value);
		return Array.from(set);
	}, [props.value]);

	return (
		<div className="space-y-1">
			<Label className="text-muted-foreground text-xs">Timezone</Label>
			<Select
				value={props.value}
				onValueChange={(v) => {
					if (typeof v === "string") props.onChange(v);
				}}
				disabled={props.disabled}
			>
				<SelectTrigger className="h-9 w-full">
					<SelectValue>{props.value}</SelectValue>
				</SelectTrigger>
				<SelectPopup>
					{options.map((tz) => (
						<SelectItem key={tz} value={tz}>
							{tz}
						</SelectItem>
					))}
				</SelectPopup>
			</Select>
		</div>
	);
}
