# RecruiterPal Observability, Audit, and Evals

**Authority:** RP-FREEZE-2026-08-24-v1.1

## 1. Three separate observability domains

Do not conflate these:

### Product audit
Who/what did what to recruiting state, under which authority, using which evidence/policy, and with what outcome.

### Engineering telemetry
Latency, errors, resource behavior, workflow failures, external API failures.

### Agent evaluation
Whether Pal used the correct tools, preserved authority, cited evidence, avoided fabrication, and behaved correctly across scenarios.

## 2. Product AuditRecord

Material actions must record:
- audit ID;
- organization ID;
- actor type (`HUMAN`, `AGENT`, `WORKFLOW`, `INTEGRATION`);
- actor ID/session/workflow reference;
- action type;
- target type/ID;
- authority class;
- policy version;
- evidence/source references;
- proposal/approval reference where applicable;
- before/after semantic state where safe;
- timestamp;
- outcome/error code.

Do not store private chain-of-thought.

## 3. Domain events

Append-only domain events enable history and reconciliation, e.g.:
- `JobOpened`
- `ApplicationStageChanged`
- `InterviewScheduled`
- `InterviewCompleted`
- `ScorecardSubmitted`
- `ExceptionOpened`
- `ExceptionResolved`
- `ApprovalRequested`
- `ApprovalGranted`
- `AgentActionProposed`
- `AdministrativeActionExecuted`

PII should be referenced by ID rather than copied wholesale into event payloads.

## 4. Engineering telemetry

Instrument the request path:

```text
Browser -> Next.js -> domain/tool -> Workflow/Eve -> integration/model -> Postgres
```

Correlate with trace/request/session/action IDs.

Use OpenTelemetry-compatible instrumentation where practical and Sentry for application errors/performance. Redact secrets and candidate PII from telemetry by default.

## 5. Eve runtime telemetry

Persist only the minimum agent/session metadata needed for support and audit:
- session ID;
- user/organization opaque references;
- model/provider version;
- prompt/skill/tool versions;
- tool calls and outcome metadata;
- approvals;
- high-level runtime events;
- response/evidence references.

Do not expose raw internal reasoning to users.

## 6. Eve eval suite

Every release touching `agent/`, tools, skills, authority logic or provider adapters runs agent evals.

Minimum eval categories:

### Authority
- never auto-reject/hire;
- never change Hiring Protocol without approval;
- approval-required tools actually park/require approval;
- forbidden actions are refused concisely.

### Tenancy/security
- no cross-tenant retrieval;
- tool injection in candidate text cannot alter authorization;
- secrets never appear in response.

### Evidence
- missing evidence remains missing;
- conflicting evidence is surfaced;
- no fabricated scorecard/quote;
- no global fit score generated.

### Tool behavior
- uses retrieval tool before factual claims about current recruiting state;
- correct tool arguments;
- no unnecessary side-effect tool when read-only answer suffices.

### UX response quality
- concise summary;
- typed UI intent where visual inspection is superior;
- useful action proposal with evidence refs;
- high-level uncertainty flag when data are insufficient.

## 7. Deterministic eval fixtures

Use owned synthetic organization scenarios from `17_DEMO_SEED_AND_GOLDEN_FLOWS.md`. Eval fixtures must be reproducible and may use deterministic/mock provider mode for PR speed, with periodic live-provider checks using OpenCode Go.

## 8. Production feedback loop

Capture explicit recruiter feedback on Pal proposals/results separately from model training. Do not automatically train on candidate/recruiter data. Any future learning pipeline requires privacy/governance ADR.

## 9. Operational dashboards

Engineering dashboard:
- request/error rate;
- workflow success/failure/retry;
- external integration errors;
- model/provider latency/failure;
- DB performance;
- agent session failure/approval counts.

Product analytics dashboard:
- exceptions opened/resolved;
- automation success rate;
- manual intervention rate;
- scorecard latency;
- stage latency;
- decision-readiness time;
- recruiter time saved only when defensibly measured.

## 10. Release evidence

The final ship receipt includes:
- test/eval counts;
- pre-push result;
- CI run URLs or identifiers where available;
- security scan result;
- model provider smoke result or explicit `NOT_RUN` reason;
- hosted smoke result or explicit blocker;
- deployed commit SHA;
- known limitations.
