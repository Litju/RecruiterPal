# RecruiterPal V1 Ship Receipt

## Final status

`PASS_PORTFOLIO_READY_WITH_LIMITATIONS`

RecruiterPal is qualified through M9 for the local product and public-source
release. Hosted database, live model-provider, live integration, and the
scheduled Next.js security-release gate remain explicitly blocked below.

## Repository

- repo: https://github.com/Litju/RecruiterPal
- visibility: PUBLIC
- branch: `main`
- start SHA: `b5662f4f72a39eb7a8a5474c543ad690d57e3a60`
- final product SHA: `cd7e75c71c4dfd87ea71bf943047d73517d466c4`
- receipt commit: documentation-only commit immediately after the final product SHA
- PR: NOT_RUN (direct push to the requested `main` branch)
- merge SHA: NOT_RUN (no pull request was used)

## Milestone commits

- M0: `b5662f4f72a39eb7a8a5474c543ad690d57e3a60`
- M1: `bbe39141271ed70d4ad5d99883573c88863e7862`
- M2: `399fa4fc903149e6157d68ea4c32175fe4c21a2e`
- M3: `4183a2348271178d416acb9ecc2b464ec5682c99`
- M4: `c288e1aa7165b8313a1b5ec88ea655095833603b`
- M5: `342e93f642089138545490a3243122bf7780fa00`
- M6: `c7a2a985e5a1dcb20f056cd7ee6ebf5094acd6c3`
- M7: `85c228a849d19c77098705dbadf01dc0f36e7fda`
- M8: `06ed50401e1ed8c0dc3236a2a54aaffa70316178`
- M9: `cd7e75c71c4dfd87ea71bf943047d73517d466c4` (release qualification fixes)

## Stack qualification

- Node: `24.14.0`
- pnpm: `10.17.1`
- Turborepo: `2.10.11`
- TypeScript: `5.9.3`
- Next.js: `16.3.2`
- React / React DOM: `19.2.8`
- Eve: `0.44.3`
- Workflow SDK: `4.8.4`
- Drizzle ORM / Drizzle Kit: `0.45.2` / `0.31.10`
- PostgreSQL: local qualification on `postgres:18-alpine`; Neon hosted qualification BLOCKED
- Better Auth: `1.7.1`
- OpenCode Go endpoint/protocol: `https://opencode.ai/zen/go/v1` / Responses-compatible
- model: `gpt-5.6-luna`

## Data / migrations

- migrations: PASS (local PostgreSQL 18 migration path)
- seed: PASS (deterministic Northstar Labs world)
- RLS: PASS (17/17 adversarial tenant-isolation and fail-closed checks)
- clean-room scan: PASS (final tracked-source scan)
- secret scan: PASS (final tracked-source scan)
- provenance: PASS (repository history begins at the clean-room M0 commit)

## Agent

- session create: PASS (server-side persisted Eve session boundary)
- continuation: PASS (contextual session and proposal persistence boundary)
- streaming: PASS (server-side event stream contract; live provider stream BLOCKED)
- typed tool call: PASS (13 bounded typed tools with organization, actor, permission, resource, authority, schema, and invariant checks)
- HITL: PASS (approval-aware proposals and consequential-action gate)
- subagent: PASS (bounded evidence-analysis specialist)
- evals: PASS (9/9 deterministic safety evaluations)
- OpenCode Go live smoke: BLOCKED (`OPENCODE_GO_API_KEY` absent; no provider success claimed)

## Workflows

- scorecard chase: PASS (deterministic durable reminder/escalation path)
- follow-up/scheduling: PASS (candidate follow-up and scheduling-resolution plans)
- exception reconciliation: PASS (stale-state and exception reconciliation)
- morning portfolio: PASS (Today deterministic portfolio snapshot and execution surface)
- idempotency: PASS (duplicate workflow/mutation execution is deduplicated and audit-safe)

## UX/E2E

