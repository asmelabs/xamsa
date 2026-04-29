ROADMAP

## v26.04.14

- Implement Pack.settings `allowOthersHost` so the pack can be hosted by non-author users
- Fix chart colors

## v26.04.15

- Add to profile page `my draft packs` section, so user can directly see and manage their draft packs
- Add new badge: "Magnificent" - Someone who wins the game without single incorrect answer
- Add filtering to game stats 'By Round' and 'By Player' section. Selectors, min/max values, searching, etc. Also make those tabs url-saved with nuqs, and their filters as well.

## v26.04.15

- Add language selector when creating a new pack, also editing pack settings. Currently language exists, but it is hardcoded to "az" only.
- Duplicate Question See Prevention: So a user can see the same question multiple times. Let's say i have a pack A, and user Jon plays it.
  Then he plays another time. Now there will be question that he already saw. When starting a game, host can be able to select prevention rules.
  > Either let players can just normally play the questions they saw
  > Only those players who has seen the question, will not be able to Buzz on the specific question
  > Anyone will not be able to Buzz on a question where there are players that have seen the question before
- When joining a game, current flow is this. Host copies the code, sends to player. Player goes to join page, pastes and enters.
  There can be a url that when pasting, the app automatically checks everything (can player join, is game not completed, etc.) every validation
  steps, and automatically joins the player, so player does not have to copy the code and input then join (of course we will
  keep that functionality as well)

## v26.04.16

- Make the badges section on profile more compact, since the number of badges is growing.
- Create badges section on /dashboard like other tables. add filters like minEarners/maxEarners, search etc. and type/category/period filters.
- Add new badge: "Abomination" - Someone who gets 5/5 incorrect answers in a single topic (opposite of "Ace")
- Add new badge: "Genius" - When a player gets positive points in all of the topics of a game
- Add new badge: "Dunce" - When a player gets non-positive points (0 or negative) in all of the topics of a game
- On game screen, add better share button. When clicked, it will open a popup, with copy invite link, or directly
  share link on WhatsApp, Telegram, Discord, Twitter, and Facebook.

## v26.04.17

- More analytics/stats/charts on pack, topic and question pages.
- When starting a game, host can select topics from the pack to play. So, you do not
  need to play whole pack, you can select only specific topics. (by default, all topics are selected)
- add DR values of packs, topics and questions to /dashboard tables. Also min/max filtering, and sorting options by DRs.

## v26.04.18

### Reveal: show explanation and acceptable answers

When the host reveals a question, the existing answer reveal must also display:

- The question's `explanation` field, if non-empty.
- The question's `acceptableAnswers` array, if non-empty.

Both are shown to all players, hosts, and spectators alongside the answer. If a field is empty/null, simply omit that section — do not render an empty placeholder.

