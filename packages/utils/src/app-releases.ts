import { parseCalverParam } from "./app-release-calver";
import type {
	AppRelease,
	AppReleasesManifest,
	ReleaseHighlight,
} from "./app-releases-types";

export type { AppRelease, AppReleasesManifest, ReleaseHighlight };

/**
 * What’s-new copy is **for players and hosts**, not changelogs. Lead with outcomes and
 * delight; use plain language. Avoid jargon (API/CORS/events/tables/deploy details) unless a
 * non-technical reader would recognise why it matters.
 */

const current = { year: 2026, month: 5, patch: 4 } as const;

export const appReleasesManifest: AppReleasesManifest = {
	productName: "Xamsa",
	current,
	releases: [
		{
			releasedAt: "2026-05-04",
			year: 2026,
			month: 5,
			patch: 4,
			title:
				"Scan to join, calmer spoiler explainer, live presence dots, and reactions on every comment",
			highlights: [
				{
					kind: "text",
					text: "Hosts get a tappable QR right next to the invite link—point a phone, jump into the lobby, no typing room codes around the table.",
				},
				{
					kind: "text",
					text: "Spoiler-mode picks now wear a friendly explainer: hover the info dot to see who gets muted, when, and why—and players sidelined mid-round get the same plain-English reason inline next to their buzzer.",
				},
				{
					kind: "text",
					text: "Live presence dots glow on every player row and next to the host’s name—green when they’re watching, orange when their tab is hidden, quiet when they’ve stepped away—so you always know who’s really in the room.",
				},
				{
					kind: "text",
					text: "Comments cheer back: react to any reply with the same emojis you use on posts, see the breakdown at a glance, and watch the counts settle without a refresh.",
				},
				{
					kind: "text",
					text: "Recap polish too—your post-game “Play again with this pack” shortcut reads clearer on small screens, sitting above the deeper stats link.",
				},
			],
		},
		{
			releasedAt: "2026-05-04",
			year: 2026,
			month: 5,
			patch: 3,
			title:
				"Your feed, your profile, and every pack page—now easier to read, follow, and discuss",
			highlights: [
				{
					kind: "text",
					text: "Home has a Friends-style lane: flip between the whole neighbourhood and posts from people you follow, save the good ones for later, and skim reactions without the toolbar fighting your thumb.",
				},
				{
					kind: "text",
					text: "Profiles grew tabs—feed first, badges, stats, packs, games, plus a Saved shelf for your own bookmarks—while progress stays up top and sign-out stays put.",
				},
				{
					kind: "text",
					text: "Glass search surfaces posts alongside packs and shortcuts, packs and topics pick up Discussion tabs that mirror post threads, and the dedicated post page breathes wider.",
				},
				{
					kind: "text",
					text: "Smaller reactions, tighter breakdowns, and less accidental text-selection make cheering (or facepalming) a post feel closer to tapping a sticker than editing a doc.",
				},
			],
		},
		{
			releasedAt: "2026-05-02",
			year: 2026,
			month: 5,
			patch: 2,
			title:
				"Tag your crew, thread the chatter, and share posts that travel beautifully",
			highlights: [
				{
					kind: "text",
					text: "Drop @handles in posts and comments—when friends are named, their names light up with a friendly path to their profile so nobody’s left guessing who you meant.",
				},
				{
					kind: "text",
					text: "Get a gentle ping by email when someone’s talking about you, with enough context to know it’s real and a button that lands you right on the moment—quietly capped so your inbox doesn’t hum with repeats.",
				},
				{
					kind: "text",
					text: "Every post has a calm, permanent home on the web: copy its link, send it anywhere, and chats will unfurl a proper preview card with the author’s voice up front.",
				},
				{
					kind: "text",
					text: "Comments now branch the way real conversations do—reply inline, tuck noisy side-threads out of sight, and keep the banter readable without losing the spark.",
				},
			],
		},
		{
			releasedAt: "2026-05-01",
			year: 2026,
			month: 5,
			patch: 1,
			title:
				"The home hub comes alive—posts, replies, reactions, all in one flow",
			highlights: [
				{
					kind: "text",
					text: "The home screen now feels like the heart of Xamsa: your welcome line, trending packs to explore, snapshots of how you’ve been playing, and posts from everyone else—woven together so newcomers can browse freely and logged-in hosts see both their momentum and the room’s energy.",
				},
				{
					kind: "text",
					text: "Share a thought, drop a selfie from game night, or mix both—composer keeps it simple while photos land right beside your words on the timeline.",
				},
				{
					kind: "text",
					text: "React how you’d react in chat—heart something funny, widen your eyes at a clutch play, sympathise after a brutal round. Toggle off just as naturally if your finger slipped.",
				},
				{
					kind: "text",
					text: "Conversations spill into comments beneath each post: expand the thread when you’re curious, skim when you’re in a hurry, and drop your take without juggling extra screens.",
				},
				{
					kind: "text",
					text: "Posting about a favourite pack, a killer topic, or a legendary room? Attach those cards so followers can leap straight into the same energy you’re buzzing about.",
				},
				{
					kind: "text",
					text: "Scroll past the big composer card and a floating shortcut slides in from the corner—perfect for jotting mid-feed without jumping back up the page.",
				},
				{
					kind: "text",
					text: "We didn’t sneak @-mentions into this wave; they deserve their own sparkle and stay on our near-term roadmap.",
				},
			],
		},
		{
			releasedAt: "2026-05-01",
			year: 2026,
			month: 5,
			patch: 0,
			title:
				"Sharper profiles, clever search shortcuts, quieter polish backstage",
			highlights: [
				{
					kind: "text",
					text: "Tap any profile avatar in the lobby, leaderboard, badges, or rosters—we pop up a roomy preview so icons feel less like postage stamps.",
				},
				{
					kind: "text",
					text: "Follow and unfollow from follower or following lists straight away, and revisit the tab you cared about whenever you reopen the profile link.",
				},
				{
					kind: "text",
					text: "The command palette remembers more everyday jumps—privacy, legal, security controls, freshest What’s New, logout when you want a clean session—plus ⌘ / Ctrl +I help tips alongside ⌘ / Ctrl + K.",
				},
				{
					kind: "text",
					text: "What’s New doubles as clip-and-share announcements: every story has a cosy link so friends can tap straight into what changed.",
				},
				{
					kind: "text",
					text: "Transactional emails tidy up navigation at the footer—always a friendly path home, packs, leaderboard, badges, Play, updates, or legal FAQs.",
				},
				{
					kind: "text",
					text: "Hosts see calmer queues and clearer cues for skipping forward versus pausing, so frantic nights still feel anchored.",
				},
				{
					kind: "text",
					text: "We tightened how pack, topic, and question names resolve so clashes with favourite routes become far rarer—you keep your creative naming without slamming mysterious dead ends.",
				},
				{
					kind: "text",
					text: "Foundations landed for threaded comments across packs & topics—you’ll spot the payoff in-player soon.",
				},
			],
		},
		{
			releasedAt: "2026-04-30",
			year: 2026,
			month: 4,
			patch: 27,
			title: "Sign-in you can rely on in more setups",
			highlights: [
				{
					kind: "text",
					text: "If logging in flickered weirdly strict browsers, privacy extensions, or certain password workflows, give this patch a whirl—we tuned the seams so credential screens stay responsive without surprise dead ends.",
				},
			],
		},
		{
			releasedAt: "2026-04-30",
			year: 2026,
			month: 4,
			patch: 26,
			title:
				"Sign in with Google, link accounts, and store your Google photo on Xamsa",
			highlights: [
				{
					kind: "text",
					text: "Log in or create an account using Google from the login and register pages. If you already registered with the same email address, your Google sign-in links to that account so you keep one profile and history.",
				},
				{
					kind: "text",
					text: "Google sign-in chooses a cosy handle from your name (we’ll tuck a polite number on the end if yours is taken), and keeps your avatar looking sharp wherever you appear.",
				},
				{
					kind: "routerLink",
					to: "/settings/security",
					label: "Security Settings",
					before: "Go to ",
					after: " to manage your accounts, email, and password settings.",
				},
				{
					kind: "routerLink",
					to: "/legal/privacy-policy",
					label: "Privacy Policy",
					before: "Read our ",
					after: " to learn more about how we handle your data.",
				},
				{
					kind: "routerLink",
					to: "/legal/terms-of-service",
					label: "Terms of Service",
					before: "Read our ",
					after: " to learn more about how we handle your data.",
				},
			],
		},
		{
			releasedAt: "2026-04-30",
			year: 2026,
			month: 4,
			patch: 25,
			title: "You can now add a profile photo to your account!",
			highlights: [
				{
					kind: "text",
					text: "Add a profile photo from Settings so friends recognize you on your profile, leaderboards, and anywhere your picture appears in the app.",
				},
				{
					kind: "text",
					text: "Choose a photo, drag to frame it, zoom in or out, then save. We keep it in a neat square so it always looks consistent wherever it shows up.",
				},
				{
					kind: "text",
					text: "Swap your photo any time or clear it completely if you’d rather use your initials. What you see in Settings stays in sync without needing to refresh the page.",
				},
			],
		},
		{
			releasedAt: "2026-04-30",
			year: 2026,
			month: 4,
			patch: 24,
			title:
				"Verified email, account mail change, and gated play with lighter mail",
			highlights: [
				{
					kind: "text",
					text: "Email and password accounts must verify the address before sign-in. After sign-up we show a calm “check your inbox” screen with spam and resend guidance; login and Settings can resend verification too, and unverified sign-in attempts steer you the same way.",
				},
				{
					kind: "text",
					text: "Settings shows verification status and lets you start an email change that confirms the new inbox. Completing the link in your mail can sign you back in automatically afterward.",
				},
				{
					kind: "text",
					text: "Hosting, joining, buzzing, and authoring packs, topics, or questions need a verified inbox; we’ll nudge you with a shortcut to finish when something’s gated. Leaving a session you’ve already entered stays kind even mid-verification.",
				},
				{
					kind: "text",
					text: "You may get short messages when you win a hosted game or someone new follows you—same mail styling as auth mail, with text-first layout and no large inline image so messages stay small.",
				},
			],
		},
		{
			releasedAt: "2026-04-30",
			year: 2026,
			month: 4,
			patch: 23,
			title: "Search shortcuts that feel like magic words",
			highlights: [
				{
					kind: "text",
					text: "Staff and moderators: start typing everyday dashboard phrases in ⌘ K / Ctrl + K and we’ll hoist the right backstage door—fewer breadcrumbs, quicker rescues.",
				},
				{
					kind: "text",
					text: "Anyone can bark quick wishes—jump to leaderboard, fire up Play, peek at badges, rewind history, skim What’s New, spin up drafts, leap into rooms by code—or land soft login prompts when a shortcut needs an account.",
				},
				{
					kind: "text",
					text: "Those nifty commands float above ordinary search picks so speedy habits stay effortless while we still capped the surface to eight neat rows.",
				},
			],
		},
		{
			releasedAt: "2026-04-30",
			year: 2026,
			month: 4,
			patch: 22,
			title:
				"Flexible right answers on questions, tighter leaderboards for ties, backstage polish",
			highlights: [
				{
					kind: "text",
					text: "Authoring packs or bulk topics gets friendly chips—stack up alternative answers teammates might shout aloud without repeating yourself in prose.",
				},
				{
					kind: "text",
					text: "Global leaderboards now celebrate genuine ties instead of artificially bumping rivals down the ladder—you’ll recognise “shared podium” numbering from sports finals.",
				},
				{
					kind: "text",
					text: "Our staff snapshot of creators adds follower mojo at a glance, sortable if you’re hunting ambassadors.",
				},
				{
					kind: "text",
					text: "Hefty question cells across staff analytics wrap kindly so nobody scrolls sideways through novels.",
				},
			],
		},
		{
			releasedAt: "2026-04-29",
			year: 2026,
			month: 4,
			patch: 21,
			title:
				"Bring the outside world into your packs—richer imports, calmer drafting",
			highlights: [
				{
					kind: "text",
					text: "A single Import studio now welcomes spreadsheets, pasted walls of text, power-user snippets, trusty structured files, moderated remote pulls, plus the moderator-friendly 3sual bridge—everything lands in tidy preview rows before you approve the sprint.",
				},
				{
					kind: "text",
					text: "Huge hauls unlocked: drag in piles of structured topics knowing we keep pacing sensible for smaller hand-made batches.",
				},
				{
					kind: "text",
					text: "Every bulk row echoes the carousel hints you adore on single-topic mode—step dots, filled answers, glanceable completeness without endless scrolling.",
				},
			],
		},
		{
			releasedAt: "2026-04-29",
			year: 2026,
			month: 4,
			patch: 20,
			title:
				"Search the lobby from anywhere on home; boards that spotlight your rivals",
			highlights: [
				{
					kind: "text",
					text: "Kick off ⌘ K / Ctrl + K from home and skim people, packs, topics, rooms by code—all in one glassy spotlight with airy spacing and unmistakable badges.",
				},
				{
					kind: "text",
					text: "Leaderboards reorganise around moods (Elo, XP, crowns, hustle). Flip to “friends only,” keep your tab in sync with the URL you share—great for rivalry bragging clips.",
				},
			],
		},
		{
			releasedAt: "2026-04-29",
			year: 2026,
			month: 4,
			patch: 19,
			title: "Follow voices you love—counts, lists, and cosy social proof",
			highlights: [
				{
					kind: "text",
					text: "Profiles trumpet how many champions cheer you on—and how many halls you’re cheering in return—while one tap follows or unfollows (no self-stalking, promise).",
				},
				{
					kind: "text",
					text: "Peek either fan club with roomy rows, glossy avatars, and instant jumps into their arenas—foundation for louder social moments still cooking.",
				},
			],
		},
		{
			releasedAt: "2026-04-29",
			year: 2026,
			month: 4,
			patch: 18,
			title:
				"Hosts gain surgical buzz control; players see fuller answers once the veil lifts",
			highlights: [
				{
					kind: "text",
					text: "When the curtain drops on an answer you’ll savour the witty explanation writers tucked in—as well as any clever alternate wording that deserves credit.",
				},
				{
					kind: "text",
					text: "Need to undo an accidental adjudication mid-question? Hosts can rewind a wrongly scored buzz—with guardrails where undoing might unfairly rewind someone else—and everyone’s scoreboard snaps back politely.",
				},
				{
					kind: "text",
					text: "Whole questions can be politely skipped during chaos: pulses reset, recap tallies whisper “skipped by host,” and you march forward without blaming the trivia gods.",
				},
			],
		},
		{
			releasedAt: "2026-04-29",
			year: 2026,
			month: 4,
			patch: 17,
			title:
				"Clearer staff lenses on difficulty, public analytics where it helps, curated topic lineups",
			highlights: [
				{
					kind: "text",
					text: "Behind the curtain, staff can sort and filter every pack, topic, and question by how the crowd actually rated the challenge—so editorial calls start from lived play, not hunches.",
				},
				{
					kind: "text",
					text: "Published pack and topic pages (and question pages you’re meant to see) grow an Analytics nook: finishes, buzz outcomes, cheer-worthy hosts and players, and the first and last nights the community showed up.",
				},
				{
					kind: "text",
					text: "Spinning up a live game? Hand-pick which topics fire this session—default is the full pack, or narrow the set when you still have enough runway for a proper night. Older rooms without saved picks behave like they always did.",
				},
			],
		},
		{
			releasedAt: "2026-04-28",
			year: 2026,
			month: 4,
			patch: 16,
			title:
				"Badge wall tightens up, staff sees what’s hot, live rooms get one glorious Share button",
			highlights: [
				{
					kind: "text",
					text: "Your profile badge mosaic packs tighter so the trophy shelf still scans when we keep adding sparkle.",
				},
				{
					kind: "text",
					text: "Staff gains a badges command center—how often each accolade fires, how many distinct champs earned it, and filters by time, type, or category so balance tweaks have receipts.",
				},
				{
					kind: "text",
					text: "Three new stories to chase: Abomination (five wrongs in one topic—ouch), Genius (green across every topic in a finished brawl), and Dunce (a humbling sweep). They live in the catalog and unlock mid-game like your other favourites.",
				},
				{
					kind: "text",
					text: "Live headers merge “copy code” chaos into one Share sheet—your phone’s native share when it can, friendly buttons for WhatsApp, Telegram, X, and Facebook, Discord-friendly paste text, plus instant grabs for room code and invite link.",
				},
			],
		},
		{
			releasedAt: "2026-04-28",
			year: 2026,
			month: 4,
			patch: 15,
			title:
				"Your packs lane, shareable stat stories, spoiler-smart nights, multilingual packs",
			highlights: [
				{
					kind: "text",
					text: "Profiles add a cosy “My packs” hop that opens the directory already scoped to your drafts and published gems—same browse experience, just your corner of the universe.",
				},
				{
					kind: "text",
					text: "Game deep-dives now bake the tab, filters, and searches into the link you share—Overview, By round, By player, or Flow—so “look at this chaos” opens exactly where you left it, and the back button plays fair.",
				},
				{
					kind: "text",
					text: "Magnificent arrives: crown a winner who never missed. It shows up in the catalog, recap, and your badge journey like the rest of the pantheon.",
				},
				{
					kind: "text",
					text: "By-player views badge moments as neat chips per topic with links to learn more, and buzz timelines get a friendly filter so you relive only the heartbreakers or the clutch hits.",
				},
				{
					kind: "text",
					text: "Pick each pack’s language (English, Azerbaijani, Russian, or Turkish) right in the builder—no more awkward defaults when you’re aiming global.",
				},
				{
					kind: "text",
					text: "Hosts set how spoiler-aware the room is: classic play; quiet only the players who’ve seen a prompt before; or hush everyone if anyone’s been spoiled. Buzzers speak plainly when you’re sidelined—and we enforce it fairly for the whole table.",
				},
				{
					kind: "text",
					text: "Share from the live header still drops friends on the familiar join door with the same safety dance as typing the code by hand.",
				},
				{
					kind: "text",
					text: "When replay rules mute the room—or just a few players—hosts see the same plain-English reasons players do, so you’re never guessing who’s ghosted and why.",
				},
			],
		},
		{
			releasedAt: "2026-04-28",
			year: 2026,
			month: 4,
			patch: 14,
			title:
				"Charts you can read at a glance, community tables for public packs",
			highlights: [
				{
					kind: "text",
					text: "Score lines and outcome pies across stats, recap, and profiles borrow colours that actually separate in light and dark mode—wins glow, misses read clearly, no squinting required.",
				},
				{
					kind: "text",
					text: "Love a public pack you didn’t write? Authors can welcome the neighbourhood to run their show; you flip the switch when creating or editing settings.",
				},
				{
					kind: "text",
					text: "The packs directory adds “Can host” when you’re signed in—your own published work plus public packs that invited the crowd to host.",
				},
			],
		},
		{
			releasedAt: "2026-04-28",
			year: 2026,
			month: 4,
			patch: 13,
			title: "Living difficulty vibes for every question, topic, and pack",
			highlights: [
				{
					kind: "text",
					text: "Questions, themes, and full packs wear a restless “how spicy is this?” score that learns from ranked nights once hosts settle right and wrong. Tougher tables nudge the needle more than casual lounges, so the number tells an honest story.",
				},
				{
					kind: "text",
					text: "Drafts and published decks both train the vibe—only shelved archives sit out—meaning playtests while you edit reshape the curve before launch confetti.",
				},
				{
					kind: "text",
					text: "We keep the math gentle on the eyes so slow trends never vanish in rounding fuzz.",
				},
				{
					kind: "text",
					text: "You’ll spot those hints on pack and topic pages, question detail, cards, lists, and in host tooling mid-match when you need a heads-up on what’s landing.",
				},
				{
					kind: "text",
					text: "Link previews pick up the same monospace voice as the app—tiny alignment, big brand calm.",
				},
			],
		},
		{
			releasedAt: "2026-04-27",
			year: 2026,
			month: 4,
			patch: 12,
			title:
				"Shareable previews that feel on-brand, AI nudges for empty topic rows",
			highlights: [
				{
					kind: "text",
					text: "Drop a link to a pack, topic, profile, night, badge, or What’s New entry and chats render a bespoke preview card fed by live facts. Leaderboard, Play, and Join carry their own art—complete with the current Elo podium snapshot.",
				},
				{
					kind: "text",
					text: "Every card wears the Xamsa frame—orange rails, bow-tie mark—with the real title, author, stats, and faces where it helps. Smart caching keeps social apps snappy without leaving you with yesterday’s thumbnail.",
				},
				{
					kind: "text",
					text: "Topic rows get a co-pilot button that dreams up a name and one-line pitch when you’re staring at blank space. It shares the same daily creative allowance as AI question help and peeks at names you already picked so ideas don’t twin.",
				},
				{
					kind: "text",
					text: "Bulk topic mode gets the same per-row sparkle—names and blurbs only, your five questions stay yours. Optional hints steer the vibe in both flows.",
				},
			],
		},
		{
			releasedAt: "2026-04-27",
			year: 2026,
			month: 4,
			patch: 11,
			title:
				"Badges pop live in the room, settle beautifully after the final buzz",
			highlights: [
				{
					kind: "text",
					text: "Snag an Ace, Jackpot, Scavenger, or any other mid-game flex and the whole table sees the cheer the moment it happens—no refresh roulette.",
				},
				{
					kind: "text",
					text: "Stack several wins and one elegant strip rolls up from the bottom: who earned what, a breath to read, tap to dismiss—play never stops.",
				},
				{
					kind: "text",
					text: "Post-game screens tuck each player’s badges inside their own card by topic, with links to learn the lore. The old mega-list is retired for calmer storytelling.",
				},
				{
					kind: "text",
					text: "A public badge gallery invites browsing and bragging rights; profiles gain shelves with counts and deep dives per achievement—and search-friendly paths so newcomers find the mythos.",
				},
				{
					kind: "routerLink",
					before: "Open ",
					to: "/badges/",
					label: "Badges",
					after:
						" to explore the full catalog, or check your profile to see your history.",
				},
			],
		},
		{
			releasedAt: "2026-04-23",
			year: 2026,
			month: 4,
			patch: 10,
			title:
				"Sharper AI suggestions for budding topics—now powered by Google Gemini",
			highlights: [
				{
					kind: "text",
					text: "The “dream up topics with AI” flow now runs through Google’s Gemini models, tuned for multilingual flair (Azerbaijani included!) and tighter listening to pack context.",
				},
				{
					kind: "text",
					text: "We lean on Gemini’s flagship brain first, yet automatically fall back to a lighter cousin if the heavens throw a throttle tantrum—so your creative bursts rarely stall.",
				},
			],
		},
		{
			releasedAt: "2026-04-23",
			year: 2026,
			month: 4,
			patch: 9,
			title:
				"Hosting levels you up in XP; clashes move Elo; Flow tells richer stories",
			highlights: [
				{
					kind: "text",
					text: "The person running the night earns XP and levels from live play—guests sharpen their reputations through Elo and stats you already know. Wrap early or see it through; generous hosting bonuses still land either way.",
				},
				{
					kind: "text",
					text: "Flow view now highlights whichever players you care about across the score journey and lays out how each wave of prompts treated the pack—dip back to Overview when you crave the saga of streaks.",
				},
				{
					kind: "text",
					text: "After the confetti settles, endings tout how hosting XP shifted and—in ranked scraps with real head-to-head—how Elo bounced. Busy host ribbons and cramped reveal screens loosen up on small phones.",
				},
				{
					kind: "text",
					text: "The round-by-round grid adds a storytelling lens: total points, how often folks lunged for the buzzer, splits of right and wrong tales, or who pounced first—one stat at a time with matching row, column, and grand totals.",
				},
				{
					kind: "text",
					text: "Public profiles flaunt more lifetime lore—near-miss buzzes, first grabs, arenas played and hosted, clocks in seat and spotlight, published packs—with pies and yearly bars so your comeback arc is undeniable.",
				},
			],
		},
		{
			releasedAt: "2026-04-23",
			year: 2026,
			month: 4,
			patch: 8,
			title:
				"Cleaner nights when plans change; buzz ribbons that behave; sweeter endings",
			highlights: [
				{
					kind: "text",
					text: "Call off a night straight from the lobby and everyone sails back to Play—no phantom scorecards, no public replay reel—because nothing really started.",
				},
				{
					kind: "text",
					text: "Hosts running tight decks get a slimmer buzz queue under the knobs, pings line up with who actually raised a hand, and your own regrets strike through exactly like anyone else’s—no favourites.",
				},
				{
					kind: "text",
					text: "Already left stars on a pack? The wrap-up screen celebrates your own score instead of nagging twice. We’re itching to layer bolder round-by-round murals on top of today’s recap—stay tuned.",
				},
			],
		},
		{
			releasedAt: "2026-04-23",
			year: 2026,
			month: 4,
			patch: 7,
			title: "Retire stray topics without leaving ghosts behind",
			highlights: [
				{
					kind: "text",
					text: "Built the wrong theme or testing a gag? Delete topics you own cleanly so your masterpiece stays focussed—no orphaned rows haunting the carousel.",
				},
			],
		},
		{
			releasedAt: "2026-04-23",
			year: 2026,
			month: 4,
			patch: 6,
			title:
				"Fairer buzz etiquette, sharper rankings, a public reel of legends",
			highlights: [
				{
					kind: "text",
					text: "Shut a night down from the lobby before the first whistle and nobody banks XP, stats, or deck mileage—glory waits until you actually play.",
				},
				{
					kind: "text",
					text: "Once an answer flashes, buzzing locks—revealing manually rings out lingering attempts. Everyone’s timestamps line up honestly, hosts clear the queue true to arrival order, and “who’s next” reads cleaner.",
				},
				{
					kind: "text",
					text: "Ranked Elo settles the moment games finish—even when hosts call curtain early—and boards spotlight you after a single showdown. Pure hosts snag their XP leaderboard moment even before jumping in as contestants.",
				},
				{
					kind: "routerLink",
					before: "Open ",
					to: "/games/history",
					label: "Recent games",
					after:
						" for a public feed of finished sessions; the Play page links here too.",
				},
			],
		},
		{
			releasedAt: "2026-04-22",
			year: 2026,
			month: 4,
			patch: 5,
			title: "Pack pages, editor layout, and pack actions",
			highlights: [
				{
					kind: "text",
					text: "Pack builder routes now use a consistent header, breadcrumbs, and page shell on create, edit, bulk, and topic or question screens.",
				},
				{
					kind: "text",
					text: "The pack overflow menu can switch public/private (with a short confirm), open Play, jump to bulk topic import, and keeps copy link, topics, reorder, and delete working.",
				},
				{
					kind: "text",
					text: "On your pack, Publish stays visible in draft: it is disabled with a tooltip until you have the minimum number of topics; rating prompts are clearer for visitors and after games.",
				},
				{
					kind: "text",
					text: "Topics list on the pack’s Topics page shows each row’s question count; question pages can step previous/next in the topic when you are the author.",
				},
				{
					kind: "routerLink",
					before: "Open ",
					to: "/packs/",
					label: "Packs",
					after: " to browse or start from Create a pack.",
				},
			],
		},
		{
			releasedAt: "2026-04-22",
			year: 2026,
			month: 4,
			patch: 4,
			title: "3sual import and smooth bulk-topic marathons",
			highlights: [
				{
					kind: "text",
					text: "Where allowed, you can preview and import a 3sual package into a draft pack, with validation and duplicate checks before topics are created.",
				},
				{
					kind: "text",
					text: "Huge hauls chug politely in the background: follow the progress ticker until every topic lands—no staring at a frozen tab when the spreadsheet is chunky.",
				},
				{
					kind: "text",
					text: "Bulk create for packs and topics is integrated with the same import flow when creating a pack with a 3sual source.",
				},
			],
		},
		{
			releasedAt: "2026-04-22",
			year: 2026,
			month: 4,
			patch: 3,
			title: "Global leaderboard and finished-game stats",
			highlights: [
				{
					kind: "text",
					text: "The Leaderboard arrives in full voice: global ladders for how you duel, how you climb, how you win, or lifetime shine—keep pulling for the next chunk of rivals whenever curiosity strikes.",
				},
				{
					kind: "text",
					text: "After a game ends, use Full stats to open a detailed recap: charts, every round and question, all buzzes with timestamps, and a per-player breakdown.",
				},
				{
					kind: "routerLink",
					before: "Open ",
					to: "/leaderboard/",
					label: "Leaderboard",
					after: " anytime to see how you stack up.",
				},
			],
		},
		{
			releasedAt: "2026-04-22",
			year: 2026,
			month: 4,
			patch: 2,
			title: "Softer landing after signup, fresher shells after login",
			highlights: [
				{
					kind: "text",
					text: "When email verification isn’t between you and the party, signup drops you straight on the doorstep you chose—or cosy home—without the phantom inbox nag.",
				},
				{
					kind: "text",
					text: "After login or signup the app politely refreshes in place so your tabs wake up recognised—skip the mash-reload ritual.",
				},
				{
					kind: "text",
					text: "We only whisk you toward addresses inside Xamsa after auth—fewer accidental detours, more peace of mind.",
				},
			],
		},
		{
			releasedAt: "2026-04-22",
			year: 2026,
			month: 4,
			patch: 1,
			title:
				"Pages that whisper the right intro to Google and group chats alike",
			highlights: [
				{
					kind: "text",
					text: "Across the map, smarter titles and blurbs greet search bots and clipboard sharers alike—each door signs its personality clearly.",
				},
				{
					kind: "text",
					text: "Social previews inherit a cohesive default collage; homescreen icons breathe the refreshed bow-tie mark.",
				},
				{
					kind: "text",
					text: "Pack, topic, question, profile, Play, and game stories carry bespoke elevator pitches—while intimate flows stay politely out of strangers’ indexes.",
				},
				{
					kind: "text",
					text: "Production deploys honour your canonical public URL automatically so pasted links preview with the right absolute artwork—nothing for players to fiddle with.",
				},
			],
		},
		{
			releasedAt: "2026-04-22",
			year: 2026,
			month: 4,
			patch: 0,
			title: "Initial release",
			highlights: [
				{
					kind: "text",
					text: "Initial release of Xamsa.",
				},
				{
					kind: "text",
					text: "You can now create your account and start playing games.",
				},
				{
					kind: "text",
					text: "You can create packs, topics and questions, also edit and reorder them before publishing.",
				},
				{
					kind: "text",
					text: "You can host your own packs, send game codes to your friends and play together.",
				},
				{
					kind: "text",
					text: "Hosting feeds your XP story; hopping in sharpens Elo when the table gets serious.",
				},
			],
		},
	],
};

export function getReleasesNewestFirst(): AppRelease[] {
	return [...appReleasesManifest.releases].sort((a, b) => {
		if (a.year !== b.year) {
			return b.year - a.year;
		}
		if (a.month !== b.month) {
			return b.month - a.month;
		}
		return b.patch - a.patch;
	});
}

export function releaseMatchesCurrent(r: AppRelease): boolean {
	return (
		r.year === current.year &&
		r.month === current.month &&
		r.patch === current.patch
	);
}

export function getReleaseByCalverParam(param: string): AppRelease | undefined {
	const parts = parseCalverParam(param);
	if (!parts) {
		return undefined;
	}
	return appReleasesManifest.releases.find(
		(r) =>
			r.year === parts.year &&
			r.month === parts.month &&
			r.patch === parts.patch,
	);
}
