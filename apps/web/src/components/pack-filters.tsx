import { PackLanguageSchema } from "@xamsa/schemas/db/schemas/enums/PackLanguage.schema";
import { packSort } from "@xamsa/schemas/modules/listings/pack";
import { PackDifficultyBandSchema } from "@xamsa/schemas/modules/pack";
import { Badge } from "@xamsa/ui/components/badge";
import { Button } from "@xamsa/ui/components/button";
import { Checkbox } from "@xamsa/ui/components/checkbox";
import { Label } from "@xamsa/ui/components/label";
import {
	NumberField,
	NumberFieldDecrement,
	NumberFieldGroup,
	NumberFieldIncrement,
	NumberFieldInput,
} from "@xamsa/ui/components/number-field";
import {
	Select,
	SelectItem,
	SelectPopup,
	SelectTrigger,
	SelectValue,
} from "@xamsa/ui/components/select";
import { Switch } from "@xamsa/ui/components/switch";
import { formatCase } from "@xamsa/utils/case-formatters";
import { FilterIcon } from "lucide-react";
import {
	parseAsArrayOf,
	parseAsBoolean,
	parseAsFloat,
	parseAsInteger,
	parseAsStringLiteral,
	useQueryState,
} from "nuqs";
import { useSortQuery } from "@/hooks/use-sort-query";
import { BetterDialog } from "./better-dialog";

interface PackFiltersProps {
	isAuthenticated: boolean;
}

const LANGUAGE_LABELS: Record<
	(typeof PackLanguageSchema.options)[number],
	string
> = {
	az: "Azərbaycanca",
	en: "English",
	ru: "Русский",
	tr: "Türkçe",
};

const DIFFICULTY_LABELS: Record<
	(typeof PackDifficultyBandSchema.options)[number],
	{ label: string; hint: string }
> = {
	easy: { label: "Easy", hint: "PDR 0–2.25" },
	medium: { label: "Medium", hint: "PDR 2.25–4.5" },
	hard: { label: "Hard", hint: "PDR 4.5–6.75" },
	expert: { label: "Expert", hint: "PDR 6.75–9" },
};

