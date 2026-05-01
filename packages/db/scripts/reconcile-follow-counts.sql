-- Re-sync denormalized follow counters from actual user_follow rows.
-- Needed when follows were CASCADE-removed with a deleted user — columns are not adjusted automatically.

UPDATE "user" u
SET
  total_followers = COALESCE((SELECT COUNT(*)::int FROM "user_follow" f WHERE f."following_id" = u.id AND f.status = 'accepted'), 0),
  total_following = COALESCE((SELECT COUNT(*)::int FROM "user_follow" f WHERE f."follower_id" = u.id AND f.status = 'accepted'), 0);
