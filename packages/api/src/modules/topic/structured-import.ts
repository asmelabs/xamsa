import { ORPCError } from "@orpc/server";
import { BULK_TOPICS_MAX_TSUAL_IMPORT } from "@xamsa/schemas/common/bulk";
import {
	CreateTopicPayloadSchema,
	type CreateTopicPayloadType,
	PreviewStructuredImportInputSchema,
	type PreviewStructuredImportInputType,
	type PreviewStructuredImportOutputType,
} from "@xamsa/schemas/modules/topic";
import { XMLParser } from "fast-xml-parser";
import YAML from "yaml";
import z from "zod";

export type StructuredFormat = "json" | "yaml" | "xml" | "blocks";

function badRequest(message: string): never {
	throw new ORPCError("BAD_REQUEST", { message });
}

function normalizeQuestion(
	raw: unknown,
	context: string,
): CreateTopicPayloadType["questions"][number] {
	if (!raw || typeof raw !== "object") {
		badRequest(`${context}: each question must be an object`);
	}
	const o = raw as Record<string, unknown>;
	const text = String(o.text ?? "").trim();
	const answer = String(o.answer ?? "").trim();
	let acceptableAnswers: string[] = [];
	if (Array.isArray(o.acceptableAnswers)) {
		acceptableAnswers = o.acceptableAnswers
			.map((x) => String(x).trim())
			.filter((s) => s.length > 0);
	} else if (typeof o.acceptableAnswers === "string") {
		acceptableAnswers = o.acceptableAnswers
			.split(",")
			.map((s) => s.trim())
			.filter((s) => s.length > 0);
	}
	const description = String(o.description ?? "").trim();
	const explanation =
		o.explanation == null || o.explanation === ""
			? ""
			: String(o.explanation).trim();
	return {
		text,
		answer,
		acceptableAnswers,
		description,
		explanation,
	};
}

function normalizeTopicObject(
	raw: unknown,
	context: string,
): CreateTopicPayloadType {
	if (!raw || typeof raw !== "object") {
		badRequest(`${context}: topic must be an object`);
	}
	const o = raw as Record<string, unknown>;
	const name = String(o.name ?? "").trim();
	const description =
		o.description == null || o.description === ""
			? ""
			: String(o.description).trim();
	const qs = o.questions;
	if (!Array.isArray(qs)) {
		badRequest(`${context}: "questions" must be an array of length 5`);
	}
	if (qs.length !== 5) {
		badRequest(
			`${context}: each topic must have exactly 5 questions (found ${String(qs.length)})`,
		);
	}
	const questions = qs.map((q, i) =>
		normalizeQuestion(q, `${context} → question ${String(i + 1)}`),
	);
	return { name, description, questions };
}

function parseTopicsArray(
	topicsRaw: unknown,
	context: string,
): CreateTopicPayloadType[] {
	if (!Array.isArray(topicsRaw)) {
		badRequest(`${context}: expected an array of topics`);
	}
	if (topicsRaw.length === 0) {
		badRequest(`${context}: no topics found`);
	}
	if (topicsRaw.length > BULK_TOPICS_MAX_TSUAL_IMPORT) {
		badRequest(`Too many topics (max ${String(BULK_TOPICS_MAX_TSUAL_IMPORT)})`);
	}
	return topicsRaw.map((t, i) =>
		normalizeTopicObject(t, `${context} topic ${String(i + 1)}`),
	);
}

/**
 * Semicolon rows: topic row (name, description) then 5 question rows.
 * @param lineLayout `txt`: text;answer;explanation;acceptableAnswers — `csv`: text;answer;acceptableAnswers;explanation
 */