- Today: PASS (primary execution surface with exceptions, deadlines, signals, readiness, and Pal work)
- command palette: PASS (Ctrl+K / Cmd+K navigation and action entry)
- evidence matrix: PASS (candidate workspace flow)
- approvals: PASS (approval-required state and consequential action boundary)
- keyboard/accessibility: PASS (keyboard path, semantic controls, reduced-motion support, and accessible drawer/pane semantics)
- Playwright: PASS (GitHub Actions golden flow 1/1; local golden flow 1/1)

## Quality

- format/lint/typecheck: PASS (format and typecheck clean; lint has non-blocking existing warnings and no errors)
- unit tests: PASS (15 domain, 7 contract, 7 integration, 8 agent-runtime safety tests)
- Postgres tests: PASS (17 RLS, 5 application, 1 workflow, and 1 agent-runtime DB qualification suites)
- Workflow tests: PASS (4 pure workflow tests plus DB retry/idempotency coverage)
- security/dependency scan: PASS (`pnpm audit --audit-level high`; no known vulnerabilities)
- secret scan: PASS
- pre-push: PASS (Lefthook `1.13.6`, mandatory `qa:fast` completed locally)
- CI: PASS (GitHub Actions run `32783177989`; quality and E2E jobs passed)

## Deployment

- Vercel: BLOCKED (authenticated CLI `58.9.4`; project `recruiterpal` created and configured for Next.js at `apps/web`; `vercel build --prod` failed closed because hosted `DATABASE_URL` is absent; no deployment or production promotion is claimed)
- Neon: BLOCKED (no authenticated Neon API/CLI credential or hosted connection string was available; no Neon resource was provisioned or qualified)
- hosted smoke: BLOCKED (no successful hosted deployment with a hosted database)
- Next.js security gate: BLOCKED (current `16.3.2`; the official August 26, 2026 security release boundary had not arrived on August 24, 2026, and `16.3.3` was not available in the registry during qualification; see [Next.js release information](https://nextjs.org/blog) and [support policy](https://nextjs.org/support-policy))
- live Gmail / Google Calendar: BLOCKED (live credentials absent; synthetic adapters and no-external-write behavior PASS)

## Known limitations

- Live OpenCode Go qualification cannot run until `OPENCODE_GO_API_KEY` is supplied.
- A hosted PostgreSQL/Neon connection is required before Vercel can build the auth route and before hosted smoke can run.
- Live Gmail and Google Calendar writes remain unqualified until provider credentials are supplied; synthetic fallbacks are explicit and non-delivering.
- The required Next.js security patch is scheduled for August 26, 2026 and was not available on the qualification date; production release remains gated by that boundary.
- Lint is green with a small set of non-blocking existing warnings; no lint errors remain.

## Integrity statement

The clean-room scan found no forbidden external challenge artifacts, private
datasets, credentials, or secrets in the public repository. No external
deployment or provider check is marked PASS unless it was actually executed
successfully.

## Machine-readable release receipt

RECRUITERPAL_STATUS=PASS_PORTFOLIO_READY_WITH_LIMITATIONS
PUBLIC_REPO=https://github.com/Litju/RecruiterPal
FINAL_SHA=cd7e75c71c4dfd87ea71bf943047d73517d466c4
WORKTREE_CLEAN=PASS
M0=PASS
M1=PASS
M2=PASS
M3=PASS
M4=PASS
M5=PASS_WITH_LIVE_PROVIDER_BLOCKED
M6=PASS
M7=PASS_WITH_LIVE_INTEGRATIONS_BLOCKED
M8=PASS
M9=PASS_WITH_HOSTED_GATES_BLOCKED
DOMAIN_TESTS=PASS
DB_RLS_TESTS=PASS
WORKFLOW_TESTS=PASS
EVE_EVALS=PASS_9_OF_9
OPENCODE_GO=BLOCKED_KEY_ABSENT
PLAYWRIGHT=PASS_1_OF_1_LOCAL_AND_CI
PRE_PUSH=PASS
CI=PASS_RUN_32783177989
VERCEL=BLOCKED_HOSTED_DATABASE_URL_ABSENT
NEON=BLOCKED_CREDENTIALS_ABSENT
SECURITY_RELEASE_GATE=BLOCKED_NEXT_16_3_PATCH_SCHEDULED_2026_08_26
SHIP_RECEIPT=PASS
