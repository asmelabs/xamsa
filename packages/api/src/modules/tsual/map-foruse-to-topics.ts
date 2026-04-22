import { BULK_TOPICS_MAX_TSUAL_IMPORT } from "@xamsa/schemas/common/bulk";
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
 * One Xamsa topic per 3sual theme; hər temada **dəqiq 5** sual (values) olmalıdır.
 * Mövzu adı = `theme.name` (fazalar yalnız tapmaq üçün birləşdirilir).
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
				topics.push(mapThemeToTopic(theme));
			}
		}
	}

	if (topics.length > BULK_TOPICS_MAX_TSUAL_IMPORT) {
		throw new TsualMapError(
			`Bu paketdə ${String(topics.length)} mövzu var; bir dəfədə ən çoxu ${String(BULK_TOPICS_MAX_TSUAL_IMPORT)} mövzu import oluna bilər. Paketi əllə bölüb import edin və ya 3sual-da mövzuları azaldın.`,
		);
	}

	return topics;
}

export class TsualMapError extends Error {
	override name = "TsualMapError";
}

function mapThemeToTopic(theme: TsualTheme): CreateTopicPayloadType {
	const n = theme.values.length;
	if (n !== 5) {
		throw new TsualMapError(
			`"${theme.name}" mövzusunda 5 sual olmalıdır; 3sual-da bu mövzuda ${String(n)} sual var.`,
		);
	}
	const name =
		theme.name.trim().length > 0 ? theme.name.slice(0, 100) : "Mövzu";
	const desc =
		theme.information != null && String(theme.information).trim() !== ""
			? String(theme.information).slice(0, 1000)
			: undefined;
	return {
		name,
		description: desc,
		questions: theme.values.map((v) => ({
			text: v.text,
			answer: v.answer,
			acceptableAnswers: [] as string[],
			description: "",
			explanation: (v.comment ?? "").slice(0, 1000),
		})),
	};
}
