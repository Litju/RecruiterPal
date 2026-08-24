# RecruiterPal One-Shot Build Sequence

**Authority:** RP-FREEZE-2026-08-24-v1.1

The implementation may run autonomously end to end, but it must create checkpoint commits so failures are inspectable and work is recoverable.

## M0 — Clean-room bootstrap
- verify/create fresh `RecruiterPal` repository;
- verify no challenge artifacts/history;
- import frozen docs under `docs/build-contract/`;
- initialize pnpm/Turborepo/Next.js/strict TS;
- baseline README/license/gitignore;
- commit.

## M1 — Domain + database foundation
- Neon/Postgres-compatible schema;
- Drizzle migrations;
- tenant/RLS strategy;
- domain state machines/invariants;
- deterministic seed generator;
- real DB tests;
- commit.

## M2 — Auth + application shell
- Better Auth organizations/roles;
- app shell/navigation;
- Today/Jobs/Pipeline/Candidates/Interviews/Decisions/Analytics skeletons;
- protected routing;
- commit.

## M3 — Core recruiting flows
- jobs/protocols;
- candidates/applications/stages;
- interviews/scorecards;
- evidence/readiness;
- exceptions/approvals/audit;
- commit.

## M4 — Durable workflows
- Workflow SDK wiring;
- scorecard chase;
- candidate follow-up;
- scheduling resolution;
- exception/integration reconciliation;
- idempotency tests;
- commit.

## M5 — Eve + OpenCode Go
- Eve adapter/mount;
- provider adapter;
- Pal instructions;
- typed tools;
- skills;
- bounded subagents;
- session streaming/HITL;
- eval fixtures;
- commit.

## M6 — Agent-native immersive UX
- polished Today;
- command palette/Pal surface;
- contextual right rail/drawers;
- evidence matrix;
- scorecard compare;
- action previews/approvals;
- runtime status stream;
- motion/accessibility/keyboard shortcuts;
- responsive layouts;
- commit.

## M7 — Integrations/demo analytics
- Gmail/Google Calendar integration architecture with real connection paths if credentials available;
- synthetic fallback adapters for deterministic demo;
- operational analytics/signals;
- commit.

## M8 — QA hardening
- Lefthook pre-push;
- full unit/integration/workflow/Eve eval/E2E suite;
- security/provenance scans;
- CI workflows;
- performance/accessibility passes;
- commit.

## M9 — Deploy/qualify
- Vercel/Neon configuration;
- Next security gate;
- hosted smoke if credentials/provider allow;
- screenshots/demo assets if helpful;
- `SHIP_RECEIPT.md`;
- final commit/push/PR.

## Milestone rule

Do not continue blindly after a broken checkpoint. Repair until the checkpoint's local gates pass, then commit and continue.
