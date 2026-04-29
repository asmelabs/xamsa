-- Leaderboard sorts by total games hosted / played (patch 20 boards).
CREATE INDEX "user_total_games_hosted_idx" ON "user"("total_games_hosted");
CREATE INDEX "user_total_games_played_idx" ON "user"("total_games_played");
