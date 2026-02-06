# 🕵️ CampusWhisper — Decentralized Anonymous Campus Rumor Verification System

## 📄 Day 1 Submission

**Team:** 4 Members
**Date:** February 6, 2026

---

## 1. Problem Understanding

We need to build a **trustless, anonymous rumor board** for campus events where:

- Students submit rumors/news **anonymously**
- There is **no central authority** deciding truth
- Other anonymous students **verify or dispute** claims
- Rumors earn **trust scores** through a designed mechanism
- The system must prevent **duplicate voting without collecting identities**
- Popular false rumors must **not auto-win** via mob rule
- The system must handle **score mutation bugs** (verified facts changing scores)
- **Bot accounts** manipulating votes must be detectable
- **Deleted rumors** must not ghost-affect newer rumor scores
- A **mathematical proof** must show the system can't be gamed by coordinated liars

### Core Tension

The fundamental challenge is the **trust trilemma**: the system must be simultaneously **anonymous**, **sybil-resistant**, and **decentralized**. Any two are easy — all three together require careful mechanism design.

---

## 2. Assumptions

| #   | Assumption                                                                                         | Justification                                                                       |
| --- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 1   | Students have a valid **university email** (e.g., `@campus.edu`)                                   | Needed for one-time enrollment; email is never stored or linked to activity         |
| 2   | The system is **semi-decentralized** — there's a server, but it has no admin control over truth    | Full P2P is infeasible for a hackathon; we decentralize _trust_, not infrastructure |
| 3   | A **semester-based salt** is distributed to all students (e.g., via LMS/email)                     | Required for the hash-based commitment scheme                                       |
| 4   | Users act **rationally** (they prefer higher reputation and influence over losing them)            | Required for the game-theoretic proof to hold                                       |
| 5   | The system starts with a **bootstrapping phase** where early votes are treated as lower-confidence | Cold-start problem is acknowledged and handled                                      |
| 6   | Rumors are **text-based** with optional image/link evidence attachments                            | Keeps scope buildable in one day                                                    |
| 7   | A rumor's lifecycle is: `submitted → active → verified/debunked → archived`                        | Clear state machine for score management                                            |

---

## 3. Proposed Solution & Approach

### 3.1 — Anonymous Identity & Sybil Resistance: **Hash-Based Commitment Scheme**

**How it works:**

1. University distributes a **secret salt** `S` to all enrolled students (per semester, via email/LMS)
2. When a student wants to vote on rumor `R`, their client computes:

```
vote_key = SHA256(student_id + S + rumor_id)
```

3. The `vote_key` is sent to the server. The server:
    - Checks if this `vote_key` has already voted on this rumor → **reject if duplicate**
    - Stores the `vote_key` → **cannot reverse-engineer** `student_id` from it (one-way hash)
    - Has **no knowledge** of which student produced which `vote_key`

4. Each unique `(student, rumor)` pair produces a **unique, deterministic, irreversible** key

**Why this works:**

- ✅ **Sybil-resistant**: One student can only produce one valid `vote_key` per rumor
- ✅ **Anonymous**: Server never sees `student_id`; hash is irreversible
- ✅ **Simple to implement**: One SHA256 call. No crypto libraries needed
- ✅ **Verifiable**: If challenged, a third party with the salt can verify the scheme's integrity

**Edge case — salt leakage:**
If the salt leaks to outsiders, they still need a valid `student_id` in the university's format. We can add an enrollment step where `hash(student_id + enrollment_salt)` is pre-registered (one-time, anonymous), creating a whitelist of valid hash prefixes.

---

### 3.2 — Verification Mechanism: **Evidence-Based Challenge System**

**How it works:**

1. A rumor is submitted as **unverified**.
2. Any user can attach **evidence** (screenshots, links, photos) to either **support** or **dispute** the rumor.
3. Other users vote on the **evidence quality**, not just the rumor.
4. Evidence with higher community validation gets **higher weight** in the trust score.

**Resolution triggers:**

- Trust score stays above **0.75** for **48 hours** → Verified ✅
- Trust score stays below **0.25** for **48 hours** → Debunked ❌
- Score between 0.25–0.75 after **7 days** → Inconclusive ⚪

**Why this works:**

