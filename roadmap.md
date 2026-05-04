# Xamsa product roadmap

**Public page:** [`/roadmap/`](/roadmap/). The site renders from `apps/web/src/lib/roadmap-content.ts`; update that file when you change this doc so the page stays accurate.

Planning view for **May 2026** calver (`26.05.xx`). Copy in “What’s New” should stay player-facing; this file is for engineering and product planning.

**Reference:** shipped highlights live in `packages/utils/src/app-releases.ts` (`appReleasesManifest`). Bump `current` there when you cut a release.

---

## v26.05.02

### @-mentions in posts and comments

Let people tag friends with `@username`, resolve links to profiles, and persist mentions so tagged users can find the conversation later.

### Mention notifications (email)

Send mention alerts by email with sensible deduping, a clear one-line context, and a link straight to the post or comment.

### Post permalinks, single-post page, and share cards

Stable URLs for every post; a dedicated post page with full detail (body, image, attachment, comments); reuse the preview pipeline for social shares on desktop and mobile.

### Comment threading on home

Full thread UX: replies under comments, collapsible branches, and inline Reply—aligned with existing depth limits—and optimistic updates that still feel instant.

---

## v26.05.03

### Better post card, comment section and post page

Wider standalone post layout, tighter feed cards, and a calmer reaction bar (less accidental text selection, smaller targets, trimmed breakdown sheet).

### “Following” home feed tab

Add a filter on the home timeline so logged-in users can choose “Everyone” vs “People I follow,” reusing follow relationships already in the product.

### Pack, topic, and question discussion sections

Surface the same comment system used for posts on **published** pack, topic, and question pages so communities can discuss sets outside the home feed—with tabs for analytics, primary content, and discussion.

### Search posts from home search

Extend the glass search with a dedicated post result type: recent public posts with icons, snippets, and deep links, capped for performance.

### Bookmark posts

Let logged-in users save posts from the feed and reopen them later from profile **Saved**, with optimistic updates in the UI.

### Better profile page

Tabs under the header (Feed, Saved for you, Badges, Stats, Packs, Games) synced with query state; follower/following sheets use **`follow=`** so **`tab=`** stays free for profile browsing. Progress stays visible under the header; sign-out stays at the foot.

### Better pack/topic/question pages

Tabbed pack, topic, and question layouts: analytics, content (topics or questions listing), and discussion where comments apply.

---

## v26.05.04

### Host lobby QR code

Show a scannable QR on the host screen that encodes the existing join URL so in-person players can enter without typing the room code.

### Remember per-pack default game options

When a host starts a game, offer to reuse their last spoiler mode, topic subset, and related knobs for that pack so repeat nights need fewer taps.

### Spoiler settings discoverability

Short in-product explainer for spoiler-aware play: what each mode does, who sees muted buzzers, and when to pick each option.

### “Play again” from recap

From the finished-game screen, one control to spin up a fresh lobby with the same pack (and sensible defaults) so groups can chain sessions quickly.

---

## v26.05.05

### Pack tags in the directory

Optional author-defined tags and matching filters on the packs directory so sets are easier to browse without building playlist collections.

### Duplicate topic inside a pack

Let authors clone an existing topic (including its five questions) inside the same pack to iterate on themes or language variants faster.

### Export pack and topic to files

Download a pack or single topic in formats aligned with import—e.g. CSV, JSON, TXT, and Markdown—using the same validation shape as the import studio.

### Profile “draft packs” lane

A compact strip or section on the profile for drafts and in-progress work, jumping straight into edit or publish flows.

---

## v26.05.06

### “Dominator” badge

Award when the winner’s score is materially ahead of second place (tune thresholds from real game distributions so it stays rare but achievable).

### “Survivor” badge

Award when the winner edges out second place by a very small margin—celebrate clutch finishes without encouraging sandbagging.

### Weekly or seasonal leaderboard snapshot

Optional time-boxed ladder (e.g. “this week’s XP”) that resets on a schedule, without erasing lifetime boards.

### Badge detail share previews

Improve Open Graph and in-app share for individual badges so clips and group chats show the right art and description.

---

## v26.05.07

### In-app notification center

A single inbox for follows, mentions, game outcomes, and product notices; mark read, deep-link to entities, and respect account settings.

### Notification preferences

Granular toggles per category (social vs gameplay vs marketing), with a clear “mute all except security” escape hatch.

### Mention email quiet hours

Let users pick windows when mention emails are deferred so late-night games don’t wake inboxes—still surfaced in-app immediately.

### Grouped in-app notifications

Collapse noisy bursts (several reacts or follows in a row) into one expandable row inside the notification center to keep the feed readable.

---

## v26.05.08

### Pack directory advanced filters

Filter and sort published packs by language, difficulty band, minimum topic count, recency, and simple “hide ones I’ve finished” style toggles where data allows.

### Host keyboard shortcuts companion

A lightweight cheat sheet (and optional ⌘/Ctrl-? overlay) for hosts in live games: pause, skip, next, buzzer actions—aligned with real bindings.

### Multi-select in pack topic list

Select several topics at once for batch delete, reorder shortcuts, or bulk jump into edit—less friction for large packs.

### Profile play streaks

Show a compact streak or activity strip from real sessions so regular players get visible momentum without new competitive ladders.

---

## v26.05.09

### PWA polish

Install prompt, standalone display mode, and shell caching for static assets so return visits feel app-like on phones.

### Feed virtualization

Virtualize long home timelines to keep scroll performance steady on mid-range devices during busy evenings.

### Image pipeline for posts

Consistent max dimensions, modern formats where supported, and placeholder blur for post images to reduce layout shift.

### Lazy-loaded game UI chunks

Split host-only or analytics-heavy panels into async chunks so joiners on slow networks download a smaller first paint before the room goes busy.

---

## v26.05.10

### AI-assisted practice host (experiment)

A clearly labeled opt-in mode where an AI host advances flow, reveals prompts, marks correct or incorrect, skips when allowed, and validates free-text answers with high bar accuracy—only shippable when quality matches human hosting for the supported pack types.

### Seasonal spotlights and weekend cups

Time-boxed featured ladders or highlighted pack rows (without full playlist collections) to give the community recurring reasons to gather.

### Richer stats dashboard for creators

Authors see return players, completion funnels per topic, and difficulty trends over time on pack and topic analytics pages.

### Richer oEmbed and link previews

Improve how external sites and messagers render Xamsa links—packs, games, profiles—with consistent metadata and artwork.

### Custom pack cover image

Optional hero art on pack pages (upload + crop) so authors can brand listings and shares without new collection features.

### Accessibility pass (WCAG-oriented)

Keyboard paths for feed composer, reactions, and game host controls; focus management in dialogs; contrast fixes in charts.

### Support-ready error details

When something fails, offer a copyable bundle (build/version, route, anonymised ids) players can paste to staff—no full session replay required.

### Data export for accounts

GDPR-style export: profile, posts, comments, and game history in one downloadable archive.

### What’s New RSS feed

A public RSS (or Atom) mirror of release entries so blogs and power users can follow updates outside the app.

### Post-deploy smoke checks

Automated probes after release—e.g. can open Play, start a dry lobby, hit auth health—so regressions surface before traffic spikes.

### Mobile navigation refinements

Bottom nav or thumb-friendly patterns for feed ↔ play ↔ profile; reduce tap depth to start hosting from home.

### Community highlights reel

Surface a curated or algorithmic strip of standout posts, games, or packs on home for logged-out visitors—showcase energy without requiring login.
