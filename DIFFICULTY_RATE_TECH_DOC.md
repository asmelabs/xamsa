# Difficulty rate (DR) — technical specification

> **Note:** The **shipped** algorithm and data model are summarized in [DIFFICULTY_RATE_IMPLEMENTATION_SPEC.md](./DIFFICULTY_RATE_IMPLEMENTATION_SPEC.md). This file remains as broader design context (alternatives, tradeoffs).

This document describes **Question Difficulty Rate (QDR)**, **Topic Difficulty Rate (TDR)**, and **Pack Difficulty Rate (PDR)** for Xamsa: definitions, update algorithms, normalization, data model, and implementation notes. It is intended to be implementation-ready but parameters should be tuned against production traffic.

---

## 1. Goals and constraints

| Requirement | Spec |
|-------------|------|
| **Scale** | Each DR is a **user-facing** number in **\[1, 10\]**, typically shown with one decimal. |
| **Initial value** | When content is **first published** (or when a new question/topic/pack row is first exposed as published), set DR to **4.5** (neutral / middle ground). |
| **Update cadence** | Recompute (or apply incremental updates) **after each finished game** that played the relevant content, using data from that session and accumulated state. |
| **Compatibility** | Use existing **`User.elo`** (integer, default 1000, see `User` in `packages/db/prisma/schema/auth.prisma`) as the strength signal. Elo is already updated in `finalizeGame` (`packages/api/src/modules/game/finalize-game.ts`); QDR updates should use a **pre-game** or **pre-question** Elo snapshot consistent with that flow. |

**Non-goals (v1):** using DR to match players or to gate content; DR is primarily **metadata for discovery, labeling, and author analytics** unless product later extends it.

---

## 2. Terminology

- **QDR** — difficulty of a single `Question` (per `question.id`).
- **TDR** — difficulty of a `Topic` (per `topic.id`), derived from the **up to five** questions in that topic (`Question.order` ∈ \[1, 5\] in `pack.prisma`).
- **PDR** — difficulty of a `Pack` (per `pack.id`), derived from its topics’ TDRs.

**Internal vs display:** implementations should keep an **internal real-valued state** (unbounded or wide range) for stable online updates, then map to **display DR ∈ \[1, 10\]** via a fixed normalization (Section 5). Optionally store both `difficultyInternal` and `difficultyDisplay` or only one plus derived columns.

---

## 3. Signals available in the codebase

These inform what QDR can use without new instrumentation:

| Signal | Source | Use for QDR |
|--------|--------|--------------|
| **Correct / wrong / expired** | `Click.status` (`ClickStatus` in `game.prisma`) | Primary outcome. Expired may be treated as “no scored outcome” for QDR or a separate light penalty — product choice. |
| **Who answered** | `Click` → `Player` → `User` | `User.elo` at play time. |
| **Buzz order** | `Click.position` (1 = first in queue) | Optional: weight first buzzes more, or use as tie-break. |
| **Reaction time** | `Click.reactionMs` | Optional: slow correct vs fast wrong (noise-heavy; use as small modifier or ignore in v1). |
| **Per-question order** | `Question.order` (1..5) | Drives TDR aggregation and monotonicity (Section 4.2). |

**Definition (v1):** a **scored attempt** for QDR is a `Click` with `status ∈ { correct, wrong }` on that `questionId`. (Whether `expired` counts is configurable.)

---

## 4. Algorithms

### 4.1 Question difficulty (QDR)

**Intent:** a question is “harder” if, controlling for user strength, **stronger players miss** or **weaker players hit** more than the model expects.

#### Internal representation

- Maintain **internal difficulty** `q_internal ∈ ℝ` (e.g. same scale as Elo “difficulty” or a dedicated logit line).
- Optionally maintain **QDR observation count** `n_q` for damping.

#### Elo-style logistic update (recommended default)

Map user strength and question difficulty to a **expected probability of correct** for a *scored* attempt:

\[
\mathbb{P}(\text{correct} \mid u,q) = \sigma\bigl(\alpha \cdot (E_u - S_q)\bigr) = \frac{1}{1 + \exp\bigl(-\alpha (E_u - S_q)\bigr)}
\]

Where:

- \(E_u\) = `User.elo` **at game start** (or snapshot time defined below).
- \(S_q\) = **question strength** in Elo space: \(S_q = E_{\text{ref}} - q_{\text{offset}}\), with `q_offset` derived from internal state so that **higher QDR (harder) ↔ higher \(S_q\)** in the sense that strong users are still favored.

A practical convention:

- Store **`qEloEquiv`** (float): “Elo at which a typical user has 50% correct” *not* the display 1..10. Initial `qEloEquiv` = **1000** (align with default user Elo).  
- **Display QDR** = normalize `qEloEquiv` (or a dedicated internal scalar) to \[1, 10\] (Section 5).

**Per-attempt update (after each relevant click or batched at end of question):**

