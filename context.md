# Project Context Log

## Snapshot — 2026-02-06

**Project:** CampusWhisper (anonymous campus rumor verification)

**Hackathon Timeframe:**

- Day 1: documentation + design only (deadline 6:00 PM)
- Day 2: build MVP within **10:00–2:00**

**Tech Stack Constraint:**

- Tech stack is **TBD** (must use the provided boilerplate tomorrow and fork it)
- Design must stay framework-agnostic and portable

**Day 1 Deliverables:**

- Problem understanding
- Assumptions
- Proposed solution & approach
- System architecture
- Trust score mechanism

**Chosen Mechanisms (current):**

- **Anonymous voting:** Hash-based commitment `SHA256(student_id + salt + rumor_id)`
- **Verification:** Evidence-based challenge system (vote on evidence quality)
- **Trust score:** Bayesian update with evidence-weighted votes
- **Anti-mob:** Evidence multiplier + logarithmic scaling
- **Score mutation bug:** Append-only audit log (replayable history)
- **Bots:** Behavioral fingerprinting + trust-graph anomaly detection
- **Ghost rumor bug:** Dependency graph (DAG) with downstream recomputation
- **Proof:** Game theory (dominant strategy) + cost-growth bound

**MVP Scope (10–2 feasible):**

- Rumor submission
- Evidence submission + voting
- Bayesian scoring
- Log scaling
- Audit log
- Basic bot flags

**Delivery Priority:**

- Only implement MVP features that can be demoed by 2:00 PM
- Advanced items (full trust-graph, DAG propagation) are listed as future work unless time remains

**Optional AI assistive features:**

- Summarization
- Duplicate detection
- Toxicity/harm warnings (non-blocking)

**Key Files:**

- approach.md
- summary.md
- proposal.md
- context.md
