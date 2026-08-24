# RecruiterPal Database Schema and Data Contracts

**Authority:** RP-FREEZE-2026-08-24-v1.1

## Canonical table families

### Tenancy / identity
- organizations
- users
- memberships
- teams
- invitations

### Recruiting
- jobs
- job_requirements
- hiring_protocols
- hiring_protocol_versions
- competencies
- protocol_competencies
- candidates
- candidate_contacts
- applications
- application_stage_events
- application_obligations

### Interviews / evidence
- interviews
- interview_participants
- interview_kits
- interview_questions
- scorecard_templates
- scorecards
- scorecard_ratings
- evidence_observations
- evidence_artifacts
- decision_readiness_snapshots
- decision_records

### Communications / scheduling
- communication_threads
- messages
- extracted_facts
- availability_windows
- calendar_events

### Operations
- exceptions
- approvals
- actions
- workflow_instances
- workflow_obligations
- integration_connections
- external_object_links
- sync_cursors
- outbox_events

### Audit / agent
- domain_events
- audit_records
- agent_sessions
- agent_action_proposals
- agent_feedback

## Mandatory columns

Every tenant-owned row includes `organization_id` unless ownership is inherited through an immutable FK and RLS proof remains clear. Prefer explicit tenant key on high-risk tables.

Common metadata:
- `id` UUID/ULID-style stable identifier;
- `created_at` timestamptz;
- `updated_at` where mutable;
- `created_by`/`updated_by` where meaningful;
- optimistic version column where concurrent edits matter.

## Sensitive data segregation

Protected demographic attributes, if ever collected for lawful restricted auditing, live in a separately permissioned table/schema and are not part of normal candidate-retrieval/tool responses.

## State history

Do not rely only on mutable current stage. `application_stage_events` preserves transitions with actor, reason, timestamp, protocol version, and source.

## Protocol versioning

An approved Hiring Protocol version is immutable. Editing creates a new version. Existing application evidence remains linked to the version under which it was collected unless an explicit migration/reassessment record exists.

## Evidence observation

Each observation carries:
- application ID;
- competency ID;
- protocol version;
- evidence source type;
- artifact/message/interview reference;
- observer/rater;
- observation text or structured fact;
- rating if rubric permits;
- confidence/quality metadata if defined;
- timestamp;
- provenance/source ID.

No observation may be invented by the model without a source reference.

## Exception keys

Exceptions use stable deduplication keys such as:

`organization:job/application:exception_type:scope_version`

Recomputation updates/open/closes the same logical exception rather than spamming duplicates.

## Indexing

At minimum index:
- organization + current job/application state;
- organization + responsible recruiter + SLA/deadline;
- application + stage events;
- interview + completion/scorecard state;
- exception + severity/status;
- approvals pending by approver;
- external object links;
- audit/domain event time ranges.

Use FTS for role/candidate/document text search. Add pgvector indexes only once semantic retrieval use cases and cardinality justify them.

## RLS test requirement

For every tenant-owned table with externally reachable data, integration tests must prove:
- own-tenant read works;
- cross-tenant read returns no row/denied;
- cross-tenant update/delete denied;
- service-role bypass is restricted to explicit backend paths and not available to Eve/model clients.
