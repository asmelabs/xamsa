import { useMutation } from "@tanstack/react-query";
import { BULK_TOPICS_MAX_TSUAL_IMPORT } from "@xamsa/schemas/common/bulk";
import {
	type CreateTopicPayloadType,
	STRUCTURED_IMPORT_RAW_MAX,
} from "@xamsa/schemas/modules/topic";
import { Button } from "@xamsa/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogPanel,
	DialogTitle,
} from "@xamsa/ui/components/dialog";
import { Input } from "@xamsa/ui/components/input";
import { Label } from "@xamsa/ui/components/label";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@xamsa/ui/components/tabs";
import { Textarea } from "@xamsa/ui/components/textarea";
import { BookOpen, CircleHelp, Upload } from "lucide-react";
import type { ChangeEvent } from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { toastOrpcMutationFailure } from "@/lib/orpc-email-verification-error";
import { orpc } from "@/utils/orpc";

export type TopicImportMeta = {
	tsualPackageId?: number;
	sourceLabel?: string;
};

export type TopicImportSuccess = {
	topics: CreateTopicPayloadType[];
	meta?: TopicImportMeta;
};

interface TopicImportDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	canImport3sual: boolean;
	onImported: (payload: TopicImportSuccess) => void;
}

function countError(): void {
	toast.error(
		`Import has more than ${String(BULK_TOPICS_MAX_TSUAL_IMPORT)} topics; shorten the file and try again.`,
	);
}

type ImportHelpTopic = "overview" | "paste" | "file" | "url" | "3sual";

function FormatExampleBlock({
	title,
	filename,
	children,
}: {
	title: string;
	filename: string;
	children: string;
}) {
	return (
		<div className="space-y-1.5">
			<p className="font-medium text-foreground text-xs">
				{title}{" "}
				<code className="rounded bg-muted px-1 py-px font-normal text-[11px]">
					{filename}
				</code>
			</p>
			<pre className="max-h-52 overflow-auto whitespace-pre rounded-md border border-border/80 bg-muted/40 p-3 text-left font-mono text-[10px] text-foreground leading-snug">
				{children.trimEnd()}
			</pre>
		</div>
	);
}

