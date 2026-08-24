# RecruiterPal — Frozen Build Contract

**Freeze ID:** `RP-FREEZE-2026-08-24-v1.1`  
**Status:** **FROZEN FOR ONE-SHOT IMPLEMENTATION**  
**Product:** **RecruiterPal — the agent-driven workspace for evidence-based recruiting**  
**Architecture convergence:** **Eve + OpenCode Go + Vercel Workflow**  
**Repository rule:** fresh clean-room repository from commit zero.

## 1. Product thesis

RecruiterPal exists to reduce **recruiter orchestration debt**: the recurrent daily burden of discovering what changed across many active jobs and candidates, what is blocked, which stakeholder owes an action, what evidence is missing, what is at risk, what can be safely automated, and what requires human judgment.

The V1 product is a **recruiting portfolio control loop**, not a generic ATS clone and not a chatbot bolted onto one.

The recruiter must be able to open **Today** and immediately answer:

> What requires my attention, why, what has Pal already handled, what can Pal safely handle next, and which decisions are not yet decision-ready?

## 2. Locked computational hierarchy

This hierarchy is non-negotiable:

1. **Deterministic TypeScript domain code** owns invariants, tenant boundaries, permissions, calculations, state transitions, canonical mutations, and side-effect authorization.
2. **Vercel Workflow / Workflow SDK** owns durable deterministic execution: waits, retries, timers, resumability, idempotent multi-step process coordination, and long-running business workflows.
3. **PostgreSQL / Neon** is the canonical business source of truth and audit/event ledger.
4. **Eve** owns agent sessions, contextual reasoning, tool selection, skills, subagents, schedules, human-in-the-loop agent approvals, and agent streaming events.
5. **OpenCode Go** is the locked V1 runtime model provider through the OpenAI Responses-compatible endpoint already qualified in ShoppingPal.
6. **Python ML/science services** exist only where Python materially improves statistics, modeling, validation, or scientific analysis. Python does not own the agent runtime.
7. **Humans** retain authority for consequential employment decisions and changes to selection policy.

The LLM is never the source of truth, never receives raw database credentials, never executes arbitrary production SQL, and never directly bypasses domain authorization.

## 3. Locked V1 runtime topology

```text
Browser
  |
  v
Next.js / React RecruiterPal
  |-- immersive UI + command surface
  |-- BFF / route handlers / server actions
  |-- deterministic domain services
  |-- Better Auth + RBAC
  |-- Drizzle
  |
  +--> Neon PostgreSQL 18.x
  |      |-- canonical business state
  |      |-- append-only domain/audit events
  |      |-- PostgreSQL FTS
  |      +-- pgvector (only where semantic search is justified)
  |
  +--> Vercel Workflow SDK
  |      |-- durable deterministic workflows
  |      |-- timers / waits / retries / reconciliation
  |      +-- idempotent external side effects
  |
  +--> Eve
         |-- durable agent sessions
         |-- typed tools
         |-- skills
         |-- bounded subagents
         |-- HITL agent approval
         |-- schedules
         |-- evals
         +--> OpenCode Go / OpenAI Responses-compatible API

Optional Python intelligence service
  |-- statistics
  |-- process analytics / ML
  |-- scientific validation
  +-- never canonical recruiting state
```

## 4. Product pillars

### Run the process
Keep concurrent hiring work moving: follow-ups, reminders, scheduling resolution, stakeholder coordination, stale-state detection, synchronization, SLA handling, and exception routing.

### Protect the decision
Use versioned Hiring Protocols, structured evidence, scorecards, evidence completeness, disagreement detection, provenance, and explicit decision-readiness states. Do not replace human employment decisions with opaque AI scores.

### Learn from the system
Measure funnel behavior, process bottlenecks, stage latency, capacity, anomaly/drift signals, scorecard behavior, and later validated outcome relationships using transparent statistical/ML contracts.

## 5. Agent-native UX invariant

Pal is not a bottom-right chat bubble. Pal is the ambient interaction layer.

- current route, selected entities, filters, permissions, and recent product actions form deterministic context;
- short commands such as “why is this blocked?” must work without restating context;
- Pal should manipulate predefined product views via typed UI intents instead of returning essays when a visual action is better;
- every agent run exposes truthful high-level runtime status without exposing private chain-of-thought;
- safe administrative actions may execute automatically under policy;
- consequential or policy-changing actions require explicit human authority.