- ✅ Shifts debate from **opinion** to **verifiable proof**
- ✅ Enables layered trust: rumor → evidence → evidence votes
- ✅ Strongly resists popularity-only manipulation
- ✅ Easy to explain and demo (attach evidence, vote on evidence)

---

### 3.3 — Trust Score Mechanism: **Bayesian Trust Scoring**

**The Formula:**

Each rumor starts with a prior trust score of **P₀ = 0.5** (maximum uncertainty).

When user `i` casts a vote `vᵢ ∈ {+1, -1}` with evidence quality `qᵢ` and voter reputation `rᵢ`:

```
Trust Score Update:

P_new = P_old × L / (P_old × L + (1 - P_old))

Where L (likelihood ratio) = exp(α × vᵢ × wᵢ)

And vote weight wᵢ = rᵢ × (1 + qᵢ)
```

- `α` = learning rate (tuned to 0.1 to prevent single-vote domination)
- `vᵢ` = +1 (verify) or -1 (dispute)
- `qᵢ` = evidence quality score (0.0–1.0), derived from evidence upvotes
- `rᵢ` = voter's reputation score (0.0–1.0), derived from historical accuracy

**Voter Reputation (`rᵢ`):**

```
rᵢ = (correct_votes + 1) / (total_votes + 2)    // Laplace smoothing
```

- New users: `r = 1/2 = 0.5` (neutral)
- User with 9/10 correct: `r = 10/12 ≈ 0.83` (high influence)
- User with 2/10 correct: `r = 3/12 = 0.25` (low influence)

**Properties:**

- ✅ Starts uncertain, converges with evidence
- ✅ High-reputation voters shift score more
- ✅ Naturally handles conflicting votes (they partially cancel)
- ✅ Single voter can never dominate (bounded by α and stake cap)

---

### 3.4 — Preventing Popularity = Truth: **Evidence Multiplier + Log Scaling**

**Problem:** If 500 people believe a false rumor, raw voting would make it "true."

**Solution — Two mechanisms combined:**

#### A) Logarithmic Vote Scaling

The effective vote count is scaled logarithmically:

```
effective_weight(n) = 1 + ln(n)

n = 10  → weight = 3.3
n = 100 → weight = 5.6
n = 1000 → weight = 7.9
```

So 1000 votes is only **~2.4×** more powerful than 100 votes, not 10×. This **caps mob power**.

#### B) Evidence Multiplier

Evidence-backed votes carry **higher weight** than raw opinion. A rumor without evidence can move, but its score advances **slowly**; verified evidence creates **step-change** gains.

**Why this works:**

- ✅ Popular lies grow slowly without proof
- ✅ Unpopular truths with strong evidence CAN reach verified
- ✅ Creates incentive to find evidence, not just recruit voters
- ✅ Simple to implement: evidence-weight multiplier

---

### 3.5 — Score Mutation Bug Fix: **Append-Only Audit Log**

**Problem:** Verified facts from last month are mysteriously changing their trust scores.

**Root Cause Analysis:** Likely caused by:

- Late votes still being processed after resolution
- Voter reputation recalculations retroactively affecting old scores
- Database race conditions on concurrent updates

**Solution — Append-Only Audit Log:**

Every score change is logged:

```json
{
    "rumor_id": "r_abc123",
    "timestamp": "2026-02-06T14:30:00Z",
    "previous_score": 0.72,
    "new_score": 0.74,
    "trigger": "vote",
    "vote_key_hash": "sha256:...",
    "stake": 3,
    "direction": "verify"
}
```

- Logs are **append-only** (INSERT only, no UPDATE/DELETE)
- Any score can be **reconstructed** by replaying the log
- **Anomaly detection**: if `new_score` doesn't match replayed calculation → flag corruption
- **Auto-correction**: replayed score becomes the source of truth

---

### 3.6 — Bot Detection: **Behavioral Fingerprinting + Trust-Graph Analysis**

**Problem:** Users creating bot accounts to manipulate votes.

**Solution — Statistical + Graph Detection (no ML needed):**

#### Signals Tracked:

