# Difficulty rate (DR) — implementation spec (v1)

**Source of truth for shipped behavior.** For background and rejected alternatives, see [DIFFICULTY_RATE_TECH_DOC.md](./DIFFICULTY_RATE_TECH_DOC.md).

## Summary

| Entity | When updated | Rule |
|--------|----------------|------|
| **QDR** | `Click` → `correct` / `wrong`, same transaction as resolution; **published or draft** packs (`status !== archived`) and `Game.status === active` | Logistic expectation with `userElo = Player.eloAtGameStart \|\| 1000`, damped K, then `normalizeToQdr` (piecewise linear 555→1, 1000→4.5, 1665→10); stored **two decimals** so typical moves aren’t rounded away |
| **TDR** | After QDR change | Mean of `Question.qdr` for questions with `qdrScoredAttempts > 0`; if none, `4.5` |
| **PDR** | After TDR change | Mean of all `Topic.tdr` in the pack |

## Code

- **Math:** [`packages/utils/src/difficulty-rate.ts`](./packages/utils/src/difficulty-rate.ts)
- **Elo snapshot:** `Player.eloAtGameStart` set in `startGame` for all playing users; in `joinPlayer` when `game.status === "active"` (late join)
- **Persistence:** `resolveClick` in [`packages/api/src/modules/click/service.ts`](./packages/api/src/modules/click/service.ts) (inside existing `$transaction`)

## API / UI

- **Live game:** `qdr` / `tdr` / `pdr` and `hasRatedDifficulty` on `findOne` game are **host-only** where noted in [`packages/schemas/src/modules/game.ts`](./packages/schemas/src/modules/game.ts). Players do not get difficulty in `currentQuestion` for the public strip.
- **Recap & stats page:** full values + `hasRatedDifficulty`; display `—` when not yet rated.

## Tuning checkpoint

Revisit `K0`, `N0`, and normalization anchors after several weeks of production traffic.
