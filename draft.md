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

## v26.04.21

- Import topics/questions from CSV (Excel, Sheets, etc.) files.
- Import topics/questions from JSON/XML/YAML files.
- Import topics/questions from URL (e.g. https://example.com/topics.csv) (or .json, .xml, .yaml, etc.)
- Import topics/questions from TXT files.
- Import topics/questions from computer file with extension (e.g. .csv, .json, .xml, .yaml, .txt, etc.)

RULES:
TXT:

- First line is a topic name, followed by ";" and then optional topic description;
- After topic line, there are 5 lines, each line is a question text, followed by ";" and then the answer, followed by ";" and then optional explanation, followed by ";" and then optional acceptable answers (comma separated);
- After those 5 lines, again start with a new topic line.
- Note: all empty lines will be ignored;

JSON:

```json
{
	"topics": [
		{
			"name": "string",
			"description": "string or null",
			"questions": [
				{
					"text": "string",
					"answer": "string",
					"acceptableAnswers": ["string", "string", "string"],
					"explanation": "string or null"
				},
				{
					"text": "string",
					"answer": "string",
					"acceptableAnswers": ["string", "string", "string"],
					"explanation": "string or null"
				},
				{
					"text": "string",
					"answer": "string",
					"acceptableAnswers": ["string", "string", "string"],
					"explanation": "string or null"
				},
				{
					"text": "string",
					"answer": "string",
					"acceptableAnswers": ["string", "string", "string"],
					"explanation": "string or null"
				},
				{
					"text": "string",
					"answer": "string",
					"acceptableAnswers": ["string", "string", "string"],
					"explanation": "string or null"
				}
			],
      "..."
		},
    "..."
	]
}

notes: or directly an array without { "topics": [{ ... }, { ... }] } wrapper just [ { ... }, { ... } ]
same thing applies for XML and YAML as well.
```

XML:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<topics>
  <topic>
    <name>string</name>
    <description>string or null</description>
    <questions>
      <question>
        <text>string</text>
        <answer>string</answer>
        <acceptableAnswers>
          <acceptableAnswer>string</acceptableAnswer>
          <acceptableAnswer>string</acceptableAnswer>
          <acceptableAnswer>string</acceptableAnswer>
        </acceptableAnswers>
        <explanation>string or null</explanation>
      </question>
      ...
    </questions>
  </topic>
  ...
</topics>
```

YAML:

```yaml
- topics:
    - name: string
    - description: string or null
    - questions:
        - text: string
        - answer: string
        - acceptableAnswers:
            - string
            - string
        - explanation: string or null
        - ...
    - ...
```

CSV:

```csv
topic1_name;topic1_description;
question1_text;question1_answer;question1_acceptableAnswers;question1_explanation;
question2_text;question2_answer;question2_acceptableAnswers;question2_explanation;
question3_text;question3_answer;question3_acceptableAnswers;question3_explanation;
question4_text;question4_answer;question4_acceptableAnswers;question4_explanation;
question5_text;question5_answer;question5_acceptableAnswers;question5_explanation;
topic2_name;topic2_description;
question1_text;question1_answer;question1_acceptableAnswers;question1_explanation;
question2_text;question2_answer;question2_acceptableAnswers;question2_explanation;
question3_text;question3_answer;question3_acceptableAnswers;question3_explanation;
question4_text;question4_answer;question4_acceptableAnswers;question4_explanation;
question5_text;question5_answer;question5_acceptableAnswers;question5_explanation;
...
topicN_name;topicN_description;
question1_text;question1_answer;question1_acceptableAnswers;question1_explanation;
question2_text;question2_answer;question2_acceptableAnswers;question2_explanation;
question3_text;question3_answer;question3_acceptableAnswers;question3_explanation;
question4_text;question4_answer;question4_acceptableAnswers;question4_explanation;
question5_text;question5_answer;question5_acceptableAnswers;question5_explanation;
...
```

Importing with URL and file.

- Instead of copy/paste, users can paste a URL (which is a supported file type) or upload a file from their computer/device.

The file/content/url must be validated to be a supported file type, also fit the rules of the file type.

UI:

- on /packs/$packSlug/topics/new or /packs/$packSlug/topics/bulk page, there is already a [Import with 3sual] button. Now, convert that to [Import] button, which should open a dialog. On the dialog, there will be 4 tabs at the top: [URL], [FILE], [3Sual] and [COPY/PASTE]. (note: copy/paste is just a file, but instead of uploading a file, users can just copy json/xml/yaml/csv/txt text and paste it) if they don't want to copy/paste but they have the file, they can just upload with file, if they do not have the file, but have a url they can paste the url, or they have found the topics on 3sual.az, they can use 3sual.

## v26.04.22

- Add acceptableAnswers array input to questions on topic create forms. Use chips for the answers.
- Make topic form and question form more compact
- On leaderboard, when two (or more) users have the same score, they should have the same rank, and the next rank should skip the count of the users with the same score. (e.g. 1/1/3/4/5/5/5/8...)
- On dashboard, add total followers and following counts to user table. Also add sorting by followers and following counts.
- On dashboard, on clicks and questions tables, there is question field, which renders the question text in a single line, which makes it really wide column, make it multiline, so it takes up less width.

## v26.04.23

- On home search add this feature. When the user is authenticated AND he/she is moderator/admin, he/she can type "dashboard/\*" keys. If he types just dashboard, dashboard page (/dashboard) should appear on result. He can also type individual dashboard pages like "dashboard/packs", "dashboard/users", "dashboard/games", "dashboard/topics", "dashboard/questions", "dashboard/clicks", "dashboard/jobs", these all should navigate to the respective pages. This data is not coming from the api, so it is client only, and only for admin/moderators. We are just creating a new search result type "page".
- Let's make home search more smart. Not just dashboard pages, but we can also search for other pages as well.

  > "create:pack" -> shows a result for this page - /packs/new
  > "create:topic" -> shows the current user's draft packs, and when clicking one of them, navigates to - /packs/$packSlug/topics/new
  > "create:game" -> only works if the current user is not in a game, and shows list of packs that user can host a game with, clicking one of them navigates to - /play/new/$packSlug
  > "join:game" -> only works if the current user is not in a game, and shows list of games that user can join, clicking one of them navigates to - /join/$code, or user can directly type "join:$code" then it directly goes to /join/$code
  > "leaderboard" -> shows the leaderboard page - /leaderboard (or even more specific with tabs "leaderboard:elo", "leaderboard:xp", "leaderboard:wins", "leaderboard:hosts", "leaderboard:plays")
  > "play" -> /play
  > "history" -> /history
  > "settings" -> /settings
  > "badges" -> /badges (specific "badges:id" -> /badges/$badgeId)
  > "whats-new" -> /whats-new (specific "whats-new:version" -> /whats-new/$version)
  > for non authenticated users
  > "login" -> /auth/login
  > "register" -> /auth/register

You can see some of them requires autneticated users, some of them requries moderator/admin, some of them requires an api call and some of them are just client only, so handle those logics, validations, etc.

## v26.04.24

- Implement email system with Mailjet. @xamsa/mail package already has the functionality, so we can use it. It has correct env variables, and everything has been set on mailsend side.
- Until this point, we did not check email verification of the users, so now we need to do two things:
  > For new users registration, we need to send verification email to the user. I have added sendVerficationEmail on better-auth auth instance already.
  > For existing users, we will put a button on settings page, right after the email address, if not verified, it will show "Verify email" and that will send a verification email to the user.

Users that have not verified emails, will not be able to:

- Login
- Create new packs/topics/questions
- Host/Join games

So everytime a user without verified email tries to do any of the above actions, it should show a popup/toast with a button "Verify email" and that will send a verification email to the user.

Email changing:

- User can change their email address, but they will need to verify the new email address as well. They can also change unverified email addresses, so that if an existing user has entered a wrong email (since there was no verification system before), they can change it to a real email address of theirs.

When email sends to user:

> On registration
> On password reset (authenticated users, from profile settings)
> On password reset (non-authenticated users, from forgot password page)
> On email change
> Non verified emails users, when they click Verify Email button
> When a user wins a game, a congratulatory email will be sent to the user
> When a user follows another user, a notification email will be sent to the user

Note:

- Handle every email sending functions on @xamsa/mail package, and use it in anywhere needed.
- Try to create a template html text, on that package, and use it in all emails. It should have a nice footer (with links maybe) and nice header (with app name, logo, etc.) you can take the logo from apps/web/public/logo.svg, and paste to @xamsa/mail package, and use it in all emails. Look at css file on ui package, to see the colors of our app as well.

## v26.04.25

- Create @xamsa/upload package for image/file/video/audio etc. uploading.
- We will use Cloudinary for that, so we will install necessary cloudinary dependecies.
- We will create a base uploadImage function, and that will be used in everywhere.
- The root folder of images on cloudinary will be xamsa/[env]/images
- For 1st phase we will just have upload avatar functionality for users/profiles.
- It will have xamsa/[env]/images/users/user_id/avatar path.
- It will be optimized, and be square format. User will be able to crop the image to a square format on frontend before sending.
- User will be able to update and delete their avatar. When updating and deleting, beside deletion the previous avatar from db, it should also being deleted from cloudinary.

## v26.04.26

- Introduce loggin/registering with Google using better-auth social providers.
- Also support account linking, for example i have registered with xxx@gmail.com, then i login with google with same email, they should get linked.
- On login and register page, there should be continue with Google button.
- Mapping google user to our user:
  -- Google provides email, first/last name, and profile picture. We have mandatory username field, so we need to generate a username from first/last name and be sure it is unique (if not try again with incremented suffix etc.). Also google's profile picture located on their own servers, so we need to download it and save it to our cloudinary storage.

## v26.04.27

- Fix, CORS error on auth API calls.

## v26.04.28

- When clicking on someone's profile photo, it should open a popup/modal with bigger image of the profile photo.
- On followers/following dialogs on profile page, each user must have a "Follow"/"Unfollow" button justified right (if current user is authenticated and not on self). So that users can easily follow/unfollow someone from there without opening the profile page or leaving the dialog.
- On home search, when typing "whats-new" it navigates to /whats-new page. When typing "whats-new:version" it navigates to /whats-new/$version page. There should also be "whats-new:latest" that automatically finds the latest version and navigates to it. It should also work on route level. Going to /whats-new/latest should automatically redirects user to /whats-new/$version (with the latest version).
- On home search, if user is authenticated typing "logout" and clicking on it, it should sign out the user and navigate to / page.
- On home search, if user is authenticated typing "settings" and clicking on it, it should navigate to /settings page. (i guess it is already there), but addition to that "settings:security" should navigate to /settings/security page.
- On home search, "privacy" and "terms" should navigate to /legal/privacy-policy and /legal/terms-of-service pages respectively.
- On profile page, when followers or following dialogs are open, respective query param should be set to "followers" or "following" respectively using nuqs. might be "?tab=followers" or "?tab=following".

## Later versions

- Add new badge: "Dominator" - When a user wins the game, with 2x more score with the runner-up.
- Add new badge: "Survivor" - When a user wins the game, with less than 500 points difference with the runner-up.
- Add comments system on packs and topics pages.
- Add posts. Posts will be like facebook posts, where authenticated users can create posts with content, image, etc. Posts will have a comprehensive attachement system, where you can attach game, pack, user, topic, question, click, etc. simply every type of resource that exists in the app. In the first phase though, you will just be able to write text, images, and attach games and packs.

### UNKNOWN VERSIONS:

- Add non-host games where host is computer-controlled (AI). It will be able to, control the game flow, and validate the answers (answers will be inputted by AI, and it will be validated by AI).
- Add pack collections/playlists system
- Better admin dashboard
- Add Pack.settings `allowForking` so the pack can be forked by other users
- Add Pack forking system, so user can fork a pack and edit it
