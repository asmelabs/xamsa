import { createFileRoute, Link } from "@tanstack/react-router";
import { pageSeo } from "@/lib/seo";

export const Route = createFileRoute("/legal/privacy-policy")({
	head: () =>
		pageSeo({
			title: "Privacy policy",
			description:
				"How Xamsa collects, uses, and protects your data when you use our live quiz platform, including auth, hosting, email, and optional analytics.",
			path: "/legal/privacy-policy",
			keywords:
				"Xamsa privacy, data policy, quiz app privacy, GDPR, personal data",
			jsonLd: {
				"@context": "https://schema.org",
				"@type": "WebPage",
				name: "Privacy policy — Xamsa",
				description:
					"How Xamsa handles personal data including account information, gameplay, and integrations.",
			},
		}),
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="container mx-auto max-w-2xl py-10">
			<h1 className="font-bold text-2xl tracking-tight">Privacy policy</h1>
			<p className="mt-2 text-muted-foreground text-sm">
				Last updated April 30, 2026
			</p>

			<div className="mt-8 space-y-5 text-muted-foreground text-sm leading-relaxed">
				<p className="text-foreground">
					Xamsa (“we”, “us”) provides a social, real-time quiz platform. This
					policy describes what we process when you use the service. It is
					general information, not legal advice. If you need help, contact us
					through the support channel shown in the product.
				</p>

				<section className="space-y-2">
					<h2 className="font-semibold text-base text-foreground">
						Account and authentication
					</h2>
					<p>
						We use{" "}
						<a
							className="text-foreground underline underline-offset-2"
							href="https://www.better-auth.com"
							rel="noopener noreferrer"
							target="_blank"
						>
							Better Auth
						</a>{" "}
						for sign-up, sign-in, email verification, password reset, and OAuth.
						If you choose Google, Google receives standard OAuth metadata as
						part of that flow.
					</p>
				</section>

				<section className="space-y-2">
					<h2 className="font-semibold text-base text-foreground">
						Data we store
					</h2>
					<p>
						Application data — including your profile, packs, topics, questions,
						gameplay history, and moderated public content — is stored in our
						PostgreSQL databases. We retain it as needed to run the service and
						meet legal obligations.
					</p>
				</section>

				<section className="space-y-2">
					<h2 className="font-semibold text-base text-foreground">Realtime</h2>
					<p>
						Live gameplay features may use{" "}
						<a
							className="text-foreground underline underline-offset-2"
							href="https://ably.com"
							rel="noopener noreferrer"
							target="_blank"
						>
							Ably
						</a>{" "}
						for realtime messaging between clients and servers.
					</p>
				</section>

				<section className="space-y-2">
					<h2 className="font-semibold text-base text-foreground">
						Email and notifications
					</h2>
					<p>
						Transactional email (verification, password reset, and certain
						notices) may be sent through{" "}
						<a
							className="text-foreground underline underline-offset-2"
							href="https://resend.com"
							rel="noopener noreferrer"
							target="_blank"
						>
							Resend
						</a>
						. You can stop marketing-style messages where we offer opt-out;
						operational messages related to security or your account may still
						be sent.
					</p>
				</section>

				<section className="space-y-2">
					<h2 className="font-semibold text-base text-foreground">Media</h2>
					<p>
						Profile images may be processed and delivered using{" "}
						<a
							className="text-foreground underline underline-offset-2"
							href="https://cloudinary.com"
							rel="noopener noreferrer"
							target="_blank"
						>
							Cloudinary
						</a>
						.
					</p>
				</section>

				<section className="space-y-2">
					<h2 className="font-semibold text-base text-foreground">Analytics</h2>
					<p>
						Where enabled by configuration, we may use{" "}
						<a
							className="text-foreground underline underline-offset-2"
							href="https://posthog.com"
							rel="noopener noreferrer"
							target="_blank"
						>
							PostHog
						</a>{" "}
						for product analytics. You may control trackers through your browser
						settings where applicable.
					</p>
				</section>

				<section className="space-y-2">
					<h2 className="font-semibold text-base text-foreground">
						Optional AI-assisted features
					</h2>
					<p>
						If enabled, helpers that suggest quiz topics may call Google’s
						Gemini API. Request content is limited to what you submit for that
						feature; avoid pasting secrets or unnecessary personal information.
					</p>
				</section>

				<section className="space-y-2">
					<h2 className="font-semibold text-base text-foreground">
						Public content and moderation
					</h2>
					<p>
						Published packs and other content you submit may be visible to other
						users. We may moderate material that violates rules or poses safety
						risks.
					</p>
				</section>

				<section className="space-y-2">
					<h2 className="font-semibold text-base text-foreground">
						Your choices
					</h2>
					<p>
						You can access and update profile information while signed in. You
						may ask about deletion or data portability through support;
						verification may be required.
					</p>
				</section>

				<section className="space-y-2 border-border border-t pt-4">
					<p className="text-muted-foreground text-xs">
						See also:{" "}
						<Link
							className="text-foreground underline underline-offset-2"
							to="/legal/terms-of-service"
						>
							Terms of Service
						</Link>
					</p>
				</section>
			</div>
		</div>
	);
}
