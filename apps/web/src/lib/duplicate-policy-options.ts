import type { DuplicateQuestionPolicy } from "@xamsa/schemas/db/schemas/enums/DuplicateQuestionPolicy.schema";

export type DuplicatePolicyOption = {
	value: DuplicateQuestionPolicy;
	label: string;
	/** Short rationale shown beneath the lobby select. */
	description: string;
	/** One-liner used by the explainer popover: who actually gets muted. */
	whoIsBlocked: string;
	/** Suggested context for picking this mode. */
	whenToPick: string;
};

/**
 * Single source of truth for the host-facing copy of the spoiler-aware play
 * modes. The lobby select renders {label, description}; the explainer popover
 * also surfaces {whoIsBlocked, whenToPick}; the BuzzButton blocked-state
 * reuses {whoIsBlocked} so users learn the rule that's affecting them.
 */
export const DUPLICATE_POLICY_OPTIONS: DuplicatePolicyOption[] = [
	{
		value: "none",
		label: "No replay restriction",
		description:
			"Everyone can buzz even if they played this pack in a finished game before.",
		whoIsBlocked: "Nobody is muted — everyone can buzz on every question.",
		whenToPick:
			"Pick when the group plays this pack often and you don't mind repeats.",
	},
	{
		value: "block_individuals",
		label: "Block repeat players only",
		description:
			"If you saw this question in a past finished game with this pack, you cannot buzz.",
		whoIsBlocked:
			"Only players who already saw a specific question (in a finished game with this pack) are muted on it. Everyone else buzzes normally.",
		whenToPick:
			"Pick for mixed groups where some have played the pack and some haven't.",
	},
	{
		value: "block_room",
		label: "Block room if anyone has seen it",
		description:
			"If anyone in this room saw this question in a past finished game with this pack, nobody can buzz.",
		whoIsBlocked:
			"If even one player in the room has seen a question before, every player is muted on that question — to keep the playing field level.",
		whenToPick:
			"Pick for tournament-style nights where you want zero spoiler advantage.",
	},
];