## 6. Clean-room provenance invariant

RecruiterPal is **not** a continuation branch of `recruiting_insight_engine`.

Do not copy PwC challenge code, datasets, PDFs, prompts, documents, screenshots, logos, commit history, or filenames. General lessons and independently researched ideas may inform RecruiterPal, but the implementation, synthetic data, architecture, and documentation are newly authored.

## 7. Bundle authority order

If two artifacts appear to conflict, resolve authority in this order:

1. `RECRUITERPAL_FREEZE.yaml`
2. `01_PRODUCT_CONSTITUTION.md`
3. `04_SYSTEM_ARCHITECTURE.md`
4. `10_SECURITY_PRIVACY_GOVERNANCE.md`
5. `07_DATA_EVIDENCE_SELECTION_SCIENCE.md`
6. `03_DOMAIN_MODEL_AND_STATE_MACHINES.md`
7. `05_DURABLE_WORKFLOW_CONTRACTS.md`
8. `06_EVE_AGENT_ARCHITECTURE.md`
9. `08_UX_UI_CONSTITUTION.md`
10. remaining artifacts

Any required deviation must be captured as an ADR in `adr/` with the old rule, reason, replacement, consequences, and validation evidence.

## 8. Bundle map

- `01_PRODUCT_CONSTITUTION.md` — mission, product invariants, prohibitions.
- `02_PRODUCT_REQUIREMENTS_AND_SCOPE.md` — V1 surfaces, workflows, non-goals.
- `03_DOMAIN_MODEL_AND_STATE_MACHINES.md` — canonical entities and transition rules.
- `04_SYSTEM_ARCHITECTURE.md` — final Eve/OpenCode Go/Workflow topology.
- `05_DURABLE_WORKFLOW_CONTRACTS.md` — deterministic long-running execution contracts.
- `06_EVE_AGENT_ARCHITECTURE.md` — Pal runtime, skills, tools, subagents, sessions, HITL.
- `07_DATA_EVIDENCE_SELECTION_SCIENCE.md` — evidence and selection-science boundaries.
- `08_UX_UI_CONSTITUTION.md` — immersive agent-native interaction contract.
- `09_DESIGN_SYSTEM_COMPONENT_CATALOG.md` — tokens and component inventory.
- `10_SECURITY_PRIVACY_GOVERNANCE.md` — multi-tenancy, PII, authorization, AI governance.
- `11_INTEGRATIONS_EXTERNAL_SYSTEMS.md` — Gmail/Calendar-first integration strategy.
- `12_OBSERVABILITY_AUDIT_EVALS.md` — product audit + engineering telemetry + Eve evals.
- `13_TESTING_QA_PREPUSH_CICD.md` — deterministic quality gates.
- `14_DEPLOYMENT_ENVIRONMENTS.md` — local/preview/production topology and release gates.
- `15_DATABASE_SCHEMA_AND_DATA_CONTRACTS.md` — concrete schema rules and indices.
- `16_API_TOOL_AND_UI_INTENT_CONTRACTS.md` — typed boundaries.
- `17_DEMO_SEED_AND_GOLDEN_FLOWS.md` — owned synthetic demo world and portfolio scenarios.
- `18_MILESTONES_BUILD_SEQUENCE.md` — commit checkpoints for autonomous implementation.
- `19_DEFINITION_OF_DONE_ACCEPTANCE_MATRIX.md` — release acceptance matrix.
- `20_PROVENANCE_CLEAN_ROOM.md` — historical separation and portfolio wording.
- `21_ARCHITECTURE_DECISIONS.md` — locked ADR summary.
- `22_ONE_SHOT_EXECUTION_PROMPT.md` — autonomous implementation prompt.
- `23_SHIP_RECEIPT_TEMPLATE.md` — required final implementation receipt.
- `24_RESEARCH_REFERENCE_REGISTER.md` — research/version basis.
- `RECRUITERPAL_FREEZE.yaml` — machine-readable freeze.
- `contracts/*.json` — critical machine-readable boundary examples.

## 9. One-shot success condition

The one-shot implementation is successful only when it produces a fresh repository that is locally reproducible, pre-push gated, CI-gated, seeded with owned synthetic data, visually polished, agent-functional through Eve + OpenCode Go when credentials are present, useful without unsafe automation, and capable of demonstrating the golden V1 portfolio-control flows end to end.
