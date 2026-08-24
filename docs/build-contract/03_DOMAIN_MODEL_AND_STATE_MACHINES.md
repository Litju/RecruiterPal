# RecruiterPal Domain Model and State Machines

**Authority:** RP-FREEZE-2026-08-24-v1.1 · Eve + OpenCode Go convergence

## Modeling rule

A **Candidate** is a person/talent record. An **Application** is that candidate's participation in a specific Job process. Hiring process state belongs to Application, not Candidate.

Every tenant-owned table includes `organization_id` and is protected by application authorization plus PostgreSQL RLS.

## Core aggregates

### Organization
Owns policy, users, teams, jobs, candidate records, integrations, automation settings, and audit data.

### Job
Represents a requisition. Holds business role data and references an approved HiringProtocol version.

Key fields:
- id
- organization_id
- title
- department
- location_mode
- employment_type
- status
- owner_recruiter_id
- hiring_manager_id
- active_protocol_version_id
- opened_at
- target_fill_date
- created_at / updated_at

### HiringProtocol
Versioned contract for how a role will be assessed.

Contains:
- role requirements;
- competencies;
- stage definitions;
- required evidence sources;
- interview kits;
- scorecard templates;
- decision-readiness rules;
- approved automation policy references.

Never mutate an approved protocol version in place. Create a new version.

### Candidate
Canonical person record with normalized identity fields and PII classification.

### Application
Candidate × Job process.

Fields include:
- current_stage_id
- status
- source
- owner_recruiter_id
- applied_at
- last_activity_at
- next_expected_action_at
- candidate_deadline_at
- protocol_version_id

### InterviewPlan / Interview
Plan defines required interviews; Interview is a scheduled or completed occurrence.

### Scorecard
One interviewer's structured evaluation for one interview/assessment under one template/protocol version.

### EvidenceObservation
Atomic evidence item, not an overall judgment.

Fields:
- competency_id
- source_type
- source_object_id
- observation
- rater_id
- rubric_anchor_id optional
- rating optional
- artifact_reference optional
- observed_at
- protocol_version_id
- provenance

### DecisionReadinessSnapshot
Derived, immutable snapshot of whether the process is ready for a human decision at time T.

Fields:
- application_id
- status
- reasons[]
- missing_evidence[]
- conflicts[]
- missing_approvals[]
- stale_protocol_flags[]
- computed_at
- ruleset_version

### Exception
Operational deviation requiring attention or automated resolution.

Types include:
- overdue_scorecard
- scheduling_conflict
- candidate_response_overdue
- interviewer_decline
- evidence_missing
- material_rating_conflict
- protocol_drift
- stage_sla_breach
- offer_approval_delay
- integration_sync_error
- candidate_deadline_risk
- capacity_risk

### ActionProposal
Typed proposal produced by deterministic rules, ML, or Pal.

### ApprovalRequest
Explicit human gate for an action.

### DomainEvent
Append-only business event representation used for audit/history and downstream workflow triggering.

## State machines

### JobStatus

```text
DRAFT
  -> PENDING_APPROVAL
  -> OPEN
  -> ON_HOLD
  -> CLOSED_FILLED
  -> CLOSED_CANCELLED
```

Rules:
- `OPEN` requires approved HiringProtocol.
- Closing a job prevents new applications from entering active stages.
- `ON_HOLD` pauses configured automation timers except compliance/security tasks.

### ApplicationStatus

```text
ACTIVE
WITHDRAWN
REJECTED
HIRED
CANCELLED
```

`REJECTED` and `HIRED` are consequential terminal states and require configured human authority. Pal cannot independently set them.

### Stage transition

Stage definitions are job/protocol-specific. Generic example:

```text
APPLIED
 -> RECRUITER_REVIEW
 -> RECRUITER_SCREEN
 -> HM_REVIEW
 -> TECHNICAL_ASSESSMENT
 -> INTERVIEW_LOOP
 -> DECISION
 -> OFFER
 -> HIRED
```

Allowed transitions are explicit edges, not free strings.

### InterviewStatus

```text
PLANNED
 -> AWAITING_AVAILABILITY
 -> SCHEDULED
 -> RESCHEDULE_REQUIRED
 -> COMPLETED
 -> CANCELLED
 -> NO_SHOW
```

Application-owned Vercel Workflows own waiting, reminders, retries, and durable deterministic process paths.

### ScorecardStatus

```text
NOT_OPEN
 -> OPEN
 -> SUBMITTED
 -> AMENDED
```

Additional derived SLA state:

```text
ON_TIME | DUE_SOON | OVERDUE | ESCALATED
```

Scorecards are never silently overwritten. Amendments preserve version history.

### DecisionReadinessStatus

```text
NOT_APPLICABLE
INCOMPLETE
CONFLICT_REVIEW_REQUIRED
APPROVAL_REQUIRED
READY
STALE
```

`READY` means required process evidence and approvals are complete. It does not mean “hire”.

### ActionProposalStatus

```text
PROPOSED
AUTHORIZED_AUTOMATIC
AWAITING_APPROVAL
APPROVED
REJECTED
EXECUTING
WAITING_EXTERNAL
SUCCEEDED
FAILED_RETRYABLE
FAILED_FINAL
CANCELLED
```

### ExceptionStatus

```text
OPEN
ACKNOWLEDGED
AUTO_RESOLVING
WAITING_EXTERNAL
WAITING_HUMAN
RESOLVED
DISMISSED_WITH_REASON
```

## Core invariants

1. Every Application references exactly one Job and Candidate in the same organization.
2. Every active Application is evaluated under one explicit HiringProtocol version.
3. Protocol changes never retroactively alter existing evidence semantics without a migration/review record.
4. Every Scorecard references the template and protocol version used at submission.
5. Every EvidenceObservation has provenance.
6. Protected demographic data, if present, is segregated and never returned from candidate-advancement tools unless the caller has a restricted audit permission.
7. Stage transitions are validated by domain code.
8. Consequential terminal transitions require an authorized human action record.
9. External side effects occur only through Activities/domain services and are idempotent.
10. Every automated side effect emits DomainEvent + AuditRecord.
11. Decision readiness is deterministic from current process evidence/configuration; LLMs may explain it but not define it.
12. Exceptions have deterministic identifiers/deduplication keys where possible to prevent repeated duplicate alerts.
13. One external integration object maps to internal records through explicit `ExternalObjectLink`, never by ad hoc string matching alone.
14. Soft-deleted/retained PII obeys retention policy and remains tenant-scoped.

## Event examples

- `job.created`
- `job.protocol_approved`
- `job.opened`
- `application.created`
- `application.stage_changed`
- `interview.scheduled`
- `interview.reschedule_required`
- `interview.completed`
- `scorecard.opened`
- `scorecard.submitted`
- `scorecard.overdue`
- `evidence.observed`
- `decision_readiness.computed`
- `exception.opened`
- `exception.resolved`
- `action.proposed`
- `action.approved`
- `action.executed`
- `communication.sent`
- `integration.sync_failed`

Event payloads contain IDs and relevant immutable facts, not complete PII snapshots unless absolutely required.
