# RecruiterPal Durable Workflow Contracts

**Authority:** RP-FREEZE-2026-08-24-v1.1  
**Runtime:** Vercel Workflow SDK + deterministic domain services

## 1. Responsibility boundary

Vercel Workflow owns **durable deterministic execution**. It does not own recruiting truth and it does not replace domain policy.

Use it for:
- waits lasting minutes/days;
- retryable external actions;
- idempotent follow-ups;
- scheduling/reconciliation loops;
- SLA timers;
- webhook/event coordination;
- multi-step administrative automation;
- crash/deploy-safe continuation.

Use Eve only when semantic interpretation, synthesis, or model reasoning is actually required.

## 2. Workflow invariants

1. Canonical state lives in PostgreSQL.
2. Every external side effect has a stable business `action_id` / idempotency key.
3. Workflow retries cannot duplicate emails, calendar events, reminders, audit records, or state transitions.
4. Workflow steps re-authorize sensitive mutations at execution time.
5. Long waits persist intent/state references, not complete unnecessary PII payloads.
6. A workflow never silently advances a candidate through a consequential employment decision.
7. Human approval state is explicit and auditable.
8. External webhook ordering is treated as unreliable; reconciliation is authoritative.
9. Cancellation/withdrawal/closure signals terminate obsolete work.
10. All final mutations emit domain events and audit records.

## 3. V1 workflows

### WF-01 Scorecard Chase
Trigger: interview marked complete with required scorecard(s) absent.

Flow:
1. calculate missing scorecards deterministically;
2. wait configured grace period;
3. re-check state;
4. send idempotent reminder(s);
5. wait escalation period;
6. re-check;
7. create/escalate exception if still missing;
8. close automatically when requirements are satisfied or interview/application is canceled.

No LLM required.

### WF-02 Candidate Follow-up
Trigger: outbound scheduling/status request awaiting candidate response.

Flow:
1. persist communication obligation;
2. wait SLA;
3. re-check inbound thread/state;
4. send approved-template follow-up if policy allows;
5. escalate after configured maximum attempts;
6. stop immediately on candidate response/withdrawal.

LLM may draft a non-template message only through approval policy; it does not own timers.

### WF-03 Interview Scheduling Resolution
Trigger: candidate/panel scheduling needs resolution.

Flow:
1. retrieve constraints/approved interviewer pool;
2. compute deterministic feasible slots where possible;
3. request candidate/interviewer availability when needed;
4. wait for responses;
5. reconcile declines/timezone changes;
6. book through idempotent calendar action;
7. synchronize domain state;
8. notify participants;
9. if no feasible slot within SLA, emit scheduling exception.

An Eve subagent may help interpret free-form availability messages, but final slot validation is deterministic.

### WF-04 Hiring Manager Feedback
Trigger: hiring-manager review requested.

Flow:
1. create obligation/deadline;
2. wait;
3. remind according to policy;
4. escalate after threshold;
5. close on response, role closure, or application state change.

### WF-05 Competing Offer Escalation
Trigger: verified candidate-stated external offer deadline.

Flow:
1. store extracted deadline as `UNVERIFIED` or `CONFIRMED` fact with source reference;
2. require human/recruiter confirmation if extracted by model and policy requires it;
3. recompute urgency deterministically;
4. generate critical exception;
5. notify responsible recruiter/hiring manager;
6. do not auto-advance/reject/offer.

### WF-06 Exception Reconciliation
Trigger: scheduled recurring scan or state-changing event.

Flow:
1. recompute deterministic exception predicates;
2. deduplicate using stable exception keys;
3. open/update/close exceptions;
4. preserve history;
5. optionally ask Eve to produce concise narrative diagnosis for complex exceptions.

### WF-07 Integration Reconciliation
Trigger: webhook receipt, scheduled poll, or detected drift.

Flow:
1. ingest external event;
2. map through `ExternalObjectLink`;
3. validate monotonic/version semantics where available;
4. update canonical state transactionally;
5. detect conflicting/missing data;
6. schedule backfill/poll if needed;
7. never trust webhook delivery as complete.

### WF-08 Daily Portfolio Preparation
Trigger: configured morning schedule.

Flow:
1. deterministic recomputation of open exceptions, SLAs, pending approvals, interviews and deadlines;
2. materialize portfolio snapshot;
3. optionally invoke Eve Portfolio Brief skill/subagent to synthesize the snapshot;
4. store brief with evidence references and expiry timestamp;
5. show on Today.

## 4. Workflow step taxonomy

### Pure step
No external side effect; deterministic transformation/check.

### Read step
Authorized scoped read of canonical state or external system.

### Side-effect step
Email, calendar, message, external mutation. Requires idempotency key + audit record.

### Agent interpretation step
Calls Eve only for unstructured interpretation/synthesis. The output must conform to a typed RecruiterPal schema and is treated as a proposal/fact extraction, not canonical truth until validated.

## 5. Idempotency contract

Each action uses a key such as:

```text
organization_id:workflow_type:business_object_id:action_type:policy_version:logical_attempt
```

The receiving integration adapter stores execution outcome keyed by this value. Duplicate retries return the prior outcome instead of repeating the side effect.

## 6. Human approval contract

Consequential actions never become merely a Workflow continuation condition. They require a product `ApprovalRequest` with:
- target;
- action type;
- proposal source;
- evidence references;
- policy/authority class;
- requester;
- approver;
- creation/expiry timestamps;
- decision and reason if provided.

The workflow waits for the canonical approval result, then re-validates state before execution.

## 7. No hidden queues

Every material pending obligation must be queryable from product state: pending reminders, waiting feedback, waiting candidate response, pending approval, scheduling conflict, integration recovery. The Today surface is built from these explicit states rather than invisible background jobs.