| Signal                    | Threshold                                                       | Action                                       |
| ------------------------- | --------------------------------------------------------------- | -------------------------------------------- |
| **Voting speed**          | < 3 seconds between vote page load and vote submission          | Flag + reduce vote weight to 0.1×            |
| **Temporal clustering**   | 5+ accounts voting on same rumor within 10-second window        | Flag entire cluster                          |
| **Agreement correlation** | Two accounts agree on > 90% of votes (across 10+ shared rumors) | Merge their vote weight (treat as one voter) |
| **Stake pattern**         | Always stakes exactly the same amount                           | Soft flag (low confidence)                   |
| **Session fingerprint**   | Same browser fingerprint hash across multiple accounts          | Hard flag + suspend                          |

#### Trust-Graph Anomaly Detection

- Build a graph where nodes are users and edges connect users who frequently agree.
- Bot rings form **dense clusters** with near-identical voting patterns.
- Clusters above a similarity threshold get **down-weighted as a group**.

#### Penalty System:

```
flag_score = weighted_sum(signals)

flag_score < 0.3  → Normal user
flag_score 0.3–0.7 → Reduced vote weight (multiplied by 1 - flag_score)
flag_score > 0.7  → Vote quarantined (not counted until manual review)
```

**Why this works:**

- ✅ No identity collection needed — purely behavioral
- ✅ Bots can technically vote, but their votes are **effectively worthless**
- ✅ False positives are handled gracefully (reduced weight, not banned)
- ✅ Correlation detection catches **coordinated** bot rings, not just individuals

---

### 3.7 — Ghost Rumor Bug Fix: **Dependency Graph (DAG)**

**Problem:** Deleted rumors are still affecting trust scores of newer related rumors.

**Root Cause Analysis:** When a rumor is deleted:

- Voter reputation scores were calculated INCLUDING votes on the now-deleted rumor
- If rumor A was deleted but user X voted correctly on A, X's reputation still reflects that vote
- X's inflated reputation then affects their votes on rumor B → ghost influence

**Solution — Dependency Graph Propagation:**

1. Model rumor relationships as a **directed acyclic graph (DAG)**.
2. Each rumor has edges to related rumors that reused the same evidence or witnesses.
3. On deletion, perform a **topological walk** to recalculate only downstream nodes.
4. This prevents deleted rumors from ghost-inflating related scores.

**Why this works:**

- ✅ Efficient (only affected rumors are recomputed)
- ✅ Accurate (prevents hidden dependencies from lingering)
- ✅ Clear mental model for judges and debugging

---

## 4. System Architecture (Boilerplate‑Agnostic)

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Boilerplate UI)                  │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │  Submit   │  │  Vote    │  │  Browse  │  │  Evidence     │  │
│  │  Rumor    │  │  Panel   │  │  Feed    │  │  Upload       │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬────────┘  │
│       │              │             │               │            │
│  ┌────┴──────────────┴─────────────┴───────────────┴────────┐  │
│  │              Client-Side Vote Key Generator               │  │
│  │         vote_key = SHA256(student_id + salt + rumor_id)    │  │
│  └──────────────────────────┬────────────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────────┘
                              │ HTTPS (vote_key, NOT student_id)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SERVER (Boilerplate API)                     │
│                                                                 │
│  ┌──────────────┐  ┌────────────────┐  ┌─────────────────────┐ │
│  │  Auth Gate   │  │  Scoring       │  │  Bot Detection      │ │
│  │  (vote_key   │  │  Engine        │  │  Engine             │ │
│  │   dedup)     │  │  (Bayesian)    │  │  (Behavioral)       │ │
│  └──────┬───────┘  └───────┬────────┘  └──────────┬──────────┘ │
│         │                  │                       │            │
│  ┌──────┴──────────────────┴───────────────────────┴──────────┐ │
│  │                    Business Logic Layer                     │  │
│  │  - Evidence validation - Trust-graph analysis              │  │
│  │  - Audit logging       - Reputation recalculation          │  │
│  │  - DAG cleanup         - Resolution rules                  │  │
│  └──────────────────────────┬─────────────────────────────────┘ │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA STORE (SQL/NoSQL)                      │
│                                                                 │
│  ┌────────────┐ ┌────────────┐ ┌──────────┐ ┌───────────────┐  │
│  │  rumors     │ │  votes     │ │  users   │ │  audit_log    │  │
│  │            │ │            │ │ (anon)   │ │  (append-only)│  │
│  │- id        │ │- vote_key  │ │- token_  │ │- rumor_id     │  │
│  │- content   │ │- rumor_id  │ │  hash    │ │- old_score    │  │
│  │- score     │ │- direction │ │- tokens  │ │- new_score    │  │
│  │- status    │ │- stake     │ │- reputa- │ │- trigger      │  │
│  │- evidence[]│ │- timestamp │ │  tion    │ │- timestamp    │  │
│  │- created_at│ │- bot_score │ │- bot_    │ │               │  │
│  │- frozen_at │ │            │ │  flag    │ │               │  │
│  └────────────┘ └────────────┘ └──────────┘ └───────────────┘  │
│                                                                 │
│  ┌──────────────────────┐  ┌──────────────────────────────┐    │
│  │  Realtime             │  │  Row Level Security          │    │
│  │  (live score updates) │  │  (no direct DB access)       │    │
│  └──────────────────────┘  └──────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow — Voting

