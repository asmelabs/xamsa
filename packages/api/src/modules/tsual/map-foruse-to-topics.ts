import type { CreateTopicPayloadType } from "@xamsa/schemas/modules/topic";
import type {
	FindOnePackageOutput,
	TsualPhase,
	TsualTheme,
} from "@xamsa/schemas/modules/tsual";

function* walkPhases(phase: TsualPhase): Generator<TsualPhase> {
	yield phase;
	if (phase.subs) {
		for (const s of phase.subs) {
			yield* walkPhases(s);
		}
	}
}

/**
 * One Xamsa topic per 3sual "theme" that has at least 5 `values` (we use the first 5 only).
 * Topic name: "{phase} — {theme}"; description = theme information.
 */
export function mapForUseToXamsaTopicPayloads(
	data: FindOnePackageOutput,
): CreateTopicPayloadType[] {
	const topics: CreateTopicPayloadType[] = [];
	const source = data.package;

	for (const phase of source.phases) {
		for (const p of walkPhases(phase)) {
			if (!p.themes?.length) {
				continue;
			}
			for (const theme of p.themes) {
				const mapped = mapThemeToTopic(p.name, theme);
				if (mapped) {
					topics.push(mapped);
				}
			}
		}
	}

	return topics;
}

function mapThemeToTopic(
	phaseName: string,
	theme: TsualTheme,
): CreateTopicPayloadType | null {
	const values = theme.values;
	if (values.length < 5) {
		return null;
	}
	const five = values.slice(0, 5);
	return {
		name: `${phaseName} — ${theme.name}`.slice(0, 100),
		description: theme.information || undefined,
		questions: five.map((v) => ({
			text: v.text,
			answer: v.answer,
			acceptableAnswers: [] as string[],
			description: "",
			explanation: v.comment || "",
		})),
	};
}
