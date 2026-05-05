# Reddit-style sorting — Posts and Comments

Implementation spec for sortable post feeds and comment threads with engagement scoring and time-decay trending.

---

## 1. Scope

These sorts apply to:

- The global post feed
- A user's posts (on profile)
- Comments within a post
- Comments on Pack, Topic, and Question pages

## 2. Sort options

**Posts:**

- **Trending** (default)
- **Recent** (chronological, newest first)
- **Top** (with rolling time period)

**Comments:**

- **Top** (default)
- **Recent** (chronological, newest first)

**Top — rolling time periods (posts only):**

- All time (default)
- Last 24 hours
- Last 7 days
- Last 30 days
- Last 365 days

Time periods do NOT apply to Recent or Trending. Periods do NOT apply to comments at all.

## 3. New schema fields

### `Post`

```prisma
totalReactions Int @default(0) @map("total_reactions")  // existing
totalComments  Int @default(0) @map("total_comments")   // existing
totalBookmarks Int @default(0) @map("total_bookmarks")  // NEW
score          Int @default(0)                          // NEW

@@index([score])
@@index([createdAt, score])
```

### `Comment`

```prisma
totalReactions Int @default(0) @map("total_reactions")  // existing
totalReplies   Int @default(0) @map("total_replies")    // NEW (direct children only)
score          Int @default(0)                          // NEW

@@index([score])
@@index([rootId, score])
@@index([parentId, score])
```

`totalReplies` counts **direct children only** (not descendants). It increments when someone replies directly to this comment.

## 4. Score formulas

`score` is a denormalized cache. It always equals:

**Post:**

```
score = (totalReactions × 1) + (totalComments × 2) + (totalBookmarks × 3)
```

**Comment (root level only — see "Comment scoring" section):**

```
score = (totalReactions × 1) + (totalReplies × 3)
```

**Reply (depth > 0):**

```
score = totalReactions × 1
```

Replies do not include their child reply counts in their score. Only root-level comments factor `totalReplies` into score.

### Comment scoring rule

Score is computed differently based on `depth`:

- **Root comments (`depth = 0`)**: score includes both reactions and direct replies
- **Reply comments (`depth > 0`)**: score includes only reactions

This reflects that we only sort root comments by score; deeper replies stay in chronological order within their thread.

## 5. Score updates

Score and totals must update transactionally with the action that caused them.

**On reaction added:**

- Increment `totalReactions`
- Increment `score` by 1 (post or comment)

**On reaction removed (un-reacted):**

- Decrement `totalReactions`
- Decrement `score` by 1
- Floor at 0 (never let `totalReactions` or `score` go negative)

**On comment added (post only):**

- Increment `Post.totalComments`
- Increment `Post.score` by 2

**On comment removed (post only):**

- Decrement `Post.totalComments`
- Decrement `Post.score` by 2
- Floor at 0

**On reply added to a comment (Comment.parentId set):**

- Increment parent comment's `totalReplies`
- If parent comment is at `depth = 0`, increment parent's `score` by 3
- If parent is deeper, do not change parent's score (replies don't contribute to deeper-comment scores)

**On reply removed:**

- Decrement parent's `totalReplies`
- If parent is at `depth = 0`, decrement parent's `score` by 3
- Floor at 0

**On bookmark added (post only):**

- Increment `Post.totalBookmarks`
- Increment `Post.score` by 3

**On bookmark removed:**

- Decrement `Post.totalBookmarks`
- Decrement `Post.score` by 3
- Floor at 0

**On post or comment deleted:**

