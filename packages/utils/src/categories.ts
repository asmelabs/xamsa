export const CATEGORY_DEPTHS = [0, 1, 2, 3] as const;
export type CategoryDepth = (typeof CATEGORY_DEPTHS)[number];

export const LEAF_CATEGORY_DEPTH = CATEGORY_DEPTHS[
	CATEGORY_DEPTHS.length - 1
] as unknown as CategoryDepth;

export type Category = {
	slug: string; // globally unique
	name: string;
	description?: string;
	wiki?: string; // wikipedia url
	parent: string | null;
	depth: CategoryDepth;
};

export const categories = {
	// DEPTH=0
	science_nature: {
		slug: "science_nature",
		name: "Science & Nature",
		parent: null,
		depth: 0,
	},
	math_logic: {
		slug: "math_logic",
		name: "Mathematics & Logic",
		parent: null,
		depth: 0,
	},
	tech: {
		slug: "tech",
		name: "Technology",
		parent: null,
		depth: 0,
	},
	medicine_health: {
		slug: "medicine_health",
		name: "Medicine & Health",
		parent: null,
		depth: 0,
	},
	psychology_social: {
		slug: "psychology_social",
		name: "Psychology & Social",
		parent: null,
		depth: 0,
	},
	history: {
		slug: "history",
		name: "History",
		parent: null,
		depth: 0,
	},
	geography: {
		slug: "geography",
		name: "Geography",
		parent: null,
		depth: 0,
	},
	politics_government: {
		slug: "politics_government",
		name: "Politics & Government",
		parent: null,
		depth: 0,
	},
	economics_business: {
		slug: "economics_business",
		name: "Economics & Business",
		parent: null,
		depth: 0,
	},
	religion_spirituality: {
		slug: "religion_spirituality",
		name: "Religion & Spirituality",
		parent: null,
		depth: 0,
	},
	mythology_folklore: {
		slug: "mythology_folklore",
		name: "Mythology & Folklore",
		parent: null,
		depth: 0,
	},
	philosophy: {
		slug: "philosophy",
		name: "Philosophy",
		parent: null,
		depth: 0,
	},
	literature: {
		slug: "literature",
		name: "Literature",
		parent: null,
		depth: 0,
	},
	visual_arts: {
		slug: "visual_arts",
		name: "Visual Arts",
		parent: null,
		depth: 0,
	},
	music: {
		slug: "music",
		name: "Music",
		parent: null,
		depth: 0,
	},
	film_tv: {
		slug: "film_tv",
		name: "Film & TV",
		parent: null,
		depth: 0,
	},
	theatre_performing_arts: {
		slug: "theatre_performing_arts",
		name: "Theatre & Performing Arts",
		parent: null,
		depth: 0,
	},
	architecture_design: {
		slug: "architecture_design",
		name: "Architecture & Design",
		parent: null,
		depth: 0,
	},
	sports: {
		slug: "sports",
		name: "Sports",
		parent: null,
		depth: 0,
	},
	games_recreation: {
		slug: "games_recreation",
		name: "Games & Recreation",
		parent: null,
		depth: 0,
	},
	food_drink: {
		slug: "food_drink",
		name: "Food & Drink",
		parent: null,
		depth: 0,
	},
	language_linguistics: {
		slug: "language_linguistics",
		name: "Language & Linguistics",
		parent: null,
		depth: 0,
	},
	society_culture: {
		slug: "society_culture",
		name: "Society & Culture",
		parent: null,
		depth: 0,
	},
	people_personalities: {
		slug: "people_personalities",
		name: "People & Personalities",
		parent: null,
		depth: 0,
	},
	miscellaneous: {
		slug: "miscellaneous",
		name: "Miscellaneous",
		parent: null,
		depth: 0,
	},

	// DEPTH=1
	biology: {
		slug: "biology",
		name: "Biology",
		parent: "science_nature",
		depth: 1,
	},
	chemistry: {
		slug: "chemistry",
		name: "Chemistry",
		parent: "science_nature",
		depth: 1,
	},
} as const satisfies Record<string, Category>;

export type CategorySlug = keyof typeof categories;

export function getCategoryPath(slug: CategorySlug): string {
	const cat = categories[slug];
	if (!cat) throw new Error(`Unknown category: ${slug}`);
	if (cat.parent === null) return cat.slug;
	return `${getCategoryPath(cat.parent)}/${cat.slug}`;
}

export function getDescendantSlugs(parentSlug: CategorySlug): CategorySlug[] {
	const direct = Object.values(categories)
		.filter((c) => c.parent === parentSlug)
		.map((c) => c.slug);

	return direct.concat(direct.flatMap(getDescendantSlugs));
}

export function getAncestorSlugs(slug: CategorySlug): CategorySlug[] {
	const ancestors: CategorySlug[] = [];
	let current = categories[slug].parent;
	while (current !== null) {
		ancestors.push(current as CategorySlug);
		current = categories[current as CategorySlug].parent;
	}
	return ancestors.reverse(); // root first
}

export function isValidCategorySlug(slug: string): slug is CategorySlug {
	return slug in categories;
}

export function getCategoriesForAiPrompt(): string {
	return Object.values(categories)
		.sort((a, b) =>
			getCategoryPath(a.slug).localeCompare(getCategoryPath(b.slug)),
		)
		.map((c) => getCategoryPath(c.slug))
		.join("\n");
}

export function getCategoryBySlug(slug: CategorySlug): Category {
	const cat = categories[slug];
	if (!cat) throw new Error(`Unknown category: ${slug}`);
	return cat;
}
