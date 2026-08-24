# RecruiterPal Security, Privacy, and Governance

**Authority:** RP-FREEZE-2026-08-24-v1.1 · Eve + OpenCode Go convergence

## Threat model

RecruiterPal processes highly sensitive employment data and connects to systems that can send messages, modify calendars, and potentially synchronize ATS records. Security boundaries are first-class architecture.

Threats include:
- cross-tenant data exposure;
- overly broad recruiter permissions;
- compromised OAuth tokens;
- prompt injection through resumes/messages/documents;
- unauthorized automated side effects;
- data leakage to model providers;
- webhook spoofing/replay;
- insecure object access;
- audit tampering;
- accidental production data use in preview/test environments;
- secrets committed to source control.

## Tenant model

All tenant-owned business records include `organization_id`.

Enforcement layers:
1. authenticated organization context;
2. application-layer RBAC/resource checks;
3. repository/query tenant scoping;
4. PostgreSQL RLS;
5. test cases attempting cross-tenant access.

Never trust a client-supplied organization ID without checking membership/session context.

## Roles

Initial roles:

### Owner
Organization/security/integration authority.

### Admin / Recruiting Lead
Manage policy, team, jobs, automation, reporting; no unrestricted platform-superadmin access.

### Recruiter
Own/manage assigned hiring workflows and candidate communications according to policy.

### Hiring Manager
Access assigned jobs/applications/evidence and permitted decisions.

### Interviewer
Access interview kit and scorecard/evidence needed for assigned interviews only.

Define permissions at resource/action granularity rather than role-name conditionals scattered through UI.

## Protected/sensitive data

Classifications:

- Public/low sensitivity
- Internal operational
- Confidential recruiting
- Candidate PII
- Highly restricted demographic/audit data
- Secrets/tokens

Sensitive demographic data has separate restricted access path and is excluded from ordinary Pal candidate context.

## Encryption

- TLS in transit.
- Managed encryption at rest from providers.
- Sensitive OAuth refresh tokens encrypted using platform secret/KMS capability where architecture supports it.
- Never log raw access/refresh tokens.

## Authentication

Better Auth configuration:
- secure cookies;
- CSRF protections as framework/library requires;
- session rotation/expiry;
- social/OIDC providers only when configured;
- 2FA/passkeys available for privileged roles;
- organization membership validated on every tenant switch.

## Authorization

Server enforcement only. Client role display is UX, not security.

Every write action receives an `ActorContext`:
- user_id
- organization_id
- roles
- permissions
- request/session ID

Tool calls from Pal receive same context and may have a stricter permission subset.

## Agent tool safety

- finite tool registry;
- typed schemas;
- per-tool permission checks;
- per-tool authority class;
- input validation;
- output redaction;
- rate limits for messaging/external actions;
- no shell/browser/network tool exposed to Pal unless specifically designed and sandboxed;
- no arbitrary SQL tool.

## Prompt injection defense

External content is untrusted:
- resume text;
- candidate messages;
- interview notes;
- linked documents;
- ATS imported fields.

Rules:
- label untrusted content in model context;
- system/tool instructions are separate and higher authority;
- document text cannot grant tools/permissions;
- tool authorization happens outside the model;
- extracted instructions contained in a resume are treated as content, not commands;
- high-risk actions still require deterministic policy/human approval.

## Model-provider privacy

Provider adapter must support configurable data handling.

Before sending content:
- minimize data;
- redact fields unnecessary to task;
- avoid sensitive demographic data by default;
- record provider/model/task category in audit metadata without storing hidden reasoning;
- follow provider contractual data-retention/privacy settings in deployment configuration.

## Data retention

V1 implements configurable policy skeleton:
- candidate/application retention duration;
- message/document retention;
- audit retention;
- deletion/anonymization workflow;
- legal hold placeholder if future enterprise need.

Deletion is a workflow, not arbitrary cascade from UI.

## Audit ledger

Audit records are append-only at application level.

Record:
- actor type (`human`, `system`, `pal/model`, `integration`);
- actor ID/model config ID;
- organization;
- target resource;
- action;
- authority/policy rule;
- evidence/input refs;
- approval refs;
- timestamp;
- outcome;
- correlation/workflow/action IDs.

Avoid storing secret tokens or full unnecessary PII payloads.

## Webhook security

Per integration:
- signature verification;
- replay/timestamp protection where provider supports;
- deduplication event ID;
- raw payload retention policy;
- normalized event schema;
- dead-letter/reconciliation path.

## Secrets

- `.env.example` contains names only.
- production/preview secrets in deployment secret stores.
- secret scanning in pre-push/CI.
- no copied challenge/company credentials.

## Preview environments

Never clone production PII into pull-request preview DBs by default. Use Neon schema-only branches or synthetic fixtures.

## Security tests

Required automated cases:
- cross-tenant reads/writes rejected;
- interviewer cannot access unrelated candidate;
- Pal tool call rejected without permission;
- candidate document prompt injection cannot trigger write tool;
- webhook with bad signature rejected;
- duplicate webhook idempotent;
- hidden terminal action cannot bypass human approval;
- sensitive demographic tool inaccessible to normal recruiter;
- audit record created for all external side effects.

## Governance policy versions

Version and audit:
- AutomationPolicy
- HiringProtocol
- DecisionReadiness rules
- Prompt versions
- Model task configs
- retention policy
- RBAC permission definitions

Consequential behavior changes require review and migration strategy.