export function PackFilters({ isAuthenticated }: PackFiltersProps) {
	const [filtersOpened, setFiltersOpened] = useQueryState(
		"pack-filters-opened",
		parseAsBoolean.withDefault(false),
	);

	const { sort, setSort } = useSortQuery(
		packSort.options,
		packSort.defaultOption,
	);
	const [minPlays, setMinPlays] = useQueryState(
		"min_plays",
		parseAsInteger.withDefault(0),
	);
	const [minTopicCount, setMinTopicCount] = useQueryState(
		"min_topics",
		parseAsInteger.withDefault(0),
	);
	const [minAverageRating, setMinAverageRating] = useQueryState(
		"min_average_rating",
		parseAsFloat.withDefault(0),
	);
	const [hasRatings, setHasRatings] = useQueryState(
		"has_ratings",
		parseAsBoolean.withDefault(false),
	);
	const [onlyMyPacks, setOnlyMyPacks] = useQueryState(
		"only_my_packs",
		parseAsBoolean.withDefault(false),
	);
	const [canHost, setCanHost] = useQueryState(
		"can_host",
		parseAsBoolean.withDefault(false),
	);
	const [hideFinishedByMe, setHideFinishedByMe] = useQueryState(
		"hide_finished",
		parseAsBoolean.withDefault(false),
	);
	const [languages, setLanguages] = useQueryState(
		"language",
		parseAsArrayOf(
			parseAsStringLiteral(PackLanguageSchema.options),
		).withDefault([]),
	);
	const [difficultyBands, setDifficultyBands] = useQueryState(
		"difficulty",
		parseAsArrayOf(
			parseAsStringLiteral(PackDifficultyBandSchema.options),
		).withDefault([]),
	);

	const hasFilters =
		minPlays > 0 ||
		minTopicCount > 0 ||
		minAverageRating > 0 ||
		hasRatings ||
		onlyMyPacks ||
		canHost ||
		hideFinishedByMe ||
		languages.length > 0 ||
		difficultyBands.length > 0;

	const toggleLanguage = (
		value: (typeof PackLanguageSchema.options)[number],
	) => {
		const next = languages.includes(value)
			? languages.filter((v) => v !== value)
			: [...languages, value];
		void setLanguages(next.length === 0 ? null : next);
	};

	const toggleDifficulty = (
		value: (typeof PackDifficultyBandSchema.options)[number],
	) => {
		const next = difficultyBands.includes(value)
			? difficultyBands.filter((v) => v !== value)
			: [...difficultyBands, value];
		void setDifficultyBands(next.length === 0 ? null : next);
	};

	const handleReset = () => {
		setMinPlays(0);
		setMinTopicCount(0);
		setMinAverageRating(0);
		setHasRatings(false);
		setOnlyMyPacks(false);
		setCanHost(false);
		setHideFinishedByMe(false);
		void setLanguages(null);
		void setDifficultyBands(null);

		setFiltersOpened(false);
	};

	return (
		<div className="mx-auto flex max-w-xl items-center justify-end gap-2">
			<BetterDialog
				opened={filtersOpened}
				setOpened={(opened) => setFiltersOpened(opened ?? false)}
				submit={
					<Button variant="destructive" onClick={handleReset}>
						Reset
					</Button>
				}
				trigger={
					<Button variant="outline">
						<FilterIcon />
						Filters
						{hasFilters && <Badge className="ml-auto">On</Badge>}
					</Button>
				}
				title="Pack filters"
				description="Narrow the directory by language, difficulty, plays, topics, and ratings."
				panelClassName="space-y-4"
			>
				<div className="space-y-2">
					<Label>Languages</Label>
					<p className="text-muted-foreground text-sm">
						Show packs in any of the selected languages.
					</p>
					<div className="grid grid-cols-2 gap-2">
						{PackLanguageSchema.options.map((value) => {
							const checked = languages.includes(value);
							const id = `lang-${value}`;
							return (
								<label
									key={value}
									htmlFor={id}
									className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm transition-colors hover:bg-muted/40 has-data-checked:border-primary/40 has-data-checked:bg-primary/5"
								>
									<Checkbox
										id={id}
										checked={checked}
										onCheckedChange={() => toggleLanguage(value)}
									/>
									<span>{LANGUAGE_LABELS[value]}</span>
								</label>
							);
						})}
					</div>
				</div>
				<div className="space-y-2">
					<Label>Difficulty</Label>
					<p className="text-muted-foreground text-sm">
						Pick one or more bands. Bands are mapped from PDR (0–9).
					</p>
					<div className="grid grid-cols-2 gap-2">
						{PackDifficultyBandSchema.options.map((value) => {
							const checked = difficultyBands.includes(value);
							const id = `diff-${value}`;
							const meta = DIFFICULTY_LABELS[value];
							return (
								<label
									key={value}
									htmlFor={id}
									className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm transition-colors hover:bg-muted/40 has-data-checked:border-primary/40 has-data-checked:bg-primary/5"
								>
									<Checkbox
										id={id}
										checked={checked}
										onCheckedChange={() => toggleDifficulty(value)}
									/>
									<div className="flex flex-col leading-tight">
										<span>{meta.label}</span>
										<span className="text-muted-foreground text-xs">
											{meta.hint}
										</span>
									</div>
								</label>
							);
						})}
					</div>
				</div>
				<div className="space-y-2">
					<Label htmlFor="min-topics">Minimum topics</Label>
					<p className="text-muted-foreground text-sm">
						Hide tiny packs. Set to 0 to include every pack.
					</p>
					<NumberField
						id="min-topics"
						value={minTopicCount}
						onValueChange={(value) => setMinTopicCount(value ?? 0)}
						min={0}
					>
						<NumberFieldGroup>
							<NumberFieldDecrement />
							<NumberFieldInput />
							<NumberFieldIncrement />
						</NumberFieldGroup>
					</NumberField>
				</div>
				<div className="space-y-2">
					<Label htmlFor="min-plays">Minimum plays</Label>
					<p className="text-muted-foreground text-sm">
						Minimum number of completed game plays with the pack.
					</p>
					<NumberField
						id="min-plays"
						value={minPlays}
						onValueChange={(value) => setMinPlays(value ?? 0)}
						min={0}
					>
						<NumberFieldGroup>
							<NumberFieldDecrement />
							<NumberFieldInput />
							<NumberFieldIncrement />
						</NumberFieldGroup>
					</NumberField>
				</div>
				<div className="space-y-2">
					<Label htmlFor="min-average-rating">Minimum average rating</Label>
					<p className="text-muted-foreground text-sm">
						The minimum average rating of the pack. Packs without any ratings
						are considered as having a rating of 0.
					</p>
					<NumberField
						id="min-average-rating"
						value={minAverageRating}
						onValueChange={(value) => setMinAverageRating(value ?? 0)}
						min={0}
						max={5}
						step={0.1}
					>
						<NumberFieldGroup>
							<NumberFieldDecrement />
							<NumberFieldInput />
							<NumberFieldIncrement />
						</NumberFieldGroup>
					</NumberField>
				</div>
				<div className="space-y-2">
					<Label htmlFor="has-ratings">Has ratings</Label>
					<div className="flex items-center gap-2">
						<Switch
							id="has-ratings"
							checked={hasRatings}
							onCheckedChange={(checked) => setHasRatings(checked ?? false)}
						/>
						<p className="text-muted-foreground text-sm">
							Whether to filter packs that have any ratings.
						</p>
					</div>
				</div>
				{isAuthenticated && (
					<div className="space-y-2">
						<Label htmlFor="only-my-packs">Only my packs</Label>
						<div className="flex items-center gap-2">
							<Switch
								id="only-my-packs"
								checked={onlyMyPacks}
								onCheckedChange={(checked) => setOnlyMyPacks(checked ?? false)}
							/>
							<p className="text-muted-foreground text-sm">
								See only packs you have created.
							</p>
						</div>
					</div>
				)}
				{isAuthenticated && (
					<div className="space-y-2">
						<Label htmlFor="can-host">Can host</Label>
						<div className="flex items-center gap-2">
							<Switch
								id="can-host"
								checked={canHost}
								onCheckedChange={(checked) => setCanHost(checked ?? false)}
							/>
							<p className="text-muted-foreground text-sm">
								Published packs you can start a live game from (yours, or
								community packs that allow others to host).
							</p>
						</div>
					</div>
				)}
				{isAuthenticated && (
					<div className="space-y-2">
						<Label htmlFor="hide-finished">Hide ones I've finished</Label>
						<div className="flex items-center gap-2">
							<Switch
								id="hide-finished"
								checked={hideFinishedByMe}
								onCheckedChange={(checked) =>
									setHideFinishedByMe(checked ?? false)
								}
							/>
							<p className="text-muted-foreground text-sm">
								Hide packs that you've already played to completion as host or
								player.
							</p>
						</div>
					</div>
				)}
			</BetterDialog>
			<Select
				value={sort}
				onValueChange={(value) =>
					setSort(value as (typeof packSort.options)[number])
				}
			>
				<SelectTrigger className="w-45 md:w-40">
					<SelectValue placeholder="Sort by">
						{formatCase(sort, "snake", "title")} first
					</SelectValue>
				</SelectTrigger>
				<SelectPopup>
					{packSort.options.map((option) => (
						<SelectItem key={option} value={option}>
							{formatCase(option, "snake", "title")}
						</SelectItem>
					))}
				</SelectPopup>
			</Select>
		</div>
	);
}
