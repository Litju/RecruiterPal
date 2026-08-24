# RecruiterPal Definition of Done and Acceptance Matrix

**Authority:** RP-FREEZE-2026-08-24-v1.1

| Area | Required acceptance evidence |
|---|---|
| Clean room | Fresh Git history; no challenge code/data/artifacts; provenance scan PASS |
| Build | Frozen install + production build PASS |
| Auth | Organization-aware sign-in/authorization demonstrated |
| Tenancy | RLS/application cross-tenant tests PASS |
| Domain | Jobs, applications, interviews, scorecards, evidence, exceptions, approvals functional |
| Today | Prioritized critical/blocked/signals/routine-completed surface populated from live canonical state |
| Decision readiness | Missing/conflicting evidence prevents false readiness |
| Durable workflows | At least scorecard chase + one scheduling/follow-up flow survive waits/retries and are idempotent |
| Eve | Session start/continue/stream/tool/HITL/subagent smoke PASS |
| OpenCode Go | Live model turn/tool call PASS when credential available; otherwise truthfully marked blocked/not run |
| Authority | A3 consequential action cannot be auto-executed; eval PASS |
| UX | Context preserved through drawer/panel flow; Cmd/Ctrl+K Pal usable; no modal-heavy CRUD feel |
| UI | Polished coherent design system, loading/empty/error/blocked states, purposeful motion |
| Accessibility | Keyboard primary paths + automated checks PASS |
| Audit | Pal/workflow/human material actions traceable through product audit ledger |
| Tests | Unit + DB + workflow + Eve eval + E2E green |
| Pre-push | Repo-managed pre-push gate green on final SHA |
| CI | Required GitHub Actions green on final SHA if remote configured |
| Security | secret scan/dependency scan/security release gate green |
| Deployment | Vercel/Neon hosted smoke PASS, or explicit truthful blocker in receipt |
| Documentation | README + architecture + runbook + ship receipt current |

## Release blockers

Any of these blocks `PRODUCTION_READY`:
- known critical framework vulnerability;
- missing tenant isolation proof;
- consequential AI action bypasses approval;
- provider secret exposed;
- challenge/proprietary artifact copied into repo;
- production build failing;
- required pre-push/CI gates red;
- model invents evidence in golden eval;
- missing auditability for material side effect;
- hosted deployment claimed without actual smoke.

## Portfolio-ready threshold

Even if external credentials prevent full live integrations, the repository may be `PORTFOLIO_READY_WITH_LIMITATIONS` only if:
- deterministic product works end to end on owned synthetic data;
- live/fixture distinction is obvious;
- no fake external results are presented as real;
- all security/authority/test gates not dependent on unavailable external credentials are green;
- limitations are explicit in README and ship receipt.