- Let `outcome` = 1 for correct, 0 for wrong.
- Expected \(p = \sigma(\alpha (E_u - q_{\text{EloEquiv}}))\) with a fixed \(\alpha = 1/400\) (match classic Elo logistic width) or tune.
- **Delta:**  
  `qEloEquiv += K * (outcome - p)`  
  with **K** scaled down when `n_q` is small (e.g. `K = K0 / (1 + n_q / N0)`) to avoid wild swings on first plays.

**Click enrichment (optional v1+):**

- **Multiple clicks per question** (retries / queue): use **first scored click** for outcome, or **any correct** in the question window — document the rule; keep one primary signal to avoid double counting.
- **Position `position`:** multiply `K` by a factor if `position === 1` (buzz in first) vs later (0.5–1.0).
- **Reaction time:** e.g. `K_eff = K * clamp01(1 + β * (reactionMs - reactionMedian) / IQR)` only if A/B shows stability.

**Elo of non-clickers:** users who did not buzz provide **no direct** binary outcome. Optional extension: treat “no buzz before reveal” as a weak signal (lower engagement); **v1 recommendation:** **ignore** to reduce bias from host speed and game rules.

#### Cold start and publishing

- On **first publish** of a question: set display **QDR = 4.5** and internal `qEloEquiv = 1000` (or map 4.5 → internal consistently).
- For the first **N** scored attempts (e.g. N < 20), **blend** updated `qEloEquiv` toward **topic-level** or **global** prior:  
  `q ← w(n) * q_update + (1 - w(n)) * prior` with `w(n) → 1` as `n` grows.

---

### 4.2 Topic difficulty (TDR)

**Intent:** summarize the **five ordered questions** in a topic, respecting that **later questions (higher `Question.order`)** are intended to be **at least as hard in expectation** (incremental / ramp-up).

**Inputs:** the five (or fewer if draft) **display QDRs** (or internal values) in order: \(q_1 \ldots q_5\).

**Recommended: weighted average with monotonicity**

1. **Weights** increasing with order, e.g.  
   \(w = (1,2,3,4,5)\) normalized, or \((0.1,0.15,0.2,0.25,0.3)\) if you want the last two to dominate.  
2. **Raw TDR*:** \(\text{TDR}_* = \sum_i w_i q_i\).

3. **Monotone / incremental adjustment:** if \(q_1 \le q_2 \le \cdots \le q_5\) is violated, replace \((q_i)\) with their **isotonic regression** (pool-adjacent-violators) under increasing order, **then** apply the same weighted sum. This enforces a **ramp** without throwing away data.

**Alternative (simpler):** no isotonic step; TDR* = weighted sum of raw QDRs. Simpler but a single out-of-order question skews the narrative.

**Output:** `TDR_display = normalizeTo10(TDR_*)` if `TDR_*` is on internal scale; if QDRs are **already** in \[1,10\], TDR* is in \[1,10\] and may only need **clipping** (or pass through the same display squash as in Section 5 for consistency).

**Storage:** one scalar **TDR** on `Topic` (plus optional `tdrVersion` for migrations).

---

### 4.3 Pack difficulty (PDR)

**Intent:** a single number for the whole `Pack`.

**Default:** **unweighted arithmetic mean** of **TDR** over all `Topic` rows in the pack (ordered or unordered — mean is order-invariant):

\[
\text{PDR} = \frac{1}{M}\sum_{j=1}^{M} \text{TDR}_j
\]

**Alternatives (document if used):**

- **Weight by `Topic.order`:** later topics count more.
- **Max(TDR)**: “pack is as hard as the hardest topic” — harsher, good for “one brutal topic” packs.

**v1:** plain mean; cheapest to explain.

---

## 5. Non-linear normalization to \[1, 10\]

**Why:** internal Elo-like values spread roughly linearly, but the product wants a **visually balanced** 1–10 with **softer saturation** at the extremes.

**Recommended pipeline**

1. **Internal → linear bridge:** e.g. map `qEloEquiv` to a linear proxy on \[1,10\]:  
   \(\ell = 1 + 9 \cdot \mathrm{clip}_{[400,2000]}\frac{q_{\text{EloEquiv}} - 400}{1600}\)  
   (bounds illustrative; tune to your Elo distribution).

2. **Display squash (sigmoid on deviation from center):**  
   Let `m = 4.5` (neutral display).  
   `display = m + 4.5 * tanh( (ell - m) / T )`  
   with **T** tunable (e.g. 1.5–3.0 on the 1–10 scale) — compresses extreme `ell` toward 1 and 10 without hard clipping in the middle.

3. **Hard clip:** `final = min(10, max(1, display))` for API safety.

**Parameters to tune:** `Elo` bridge endpoints, `T` in `tanh`, and whether QDR/TDR/PDR share one curve or TDR/PDR only clip after aggregation.

**Consistency:** if all questions start at 4.5 internal→display, the **post-publish** identity holds before enough data is collected.

---

## 6. Data model changes (suggested)

Add fields on existing models in `packages/db/prisma/schema/pack.prisma` (or adjacent):

### `Question`

