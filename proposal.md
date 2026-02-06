# Project Proposal — CampusWhisper

**Date:** February 6, 2026
**Goal:** Build a trustless, anonymous campus rumor verification system with evidence‑based challenges, Bayesian trust scoring, and anti‑manipulation safeguards — demo‑ready in one hackathon day.

---

## 1) Problem Statement

Campus rumors spread fast, but truth is hard to validate. We need a system where students can submit rumors anonymously, while other students verify or dispute them without any central authority deciding truth. The system must prevent duplicate voting, resist bots, and avoid popularity‑based misinformation. It should also provide an auditable trail of score changes.

---

## 2) Proposed Solution (MVP Scope)

**Core idea:** Evidence‑based challenges + Bayesian trust scoring + bounded popularity, while preserving anonymity via hash‑based vote keys.

### MVP Features (Doable in 9–5)

- Anonymous rumor submission
- Evidence submission (links/images)
- Evidence voting (helpful/misleading)
- Rumor trust score updates (Bayesian, evidence‑weighted)
- Hash‑based duplicate vote prevention
- Log‑scaled vote impact to cap mob influence
- Append‑only audit log for score changes
- Basic bot flags (timing + agreement correlation)

### Stretch / Future Work

- Full trust‑graph anomaly detection
- DAG‑based dependency propagation for rumor deletions
- Automated evidence credibility scoring

---

## 3) Functional Requirements (FRs)

**FR‑1** Users can submit rumors anonymously.

**FR‑2** Users can attach evidence to support or dispute a rumor.

**FR‑3** Users can vote on evidence quality (helpful/misleading).

**FR‑4** The system computes a rumor trust score using Bayesian updates.

**FR‑5** The system prevents duplicate voting per user per rumor via hash‑based vote keys.

**FR‑6** Rumor scores update in real time after evidence votes.

**FR‑7** The system keeps an append‑only audit log of all score changes.

**FR‑8** The system flags suspicious voting patterns and down‑weights them.

**FR‑9** Users can view rumor status (Active / Verified / Debunked / Inconclusive).

---

## 4) Non‑Functional Requirements (NFRs)

**NFR‑1 (Anonymity):** No student identity is stored or linked to votes.

**NFR‑2 (Integrity):** All score updates must be reproducible from the audit log.

**NFR‑3 (Availability):** System should handle high read traffic with minimal latency.

**NFR‑4 (Security):** Hash‑based vote keys must be irreversible and unguessable.

**NFR‑5 (Fairness):** Popularity alone cannot push a rumor above high trust thresholds.

**NFR‑6 (Explainability):** Trust score changes are transparent and auditable.

**NFR‑7 (Performance):** Score updates should compute in under 500ms for a typical vote.

---

## 5) Architecture Overview (Boilerplate‑Agnostic)

- **Frontend:** Provided boilerplate UI framework (to be determined tomorrow)
- **Backend:** Provided boilerplate API layer
- **Database:** Provided storage layer (SQL or NoSQL)
- **Realtime (optional):** If boilerplate supports it, use for live score updates

---

## 6) Data Model (High‑Level)

**Entities:**

- `rumors`
- `evidence`
- `evidence_votes`
- `votes`
- `users` (anonymous token hash)
- `audit_log`

---

## 7) AI Moderation (Optional, Low‑Risk Add‑On)

- **Summarize rumors** for readability
- **Detect duplicates** to reduce spam
- **Flag harmful content** (warning only, no auto‑deletes)

AI never decides truth — only assists the crowd with readability and safety.

---

## 8) Delivery Plan (9–5 Build)

**9:00–10:00** Set up boilerplate, data models, and basic routing

**10:00–11:30** Core API: rumor submission, evidence submission, evidence voting

**11:30–12:30** Bayesian scoring + log scaling + audit log

**12:30–1:00** Lunch

**1:00–2:00** Frontend feed + evidence UI + score updates

**2:00–3:00** Bot flags (timing + agreement correlation)

**3:00–4:00** Testing + polish

**4:00–5:00** Pitch prep + deploy (using boilerplate’s deploy path)

---

## 9) Success Criteria

- Demo shows a rumor gaining/losing trust based on evidence votes
- Duplicate votes are rejected
- Audit log proves score changes
- Popularity alone cannot verify a rumor

---

## 10) Answer to “Should we add ERDs?”

**Yes, add a simple ERD.** It helps judges understand data flow quickly and is easy to include. Keep it minimal (rumors ↔ evidence ↔ evidence_votes, users ↔ votes, audit_log). A one‑page ERD diagram is enough.
