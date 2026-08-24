# RecruiterPal — Full One-Shot Autonomous Execution Prompt

## ROLE

You are the principal engineer, product engineer, ML systems engineer, UX engineer, QA engineer, and release engineer responsible for implementing **RecruiterPal V1** from a frozen build contract in one autonomous run.

You must build the actual product. Do not return architecture prose as a substitute for implementation.

## SOURCE OF TRUTH

A directory named `RecruiterPal_Frozen_Build_Contract_v1.1_Eve_OpenCodeGo_2026-08-24` is provided with this prompt. Read **every artifact** before modifying application code.

Authority order:
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

Do not silently reinterpret frozen decisions. If a locked dependency is unavailable, insecure, or technically impossible, choose the smallest safe substitute, create an ADR explaining the deviation, and continue.

## CLEAN-ROOM REQUIREMENT

This is a **fresh project**.

- Project/repository name: `RecruiterPal`.
- Preferred GitHub destination if authenticated and available: `Litju/RecruiterPal`.
- Never modify, copy from, rename, or import history from `Litju/recruiting_insight_engine`.
- Never copy its datasets, PDFs, ZIPs, prompts, source, screenshots, docs, or commit history.
- Do not use PwC branding or imply endorsement.
- Generate all committed demo data deterministically from new RecruiterPal seed generators.

If the target repository already exists and contains unrelated/non-empty work, **do not destroy it**. Create a safe new directory/branch or record the conflict in the ship receipt rather than deleting history.

## LOCKED PRODUCT

RecruiterPal is the agent-driven workspace for evidence-based recruiting. Its primary problem is **recruiter orchestration debt**.

The V1 wedge is the portfolio control loop:

> What requires my attention, why, what has Pal already handled, what can Pal handle next, and which decisions are not decision-ready?

Primary surfaces:
- Today
- Jobs
- Pipeline
- Candidates
- Interviews
- Decisions/Evidence
- Inbox/communications
- Analytics
- Settings/Integrations
- ambient Pal command/runtime surface

Do not turn the app into an ATS CRUD template with a chatbot.

## LOCKED ARCHITECTURE

### Product core
- Node.js 24+
- pnpm workspace + Turborepo
- TypeScript strict
- Next.js 16.3-class App Router, but use a **security-patched compatible version** for public production
- React 19.2-class
- Tailwind CSS 4.3-class
- shadcn/ui/current supported primitives
- Motion
- TanStack Table/Virtual where needed
- Better Auth with organization-aware RBAC
- Drizzle ORM
- PostgreSQL 18.x / Neon-compatible

### Agent runtime — REQUIRED
Use **Eve**, not Eve.

Keep Eve behind `packages/agent-runtime` adapter contracts because Eve is beta.

Required Eve capabilities in V1:
- durable session start/continue/stream;
- typed tools;
- skills;
- at least one bounded subagent;
- HITL approval path;
- eval suite;
- contextual Pal integration with web UI.

### Model provider — REQUIRED
Use the user's **OpenCode Go** subscription as the V1 provider.

Provider topology:

```ts
import { createOpenAI } from "@ai-sdk/openai";
import { defineAgent } from "eve";

const openCodeGo = createOpenAI({
  name: "opencode-go",
  baseURL: "https://opencode.ai/zen/go/v1",
  apiKey: process.env.OPENCODE_GO_API_KEY!,
});

const recruiterPalModel = openCodeGo.responses("gpt-5.6-luna");
```

Use `OPENCODE_GO_API_KEY`. Never commit it. If the model ID is unavailable at execution time, query/inspect the provider's available models if possible and choose the closest compatible model only after recording the substitution and running all agent evals.

Do not silently fall back to another paid provider.

### Durable deterministic workflows — REQUIRED
Use **Vercel Workflow SDK** / application-owned durable TypeScript workflows for waits, retries, timers, reconciliation, and side-effect coordination.

Do **not** introduce Temporal in V1 unless you create an ADR proving Workflow SDK cannot meet an actual frozen requirement.

### Python
Only introduce Python/FastAPI if a concrete statistics/ML module materially benefits from it. Do not create a Python agent service merely out of habit.

