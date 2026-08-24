# RecruiterPal Product Requirements and Scope

**Authority:** RP-FREEZE-2026-08-24-v1.1 · Eve + OpenCode Go convergence

## Personas

### Primary: Recruiter
Owns multiple open requisitions and is responsible for process momentum, candidate communication, scheduling, evidence collection, stakeholder coordination, and offer progression.

### Recruiting Lead / Admin
Configures organization policy, automation authority, SLAs, templates, integrations, reporting, and recruiter portfolio oversight.

### Hiring Manager
Defines/approves role requirements and hiring protocol, reviews candidates/evidence, submits decisions, joins debriefs, and approves offers where configured.

### Interviewer
Receives interview assignments, interviewer kits, reminders, and submits structured scorecards/evidence.

### Candidate
Not a full V1 product user. Candidate-facing interactions occur through approved email/calendar flows. A future candidate portal is out of V1.

## Information architecture

Primary navigation:

1. **Today** — priority control surface.
2. **Jobs** — requisitions, protocol, pipeline summary, stakeholders.
3. **Pipeline** — cross-role and per-role application flow.
4. **Candidates** — people/talent records and application history.
5. **Interviews** — schedule, queue, kits, scorecard completion.
6. **Decisions** — decision-readiness queue, evidence matrices, debriefs.
7. **Inbox** — candidate/stakeholder communication and detected events.
8. **Analytics** — operational analytics and workflow signals.
9. **Activity** — organization/recruiter automation and audit activity.
10. **Settings** — org, roles, policies, integrations, SLAs.

Pal is globally available and context-aware from every surface.

## V1 required workflows

### WF-01 Create and activate a job
- Create requisition.
- Assign recruiter and hiring manager.
- Define basic role metadata.
- Create versioned Hiring Protocol.
- Define stages, required evidence, scorecards, and SLAs.
- Require human approval before activation.

### WF-02 Add/import a candidate application
- Candidate identity record.
- Application bound to one job.
- Source and stage.
- Resume/document metadata where available.
- Event entry.

### WF-03 Pipeline progression
- Stage transitions validated against allowed state machine.
- Required approvals enforced.
- Transition events written atomically.
- No LLM direct transition mutation.

### WF-04 Interview scheduling
- Create interview plan.
- Select qualified interviewers.
- Gather/resolve availability.
- Schedule, reschedule, or substitute within policy.
- Candidate/interviewer communications.
- Durable timers and reminders.

### WF-05 Interview completion and scorecards
- Mark completion from calendar/manual event.
- Open scorecard task.
- Enforce protocol version.
- Remind after SLA.
- Escalate after configured threshold.
- Record evidence observations.

### WF-06 Decision readiness
- Evaluate required evidence completeness.
- Check scorecard completion.
- Detect material rating conflicts.
- Check protocol version consistency.
- Check required approvals.
- Output typed readiness state and reasons.

### WF-07 Contextual Pal exception resolution
- Pal reads current context.
- Pal retrieves authorized facts via tools.
- Pal outputs typed diagnosis and action proposals.
- Safe actions execute through domain/Vercel Workflow.
- Approval-required actions render action previews.
- Every action produces audit/event records.

### WF-08 Candidate communication
- Thread/message representation.
- Approved templates/FAQ policy.
- Draft assist.
- Low-risk automated reminders/status updates where enabled.
- Escalate ambiguous/consequential candidate questions.
- Detect temporal facts such as competing-offer deadlines and attach them to application state as human-reviewable extracted facts.

### WF-09 Today brief
- Deterministic exception query.
- Priority ranking from explicit severity/urgency/business rules.
- Optional ML risk signals shown separately from rules.
- Pal summary generated from structured exception set.
- “Handled by Pal” activity list.

### WF-10 Audit inspection
- User can inspect why an action occurred.
- Shows policy, workflow, actor/model/tool, evidence references, timestamps, execution result, and approval if applicable.

## V1 entities visible in product

- Organization
- User / Member / Team
- Job
- HiringProtocol
- Competency
- StageDefinition
- Candidate
- Application
- ApplicationStageHistory
- InterviewPlan
- Interview
- InterviewAssignment
- InterviewQuestion
- ScorecardTemplate
- Scorecard
- Rating
- EvidenceObservation
- DecisionReadinessSnapshot
- DecisionRecord
- Offer
- CommunicationThread
- Message
- Task
- Exception
- ActionProposal
- ApprovalRequest
- AutomationPolicy
- DomainEvent
- AuditRecord
- IntegrationConnection
- ExternalObjectLink

## V1 non-goals

- Full payroll/HRIS replacement.
- Full CRM marketing automation suite.
- General job-board marketplace.
- Autonomous hiring/rejection.
- Video interview emotion/personality analysis.
- Psychometric test creation.
- Full compensation product.
- Native mobile app.
- Enterprise SAML/SCIM if no customer requires it; architecture must permit later addition.
- Multi-region active-active infrastructure.
- Kafka-based event platform.

## Demo dataset requirements

V1 ships with a synthetic organization containing:

- 1 organization;
- 8 jobs;
- 40–60 active applications;
- realistic historical stage events;
- 10+ interviewers;
- scorecard completion/overdue states;
- rating conflicts;
- at least one competing-offer deadline;
- at least one requirement-version drift scenario;
- at least one interview capacity bottleneck;
- at least one ready-to-decide candidate;
- at least one intentionally not-ready candidate.

Synthetic data must contain no copied challenge rows or PwC artifacts.

## UX acceptance for V1

The demo must prove:

- user can navigate without full page-reset feeling;
- `⌘/Ctrl+K` opens universal Pal/command surface;
- current object context is preserved in Pal interactions;
- candidate detail can open in contextual panel/drawer from pipeline;
- exception cards support direct resolution actions;
- Pal status is visible during durable workflows;
- keyboard path exists for core recruiter actions;
- motion obeys reduced-motion preference;
- all critical states have text/icon semantics in addition to color.