function ImportFormatExamplesSection() {
	return (
		<div className="space-y-4 border-border/60 border-t pt-4">
			<div>
				<p className="font-medium text-foreground text-sm">
					Example layouts (one topic, five questions)
				</p>
				<p className="mt-1 text-muted-foreground text-xs leading-relaxed">
					Copy a sample into a new file or into the paste box, change the
					wording, then add more topics by repeating the same pattern (another
					TXT/CSV block or another entry in the JSON/YAML/XML list).
				</p>
			</div>

			<FormatExampleBlock
				title="Plain text"
				filename=".txt"
			>{`Sample topic;One demo topic with five questions.
Capital of France?;Paris;City on the River Seine.;Parigi
Capital of Japan?;Tokyo;;
2 + 2?;4;;four
Sky color on a clear day?;Blue;;
Largest ocean?;Pacific;;Pacific Ocean`}</FormatExampleBlock>

			<FormatExampleBlock
				title="Spreadsheet-style rows (semicolon between cells)"
				filename=".csv"
			>{`Sample topic;One demo topic with five questions.
Capital of France?;Paris;Parigi;City on the River Seine.
Capital of Japan?;Tokyo;;
2 + 2?;4;four;
Sky color on a clear day?;Blue;;
Largest ocean?;Pacific;Pacific Ocean;`}</FormatExampleBlock>

			<FormatExampleBlock
				title='JSON: array at root, or one object with a "topics" array'
				filename=".json"
			>{`[
  {
    "name": "Sample topic",
    "description": "One demo topic with five questions.",
    "questions": [
      {
        "text": "Capital of France?",
        "answer": "Paris",
        "acceptableAnswers": ["Parigi"],
        "explanation": "City on the River Seine."
      },
      {
        "text": "Capital of Japan?",
        "answer": "Tokyo",
        "acceptableAnswers": [],
        "explanation": ""
      },
      {
        "text": "2 + 2?",
        "answer": "4",
        "acceptableAnswers": ["four"],
        "explanation": ""
      },
      {
        "text": "Sky color on a clear day?",
        "answer": "Blue",
        "acceptableAnswers": [],
        "explanation": ""
      },
      {
        "text": "Largest ocean?",
        "answer": "Pacific",
        "acceptableAnswers": ["Pacific Ocean"],
        "explanation": ""
      }
    ]
  }
]`}</FormatExampleBlock>

			<FormatExampleBlock
				title="YAML (top-level list, or a mapping with topics:)"
				filename=".yaml"
			>{`- name: Sample topic
  description: One demo topic with five questions.
  questions:
    - text: Capital of France?
      answer: Paris
      acceptableAnswers:
        - Parigi
      explanation: City on the River Seine.
    - text: Capital of Japan?
      answer: Tokyo
      acceptableAnswers: []
      explanation: ""
    - text: 2 + 2?
      answer: "4"
      acceptableAnswers:
        - four
      explanation: ""
    - text: Sky color on a clear day?
      answer: Blue
      acceptableAnswers: []
      explanation: ""
    - text: Largest ocean?
      answer: Pacific
      acceptableAnswers:
        - Pacific Ocean
      explanation: ""`}</FormatExampleBlock>

			<FormatExampleBlock
				title="XML (wrapper &lt;topics&gt;)"
				filename=".xml"
			>{`<topics>
  <topic>
    <name>Sample topic</name>
    <description>One demo topic with five questions.</description>
    <questions>
      <question>
        <text>Capital of France?</text>
        <answer>Paris</answer>
        <explanation>City on the River Seine.</explanation>
        <acceptableAnswers>
          <acceptableAnswer>Parigi</acceptableAnswer>
        </acceptableAnswers>
      </question>
      <question>
        <text>Capital of Japan?</text>
        <answer>Tokyo</answer>
      </question>
      <question>
        <text>2 + 2?</text>
        <answer>4</answer>
        <acceptableAnswers>
          <acceptableAnswer>four</acceptableAnswer>
        </acceptableAnswers>
      </question>
      <question>
        <text>Sky color on a clear day?</text>
        <answer>Blue</answer>
      </question>
      <question>
        <text>Largest ocean?</text>
        <answer>Pacific</answer>
        <acceptableAnswers>
          <acceptableAnswer>Pacific Ocean</acceptableAnswer>
        </acceptableAnswers>
      </question>
    </questions>
  </topic>
</topics>`}</FormatExampleBlock>
		</div>
	);
}

function GuideLink({
	disabled,
	onClick,
	label = "Step-by-step guide",
}: {
	disabled?: boolean;
	onClick: () => void;
	label?: string;
}) {
	return (
		<button
			className="inline-flex items-center gap-1.5 font-medium text-muted-foreground text-xs underline underline-offset-2 transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
			disabled={disabled}
			onClick={onClick}
			type="button"
		>
			<BookOpen className="size-3.5 shrink-0" />
			{label}
		</button>
	);
}

