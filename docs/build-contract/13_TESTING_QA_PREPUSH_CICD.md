# RecruiterPal Testing, QA, Pre-Push, and CI/CD

**Authority:** RP-FREEZE-2026-08-24-v1.1

## Quality principle

Deterministic QA happens locally before push and is independently reproduced in CI. Agentic code does not receive lower quality standards than deterministic code.

## 1. Test layers

### Domain unit tests
Highest volume. Cover:
- stage transitions;
- job/protocol version invariants;
- decision-readiness calculation;
- evidence completeness;
- SLA states;
- authority policy;
- exception open/update/close/dedup;
- tenant-scope helpers;
- idempotency key construction.

### PostgreSQL integration tests
Real Postgres, not mocked SQL, for:
- migrations;
- FK/check/unique constraints;
- RLS;
- tenant isolation;
- transactions/outbox/audit;
- FTS/pgvector if enabled;
- concurrency-sensitive mutations.

### Vercel Workflow tests
Cover each durable workflow:
- happy path;
- waits/timers;
- retryable failure;
- permanent failure;
- duplicate event;
- cancellation;
- stale approval;
- idempotent external action;
- reconciliation after missing/reordered webhook.

### Eve integration tests
Pin and qualify:
- session creation;
- session continuation;
- reconnectable stream;
- typed read tool call;
- typed write/proposal tool call;
- HITL approval event/resume;
- subagent delegation;
- schedule wiring where testable;
- OpenCode Go provider adapter;
- missing credential failure behavior.

### Eve evals
Run the authority/security/evidence scenarios in `12_OBSERVABILITY_AUDIT_EVALS.md`.

### UI component tests
At minimum:
- Today exception card;
- Pal command surface;
- Pal runtime status;
- candidate panel;
- evidence matrix;
- scorecard conflict comparison;
- approval card;
- pipeline filters;
- scheduling resolution;
- permission-disabled actions.

### Playwright E2E golden flows
1. sign in -> Today renders seeded portfolio;
2. critical competing-offer exception -> inspect evidence -> return without losing context;
3. missing scorecard -> safe reminder -> workflow/audit visible;
4. approval-required operational proposal -> approve -> state updates;
5. consequential stage/hire/reject attempt remains human-only;
6. create job -> protocol version -> open role;
7. schedule/reschedule interview;
8. submit scorecard -> readiness recomputes;
9. cross-tenant URL/object access denied;
10. `Cmd/Ctrl+K` agent command -> contextual result/UI intent;
11. candidate message event -> extracted deadline requires correct validation path;
12. large candidate list remains responsive/virtualized.

## 2. Accessibility

Release blockers:
- keyboard trap;
- inaccessible critical control;
- broken focus restoration in drawer/dialog;
- color-only status;
- missing accessible name;
- critical contrast failure.

Primary flows must be completely keyboard-operable.

## 3. Pre-push hook

Use **Lefthook** unless technically blocked.

Required pre-push gates:
- format check;
- lint;
- TypeScript typecheck;
- TS unit/domain tests;
- contract/schema validation;
- migration sanity;
- real-Postgres fast integration subset;
- Eve static/config validation;
- fast Eve eval subset with deterministic fixtures;
- secret scan;
- dependency audit;
- clean-room banned artifact/name scan;
- web production build.

If Python exists:
- format/lint/typecheck;
- unit/property tests.

Slow full Playwright/live-provider workflows can remain CI-only, but pre-push cannot be superficial.

## 4. CI workflows

### `quality.yml`
- frozen install;
- format/lint/typecheck;
- unit tests;
- Postgres integration;
- workflow tests;
- contract tests;
- secret/dependency/provenance scans;
- production build.

### `agent-evals.yml`
Triggered on agent/tool/skill/provider-contract changes plus protected branch.
- deterministic eval suite;
- live OpenCode Go smoke only when encrypted secret is available;
- never log secret.

### `e2e.yml`
- isolated synthetic DB;
- app server;
- local/test provider path where possible;
- Playwright golden flows;
- accessibility checks.

### `release.yml`
- requires all protected checks;
- verifies exact lockfiles;
- verifies Next.js security gate;
- deploys preview/staging;
- hosted smoke;
- production promotion only when all release blockers clear.

## 5. Security/provenance scans

Block:
- committed `.env` or credentials;
- known secret patterns;
- PwC challenge PDF/ZIP/datasets/artifacts;
- copied `recruiting_insight_engine` paths or challenge-specific document filenames;
- dependency critical vulnerabilities without approved ADR;
- direct production DB credential exposure to Eve/model code.

## 6. Commit discipline

The one-shot coding agent must create milestone commits. Each checkpoint should be buildable/testable unless explicitly a scaffold commit. Never force-push a shared branch. Never rewrite unrelated history.

## 7. Definition of green

Green means:
- local pre-push passes;
- CI passes the same source SHA;
- production build succeeds;
- seeded golden flows pass;
- agent evals pass;
- hosted smoke passes if release is attempted;
- security and clean-room gates pass;
- final `SHIP_RECEIPT.md` truthfully records any provider/deployment blocker.
