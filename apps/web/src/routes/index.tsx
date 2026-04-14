import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	head: () => ({
		meta: [{ title: "Ali Mammadzadeh" }],
	}),
	component: HomeComponent,
});

function HomeComponent() {
	return (
		<div className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-black">
			<div className="absolute inset-0">
				<img
					src="/images/mammadzade_cars.jpg"
					alt="Ali Mammadzadeh's cars"
					className="h-full w-full scale-105 object-cover blur-sm"
				/>
				<div className="absolute inset-0 bg-black/60" />
			</div>
			<div className="relative z-10 h-full w-full">
				<img
					src="/images/mammadzade_cars.jpg"
					alt="Ali Mammadzadeh's cars"
					className="h-full w-full object-contain"
				/>
				<div className="absolute inset-0 bg-black/40" />
			</div>
			<div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
				<h1 className="font-heading text-4xl text-white uppercase tracking-[0.2em] sm:text-6xl">
					Coming Soon...
				</h1>
			</div>
		</div>
	);
}
