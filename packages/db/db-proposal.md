# Database and product proposals

Ideas for future schema and features—**not** implemented. Use this as a backlog when planning migrations.

## Social and discovery

- **Follows:** `UserFollow` (`followerId`, `followingId`, unique pair) for notifications when someone publishes a pack or hosts.
- **Pack collections / playlists:** Curated lists of pack slugs with a title and visibility (public or per-user).
- **Comments or ratings narrative:** Short text reviews on `PackRating` (today only numeric rating).

## Gameplay

- **Spectating (revisited):** If watch-only joins return, add `PlayerStatus.spectating` or a separate `Spectator` model, and reintroduce counters (games spectated, time spectating, `Game.totalSpectators`) with clear update rules.
- **Teams:** `Team` per game (`gameId`, `name`, `color`), `Player.teamId` optional; scoring and leaderboards per team.
- **Custom rounds:** `GameSettings` extensions—max players, buzzer cooldown, per-topic question caps, optional “steal” rules.
- **Question media:** `Question.imageUrl` or `Attachment` table for picture/audio clues.

## Progression and economy

- **Achievements:** Normalize `Achievement` catalog; `UserAchievement` unlock rows instead of only JSON on `Player.achievements` for cross-game stats.
- **Seasons / leagues:** Time-bounded Elo or XP multipliers with `Season` boundaries.
- **Cosmetics:** Profile frames, pack cover art uploads—`User.avatarFrame`, `Pack.coverImageId`.

## Moderation and trust

- **Reports:** `ContentReport` (target type: pack/user/question, target id, reporter, status).
- **Pack moderation queue:** `PackReviewStatus` before published content goes public for new authors.

## Analytics (optional, privacy-conscious)

- **Aggregates only:** Nightly rollups for “popular packs by locale” without raw event tables, if you outgrow on-the-fly `totalPlays` counters.

When you adopt any item here, replace it with a proper issue/spec and a Prisma migration; keep this file updated or delete the section once shipped.