export function parseBlocksFormat(
	raw: string,
	lineLayout: "txt" | "csv",
): CreateTopicPayloadType[] {
	const rows = raw
		.split(/\r?\n/)
		.map((line) => line.split(";").map((c) => c.trim()))
		.filter((r) => r.some((c) => c.length > 0));

	const topics: CreateTopicPayloadType[] = [];
	let idx = 0;
	let blockIndex = 0;
	while (idx < rows.length) {
		blockIndex += 1;
		const topicRow = rows[idx];
		if (!topicRow) break;
		const name = topicRow[0] ?? "";
		const description = topicRow[1] ?? "";
		idx += 1;
		const questions: CreateTopicPayloadType["questions"] = [];
		for (let qn = 0; qn < 5; qn++) {
			if (idx >= rows.length) {
				badRequest(
					`Block ${String(blockIndex)} (“${name || "untitled"}”): expected 5 question rows after topic row`,
				);
			}
			const r = rows[idx];
			if (!r) {
				badRequest(
					`Block ${String(blockIndex)} (“${name || "untitled"}”): missing question row`,
				);
			}
			const c0 = r[0] ?? "";
			const c1 = r[1] ?? "";
			const c2 = r[2] ?? "";
			const c3 = r[3] ?? "";
			let text: string;
			let answer: string;
			let explanation: string;
			let acceptableRaw: string;
			if (lineLayout === "csv") {
				text = c0;
				answer = c1;
				acceptableRaw = c2;
				explanation = c3;
			} else {
				text = c0;
				answer = c1;
				explanation = c2;
				acceptableRaw = c3;
			}
			const acceptableAnswers = acceptableRaw
				.split(",")
				.map((s) => s.trim())
				.filter((s) => s.length > 0);
			questions.push({
				text,
				answer,
				acceptableAnswers,
				description: "",
				explanation,
			});
			idx += 1;
		}
		topics.push({ name, description, questions });
	}
	if (topics.length > BULK_TOPICS_MAX_TSUAL_IMPORT) {
		badRequest(`Too many topics (max ${String(BULK_TOPICS_MAX_TSUAL_IMPORT)})`);
	}
	if (topics.length === 0) {
		badRequest("No topics found in file");
	}
	return topics;
}

export function parseJsonFormat(raw: string): CreateTopicPayloadType[] {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		badRequest("Invalid JSON");
	}
	let topicsRaw: unknown;
	if (Array.isArray(parsed)) {
		topicsRaw = parsed;
	} else if (
		parsed &&
		typeof parsed === "object" &&
		"topics" in parsed &&
		Array.isArray((parsed as { topics: unknown }).topics)
	) {
		topicsRaw = (parsed as { topics: unknown[] }).topics;
	} else {
		badRequest('JSON must be a top-level array or { "topics": [...] }');
	}
	return parseTopicsArray(topicsRaw, "JSON");
}

export function parseYamlFormat(raw: string): CreateTopicPayloadType[] {
	let parsed: unknown;
	try {
		parsed = YAML.parse(raw);
	} catch {
		badRequest("Invalid YAML");
	}
	let topicsRaw: unknown;
	if (Array.isArray(parsed)) {
		topicsRaw = parsed;
	} else if (
		parsed &&
		typeof parsed === "object" &&
		"topics" in parsed &&
		Array.isArray((parsed as { topics: unknown }).topics)
	) {
		topicsRaw = (parsed as { topics: unknown[] }).topics;
	} else {
		badRequest(
			"YAML must be a top-level array or a mapping with a `topics` array",
		);
	}
	return parseTopicsArray(topicsRaw, "YAML");
}

function xmlToArray<T>(v: T | T[] | undefined): T[] {
	if (v == null) return [];
	if (Array.isArray(v)) return v;
	return [v];
}

