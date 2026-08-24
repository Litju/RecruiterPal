# RecruiterPal System Architecture

**Authority:** RP-FREEZE-2026-08-24-v1.1

## 1. Architecture style

**TypeScript modular monolith + Eve agent runtime + Vercel durable workflows + optional Python science service.**

Do not start with a microservice swarm. Do not add infrastructure merely because it is fashionable.

## 2. Locked stack

### Product/UI plane
- Node.js 24+
- TypeScript 5.9-class strict mode
- Next.js 16.3-class App Router, **security-patched before any public production release**
- React 19.2-class
- Tailwind CSS 4.3-class
- shadcn/ui using current supported primitives; prefer Base UI for new scaffold where compatible
- Motion for restrained state transitions
- TanStack Table/Virtual for dense operational lists
- Lucide icons
- pnpm 10.x
- Turborepo

### Agent plane
- **Eve** (verified baseline: `eve@0.44.3`; pin an exact qualified version in the lockfile)
- Eve filesystem-first `agent/` structure
- typed tools with Zod
- skills for on-demand procedures
- bounded subagents
- durable sessions / reconnectable event stream
- human-in-the-loop approvals
- schedules
- Eve evals
- adapter boundary around Eve because Eve is beta

### Runtime model provider
- **OpenCode Go subscription**
- provider name: `opencode-go`
- protocol: OpenAI Responses-compatible
- base URL: `https://opencode.ai/zen/go/v1`
- credential env: `OPENCODE_GO_API_KEY`
- verified V1 model topology: `@ai-sdk/openai` `createOpenAI(...).responses(...)`
- initial model: `gpt-5.6-luna` unless OpenCode Go availability changes; any substitution requires model compatibility/eval gates
- never commit provider credentials

### Durable deterministic execution
- **Vercel Workflow SDK**
- application-authored TypeScript workflows with `use workflow` / `use step` semantics where appropriate
- deterministic coordination, waits, retries, timers, reconciliation and external side effects
- canonical workflow business state projected to PostgreSQL
- no Temporal in V1 unless a new ADR proves a concrete need that Vercel Workflow cannot satisfy

### Data plane
- PostgreSQL 18.x
- Neon
- Drizzle ORM
- explicit SQL for analytical queries where better than ORM abstraction
- PostgreSQL full-text search first
- pgvector only for justified semantic retrieval
- RLS + application authorization
- append-only audit/domain-event ledger
- outbox pattern for transactional side-effect initiation where required

### Authentication / tenancy
- Better Auth 1.7-class patched release
- Organization plugin
- organization-scoped roles/permissions
- sessions and 2FA/passkeys where practical
- enterprise SSO/SCIM deferred until needed

### Python intelligence plane
Use only if a task materially benefits from Python:
- Python 3.12+
- FastAPI/Pydantic if service boundary is required
- numpy/scipy/statsmodels/scikit-learn/polars
- statistical/ML evaluation
- process analytics
- no agent orchestration ownership
- no direct autonomous employment-decision authority

### Observability
- OpenTelemetry-compatible traces/metrics/log correlation
- Sentry for application errors/performance
- Eve event/session observability and Eve evals
- product audit ledger is separate and authoritative for business accountability

### Testing
- Vitest
- Testing Library
- Playwright
- real PostgreSQL integration tests
- Workflow tests around deterministic steps/retries/idempotency
- Eve evals
- pytest/Hypothesis only if Python service exists
- accessibility automation + manual keyboard flows

## 3. Runtime topology

