import { Link, useRouter } from "@tanstack/react-router";
import { Button } from "@xamsa/ui/components/button";

export function PackNotFound() {
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