export function parseXmlFormat(raw: string): CreateTopicPayloadType[] {
	const parser = new XMLParser({
		ignoreAttributes: false,
		removeNSPrefix: true,
		trimValues: true,
	});
	let doc: unknown;
	try {
		doc = parser.parse(raw);
	} catch {
		badRequest("Invalid XML");
	}
	if (!doc || typeof doc !== "object") {
		badRequest("Invalid XML root");
	}
	const root = doc as Record<string, unknown>;
	const topicsRoot = root.topics as Record<string, unknown> | undefined;
	if (!topicsRoot) {
		badRequest("XML must have a <topics> root");
	}
	const topicNodes = xmlToArray(
		topicsRoot.topic as Record<string, unknown> | undefined,
	) as Record<string, unknown>[];
	const topics = topicNodes.map((node, ti) => {
		const n = node;
		const name = String(n.name ?? "").trim();
		const description =
			n.description == null || n.description === ""
				? ""
				: String(n.description).trim();
		const questionsRoot = n.questions as Record<string, unknown> | undefined;
		if (!questionsRoot) {
			badRequest(`XML topic ${String(ti + 1)}: missing <questions>`);
		}
		const qNodes = xmlToArray(
			questionsRoot.question as Record<string, unknown> | undefined,
		);
		if (qNodes.length !== 5) {
			badRequest(
				`XML topic ${String(ti + 1)}: expected 5 <question> elements, got ${String(qNodes.length)}`,
			);
		}
		const questions = qNodes.map((qRaw) => {
			const q = qRaw as Record<string, unknown>;
			const text = String(q.text ?? "").trim();
			const answer = String(q.answer ?? "").trim();
			const explanation =
				q.explanation == null || q.explanation === ""
					? ""
					: String(q.explanation).trim();
			let acceptableAnswers: string[] = [];
			const aaRoot = q.acceptableAnswers as Record<string, unknown> | undefined;
			if (aaRoot) {
				const answers = xmlToArray(
					aaRoot.acceptableAnswer as string | undefined,
				);
				acceptableAnswers = answers
					.map((a) => String(a).trim())
					.filter((s) => s.length > 0);
			} else if (typeof q.acceptableAnswer === "string") {
				acceptableAnswers = [String(q.acceptableAnswer).trim()].filter(
					(s) => s.length > 0,
				);
			}
			return {
				text,
				answer,
				acceptableAnswers,
				description: "",
				explanation,
			};
		});
		return { name, description, questions };
	});
	if (topics.length > BULK_TOPICS_MAX_TSUAL_IMPORT) {
		badRequest(`Too many topics (max ${String(BULK_TOPICS_MAX_TSUAL_IMPORT)})`);
	}
	if (topics.length === 0) {
		badRequest("No topics in XML");
	}
	return topics;
}

export function detectStructuredFormat(
	raw: string,
	filenameHint?: string,
): StructuredFormat {
	const hint = (filenameHint ?? "").toLowerCase();
	if (hint.endsWith(".json")) return "json";
	if (hint.endsWith(".yaml") || hint.endsWith(".yml")) return "yaml";
	if (hint.endsWith(".xml")) return "xml";
	if (hint.endsWith(".csv") || hint.endsWith(".txt")) return "blocks";

	const t = raw.trimStart();
	if (t.startsWith("{") || t.startsWith("[")) return "json";
	if (t.startsWith("<")) return "xml";
	return "blocks";
}

function blocksLineLayout(filenameHint?: string): "txt" | "csv" {
	const h = (filenameHint ?? "").toLowerCase();
	if (h.endsWith(".csv")) return "csv";
	return "txt";
}

export function parseStructuredRaw(
	raw: string,
	filenameHint?: string,
): CreateTopicPayloadType[] {
	const fmt = detectStructuredFormat(raw, filenameHint);
	switch (fmt) {
		case "json":
			return parseJsonFormat(raw);
		case "yaml":
			return parseYamlFormat(raw);
		case "xml":
			return parseXmlFormat(raw);
		case "blocks":
			return parseBlocksFormat(raw, blocksLineLayout(filenameHint));
		default: {
			const _x: never = fmt;
			return _x;
		}
	}
}

export function validateTopicPayloads(
	topics: CreateTopicPayloadType[],
): CreateTopicPayloadType[] {
	return z.array(CreateTopicPayloadSchema).parse(topics);
}

export function previewStructuredImportFromBody(
	input: PreviewStructuredImportInputType,
): PreviewStructuredImportOutputType {
	const i = PreviewStructuredImportInputSchema.parse(input);
	try {
		const draft = parseStructuredRaw(i.raw, i.filenameHint);
		const topics = validateTopicPayloads(draft);
		return { topics };
	} catch (e) {
		if (e instanceof ORPCError) throw e;
		if (e instanceof z.ZodError) {
			const msg = e.issues.map((x) => x.message).join("; ");
			badRequest(msg || "Validation failed");
		}
		throw e;
	}
}
