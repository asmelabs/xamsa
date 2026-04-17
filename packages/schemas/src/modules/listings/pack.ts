import type { Prisma } from "@xamsa/db";
import { definePeriod } from "../../common/period.schema";
import { defineSearch } from "../../common/search.schema";
import { defineSorting } from "../../common/sorting";

export const packSort = defineSorting<Prisma.PackOrderByWithRelationInput>()({
	values: {
		newest: { createdAt: "desc" },
		oldest: { createdAt: "asc" },
		popular: { totalPlays: "desc" },
		best: { averageRating: "desc" },
		largest: { topics: { _count: "desc" } },
	},
	default: "newest",
});

export const packSearch = defineSearch<Prisma.PackWhereInput>([
	"name",
	"description",
]);

export const packPeriod = definePeriod<Prisma.PackWhereInput>("createdAt");
