import type { Prisma } from "@xamsa/db";
import { definePeriod } from "../../common/period.schema";
import { defineSearch } from "../../common/search.schema";
import { defineSorting } from "../../common/sorting";

export const topicSort = defineSorting<Prisma.TopicOrderByWithRelationInput>()({
	values: {
		default: {
			order: "asc",
		},
	},
	default: "default",
});

export const topicSearch = defineSearch<Prisma.TopicWhereInput>([
	"name",
	"description",
]);

export const topicPeriod = definePeriod<Prisma.TopicWhereInput>("createdAt");
