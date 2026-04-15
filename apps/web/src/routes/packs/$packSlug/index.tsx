import {
	createFileRoute,
	Link,
	notFound,
	useRouter,
} from "@tanstack/react-router";
import { Badge } from "@xamsa/ui/components/badge";
import { Button } from "@xamsa/ui/components/button";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@xamsa/ui/components/card";
import { format } from "date-fns";
import { Globe, Lock, Play, Star, Trophy, Users } from "lucide-react";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/packs/$packSlug/")({
	component: RouteComponent,
	notFoundComponent: PackNotFound,
	loader: async ({ params }) => {
		try {
			return await orpc.pack.findOne.call({ slug: params.packSlug });
		} catch {
			throw notFound();
		}
	},
	head: ({ loaderData }) => ({
		meta: [
			{ title: loaderData ? `${loaderData.name} — Xamsa` : "Pack — Xamsa" },
			{
				name: "description",
				content: loaderData?.description || "A pack of questions and answers",
			},
			{
				name: "og:title",
				content: loaderData
					? `${loaderData.name} by ${loaderData.author.name} — Xamsa`
					: "Pack — Xamsa",
			},
			{
				name: "og:description",
				content: loaderData?.description || "A pack of questions and answers",
			},
		],
	}),
});

const statusConfig = {
	draft: { label: "Draft", variant: "outline" },
	published: { label: "Published", variant: "success" },
	disabled: { label: "Disabled", variant: "warning" },
	archived: { label: "Archived", variant: "info" },
} as const;

const languageLabels: Record<string, string> = {
	az: "Azerbaijani",
	en: "English",
	ru: "Russian",
	tr: "Turkish",
};

function PackNotFound() {
	const router = useRouter();

	return (
		<div className="container mx-auto flex max-w-3xl flex-col items-center gap-4 py-20 text-center">
			<p className="font-bold text-6xl">404</p>
			<h1 className="font-semibold text-xl">Pack not found</h1>
			<p className="text-muted-foreground">
				The pack you're looking for doesn't exist or you don't have access to
				it.
			</p>
			<div className="flex gap-2">
				<Button variant="outline" onClick={() => router.history.back()}>
					Go back
				</Button>
				<Button render={<Link to="/packs" />}>Browse packs</Button>
			</div>
		</div>
	);
}

function RouteComponent() {
	const pack = Route.useLoaderData();

	const status = statusConfig[pack.status];
	const isPrivate = pack.visibility === "private";
	const hasRatings = pack.totalRatings > 0;

	return (
		<div className="container mx-auto max-w-3xl space-y-6 py-10">
			<div className="space-y-3">
				<div className="flex flex-wrap items-center gap-2">
					<Badge variant={status.variant}>{status.label}</Badge>
					<Badge variant="outline">
						{isPrivate ? (
							<Lock className="size-3" />
						) : (
							<Globe className="size-3" />
						)}
						{isPrivate ? "Private" : "Public"}
					</Badge>
					<Badge variant="outline">
						{languageLabels[pack.language] ?? pack.language}
					</Badge>
					<Badge variant="outline">
						Total {pack._count.topics}{" "}
						{pack._count.topics === 1 ? "topic" : "topics"}
					</Badge>
				</div>

				<h1 className="font-bold text-3xl tracking-tight">{pack.name}</h1>

				{pack.description && (
					<p className="text-muted-foreground">{pack.description}</p>
				)}

				<p className="text-muted-foreground text-sm">
					by{" "}
					<Link
						to="/u/$username"
						params={{ username: pack.author.username }}
						className="font-medium text-foreground hover:underline"
					>
						{pack.author.name}
					</Link>
					<span className="mx-1.5">·</span>
					{format(pack.createdAt, "dd MMMM yyyy")}
				</p>
			</div>

			<div className="grid grid-cols-3 gap-3">
				<StatCard
					icon={<Play className="size-4" />}
					label="Plays"
					value={pack.totalPlays.toLocaleString()}
				/>
				<StatCard
					icon={<Star className="size-4" />}
					label="Rating"
					value={hasRatings ? pack.averageRating.toFixed(1) : "—"}
					sub={hasRatings ? `${pack.totalRatings} ratings` : "No ratings yet"}
				/>
				<StatCard
					icon={<Users className="size-4" />}
					label="Reviews"
					value={pack.totalRatings.toLocaleString()}
				/>
			</div>

			{pack.status === "published" && (
				<Button
					size="lg"
					className="w-full"
					render={<Link to="/play" search={{ pack: pack.slug }} />}
				>
					<Trophy />
					Play this pack
				</Button>
			)}
		</div>
	);
}

function StatCard({
	icon,
	label,
	value,
	sub,
}: {
	icon: React.ReactNode;
	label: string;
	value: string;
	sub?: string;
}) {
	return (
		<Card>
			<CardHeader className="items-center p-4 text-center">
				<CardDescription className="flex items-center gap-1.5">
					{icon}
					{label}
				</CardDescription>
				<CardTitle>{value}</CardTitle>
				{sub && <CardDescription className="text-xs">{sub}</CardDescription>}
			</CardHeader>
		</Card>
	);
}
