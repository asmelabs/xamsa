import { Button } from "@xamsa/ui/components/button";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@xamsa/ui/components/input-group";
import { Label } from "@xamsa/ui/components/label";
import { SearchIcon, XIcon } from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";
import { useId } from "react";

interface SearchBarProps
	extends Omit<
		React.ComponentProps<typeof InputGroupInput>,
		"value" | "onChange"
	> {
	queryKey?: string;
	queryDefaultValue?: string;

	groupClassName?: string;
	containerClassName?: string;

	label?: string;
	labelClassName?: string;

	showSearchIcon?: boolean;
	searchAddonClassName?: string;
	searchIconClassName?: string;

	showClearButton?: boolean;
	clearAddonClassName?: string;
	clearIconClassName?: string;
	clearButtonClassName?: string;

	onChangeCallback?: (value: string) => void;
	onClearCallback?: (value: string) => void;
}

export function SearchBar({
	queryKey = "q",
	queryDefaultValue = "",
	children,
	containerClassName,
	groupClassName,
	label,
	labelClassName,
	showSearchIcon = true,
	showClearButton = true,
	searchAddonClassName,
	searchIconClassName,
	clearAddonClassName,
	clearIconClassName,
	clearButtonClassName,
	onChangeCallback,
	onClearCallback,
	...props
}: SearchBarProps) {
	const id = useId();

	const [search, setSearch] = useQueryState(
		queryKey,
		parseAsString.withDefault(queryDefaultValue),
	);

	const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const value = event.target.value;

		setSearch(value);
		onChangeCallback?.(value);
	};

	const handleClear = () => {
		onClearCallback?.(search);

		setSearch("");
		onChangeCallback?.("");
	};

	return (
		<div className={containerClassName}>
			{label && (
				<Label htmlFor={id} className={labelClassName}>
					{label}
				</Label>
			)}
			<InputGroup className={groupClassName}>
				{showSearchIcon && (
					<InputGroupAddon
						align="inline-start"
						className={searchAddonClassName}
					>
						<SearchIcon className={searchIconClassName} />
					</InputGroupAddon>
				)}
				<InputGroupInput
					id={id}
					placeholder="Search..."
					value={search}
					onChange={handleChange}
					{...props}
				/>
				{showClearButton && search && (
					<InputGroupAddon align="inline-end" className={clearAddonClassName}>
						<Button
							size="icon"
							variant="ghost"
							onClick={handleClear}
							className={clearButtonClassName}
						>
							<XIcon className={clearIconClassName} />
						</Button>
					</InputGroupAddon>
				)}
				{children}
			</InputGroup>
		</div>
	);
}