## COMPUTATIONAL INVARIANT

1. deterministic code owns policy, permissions, calculations, state transitions and canonical mutations;
2. Workflow SDK owns durable deterministic execution;
3. PostgreSQL owns business truth;
4. Eve owns semantic interpretation/reasoning and agent interaction;
5. ML/statistics produce measured diagnostics under contracts;
6. humans own consequential employment decisions.

If it can be done deterministically, do it deterministically.

## AGENT SAFETY / EMPLOYMENT BOUNDARIES

Pal must never autonomously:
- reject a candidate;
- decide to hire;
- set/approve compensation;
- change selection criteria or Hiring Protocol weights;
- use protected demographics for candidate advancement;
- infer personality/emotion/attractiveness from media/text;
- fabricate evidence;
- generate opaque candidate `fit` percentages/scores.

Pal may synthesize evidence, identify missing/conflicting information, propose actions, and perform configured A1 administrative actions.

All tool calls are organization-scoped, typed, independently authorized and auditable.

## DOMAIN IMPLEMENTATION

Implement the core domain from the frozen contract, including at minimum:
- organizations/users/memberships/roles;
- jobs and versioned Hiring Protocols;
- candidates and applications;
- application stage events;
- interviews and participants;
- scorecards/ratings;
- competencies/evidence observations;
- deterministic decision-readiness computation;
- communications/message threads;
- obligations/deadlines;
- exceptions;
- approvals;
- actions/workflow instances;
- domain events/audit records;
- external object links/integration cursors.

Implement RLS/application authorization and prove cross-tenant denial in tests.

## REQUIRED DURABLE WORKFLOWS

At minimum implement and test:
1. scorecard chase/reminder/escalation;
2. candidate follow-up or interview scheduling resolution;
3. exception reconciliation;
4. daily portfolio preparation.

All external side effects use idempotency keys and audit records.

## REQUIRED EVE AGENT

Build Pal with:

### Tools
At least:
- get_portfolio
- get_job
- get_application
- get_exception
- get_evidence_matrix
- get_scorecards
- get_allowed_actions
- request_scorecard_reminder
- propose_stage_transition
- draft_message
- request_interviewer_substitution

### Skills
At least:
- triage_portfolio
- diagnose_exception
- synthesize_candidate_evidence
- prepare_debrief
- investigate_pipeline_change

### Subagent
At least one bounded read-only specialist, preferably `evidence-analyst`.

### Evals
At least:
- never_auto_reject_candidate
- protected_attribute_not_used
- cross_tenant_access_forbidden
- missing_evidence_detected
- no_fabricated_evidence
- approval_boundary_preserved

## IMMERSIVE UX/UI — HIGH PRIORITY

The UI quality is part of the Definition of Done.

Do not ship a generic shadcn dashboard.

Build an agent-native recruiting cockpit with:
- persistent left navigation;
- dense but calm central workspace;
- contextual right rail/drawer for candidate/evidence/Pal context;
- global `Cmd/Ctrl+K` Pal/command surface;
- contextual short prompts without restating selected candidate/job;
- Today prioritized by Critical / Blocked / Signals / Pal-completed work;
- candidate panels that preserve pipeline context;
- evidence matrix;
- scorecard conflict comparison;
- action preview/approval cards;
- truthful Pal execution status mapped from Eve runtime events;
- purposeful Motion transitions;
- keyboard-first navigation;
- polished loading/empty/error/blocked/approval states;
- responsive layout;
- accessibility.

Pal should prefer typed UI intents to long prose when a view change communicates the result better.

## SYNTHETIC DEMO WORLD

Build the deterministic `Northstar Labs` demo from `17_DEMO_SEED_AND_GOLDEN_FLOWS.md`.

The golden demo must visibly include:
- competing-offer critical exception;
- missing scorecard workflow;
- scheduling capacity problem;
- requirement-change/funnel signal;
- decision-not-ready due to missing evidence;
- safe Pal/workflow actions completed while recruiter was away;
- second tenant for isolation tests.

## INTEGRATIONS

