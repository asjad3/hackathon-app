# CampusWhisper — Summary (Skim Version)

## Problem in one line

Build an anonymous campus rumor system with no central truth authority, while preventing duplicate votes, bot manipulation, mob-rule falsehoods, and score bugs — and prove it can’t be gamed by coordinated liars.

---

## Core Idea

Truth emerges via **evidence-based challenges**, **Bayesian trust scoring**, and **bounded popularity**, all while keeping identities hidden and preventing Sybil attacks.

---

## Key Mechanisms (Quick Scan)

### 1) Anonymous + Sybil-Resistant Voting

- **Hash-based commitment**: `SHA256(student_id + salt + rumor_id)`
- One student = one vote per rumor, without revealing identity

### 2) Verification / Dispute System

- **Evidence-based challenge system**: rumors are verified or disputed by attaching evidence
- Other users vote on the **evidence quality**, not just the rumor
- Evidence-backed votes carry higher weight than raw opinion

### 3) Trust Score Engine

- **Bayesian update** from prior $P_0 = 0.5$
- Vote influence = stake × voter reputation
- Reputation = smoothed accuracy ratio

### 4) Popularity ≠ Truth

- **Evidence multiplier** (evidence is required to reach high trust)
- **Logarithmic vote scaling** caps mob impact

### 5) Score Mutation Bug Fix

- **Append-only audit log** for every score update
- Full score history is replayable, making mutations observable and debuggable

### 6) Bot Manipulation Defense

- **Behavioral fingerprinting** (timing, clustering, agreement correlation)
- **Trust-graph anomaly detection** to catch coordinated bot rings
- Suspicious accounts get down-weighted (not banned) to reduce false positives

### 7) Ghost Rumor Bug Fix

- **Dependency graph (DAG)** for rumor relationships
- Deleting a rumor triggers recalculation only for affected downstream nodes

---

## Architecture (High-Level)

- **Client (Next.js)** computes vote_key locally
- **Server (Next.js API)** validates, scores, logs
- **Supabase (Postgres)** stores rumors, votes, users, audit log
- Realtime updates for trust scores

---

## Mathematical Proof (Why it’s hard to game)

- **Game-theoretic argument**: honest behavior is the dominant strategy (Nash Equilibrium)
- **Cost-growth bound**: attacker influence scales sublinearly (log), while cost scales linearly
- Coordinated manipulation becomes economically irrational as group size increases

---

## Why it’s buildable in one day

- No blockchain, no ML required
- Uses simple hashing + Bayesian math + evidence review
- Next.js + Supabase makes real-time scoring fast to implement

---

## Deliverable Focus

- Mechanism design is explicit, defensible, and provable
- Each hackathon “bug” has a clean, implementable fix
- Presentation-ready: formulas, state machine, and architecture diagrams already defined
