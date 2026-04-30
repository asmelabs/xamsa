import { createFileRoute, Link } from "@tanstack/react-router";
import { pageSeo } from "@/lib/seo";

export const Route = createFileRoute("/legal/terms-of-service")({
	head: () =>
		pageSeo({
			title: "Terms of Service",
			description:
				"Terms for using Xamsa’s live multiplayer quiz platform, including eligibility, acceptable use, disclaimers, and limitation of liability.",
			path: "/legal/terms-of-service",
			keywords: "Xamsa terms, user agreement, acceptable use, disclaimer",
			jsonLd: {
				"@context": "https://schema.org",
				"@type": "WebPage",
				name: "Terms of Service — Xamsa",
				description:
					"Agreement governing use of the Xamsa quiz and party game service.",
			},
		}),
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="container mx-auto max-w-2xl py-10">
			<h1 className="font-bold text-2xl tracking-tight">Terms of Service</h1>
			<p className="mt-2 text-muted-foreground text-sm">
				Last updated April 30, 2026
			</p>

			<div className="mt-8 space-y-5 text-muted-foreground text-sm leading-relaxed">
				<p className="text-foreground">
					These Terms of Service (“Terms”) govern your access to Xamsa. By
					creating an account or using the service — including signup and login
					with Better Auth, or Google OAuth — you agree to these Terms. This
					text is informational and is not legal advice; read carefully or
					consult your own advisor if unsure.
				</p>

				<section className="space-y-2">
					<h2 className="font-semibold text-base text-foreground">
						The service
					</h2>
					<p>
						Xamsa offers tools to build question packs and host realtime quiz
						games with others (including realtime features powered by
						infrastructure such as Ably). Features may change, and we cannot
						guarantee uninterrupted or error-free operation.
					</p>
				</section>

				<section className="space-y-2">
					<h2 className="font-semibold text-base text-foreground">
						Eligibility
					</h2>
					<p>
						You must have legal capacity to agree in your jurisdiction. If you
						act on behalf of an organization, you represent that you are
						authorized to bind it.
					</p>
				</section>

				<section className="space-y-2">
					<h2 className="font-semibold text-base text-foreground">
						Your account and credentials
					</h2>
					<p>
						You are responsible for activity under your credentials. Notify us
						promptly through official support channels if you suspect misuse.
						Password rules and email verification requirements help secure your
						account but do not guarantee security.
					</p>
				</section>

				<section className="space-y-2">
					<h2 className="font-semibold text-base text-foreground">
						Acceptable use
					</h2>
					<p>
						You agree not to abuse the platform: no unlawful content,
						harassment, hate, or attempts to circumvent security or overload
						systems. Moderation or removal may be applied at our discretion,
						especially where public content is concerned.
					</p>
				</section>

				<section className="space-y-2">
					<h2 className="font-semibold text-base text-foreground">
						Optional AI topic helpers
					</h2>
					<p>
						Where Gemini-assisted topic helpers are enabled, output is
						informational only. Verify facts before publishing; AI output may be
						wrong or inappropriate. Do not paste confidential data into prompts
						you do not want processed.
					</p>
				</section>

				<section className="space-y-2">
					<h2 className="font-semibold text-base text-foreground">
						Third parties
					</h2>
					<p>
						We integrate services such as Resend for email and Cloudinary for
						images. Their respective terms apply to those components. Links to
						analytics (e.g. PostHog) operate only where enabled in deployment
						configuration.
					</p>
				</section>

				<section className="space-y-2">
					<h2 className="font-semibold text-base text-foreground">
						Disclaimer
					</h2>
					<p className="text-foreground">
						The service is provided “as is” and “as available,” without
						warranties of any kind to the extent permitted by law, including
						implied warranties of merchantability, fitness for a particular
						purpose, and non-infringement.
					</p>
				</section>

				<section className="space-y-2">
					<h2 className="font-semibold text-base text-foreground">
						Limitation of liability
					</h2>
					<p>
						To the fullest extent permitted by law, neither Xamsa nor its
						operators or contributors shall be liable for indirect, incidental,
						special, consequential, exemplary, or punitive damages, or for loss
						of profits, data, or goodwill arising from these Terms or use of the
						service. Our aggregate liability for direct damages shall not exceed
						amounts you paid to us for the service in the ninety (90) days
						before the claim, or fifty US dollars if nothing was paid, unless
						applicable law forbids such a cap (in which case that limitation
						applies only to the maximum extent permitted).
					</p>
				</section>

				<section className="space-y-2">
					<h2 className="font-semibold text-base text-foreground">Changes</h2>
					<p>
						We may update these Terms and will post revisions with an updated
						effective date where practical. Continuing to use Xamsa after
						updates constitutes acceptance of the revised Terms.
					</p>
				</section>

				<section className="space-y-2 border-border border-t pt-4">
					<p className="text-muted-foreground text-xs">
						See also:{" "}
						<Link
							className="text-foreground underline underline-offset-2"
							to="/legal/privacy-policy"
						>
							Privacy Policy
						</Link>
					</p>
				</section>
			</div>
		</div>
	);
}