```
1. User opens rumor page
2. Client computes: vote_key = SHA256(student_id + salt + rumor_id)
3. Client sends: { vote_key, rumor_id, direction, evidence_id? }
4. Server checks:
   a. vote_key not already used for this rumor? → proceed
  b. Rumor is ACTIVE? → proceed
  c. Bot detection score < threshold? → proceed
5. Server computes new Bayesian trust score (evidence-weighted)
6. Server logs change to audit_log
7. Server broadcasts new score via Supabase Realtime
9. Client updates UI in real-time
```

### Data Flow — Resolution

```
1. CRON job runs every hour
2. For each ACTIVE rumor:
   a. If score > 0.75 AND has been > 0.75 for 48h → VERIFIED_PENDING
   b. If score < 0.25 AND has been < 0.25 for 48h → DEBUNKED_PENDING
   c. If age > 7 days AND score between 0.25–0.75 → INCONCLUSIVE
3. For VERIFIED/DEBUNKED_PENDING (after 24h grace period):
  a. Update rumor status
  b. Update voter reputations
  c. Log to audit trail
```

---

## 5. Tech Stack (TBD — Based on Provided Boilerplate)

| Layer           | Technology (Placeholder)              | Justification                                       |
| --------------- | ------------------------------------- | --------------------------------------------------- |
| Frontend        | **Boilerplate UI framework**          | Must use the provided template                      |
| Backend         | **Boilerplate API layer**             | Must use the provided template                      |
| Database        | **Boilerplate data store**            | Use whatever storage the boilerplate includes       |
| Auth            | **None (by design)**                  | Anonymous system; enrollment via hashed tokens only |
| Hashing         | **Web Crypto API (client-side)**      | SHA-256 runs in browser, no server-side identity    |
| Deployment      | **Boilerplate deployment path**       | Use the provided deploy flow                        |
| Background Jobs | **Simple scheduler / manual trigger** | Keep build feasible in 10–2 window                  |

---

## 6. Database Schema (Key Tables)

```sql
-- Rumors table
CREATE TABLE rumors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  category VARCHAR(50),
  trust_score DECIMAL(4,3) DEFAULT 0.500,
  status VARCHAR(20) DEFAULT 'ACTIVE',  -- ACTIVE, VERIFIED, DEBUNKED, INCONCLUSIVE, DELETED
  evidence JSONB DEFAULT '[]',
  vote_count_verify INT DEFAULT 0,
  vote_count_dispute INT DEFAULT 0,
  evidence_score DECIMAL(4,3) DEFAULT 0.000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  frozen_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

-- Votes table
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_key_hash VARCHAR(64) NOT NULL,  -- SHA256 of the vote_key (double-hashed)
  rumor_id UUID REFERENCES rumors(id),
  direction SMALLINT NOT NULL,  -- +1 verify, -1 dispute
  evidence_id UUID,
  voter_reputation DECIMAL(4,3),  -- snapshot at time of vote
  bot_flag_score DECIMAL(4,3) DEFAULT 0.000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vote_key_hash, rumor_id)  -- prevents duplicate votes
);

-- Anonymous users (identified only by token_hash)
CREATE TABLE users (
  token_hash VARCHAR(64) PRIMARY KEY,  -- SHA256 of enrollment token
  reputation DECIMAL(4,3) DEFAULT 0.500,
  correct_votes INT DEFAULT 0,
  total_votes INT DEFAULT 0,
  bot_flag_score DECIMAL(4,3) DEFAULT 0.000,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Append-only audit log
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  rumor_id UUID REFERENCES rumors(id),
  previous_score DECIMAL(4,3),
  new_score DECIMAL(4,3),
  trigger VARCHAR(50),  -- 'vote', 'resolution', 'recalculation', 'freeze'
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Evidence table
CREATE TABLE evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rumor_id UUID REFERENCES rumors(id),
  content_url TEXT,
  description TEXT,
  upvotes INT DEFAULT 0,
  submitted_by VARCHAR(64),  -- token_hash
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Evidence votes table
CREATE TABLE evidence_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id UUID REFERENCES evidence(id),
  vote_key_hash VARCHAR(64) NOT NULL,
  direction SMALLINT NOT NULL,  -- +1 helpful, -1 misleading
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vote_key_hash, evidence_id)
);
```