| Field | Type | Purpose |
|-------|------|--------|
| `difficultyDisplay` | `Float` | Cached QDR in \[1, 10\], default **4.5** |
| `difficultyEloEquiv` | `Float` | Internal anchor (optional; default 1000) |
| `difficultyScoredPlays` | `Int` | Count of updates or scored attempts (for K damping) |
| `difficultyUpdatedAt` | `DateTime?` | Last QDR change |

**Indexes:** optional `(difficultyDisplay)` for sort/filter in listings.

### `Topic`

| Field | Type | Purpose |
|-------|------|--------|
| `difficultyDisplay` | `Float` | TDR, default **4.5** |
| `difficultyUpdatedAt` | `DateTime?` | Last recompute |

### `Pack`

| Field | Type | Purpose |
|-------|------|--------|
| `difficultyDisplay` | `Float` | PDR, default **4.5** |
| `difficultyUpdatedAt` | `DateTime?` | Last recompute |

**Denormalization:** TDR/PDR can be **recomputed in a job** from children to avoid drift; no need to store full vectors unless you want topic-level `qdr1..5` for analytics.

**Publishing:** when `Question` / `Topic` / `Pack` transitions to **published**, set `difficultyDisplay = 4.5` and internal defaults if not already set.

**Migration:** backfill `4.5` for existing published rows; internal fields optional with default 1000.

---

## 7. Implementation notes

### 7.1 Where to run updates

- **QDR:** after each **finalized** `Click` for `correct`/`wrong`, or in bulk when a **game** or **question** phase completes — consistent with your transaction boundaries in `finalizeGame` and any click-resolution handlers. Batching per question in one game reduces DB writes.
- **TDR / PDR:** recompute when:
  - any **child** QDR changes, or
  - **nightly** / **async queue** to cap write amplification.

Order: **QDR → TDR (affected topic) → PDR (affected pack)**.

### 7.2 Elo snapshot

- Use **`User.elo` read at game start** (or the same snapshot already used in `EloPlayerRow.ratingBefore` in `packages/utils/src/elo.ts` patterns). Do **not** use post-game Elo for the same events that update Elo, or you introduce coupling bias; the doc’s default is **pre-game** Elo for QDR expectation.

### 7.3 Idempotency and duplicates

- If a click is edited (correct ↔ wrong), either **revert** the previous QDR delta and apply the new one, or store **per-click contribution id** in a small ledger (heavier). Simplest: **only finalize QDR on immutable resolution** and disallow retro edits for rating (product-dependent).

### 7.4 Module layout (suggested)

- `packages/utils/src/difficulty-rate.ts` — pure functions: `expectedCorrect`, `updateQEloEquiv`, `weightedTopicTdr`, `packPdrFromTdrs`, `toDisplay1to10`.
- API / finalize pipeline calls these after persisting game outcomes.

### 7.5 API and UI

- Expose `difficultyDisplay` on public pack/topic/question payloads where needed (Zod in `packages/schemas` aligned with Prisma + `@zod` generation).
- Round for UI: one decimal; avoid implying false precision (e.g. 4.3 vs 4.34 internal).

### 7.6 Testing

- **Unit tests:** monotonic isotonic TDR, sigmoid bounds, Elo update moves QDR in the right direction (wrong by strong user increases difficulty).
- **Property tests:** after many symmetric players at Elo 1000, QDR of a fixed question converges (optional).

---

## 8. Parameters (initial guesses — tune in prod)

| Symbol / knob | Suggested start | Note |
|---------------|-----------------|------|
| `K0` (QDR Elo update step) | 2–8 | Per scored attempt, before damping |
| `N0` (damping half-life in plays) | 10–30 | Larger = slower convergence |
| `α` in logistic | `1/400` | Standard Elo-like |
| TDR weights | linear 1..5 | Normalize to sum 1 |
| `tanh` scale **T** | 2.0 | Display spread |
| Elo bridge range for linear map | 400–2000 | Match your population |

---

## 9. Open decisions (fill before v1 ship)

1. **Expired clicks:** exclude (recommended) vs small negative weight.
2. **First-click only vs any buzz** for a single user on one question.
3. **Isotonic TDR** on or off (complexity vs UX story).
4. **Async vs synchronous** TDR/PDR recompute (load vs consistency).
5. **Whether DR** updates when pack is still **draft** (probably no; only published plays).

---

## 10. Summary

| Entity | Main inputs | Default aggregation | Initial value | Display |
|--------|-------------|----------------------|--------------|---------|
| **QDR** | Scored click outcomes + `User.elo` (+ optional position/time) | Elo-style logistic update on `difficultyEloEquiv`, then map to 1..10 | 4.5 / internal 1000 | \[1, 10\] |
| **TDR** | Five per-topic QDRs + `Question.order` | Weighted average + optional isotonic monotonicity | 4.5 | \[1, 10\] |
| **PDR** | All topic TDRs in pack | **Arithmetic mean** (unless weighted variant chosen) | 4.5 | \[1, 10\] |

This spec is versioned in git; when behavior changes, bump a short **changelog** section here or in release notes.