- Cascade deletes existing relations remove dependent rows automatically. No score recomputation needed for the deleted entity. Parent entities (e.g., a comment being deleted decrements the parent post's `totalComments` and `score`).

## 6. Sort queries

### Recent

```sql
ORDER BY created_at DESC, id DESC
```

Cursor pagination using `(createdAt, id)`.

### Top (with period)

```sql
WHERE created_at >= NOW() - INTERVAL '<period>'  -- omitted for "All time"
ORDER BY score DESC, id DESC
```

Periods:

- All time: no WHERE clause
- 24 hours: `INTERVAL '24 hours'`
- 7 days: `INTERVAL '7 days'`
- 30 days: `INTERVAL '30 days'`
- 365 days: `INTERVAL '365 days'`

Cursor pagination using `(score, id)`.

### Trending (posts only)

```sql
ORDER BY (
  LN(GREATEST(score, 0) + 1)
  * EXP(-EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400.0)
  + GREATEST(0, 1.0 - EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600.0)
) DESC, id DESC
```

Breakdown:

- `LN(GREATEST(score, 0) + 1)`: logarithmic compression of score, clamped to non-negative
- `EXP(-age_seconds / 86400)`: exponential decay with 24-hour half-life (well, ~24h time constant — actual half-life is 24×ln(2)≈16.6h, close enough)
- `GREATEST(0, 1.0 - age_hours)`: freshness boost — adds up to 1.0 for posts under 1 hour old, linearly decaying to 0 at 1 hour. Gives new posts a fighting chance against older popular ones.

**Pagination for Trending:** offset-based, hard-limited to first **500 results**. Beyond that, the user must switch to Top or Recent. This is deliberate — trending scores aren't stable enough for cursor pagination.

### Comment sorting

Comments are sorted **only at root level** (`depth = 0` / `parentId IS NULL`). Within each thread, child replies appear in chronological order regardless of which sort is selected.

**Top (default for comments):**

```sql
WHERE parent_id IS NULL AND <scope>  -- e.g. post_id = ? or pack_id = ?
ORDER BY score DESC, id DESC
```

**Recent:**

```sql
WHERE parent_id IS NULL AND <scope>
ORDER BY created_at DESC, id DESC
```

For each root comment retrieved, fetch its descendants in chronological order (existing behavior).

## 7. Defaults

| Surface                      | Default sort | Default period               |
| ---------------------------- | ------------ | ---------------------------- |
| Global post feed             | Trending     | n/a                          |
| User's posts                 | Trending     | n/a                          |
| Post comments                | Top          | n/a (no periods on comments) |
| Pack/Topic/Question comments | Top          | n/a                          |

For "Top" on posts, the default period is **All time**.

## 8. Implementation notes

- Score updates happen in the same transaction as the triggering mutation. Never update score in a separate transaction or async job.
- All score and total fields are clamped to >= 0 at the application level. Use `GREATEST(field - X, 0)` in the SQL update or check the value before decrementing.
- Trending sort cannot use indexes for the sorted expression (it's computed). Postgres handles this fine at expected scale (low thousands of posts).
- Top sort uses the `score` index directly, with optional time-window filter on `createdAt`. Both fields are indexed.
- Recent sort uses the existing `(createdAt, id)` index.
- No batch recomputation jobs. If drift is suspected, add diagnostics later — not now.

## 9. Edge cases

**Negative scores**: All score and total fields are clamped to >= 0. Decrement operations must check current value or use `GREATEST(value - X, 0)`.

**Brand-new posts**: The freshness boost in the Trending formula gives posts under 1 hour old up to +1.0 in their trending rank, decaying linearly. A 1-minute-old post with score 0 outranks an older post that decayed to a similar trending value.

**Zero-engagement posts**: A post with score 0 still has `LN(0+1) = 0` in the trending formula. After 24 hours and zero engagement, its trending score is essentially 0 except for the freshness boost (which is also 0 by then). It falls to the bottom of trending — correct behavior.

**Score field consistency**: Since score is denormalized, verify it matches the formula in tests:

```
post.score === (post.totalReactions * 1) + (post.totalComments * 2) + (post.totalBookmarks * 3)
comment.score === (comment.totalReactions * 1) + (comment.depth === 0 ? comment.totalReplies * 3 : 0)
```

## 10. Migration

Add the new fields with defaults, then backfill existing rows:

```sql
ALTER TABLE post
  ADD COLUMN total_bookmarks INT NOT NULL DEFAULT 0,
  ADD COLUMN score INT NOT NULL DEFAULT 0;

ALTER TABLE comment
  ADD COLUMN total_replies INT NOT NULL DEFAULT 0,
  ADD COLUMN score INT NOT NULL DEFAULT 0;

CREATE INDEX post_score_idx ON post(score);
CREATE INDEX post_created_at_score_idx ON post(created_at, score);
CREATE INDEX comment_score_idx ON comment(score);
CREATE INDEX comment_root_id_score_idx ON comment(root_id, score);
CREATE INDEX comment_parent_id_score_idx ON comment(parent_id, score);
```

**Backfill script** (run once after migration):

```sql
-- Backfill totalBookmarks for posts (count from PostBookmark relation)
UPDATE post p SET total_bookmarks = (
  SELECT COUNT(*) FROM post_bookmark pb WHERE pb.post_id = p.id
);

-- Backfill totalReplies for comments (count direct children)
UPDATE comment c SET total_replies = (
  SELECT COUNT(*) FROM comment child WHERE child.parent_id = c.id
);

-- Compute initial score for posts
UPDATE post SET score =
  (total_reactions * 1) + (total_comments * 2) + (total_bookmarks * 3);

-- Compute initial score for comments (depth-aware)
UPDATE comment SET score = CASE
  WHEN depth = 0 THEN (total_reactions * 1) + (total_replies * 3)
  ELSE total_reactions * 1
END;
```