---

## 7. Mathematical Proof: System Cannot Be Gamed

### Theorem: Honest behavior is a Nash Equilibrium

**Setup:**

- Let there be `n` voters, of which `k` are coordinated liars
- Each voter has reputation `rᵢ` and evidence-quality influence `qᵢ`
- Honest voters vote according to their genuine belief
- Liars vote to push a false rumor to "verified"

**Proof:**

#### Step 1: Dominant Strategy (Game Theory)

Users gain reputation and influence when their evidence-backed votes align with eventual outcomes. Dishonest behavior lowers future influence because it reduces reputation and causes evidence to be down‑weighted.

Therefore, for rational users, **honest behavior maximizes long‑term influence** → a **Nash Equilibrium**.

#### Step 2: Cost Growth Bound

Let $k$ be the number of coordinated attackers. Because vote impact is logarithmically scaled, total influence grows as $O(\ln k)$ while the **cost** of producing plausible evidence and coordinating grows as $O(k)$.

Thus the **cost-to-influence ratio increases with $k$**, making large-scale manipulation economically irrational.

#### Step 3: Evidence Constraint

High trust scores require **validated evidence**. Attackers must not only coordinate votes but also fabricate evidence that passes community scrutiny, which is substantially harder and riskier than mass voting.

---

## 8. Summary of How Each Challenge is Addressed

| Challenge                      | Solution                                              | Mechanism                                                            |
| ------------------------------ | ----------------------------------------------------- | -------------------------------------------------------------------- |
| No central authority           | Evidence-based challenges + Bayesian scoring          | Crowd-sourced truth anchored in evidence                             |
| Anonymous duplicate prevention | Hash-based commitment: `SHA256(id + salt + rumor_id)` | Deterministic, irreversible, unique per student per rumor            |
| Popular lies winning           | Evidence multiplier + log scaling                     | Votes alone are weak; evidence is required for high trust            |
| Score mutation bug             | Append-only audit log                                 | Replayable history makes mutations observable and correctable        |
| Bot manipulation               | Behavioral + trust-graph detection                    | Statistical + structural detection of coordinated bot rings          |
| Ghost rumor bug                | Dependency graph (DAG)                                | Recompute only affected downstream rumors                            |
| Mathematical proof             | Game theory + cost-growth argument                    | Honest behavior is dominant; attack cost grows faster than influence |

---

## 9. Implementation Plan (Day 2 — 10:00–2:00)

| Time        | Task                                                    |
| ----------- | ------------------------------------------------------- |
| 10:00–10:25 | Boilerplate setup, data models, basic routing           |
| 10:25–11:10 | Core API: rumor submission, evidence submission, voting |
| 11:10–11:40 | Bayesian scoring engine + evidence weighting            |
| 11:40–12:10 | Frontend: rumor feed, evidence UI, score updates        |
| 12:10–12:30 | Bot flags (timing + agreement correlation)              |
| 12:30–1:15  | Testing + polish                                        |
| 1:15–2:00   | Pitch prep + deploy (using boilerplate path)            |

---

## 10. Key Design Principles

1. **Trust is earned, not given** — reputation must be built through accurate voting
2. **Evidence over opinion** — proof matters more than raw votes
3. **Bounded popularity** — logarithmic scaling prevents mob dominance
4. **Transparency without identity** — full audit trail, zero personal data
5. **Graceful degradation** — bots aren't banned, they're weakened; deleted rumors are cleaned, not ignored
6. **Mathematical rigor** — every mechanism has a formal justification

---

_CampusWhisper: Where truth emerges from the crowd, not from authority._
