# RecruiterPal Locked Architecture Decisions

**Authority:** RP-FREEZE-2026-08-24-v1.1

## ADR-001 — Fresh repository
Decision: create `RecruiterPal` from commit zero.  
Reason: clean provenance and product identity.

## ADR-002 — TypeScript product core
Decision: Next.js/React/TypeScript modular monolith.  
Reason: product is an interactive multi-tenant operational SaaS and Eve is TS-native.

## ADR-003 — PostgreSQL canonical truth
Decision: Neon Postgres + Drizzle.  
Reason: recruiting data is relational, transactional and auditable.

## ADR-004 — Eve over Eve for V1 agent runtime
Decision: Eve.  
Reason: tighter TypeScript/Next.js fit; durable sessions, skills, tools, subagents, HITL, schedules, evals; avoids Python agent service.  
Risk: Eve is beta.  
Mitigation: exact pin + adapter boundary + compatibility tests.

## ADR-005 — OpenCode Go provider
Decision: OpenCode Go via OpenAI Responses-compatible endpoint.  
Reason: user subscription and topology already qualified in ShoppingPal.  
Secret: `OPENCODE_GO_API_KEY` only in secret stores.

## ADR-006 — Vercel Workflow over Temporal for V1
Decision: Vercel Workflow SDK for deterministic durable processes.  
Reason: durable TypeScript execution inside existing platform, lower operational overhead, avoids duplicating Eve/Vercel durability stack.  
Revisit only if a demonstrated requirement exceeds capability.

## ADR-007 — Python only for science/ML
Decision: optional Python service, not agent orchestration.  
Reason: use Python where numerical/scientific ecosystem is materially beneficial.

## ADR-008 — No candidate fit score
Decision: V1 uses evidence completeness/conflict/readiness, not opaque overall candidate score.  
Reason: scientific/governance defensibility and human decision authority.

## ADR-009 — Agent-native immersive UI
Decision: Pal is ambient/contextual with typed UI intents, not isolated chat.  
Reason: primary bottleneck is cross-workflow orchestration, not question answering.

## ADR-010 — Deterministic-first automation
Decision: if a task can be reliably implemented as deterministic code/workflow, do that before calling a model.  
Reason: lower cost, lower variance, easier audit/testing.

## ADR-011 — Gmail/Calendar first integrations
Decision: first real-world integrations focus on communications/scheduling; broad ATS integration is later.  
Reason: proves orchestration wedge without rebuilding entire ATS ecosystem.

## ADR-012 — Pre-push mandatory
Decision: repo-managed pre-push QA plus CI.  
Reason: quality failures should surface locally before remote CI.