Prioritize Google Calendar + Gmail integration architecture. If credentials are unavailable, implement robust adapters/contracts and deterministic synthetic/demo adapters. Never fabricate that a real external action happened.

Do not expand into every ATS in the one-shot build. Preserve an adapter boundary for future Merge/direct ATS connections.

## QUALITY / PRE-PUSH / CI

Pre-push is mandatory. Use Lefthook unless impossible.

Local pre-push must include the frozen fast gates from `13_TESTING_QA_PREPUSH_CICD.md`.

Create GitHub Actions for:
- quality/build/tests/security;
- agent evals;
- E2E;
- release/hosted smoke as appropriate.

Run tests against real PostgreSQL behavior where DB behavior is being proven.

Use Playwright for golden flows and accessibility/keyboard validation.

## SECURITY

- no secrets committed;
- `.env.example` only safe placeholders;
- strict tenant scoping;
- RLS proof;
- prompt-injection resistant tool boundary;
- external content is untrusted data;
- model gets no production DB credential;
- PII minimized in logs/events;
- protected demographic attributes segregated/restricted;
- dependency and secret scans;
- clean-room/provenance scan.

## NEXT.JS SECURITY GATE

At contract freeze time (2026-08-24), a critical Next.js security patch was scheduled for 2026-08-26. If the patched release is not yet available when you execute:
- build and qualify locally/controlled preview;
- do not claim public production readiness;
- set `RELEASE_STATUS=BLOCKED_NEXT_SECURITY_PATCH` in the ship receipt.

If the patch is available, upgrade to a patched compatible version and run the complete release gates.

## AUTONOMOUS WORKFLOW / NO CLARIFICATION LOOP

Do not repeatedly ask the user how to implement frozen decisions. The contract already answers them.

Make bounded engineering decisions where details are intentionally left open. Record material deviations in ADRs.

Do not promise future/background work. Complete as much as possible in this run.

Do not delete/reset unrelated user work. Never use destructive git cleanup merely to simplify your environment.

## REQUIRED CHECKPOINT COMMITS

Follow `18_MILESTONES_BUILD_SEQUENCE.md` and commit at M0–M9 checkpoints (combine only when technically inseparable). Use clear commit messages.

Before each checkpoint commit:
- run the relevant local gates;
- fix failures;
- leave the repo in an inspectable state.

## GITHUB / DELIVERY

If authenticated GitHub access exists:
1. create/use fresh `Litju/RecruiterPal` safely;
2. push the implementation branch;
3. open a PR to `main` after all required gates are green;
4. if repository policy and checks permit safe merge, merge only after hosted/CI acceptance rules are satisfied;
5. never force push protected/shared history.

If GitHub/Vercel/Neon credentials are unavailable, complete local implementation and record exact external blockers. Do not fake a deployment, CI run, PR, or merge.

## FINAL VALIDATION

Before declaring success, run and record:
- clean install from lockfiles;
- formatting/lint/typecheck;
- unit tests;
- real-Postgres integration tests;
- Workflow tests;
- Eve integration tests;
- Eve evals;
- production build;
- Playwright golden flows;
- accessibility checks;
- secret scan;
- dependency/security audit;
- clean-room provenance scan;
- pre-push hook on final tree;
- hosted smoke if deployment exists.

## FINAL OUTPUT REQUIRED

Create `SHIP_RECEIPT.md` using `23_SHIP_RECEIPT_TEMPLATE.md` and report:
- repository + branch;
- starting/ending/final SHAs;
- milestone commits;
- stack versions;
- database migration status;
- test/eval counts;
- pre-push result;
- CI result;
- Eve version;
- OpenCode Go provider/model smoke result;
- workflow result;
- Vercel/Neon deployment URLs/status if real;
- security/provenance results;
- known limitations;
- exact final status, one of:
  - `PASS_PRODUCTION_READY`
  - `PASS_PORTFOLIO_READY_WITH_LIMITATIONS`
  - `BLOCKED_<REASON>`

Do not claim PASS if any mandatory Definition-of-Done blocker remains.

## EXECUTE

Read the entire bundle, verify the environment, initialize the fresh clean-room project, and implement RecruiterPal end to end now. Build the product, not another plan.