This is purely additive UI on the question reveal screen. No new schema, no new events. The existing reveal broadcast already carries the question payload; ensure `explanation` and `acceptableAnswers` are included in the broadcast (they should already be in the question record, but verify they're in the realtime payload, not just in initial fetch).

### Click removal — full erasure

The host can remove any click from a game with two distinct intentions, but the implementation is the same: complete erasure. Both these cases use one mechanic.

**Case 1: Resolved click (correct or wrong) was wrongly judged.** Host hit "correct" but should have been "wrong" (or vice versa). Host removes the click entirely; if a different player should get credit, host calls them separately.

**Case 2: Click was accidental.** Player buzzed by mistake (still pending in queue, or already resolved). Host removes the buzz.

Both cases: the click is **fully deleted** from the database and all derived state. It should be as if the click never happened.

**Affected state to reset:**

- The Click row itself: delete (not soft-delete; this is a true deletion).
- Player score: subtract any points awarded; add back any points deducted.
- Player stats: decrement `totalClicks`, and whichever of `correctAnswers` / `incorrectAnswers` / `expiredAnswers` was incremented at resolution. Recompute `firstClicks` / `lastClicks` if this click was one. Recompute fastest/average reaction times if this click contributed.
- Player streak fields: recompute current streak from remaining clicks.
- Click queue position: if pending clicks remain on the same question, their `position` may need recomputation if the deleted click was in the middle. Renumber positions to stay 1..N contiguous.
- GameTopic / GameQuestion stats: recompute aggregations (total correct, total incorrect, etc.) on the affected topic and question.
- DR system: reverse the QDR delta this click caused (if it was a resolved correct/wrong click for a published pack). Recompute TDR for the topic and PDR for the pack. Use the same difficulty-rate functions in reverse — the Elo update is mathematically reversible if you stored `qdrEloEquivBefore` and `userEloAtResolution` on the Click row at resolution time. If those fields don't yet exist, add them now: `Click.qdrEloEquivBefore: Float?`, `Click.userEloAtResolution: Int?`. Populate at resolution; consume on deletion.
- Player achievements/badges already awarded for this click: revoke. If a badge was earned (e.g., Sniper, Lightning) and the click is deleted, the badge condition no longer holds — remove the corresponding `PlayerAchievement` row.

**Realtime:**

- New broadcast event: `CLICK_REMOVED` with `{ clickId, questionId, playerId }`.
- All clients update their local cache: remove the click from question history, recompute leaderboard, refresh the buzz queue display.

**UI:**

- Host gets a small "remove" affordance on each click in the question history / buzz queue.
- Confirmation dialog before deletion ("Remove this click? This cannot be undone.").
- Players see a brief notice when a click affecting them is removed ("Host removed your click on this question").

**Constraints:**

- Removal is allowed during game `active` and `paused` states.
- Removal is **not** allowed once the game reaches `completed` status. Lock all click mutations at finalization.
- If the click was on a question that's already moved on, removal still works — it just retroactively erases history.

### Skip question

The host can skip a question entirely. A skipped question is treated as if it was never asked.

**New host action:** "Skip question" button, available while a question is active or revealed.

**Behavior:**

- Confirmation dialog ("Skip this question? It will be removed from the game.")
- The question is removed from the game state. No clicks are recorded against it (any pending clicks are also removed). The game advances to the next question.
- The corresponding `GameQuestion` row should either be deleted or marked with a clear `skipped: true` flag — implementer's choice, but make sure stats and analytics treat skipped questions as non-existent (not "0 buzzes on this question").
- DR system is **not** triggered for skipped questions. No QDR update, no TDR/PDR cascade.
- Player stats are unaffected (no `expiredAnswers` increment, no buzz reaction time recorded).

**Naming change:**
The existing `Game.totalSkippedQuestions` field tracks a different concept: questions that ran their course with no correct answer / no resolution. Rename this to reflect its actual meaning. Suggested: `Game.totalUnansweredQuestions` or `Game.totalUnresolvedQuestions`. Update any UI/stats references to the renamed field.

Then introduce a new field `Game.totalHostSkippedQuestions: Int @default(0)` to count true host-initiated skips. Both fields surface separately in stats.

**Realtime:**

- New broadcast event: `QUESTION_SKIPPED` with `{ questionId, topicId }`.
- All clients advance their local game state past this question.

## v26.04.19

- Introduce following system
- Add UserFollow table.

something like this:

```prisma
enum FollowStatus {
  accepted // the following user has accepted the follow request, currently active follow
}

// note: for now, there is only accepted status, follows are automatic
// in future, we will add other statuses like pending, rejected, etc.

model UserFollow {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now()) @map("created_at")

  status FollowStatus @default(accepted)

  followerId  String @map("follower_id")
  followingId String @map("following_id")

  follower  User @relation("UserFollows", fields: [followerId], references: [id], onDelete: Cascade)
  following User @relation("UserFollowers", fields: [followingId], references: [id], onDelete: Cascade)

  @@unique([followerId, followingId])
  @@index([followerId])
  @@index([followingId])
  @@map("user_follow")
}
```

add this to User model:

```prisma
 /// follow relationships ///
  totalFollowers  Int @default(0) @map("total_followers")
  totalFollowing  Int @default(0) @map("total_following")

 /// Users this user is following (this user is the follower)
  following UserFollow[] @relation("UserFollows")
  /// Users following this user (this user is being followed)
  followers UserFollow[] @relation("UserFollowers")

  // ...rest stays the same...
```

Anti-patterns to avoid:

- do not forget self-follow prevention
- do not forget to update totalFollowers and totalFollowing when following/unfollowing

Notes:

- Implement database changes
- Add follow/unfollow services to api
- Add follow/unfollow buttons on user profile page (if authorized, and not self)
- Add total followers and total following counts on user profile page (when clicking on them it should open a list of followers/following people with cursor pagination)
- Currently follows have no implementation further. In future, we will add features for follows. Like home page feed, notifications, follower only packs, etc.

## v26.04.20

- Add a global search, on home page - at the top of the page, there should be a search bar, when clicked, it should open a glassmorphic popup. It should be able to search users (except self - by name/username), packs (either self or published packs - by title/description), topics (either self or published pack topics - by title/description), games (all games - by code). The results should be displayed in a list, limited to 8 results on popup. Each different type should have a different icon and indicator. Each should have a title/description/icon/link.

- Better leaderboard. On leaderboard currently there are 4 sections. By Elo, Xp/Level, Wins, Points. Turn that to selector and put on left side. It should have [Elo, XP (name it XP remove '/Level'), Wins, Hosts (new section, shows total hosted count), Plays (new section, shows total played count)], also currently the table on all sections have same columns, just include user and proper / needed column for each section. e.g. Only Elo for Elo section. And on right side add a switch, "Only Following" - if not checked, it will show all users (current behavior). If checked, it will show only users that the current user is following. That switch must be rendered only if user is authorized.

### UNKNOWN VERSIONS:

- Add non-host games where host is computer-controlled (AI). It will be able to, control the game flow, and validate the answers (answers will be inputted by AI, and it will be validated by AI).
- Add pack collections/playlists system
- Better admin dashboard
- Add Pack.settings `allowForking` so the pack can be forked by other users
- Add Pack forking system, so user can fork a pack and edit it