function ImportHelpDialog({
	open,
	topic,
	onOpenChange,
}: {
	open: boolean;
	topic: ImportHelpTopic | null;
	onOpenChange: (open: boolean) => void;
}) {
	const title =
		topic === "overview"
			? "Import topics — overview"
			: topic === "paste"
				? "Copy and paste — how it works"
				: topic === "file"
					? "Upload a file — how it works"
					: topic === "url"
						? "Import from a web link — how it works"
						: topic === "3sual"
							? "Import from 3sual.az — how it works"
							: "Help";

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent
				className="flex max-h-[min(90vh,90dvh)] w-[calc(100vw-2rem)] max-w-2xl flex-col"
				showCloseButton
			>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					{topic === "overview" ? (
						<DialogDescription>
							Pick the option that matches how your topics are stored today. You
							can always switch tabs and try another way.
						</DialogDescription>
					) : null}
				</DialogHeader>
				<DialogPanel className="min-h-0 flex-1 pr-3">
					{topic === "overview" ? (
						<div className="space-y-4 text-muted-foreground text-sm leading-relaxed">
							<p>
								This screen only{" "}
								<strong className="text-foreground">prepares</strong> topics in
								the bulk editor. Nothing appears in your pack until you review
								the rows and choose to create them.
							</p>
							<ul className="list-inside list-disc space-y-2 ps-1">
								<li>
									<strong className="text-foreground">Copy/paste</strong> — best
									when you already have text open (email, notes, a document) and
									want to drop it in without saving a file.
								</li>
								<li>
									<strong className="text-foreground">File</strong> — best when
									you have a saved document on your computer (for example
									something you exported from a spreadsheet app).
								</li>
								<li>
									<strong className="text-foreground">URL</strong> — best when
									the data lives on the web as a plain file anyone can open
									(must start with https).
								</li>
								<li>
									<strong className="text-foreground">3sual</strong> — for staff
									who publish on 3sual.az; pulls an existing game package by ID
									or link.
								</li>
							</ul>
							<p>
								Every topic on Xamsa needs{" "}
								<strong className="text-foreground">five</strong> questions in
								order. Imports must match that shape (the guides in each tab
								explain the layouts we recognize).
							</p>
							<p>
								Worked examples for{" "}
								<code className="rounded bg-muted px-1 text-foreground text-xs">
									.txt
								</code>
								{", "}
								<code className="rounded bg-muted px-1 text-foreground text-xs">
									.csv
								</code>
								{", "}
								<code className="rounded bg-muted px-1 text-foreground text-xs">
									.json
								</code>
								{", "}
								<code className="rounded bg-muted px-1 text-foreground text-xs">
									.yaml
								</code>
								{", and "}
								<code className="rounded bg-muted px-1 text-foreground text-xs">
									.xml
								</code>{" "}
								are in the{" "}
								<strong className="text-foreground">Copy/paste</strong>{" "}
								step-by-step guide.
							</p>
							<p>
								You can import up to{" "}
								<strong className="text-foreground">
									{String(BULK_TOPICS_MAX_TSUAL_IMPORT)} topics
								</strong>{" "}
								in one preview. If you import more than that, shorten the file
								and try again.
							</p>
						</div>
					) : null}
					{topic === "paste" ? (
						<div className="space-y-4 text-muted-foreground text-sm leading-relaxed">
							<p>
								Paste the{" "}
								<strong className="text-foreground">full contents</strong> of a
								supported file — the same text you would see if you opened it in
								a simple text app (Notepad, TextEdit, etc.).
							</p>
							<div className="space-y-2">
								<p className="font-medium text-foreground">
									Formats we recognize
								</p>
								<ul className="list-inside list-disc space-y-1.5 ps-1">
									<li>
										<strong className="text-foreground">
											Plain text (.txt)
										</strong>{" "}
										— one line for the topic title and short description, then{" "}
										<strong className="text-foreground">five lines</strong> for
										the five questions. Parts on each line are separated with a{" "}
										<strong className="text-foreground">semicolon (;)</strong>.
										On each question line the order is:{" "}
										<strong className="text-foreground">
											clue; correct answer; explanation; other acceptable
											answers
										</strong>
										. In the last part, separate extra correct spellings with{" "}
										<strong className="text-foreground">commas</strong>.
									</li>
									<li>
										<strong className="text-foreground">
											Spreadsheet-style (.csv)
										</strong>{" "}
										— repeating blocks: one row for the topic, then five rows
										for questions. Use semicolons between cells. On question
										rows the order is:{" "}
										<strong className="text-foreground">
											clue; correct answer; other acceptable answers (commas
											inside the cell); explanation
										</strong>
										. Export from Excel or Google Sheets using a semicolon as
										the separator if that is how your file is built.
									</li>
									<li>
										<strong className="text-foreground">
											JSON / YAML / XML
										</strong>{" "}
										— structured lists of topics; each topic lists five
										questions. If your file came from another program, use the
										layout that matches Xamsa’s topic + five questions model.
									</li>
								</ul>
							</div>
							<ImportFormatExamplesSection />
							<p>
								We <strong className="text-foreground">guess the format</strong>{" "}
								from what you paste (and from typical file endings if you copied
								from a named file). If parsing fails, check semicolons, line
								breaks, and that every topic has exactly five questions.
							</p>
							<p>
								Size limit: about{" "}
								<strong className="text-foreground">
									{String(Math.round(STRUCTURED_IMPORT_RAW_MAX / 1_000_000))}{" "}
									million characters
								</strong>{" "}
								per paste — enough for very large packs.
							</p>
						</div>
					) : null}
					{topic === "file" ? (
						<div className="space-y-4 text-muted-foreground text-sm leading-relaxed">
							<p>
								Choose a file from your device. Your browser reads it{" "}
								<strong className="text-foreground">locally</strong>, then sends
								the text to Xamsa only to build a{" "}
								<strong className="text-foreground">preview</strong> you can
								edit before creating topics.
							</p>
							<div className="space-y-2">
								<p className="font-medium text-foreground">
									Supported file types
								</p>
								<p>
									<code className="rounded bg-muted px-1 py-0.5 text-foreground text-xs">
										.txt
									</code>
									{", "}
									<code className="rounded bg-muted px-1 py-0.5 text-foreground text-xs">
										.csv
									</code>
									{", "}
									<code className="rounded bg-muted px-1 py-0.5 text-foreground text-xs">
										.json
									</code>
									{", "}
									<code className="rounded bg-muted px-1 py-0.5 text-foreground text-xs">
										.yaml
									</code>
									{", "}
									<code className="rounded bg-muted px-1 py-0.5 text-foreground text-xs">
										.xml
									</code>
									. The same layout rules apply as in the Copy/paste guide.
								</p>
							</div>
							<p>
								<strong className="text-foreground">Tip:</strong> If you use
								Excel or Google Sheets, export or “Save as” CSV, then import
								here. If columns use commas instead of semicolons, you may need
								to adjust the export so fields match what Xamsa expects
								(semicolon-separated for this import).
							</p>
							<ImportFormatExamplesSection />
							<p>
								After you pick a file, processing starts automatically. If you
								see an error message, open the file in a text editor, compare it
								to the Copy/paste guide, and fix any missing lines or wrong
								counts.
							</p>
						</div>
					) : null}
					{topic === "url" ? (
						<div className="space-y-4 text-muted-foreground text-sm leading-relaxed">
							<p>
								Paste a link that starts with{" "}
								<code className="rounded bg-muted px-1 py-0.5 text-foreground text-xs">
									https://
								</code>
								. Xamsa’s servers will download the file from that address and
								run the same conversion as for paste or upload.
							</p>
							<div className="space-y-2">
								<p className="font-medium text-foreground">
									What kind of link works?
								</p>
								<ul className="list-inside list-disc space-y-1.5 ps-1">
									<li>
										A{" "}
										<strong className="text-foreground">
											direct file link
										</strong>{" "}
										— when you open it, you mostly see raw text or a download,
										not a login screen or a fancy editor.
									</li>
									<li>
										The server hosting the file must be reachable from the
										public internet.{" "}
										<strong className="text-foreground">
											Links that only work on your home or office network
										</strong>{" "}
										usually cannot be used.
									</li>
								</ul>
							</div>
							<div className="space-y-2">
								<p className="font-medium text-foreground">
									Safety limits (normal users)
								</p>
								<p>
									We only allow secure{" "}
									<code className="rounded bg-muted px-1 py-0.5 text-foreground text-xs">
										https
									</code>{" "}
									links, cap file size, and refuse some private and special
									addresses so the feature cannot be abused. If a valid public
									link still fails, try downloading the file and using the{" "}
									<strong className="text-foreground">File</strong> tab instead.
								</p>
							</div>
							<p>
								The file at the URL should follow the same layouts as in the
								examples below (text, CSV, JSON, YAML, or XML).
							</p>
							<ImportFormatExamplesSection />
						</div>
					) : null}
					{topic === "3sual" ? (
						<div className="space-y-4 text-muted-foreground text-sm leading-relaxed">
							<p>
								<strong className="text-foreground">3sual.az</strong> hosts quiz
								packages. This tab loads a list of topics and questions from a
								package you are allowed to access, then fills the bulk editor so
								you can review everything before saving on Xamsa.
							</p>
							<div className="space-y-2">
								<p className="font-medium text-foreground">Who can use this?</p>
								<p>
									Only{" "}
									<strong className="text-foreground">
										moderators and admins
									</strong>{" "}
									on Xamsa see an active 3sual tab. Other people can still use
									Copy/paste, File, or URL.
								</p>
							</div>
							<div className="space-y-2">
								<p className="font-medium text-foreground">
									Supported package types
								</p>
								<p>
									Packages must be for{" "}
									<strong className="text-foreground">Fərdi Oyun</strong> or{" "}
									<strong className="text-foreground">
										Xəmsə Milli İntellektual Oyunu
									</strong>
									. Other game types on 3sual are not supported here.
								</p>
							</div>
							<div className="space-y-2">
								<p className="font-medium text-foreground">
									How to find the package ID
								</p>
								<ol className="list-inside list-decimal space-y-1.5 ps-1">
									<li>Open the package page on 3sual.az in your browser.</li>
									<li>
										Look at the address bar. You will see something like{" "}
										<code className="break-all rounded bg-muted px-1 py-0.5 text-foreground text-xs">
											https://3sual.az/package/3946
										</code>
									</li>
									<li>
										You can paste that whole link here, or type only the number
										(<strong className="text-foreground">3946</strong> in this
										example).
									</li>
								</ol>
							</div>
							<p>
								After loading, check every topic and question in the bulk
								editor. Importing does not publish anything by itself — you
								still confirm creation on Xamsa.
							</p>
						</div>
					) : null}
				</DialogPanel>
				<DialogFooter variant="bare">
					<Button
						onClick={() => onOpenChange(false)}
						type="button"
						variant="secondary"
					>
						Got it
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export function TopicImportDialog({
	open,
	onOpenChange,
	canImport3sual,
	onImported,
}: TopicImportDialogProps) {
	const pasteId = useId();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [activeTab, setActiveTab] = useState("paste");
	const [urlValue, setUrlValue] = useState("");
	const [pasteRaw, setPasteRaw] = useState("");
	const [tsualRaw, setTsualRaw] = useState("");
	const [importHelp, setImportHelp] = useState<ImportHelpTopic | null>(null);

	const {
		mutate: previewRaw,
		isPending: isRawPending,
		reset: resetRawMutation,
	} = useMutation({
		...orpc.topic.previewStructuredImport.mutationOptions(),
	});

	const {
		mutate: previewFromUrl,
		isPending: isUrlPending,
		reset: resetUrlMutation,
	} = useMutation({
		...orpc.topic.previewStructuredImportFromUrl.mutationOptions(),
	});

	const {
		mutate: previewTsual,
		isPending: isTsualPending,
		reset: resetTsualMutation,
	} = useMutation({
		...orpc.tsual.previewImport.mutationOptions(),
	});

	useEffect(() => {
		if (!open) {
			setActiveTab("paste");
			setUrlValue("");
			setPasteRaw("");
			setTsualRaw("");
			resetRawMutation();
			resetUrlMutation();
			resetTsualMutation();
			setImportHelp(null);
		}
	}, [open, resetRawMutation, resetTsualMutation, resetUrlMutation]);

	const applyTopics = useCallback(
		(topics: CreateTopicPayloadType[], meta?: TopicImportMeta) => {
			if (topics.length > BULK_TOPICS_MAX_TSUAL_IMPORT) {
				countError();
				return;
			}
			onImported({ topics, meta });
			onOpenChange(false);
			toast.success(
				meta?.tsualPackageId != null
					? "3sual draft loaded — review before saving."
					: `${String(topics.length)} topic${topics.length === 1 ? "" : "s"} loaded — review before saving.`,
			);
		},
		[onImported, onOpenChange],
	);

	const onLoadFromUrl = () => {
		const u = urlValue.trim();
		if (!u) {
			toast.error("Enter an HTTPS URL.");
			return;
		}
		previewFromUrl(
			{ url: u },
			{
				onSuccess: (data) => applyTopics(data.topics),
				onError: (err) =>
					toastOrpcMutationFailure(err, "Could not load from URL."),
			},
		);
	};

	const onLoadPaste = () => {
		const raw = pasteRaw;
		if (!raw.trim()) {
			toast.error("Paste file contents first.");
			return;
		}
		if (raw.length > STRUCTURED_IMPORT_RAW_MAX) {
			toast.error(
				`Content is too large (max ${String(Math.round(STRUCTURED_IMPORT_RAW_MAX / 1000))}k characters).`,
			);
			return;
		}
		previewRaw(
			{ raw },
			{
				onSuccess: (data) => applyTopics(data.topics),
				onError: (err) =>
					toastOrpcMutationFailure(err, "Could not parse that content."),
			},
		);
	};

	const onFileChosen = (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		e.target.value = "";
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			const text = typeof reader.result === "string" ? reader.result : "";
			if (text.length > STRUCTURED_IMPORT_RAW_MAX) {
				toast.error(
					`File is too large (max ${String(Math.round(STRUCTURED_IMPORT_RAW_MAX / 1000))}k characters).`,
				);
				return;
			}
			previewRaw(
				{ raw: text, filenameHint: file.name },
				{
					onSuccess: (data) => applyTopics(data.topics),
					onError: (err) =>
						toastOrpcMutationFailure(err, "Could not parse that file."),
				},
			);
		};
		reader.onerror = () => toast.error("Could not read the file.");
		reader.readAsText(file);
	};

	const onLoadTsual = () => {
		if (!canImport3sual) return;
		const raw = tsualRaw.trim();
		if (!raw) {
			toast.error("Enter a package ID or 3sual URL.");
			return;
		}
		previewTsual(
			{ raw },
			{
				onSuccess: (data) => {
					if (data.topics.length > BULK_TOPICS_MAX_TSUAL_IMPORT) {
						countError();
						return;
					}
					applyTopics(data.topics, {
						tsualPackageId: data.tsualPackageId,
						sourceLabel: data.sourceName,
					});
				},
				onError: (err) => toastOrpcMutationFailure(err, "3sual import failed."),
			},
		);
	};

	const busy = isRawPending || isUrlPending || isTsualPending;

	return (
		<>
			<Dialog onOpenChange={onOpenChange} open={open}>
				<DialogContent className="sm:max-w-lg" showCloseButton>
					<DialogHeader>
						<DialogTitle>Import topics</DialogTitle>
						<div className="flex flex-col gap-2">
							<DialogDescription>
								Load topics from a public HTTPS file, a local file, pasted text,
								or (for moderators) a 3sual package. Nothing is saved until you
								create topics on the bulk screen.
							</DialogDescription>
							<GuideLink
								label="Full overview — what each option does"
								onClick={() => setImportHelp("overview")}
							/>
						</div>
					</DialogHeader>
					<DialogPanel>
						<Tabs onValueChange={setActiveTab} value={activeTab}>
							<TabsList className="mb-3 w-full flex-wrap">
								<TabsTrigger value="paste">Copy/paste</TabsTrigger>
								<TabsTrigger value="file">File</TabsTrigger>
								<TabsTrigger value="url">URL</TabsTrigger>
								<TabsTrigger
									disabled={!canImport3sual}
									title={
										canImport3sual
											? undefined
											: "3sual import is available to moderators and admins only."
									}
									value="3sual"
								>
									3sual
								</TabsTrigger>
							</TabsList>
							<TabsContent className="space-y-3 pt-1" value="paste">
								<div className="flex flex-wrap items-end justify-between gap-2">
									<Label htmlFor={pasteId}>Paste your file contents here</Label>
									<GuideLink
										disabled={busy}
										onClick={() => setImportHelp("paste")}
									/>
								</div>
								<Textarea
									className="font-mono text-xs"
									id={pasteId}
									onChange={(e) => setPasteRaw(e.target.value)}
									placeholder="Paste everything from a .txt, .csv, .json, .yaml, or .xml file. Xamsa will detect the format automatically."
									rows={10}
									value={pasteRaw}
								/>
								<p className="text-muted-foreground text-xs">
									{pasteRaw.length.toLocaleString()} /{" "}
									{STRUCTURED_IMPORT_RAW_MAX.toLocaleString()} characters
								</p>
								<Button
									className="w-full sm:w-auto"
									disabled={busy || !pasteRaw.trim()}
									onClick={onLoadPaste}
									type="button"
								>
									{isRawPending && activeTab === "paste"
										? "Parsing…"
										: "Parse and load"}
								</Button>
							</TabsContent>
							<TabsContent className="space-y-3 pt-1" value="file">
								<div className="flex flex-wrap items-center justify-between gap-2">
									<p className="font-medium text-foreground text-sm">
										Pick a file from your device
									</p>
									<GuideLink
										disabled={busy}
										onClick={() => setImportHelp("file")}
									/>
								</div>
								<input
									accept=".txt,.csv,.json,.xml,.yaml,.yml,text/*,application/json"
									className="sr-only"
									onChange={onFileChosen}
									ref={fileInputRef}
									type="file"
								/>
								<Button
									className="w-full"
									disabled={busy}
									onClick={() => fileInputRef.current?.click()}
									type="button"
									variant="outline"
								>
									<Upload className="mr-2 size-4" />
									Choose file…
								</Button>
								<p className="text-muted-foreground text-xs">
									.txt, .csv, .json, .xml, .yaml — read in the browser then sent
									for preview (max{" "}
									{String(Math.round(STRUCTURED_IMPORT_RAW_MAX / 1_000_000))}
									MB). Parsing starts as soon as you pick a file.
								</p>
							</TabsContent>
							<TabsContent className="space-y-3 pt-1" value="url">
								<div className="flex flex-wrap items-end justify-between gap-2">
									<Label htmlFor="import-url">Link to a file (HTTPS)</Label>
									<GuideLink
										disabled={busy}
										onClick={() => setImportHelp("url")}
									/>
								</div>
								<div className="space-y-2">
									<Input
										autoComplete="off"
										id="import-url"
										onChange={(e) => setUrlValue(e.target.value)}
										placeholder="https://example.com/your-file.txt"
										value={urlValue}
									/>
									<p className="text-muted-foreground text-xs">
										Must be a secure https link to a file the public internet
										can download — not a login page.
									</p>
								</div>
								<Button
									className="w-full sm:w-auto"
									disabled={busy || !urlValue.trim()}
									onClick={onLoadFromUrl}
									type="button"
								>
									{isUrlPending && activeTab === "url"
										? "Fetching…"
										: "Load from URL"}
								</Button>
							</TabsContent>
							<TabsContent className="space-y-3 pt-1" value="3sual">
								{canImport3sual ? (
									<>
										<div className="flex flex-wrap items-center justify-between gap-2">
											<div className="flex items-center gap-1">
												<Label className="font-medium" htmlFor="import-tsual">
													Package ID or 3sual link
												</Label>
												<button
													aria-label="Open 3sual import guide"
													className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground"
													onClick={() => setImportHelp("3sual")}
													type="button"
												>
													<CircleHelp className="size-4" />
												</button>
											</div>
											<GuideLink
												disabled={busy}
												label="Full guide"
												onClick={() => setImportHelp("3sual")}
											/>
										</div>
										<Input
											autoComplete="off"
											id="import-tsual"
											onChange={(e) => setTsualRaw(e.target.value)}
											placeholder="3946 or https://3sual.az/package/3946"
											value={tsualRaw}
										/>
										<Button
											className="w-full sm:w-auto"
											disabled={busy || !tsualRaw.trim()}
											onClick={onLoadTsual}
											type="button"
										>
											{isTsualPending && activeTab === "3sual"
												? "Loading…"
												: "Load preview"}
										</Button>
									</>
								) : (
									<div className="space-y-3">
										<p className="text-muted-foreground text-sm leading-relaxed">
											3sual import is available to moderators and admins. You
											can still use Copy/paste, File, or URL in the other tabs.
										</p>
										<GuideLink
											label="What is 3sual import?"
											onClick={() => setImportHelp("3sual")}
										/>
									</div>
								)}
							</TabsContent>
						</Tabs>
					</DialogPanel>
					<DialogFooter>
						<Button
							onClick={() => onOpenChange(false)}
							type="button"
							variant="outline"
						>
							Close
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<ImportHelpDialog
				onOpenChange={(next) => {
					if (!next) setImportHelp(null);
				}}
				open={importHelp !== null}
				topic={importHelp}
			/>
		</>
	);
}
