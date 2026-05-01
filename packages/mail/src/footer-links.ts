const SITE_URL = "https://xamsa.site";

export { SITE_URL };
export function transactionalFooterLinks(): { href: string; label: string }[] {
	return [
		{ href: SITE_URL, label: "Home" },
		{ href: `${SITE_URL}/whats-new`, label: "What's new" },
		{ href: `${SITE_URL}/packs`, label: "Explore Packs" },
		{ href: `${SITE_URL}/leaderboard`, label: "Global Leaderboard" },
		{ href: `${SITE_URL}/play`, label: "Play a Game" },
		{ href: `${SITE_URL}/badges`, label: "See Badges" },
		{ href: `${SITE_URL}/legal/privacy-policy`, label: "Privacy Policy" },
		{ href: `${SITE_URL}/legal/terms-of-service`, label: "Terms of Service" },
	];
}
