import type { CreateTopicPayloadType } from "@xamsa/schemas/modules/topic";
import { XMLBuilder } from "fast-xml-parser";
import YAML from "yaml";

export type ExportFormat = "json" | "yaml" | "xml" | "csv" | "txt";

export const EXPORT_MIME_TYPE: Record<ExportFormat, string> = {
	json: "application/json",
	yaml: "application/yaml",
	xml: "application/xml",
	csv: "text/csv",
	txt: "text/plain",
};

export function extensionFor(format: ExportFormat): string {
	return format;
}

/**
 * Strip semicolons and CR/LF from a value before joining as a "blocks" cell.
 * The blocks parser splits rows on `;` so embedded semicolons would be lost
 * on round-trip; we pick the smallest possible substitution to keep the export
 * readable while staying parseable.
 */
function escapeBlocksCell(value: string): string {
	return value.replace(/[\r\n]+/g, " ").replace(/;/g, ",");
}

function joinBlocksRow(cells: string[]): string {
	return cells.map(escapeBlocksCell).join(";");
}

function topicsToBlocks(
	topics: CreateTopicPayloadType[],
	layout: "csv" | "txt",
): string {
	const rows: string[] = [];
	for (const topic of topics) {
		rows.push(joinBlocksRow([topic.name, topic.description ?? ""]));
		for (const q of topic.questions) {
			const acceptable = (q.acceptableAnswers ?? []).join(", ");
			const explanation = q.explanation ?? "";
			rows.push(
				layout === "csv"
					? joinBlocksRow([q.text, q.answer, acceptable, explanation])
					: joinBlocksRow([q.text, q.answer, explanation, acceptable]),
			);
		}
	}
	return `${rows.join("\n")}\n`;
}

export function serializeTopicsToJson(
	topics: CreateTopicPayloadType[],
): string {
	return `${JSON.stringify({ topics }, null, 2)}\n`;
}

export function serializeTopicsToYaml(
	topics: CreateTopicPayloadType[],
): string {
	return YAML.stringify({ topics });
}

export function serializeTopicsToXml(topics: CreateTopicPayloadType[]): string {
	const builder = new XMLBuilder({
		ignoreAttributes: false,
		format: true,
		indentBy: "  ",
		suppressEmptyNode: false,
	});
	const doc = {
		"?xml": { "@_version": "1.0", "@_encoding": "UTF-8" },
		topics: {
			topic: topics.map((t) => ({
				name: t.name,
				description: t.description ?? "",
				questions: {
					question: t.questions.map((q) => ({
						text: q.text,
						answer: q.answer,
						explanation: q.explanation ?? "",
						acceptableAnswers:
							(q.acceptableAnswers ?? []).length > 0
								? { acceptableAnswer: q.acceptableAnswers }
								: "",
					})),
				},
			})),
		},
	};
	return builder.build(doc) as string;
}

export function serializeTopicsToCsv(topics: CreateTopicPayloadType[]): string {
	return topicsToBlocks(topics, "csv");
}

export function serializeTopicsToTxt(topics: CreateTopicPayloadType[]): string {
	return topicsToBlocks(topics, "txt");
}

export function serializeTopics(
	topics: CreateTopicPayloadType[],
	format: ExportFormat,
): string {
	switch (format) {
		case "json":
			return serializeTopicsToJson(topics);
		case "yaml":
			return serializeTopicsToYaml(topics);
		case "xml":
			return serializeTopicsToXml(topics);
		case "csv":
			return serializeTopicsToCsv(topics);
		case "txt":
			return serializeTopicsToTxt(topics);
		default: {
			const _x: never = format;
			return _x;
		}
	}
}

/** Slugified-style filename safe for download attribute. */
export function buildExportFilename(
	scope: "pack" | "topic",
	slug: string,
	format: ExportFormat,
): string {
	const safe = slug.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "");
	return `${scope}-${safe || "untitled"}.${extensionFor(format)}`;
}
