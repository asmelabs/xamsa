/**
 * On Vercel, `waitUntil` extends the function lifetime so work can finish after the
 * HTTP response is sent. Locally, the promise is still run (no waitUntil); avoid
 * relying on it for correctness when the process may exit.
 */
export function scheduleWhenResponseSent(task: () => Promise<void>): void {
	const promise = task();
	const run = () => {
		promise.catch((err) => {
			console.error("[scheduleWhenResponseSent]", err);
		});
	};

	if (process.env.VERCEL === "1" || process.env.VERCEL) {
		void import("@vercel/functions")
			.then(({ waitUntil }) => {
				waitUntil(promise);
			})
			.catch(() => {
				run();
			});
	} else {
		run();
	}
}