```text
┌─────────────────────────────────────────────────────────────┐
│ Browser / Recruiter                                         │
│ Today · Jobs · Pipeline · Candidates · Interviews · Pal     │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Next.js RecruiterPal                                        │
│                                                             │
│ UI / BFF / Auth / Domain / Integration adapters             │
│                                                             │
│  ┌───────────────────┐      ┌────────────────────────────┐   │
│  │ Deterministic     │      │ Eve                       │   │
│  │ domain services   │◄────►│ Pal + skills + tools      │   │
│  └────────┬──────────┘      │ subagents + HITL + evals  │   │
│           │                 └─────────────┬──────────────┘   │
│           │                               │                  │
│           │                         OpenCode Go              │
│           │                               │                  │
│  ┌────────▼───────────────────────────────▼───────────────┐  │
│  │ Vercel Workflow SDK — durable deterministic processes │  │
│  └────────┬───────────────────────────────────────────────┘  │
└───────────┼─────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│ Neon PostgreSQL                                             │
│ canonical state · events · audit · search · vectors        │
└─────────────────────────────────────────────────────────────┘

Optional Python analytics/science service receives scoped data contracts only.
```

## 4. Source-of-truth rules

- PostgreSQL is authoritative for business facts.
- Vercel Workflow execution history is execution evidence, not a substitute for product-visible canonical state.
- Eve session state is conversational/agent runtime state, not canonical recruiting truth.
- UI local state is ephemeral.
- Sentry/OTel logs are engineering telemetry, not business audit records.
- ML artifacts are versioned analytical assets, not direct state-transition authority.

## 5. Eve adapter boundary

Because Eve is beta, application code must not scatter Eve-specific types through domain modules.

Required shape:

```text
packages/agent-runtime/
  eve-adapter.ts
  contracts.ts
  session-service.ts
  event-mapper.ts
```

Domain code consumes RecruiterPal-owned interfaces. The adapter converts those interfaces to Eve APIs. Upgrading/replacing Eve must not require rewriting hiring invariants, database repositories, or UI business components.

## 6. Monorepo layout

```text
RecruiterPal/
├─ apps/
│  ├─ web/
│  └─ intelligence/                 # optional Python service only if justified
├─ packages/
│  ├─ domain/
│  ├─ db/
│  ├─ auth/
│  ├─ agent-runtime/
│  ├─ workflows/
│  ├─ integrations/
│  ├─ contracts/
│  ├─ ui/
│  ├─ observability/
│  └─ test-utils/
├─ agent/
│  ├─ agent.ts
│  ├─ instructions.md
│  ├─ skills/
│  ├─ tools/
│  ├─ subagents/
│  └─ schedules/
├─ evals/
├─ research/
├─ docs/
│  ├─ architecture/
│  ├─ product/
│  ├─ science/
│  └─ adr/
├─ scripts/
├─ .github/workflows/
├─ lefthook.yml
├─ pnpm-workspace.yaml
└─ turbo.json
```

## 7. Core bounded modules

### Portfolio / Today
Exception aggregation, priority computation, daily brief, Pal activity summary.

### Jobs
Requisitions, job criteria, protocol versions, role state.

### Candidates / Applications
Candidate identity, applications, stage state, current obligations, deadlines.

### Interviews
Panels, schedules, calendar links, completion, scorecards.

### Evidence / Decisions
Competencies, observations, evidence completeness, scorecard disagreement, decision readiness.

### Communications
Threads, templates, candidate/stakeholder messages, extracted deadlines/events.

### Workflow
Durable deterministic waiting/retry/follow-up/reconciliation processes.

### Agent runtime
Pal sessions, tools, skills, subagents, agent schedule/eval wiring.

### Analytics
Operational metrics, funnel latency, anomalies, capacity; later ML.

### Audit / Governance
Append-only accountability records, authority decisions, prompt/tool/policy version references.

## 8. Explicit non-choices for V1

Do not add by default:
- Kubernetes
- Kafka
- Redis
- Elasticsearch/OpenSearch
- Pinecone/Weaviate/Qdrant
- Temporal
- separate microservice per domain
- GraphQL unless a concrete need appears
- autonomous candidate rejection
- arbitrary LLM SQL
- direct model access to DB
- facial/emotion/personality inference
- opaque candidate fit scores

## 9. Security version gate

A Next.js security release was announced for 2026-08-26. If implementation or deployment occurs before the patched release is available, local development and controlled preview may proceed, but **public production release is blocked**. Once the patched compatible release exists, update, lock, audit, rebuild, run full gates, and record the version in the ship receipt.
