# RecruiterPal V1 Ship Receipt

## Final status

`PASS_PUBLIC_RELEASE_WITH_HOSTED_QUALIFICATION`

RecruiterPal is qualified through M9 for the local product and public-source
release. Neon, Vercel, OpenCode Go, Eve, hosted smoke, and the patched Next.js
release gate are qualified. Live Gmail and Google Calendar credentials remain
blocked; the full local Docker-backed QA path could not complete because the
Docker daemon was unavailable in this environment.

## Repository

- repo: https://github.com/Litju/RecruiterPal
- visibility: PUBLIC
- branch: `main`
- start SHA: `b5662f4f72a39eb7a8a5474c543ad690d57e3a60`
- final product SHA: `114ac884b5e4883f4d8517d4bc96118f65d60a27`
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
- Next.js: `16.3.3`
- React / React DOM: `19.2.8`
- Eve: `0.44.3`
- Workflow SDK: `4.8.4`
- Drizzle ORM / Drizzle Kit: `0.45.2` / `0.31.10`
- PostgreSQL: local qualification on `postgres:18-alpine`; Neon hosted qualification PASS
- Better Auth: `1.7.1`
- OpenCode Go endpoint/protocol: `https://opencode.ai/zen/go/v1` / Responses-compatible
- model: `gpt-5.6-luna`

## Data / migrations

- migrations: PASS (local PostgreSQL 18 path and 4 Neon migrations)
- seed: PASS (deterministic Northstar Labs world; Neon has 2 organizations, 11 users, 8 jobs, 138 candidates/applications, and 109 scorecards)
- RLS: PASS (17/17 local adversarial checks; Neon restricted role returns 0 jobs without tenant context, 8 for Northstar Labs, and 0 for another tenant)
- clean-room scan: PASS (final tracked-source scan)
- secret scan: PASS (final tracked-source scan)
- provenance: PASS (repository history begins at the clean-room M0 commit)

## Agent

- session create: PASS (server-side persisted Eve session boundary)
- continuation: PASS (contextual session and proposal persistence boundary)
- streaming: PASS (server-side event stream contract; live Eve invocation completed with streamed session events)
- typed tool call: PASS (13 bounded typed tools with organization, actor, permission, resource, authority, schema, and invariant checks)
- HITL: PASS (approval-aware proposals and consequential-action gate)
- subagent: PASS (bounded evidence-analysis specialist)
- evals: PASS (9/9 deterministic safety evaluations)
- OpenCode Go live smoke: PASS (Responses-compatible turn returned HTTP 200 from the configured endpoint/model)
- Eve live model turn: PASS (real `eve invoke` completed through the server-side adapter)
- Eve streaming/session path: PASS (completed invocation produced the expected session event stream)

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

- format/lint/typecheck: PASS on Next.js 16.3.3 (format/typecheck clean; lint has non-blocking existing warnings and no errors)
- unit tests: PASS (15 domain, 7 contract, 7 integration, 8 agent-runtime safety tests)
- Postgres tests: PASS (17 RLS, 5 application, 1 workflow, and 1 agent-runtime DB qualification suites; hosted Neon fail-closed probe PASS)
- Workflow tests: PASS (4 pure workflow tests plus DB retry/idempotency coverage)
- security/dependency scan: PASS (`pnpm audit --audit-level high`; no known vulnerabilities)
- secret scan: PASS
- pre-push: BLOCKED on the final stack (Lefthook is configured, but mandatory `qa:fast` cannot start `postgres:18-alpine` while the local Docker daemon is unavailable)
- CI: PENDING (final commits not pushed yet; receipt will be updated with the resulting run)

## Deployment

- Vercel: PASS (authenticated CLI `58.9.4`; project `recruiterpal`; production deployment `dpl_3EEDMLYLeGUem1EHhVk69uuePRLM` ready and aliased at https://recruiterpal.vercel.app)
- Neon: PASS (dedicated `recruiterpal` project `lucky-butterfly-64762550`; migrations, seed, restricted `rp_app` role, and hosted RLS probe qualified)
- hosted smoke: PASS (`/login` 200, unauthenticated `/today` 307 to `/login`, authenticated demo Today surface loaded from Neon, `/icon.svg` 200, zero browser console errors)
- Next.js security gate: PASS (`next` and `eslint-config-next` upgraded to `16.3.3`; Vercel build log detected Next.js 16.3.3 and production smoke passed; see [Next.js release information](https://nextjs.org/blog) and [support policy](https://nextjs.org/support-policy))
- live Gmail / Google Calendar: BLOCKED (live credentials absent; synthetic adapters and no-external-write behavior PASS)

## Known limitations

- Live Gmail and Google Calendar writes remain unqualified until provider credentials are supplied; synthetic fallbacks are explicit and non-delivering.
- The full local Docker-backed QA/pre-push path remains unavailable until the Docker Desktop Linux daemon is running; hosted Neon qualification and all non-DB final gates pass.
- Lint is green with a small set of non-blocking existing warnings; no lint errors remain.

## Integrity statement

The clean-room scan found no forbidden external challenge artifacts, private
datasets, credentials, or secrets in the public repository. No external
deployment or provider check is marked PASS unless it was actually executed
successfully.

## Machine-readable release receipt

RECRUITERPAL_STATUS=PASS_PUBLIC_RELEASE_WITH_HOSTED_QUALIFICATION
PUBLIC_REPO=https://github.com/Litju/RecruiterPal
FINAL_SHA=114ac884b5e4883f4d8517d4bc96118f65d60a27
WORKTREE_CLEAN=PASS
M0=PASS
M1=PASS
M2=PASS
M3=PASS
M4=PASS
M5=PASS
M6=PASS
M7=PASS_WITH_LIVE_INTEGRATIONS_BLOCKED
M8=PASS
M9=PASS_WITH_LIVE_INTEGRATIONS_BLOCKED
DOMAIN_TESTS=PASS
DB_RLS_TESTS=PASS_LOCAL_17_OF_17_PLUS_NEON_FAIL_CLOSED
WORKFLOW_TESTS=PASS
EVE_EVALS=PASS_9_OF_9
OPENCODE_GO=PASS_RAW_RESPONSES_AND_EVE_TURN
PLAYWRIGHT=PASS_HOSTED_DEMO_AND_CI_GOLDEN_FLOW
PRE_PUSH=BLOCKED_LOCAL_DOCKER_DAEMON_UNAVAILABLE
CI=PENDING_FINAL_PUSH
VERCEL=PASS_PRODUCTION_DPL_3EEDMLYLEGUEM1EHHVK69UUEPRLM
NEON=PASS_LUCKY_BUTTERFLY_64762550
SECURITY_RELEASE_GATE=PASS_NEXT_16_3_3
SHIP_RECEIPT=PASS
