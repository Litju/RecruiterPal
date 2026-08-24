# RecruiterPal Integrations and External Systems

**Authority:** RP-FREEZE-2026-08-24-v1.1 · Eve + OpenCode Go convergence

## Strategy

V1 proves orchestration with a small number of deep integrations rather than superficially supporting every ATS.

Priority:
1. Gmail / Google Workspace email
2. Google Calendar
3. optional Slack notification bridge if time permits
4. ATS abstraction with one demo/provider adapter or synthetic adapter

Later breadth can use Merge or direct integrations based on commercial need.

## Integration architecture

```text
External provider
   |
   | webhooks + polling/reconciliation
   v
Provider Adapter
   |
   v
Normalized Integration Event
   |
   v
Domain Mapper / ExternalObjectLink
   |
   v
Domain Service / Workflow event
```

Outbound:

```text
Domain/Workflow Action
   |
   v
Authorized Integration Activity
   |
   v
Provider Adapter
   |
   v
External API
   |
   v
Result + external ID + audit event
```

## ExternalObjectLink

Every external object mapping includes:
- organization_id
- provider
- connection_id
- object_type
- external_id
- internal_resource_type
- internal_resource_id
- sync_cursor/version where relevant
- last_synced_at

Do not rely on candidate email alone as permanent object identity.

## Gmail V1

Capabilities:
- connect account/tenant-authorized mailbox;
- send recruiter messages from approved identity;
- read/reconcile threads relevant to tracked candidate communications;
- normalize inbound replies;
- link message/thread to candidate/application;
- detect candidate deadlines/questions as reviewable structured facts;
- preserve provider message IDs for threading.

Do not scrape Gmail UI.

## Google Calendar V1

Capabilities:
- read availability/free-busy required for scheduling;
- create interview events;
- add required attendees;
- update/reschedule/cancel;
- detect attendee decline/cancellation through webhook/poll reconciliation;
- map events to Interviews.

Calendar event mutation is a side effect through an idempotent Workflow step with an explicit business action key.

## Scheduling solver

Keep scheduling mathematics deterministic:
- candidate windows;
- interviewer availability;
- required panel roles;
- working hours/timezones;
- minimum lead time;
- duration;
- buffer rules;
- interviewer qualification/substitution policy.

Pal may explain or propose tradeoffs when constraints cannot be satisfied; it does not replace deterministic feasibility computation.

## ATS abstraction

Internal interface examples:
- listJobs
- listCandidates
- listApplications
- getApplication
- upsertCandidateLink
- syncStage
- syncInterview
- syncOfferMetadata

Provider-specific behavior stays behind adapter.

For a portfolio V1, a synthetic/local ATS adapter is acceptable if Gmail/Calendar demonstrate real integration behavior. If a real ATS sandbox is accessible, implement one provider end-to-end.

## Merge/Nango later

Potential future use:
- Merge for normalized ATS breadth;
- Nango or equivalent for OAuth/sync infrastructure across heterogeneous APIs.

Do not add both without a concrete need.

## Sync model

Never assume webhooks are complete or ordered.

Use:
- webhook for low-latency event;
- cursor/poll reconciliation for correctness;
- dedupe key;
- provider version/timestamp conflict handling;
- periodic reconciliation workflow.

## Conflict policy

Each mapped field has ownership:
- RecruiterPal authoritative;
- external authoritative;
- bidirectional with version resolution;
- read-only mirror.

Do not create accidental sync loops.

## Integration health

Expose:
- connection state;
- last successful sync;
- last webhook;
- pending errors;
- auth expiry/reconnect required;
- reconciliation status.

Integration failures can create Today exceptions if they threaten recruiting process correctness.

## Rate limiting

Provider adapter supports:
- request budget;
- backoff;
- `Retry-After`;
- batching when available;
- queueing through Activities;
- circuit-breaker style temporary pause when provider is unhealthy.

## Test strategy

- contract fixtures for provider payloads;
- mock HTTP provider tests;
- sandbox/live smoke test where credentials available;
- webhook signature tests;
- duplicate/out-of-order event tests;
- OAuth expiration/reconnect test;
- integration reconciliation test.
