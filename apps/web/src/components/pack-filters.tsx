import { packSort } from "@xamsa/schemas/modules/listings/pack";
import { Badge } from "@xamsa/ui/components/badge";
import { Button } from "@xamsa/ui/components/button";
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
	SelectContent,
	SelectItem,
	SelectPopup,
	SelectTrigger,
	SelectValue,
} from "@xamsa/ui/components/select";
import { Switch } from "@xamsa/ui/components/switch";
import { formatCase, toCase } from "@xamsa/utils/case-formatters";
import { FilterIcon } from "lucide-react";
import {
	parseAsBoolean,
	parseAsFloat,
	parseAsInteger,
	useQueryState,
} from "nuqs";
import { useSortQuery } from "@/hooks/use-sort-query";
import { BetterDialog } from "./better-dialog";

export function PackFilters() {
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
	const [minAverageRating, setMinAverageRating] = useQueryState(
		"min_average_rating",
		parseAsFloat.withDefault(0),
	);
	const [hasRatings, setHasRatings] = useQueryState(
		"has_ratings",
		parseAsBoolean.withDefault(false),
	);

	const hasFilters = minPlays > 0 || minAverageRating > 0 || hasRatings;

	const handleReset = () => {
		setMinPlays(0);
		setMinAverageRating(0);
		setHasRatings(false);

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
				description="Filter packs by plays and ratings"
				panelClassName="space-y-4"
			>
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
