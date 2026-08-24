# RecruiterPal Eve Agent Architecture

**Authority:** RP-FREEZE-2026-08-24-v1.1  
**Agent framework:** Eve  
**Model provider:** OpenCode Go  
**Primary product agent:** Pal

## 1. Eve responsibility

Eve owns the **probabilistic/semantic interaction layer**:
- durable agent sessions;
- natural-language interaction;
- interpretation of unstructured inputs;
- evidence synthesis;
- exception diagnosis;
- tool selection;
- skills loaded on demand;
- bounded subagent delegation;
- agent schedules;
- human-in-the-loop agent approvals;
- streaming runtime events;
- agent evals.

Eve does **not** own:
- tenant authorization;
- PostgreSQL truth;
- stage-transition rules;
- SLA arithmetic;
- hiring policy;
- consequential employment decisions;
- direct unrestricted database access.

## 2. Provider configuration

Use the OpenCode Go topology already qualified in ShoppingPal:

```ts
import { createOpenAI } from "@ai-sdk/openai";
import { defineAgent } from "eve";

const openCodeGo = createOpenAI({
  name: "opencode-go",
  baseURL: "https://opencode.ai/zen/go/v1",
  apiKey: process.env.OPENCODE_GO_API_KEY!,
});

const recruiterPalModel = openCodeGo.responses("gpt-5.6-luna");

export default defineAgent({
  model: recruiterPalModel,
  modelContextWindowTokens: 200_000,
  description: "RecruiterPal helps recruiters run evidence-based hiring workflows safely.",
});
```

Treat this as the initial provider adapter, not as a license to couple domain code to a model name.

## 3. Filesystem layout

```text
agent/
├─ agent.ts
├─ instructions.md
├─ tools/
│  ├─ get_portfolio.ts
│  ├─ get_job.ts
│  ├─ get_application.ts
│  ├─ get_exception.ts
│  ├─ get_evidence_matrix.ts
│  ├─ get_scorecards.ts
│  ├─ get_allowed_actions.ts
│  ├─ propose_stage_transition.ts
│  ├─ request_scorecard_reminder.ts
│  ├─ draft_message.ts
│  ├─ request_interviewer_substitution.ts
│  └─ create_note.ts
├─ skills/
│  ├─ triage_portfolio.md
│  ├─ diagnose_exception.md
│  ├─ synthesize_candidate_evidence.md
│  ├─ prepare_debrief.md
│  ├─ investigate_pipeline_change.md
│  └─ communication_policy.md
├─ subagents/
│  ├─ evidence-analyst/
│  ├─ scheduling-resolver/
│  └─ recruiting-analyst/
└─ schedules/
   └─ morning-portfolio-brief.md

evals/
├─ never_auto_reject_candidate.eval.ts
├─ cross_tenant_access_forbidden.eval.ts
├─ missing_evidence_detected.eval.ts
├─ protected_attribute_not_used.eval.ts
├─ approval_boundary_preserved.eval.ts
└─ no_fabricated_evidence.eval.ts
```

## 4. Agent context contract

Application code constructs the context; the model does not infer tenancy.

`InteractionContext` includes:
- actor user ID;
- organization ID;
- roles/permissions;
- current surface/route;
- selected job/application/candidate/interview/exception IDs;
- active filters/search scope;
- locale/timezone;
- recent relevant product actions;
- current authorization policy version.

Sensitive context is minimized to what the current task requires.

## 5. Tool contract

Every tool is narrow, typed, and fail-closed.

Read tools may return only organization-scoped authorized data.

Write/proposal tools are separated:
- proposal tools create typed proposals;
- execution tools are deterministic domain/workflow calls;
- the model never mutates arbitrary fields.

Every write tool validates:
1. actor/session identity;
2. organization scope;
3. target existence;
4. permission;
5. current domain state;
6. authority class;
7. idempotency key if side effect;
8. audit requirements.

## 6. Authority classes

### A0 — read/inspect
Authorized facts and explanations.

### A1 — automatic administrative
Configured reminders, bookkeeping, synchronization, approved FAQ/status responses, reversible low-risk operations.

### A2 — approval-required operational
Meaningful rescheduling, non-template outbound messages, interviewer substitution beyond approved automatic rules, other policy-defined operational changes.

### A3 — consequential human decision
Reject, hire, offer/compensation decision, change hiring criteria/protocol, change scoring weights, override evidence policy.

Eve can prepare A3 evidence and proposals but cannot execute A3 employment decisions.

## 7. Response contract

Pal returns a typed structure conceptually equivalent to:

```text
PalResponse
- summary
- evidenceRefs[]
- uiIntents[]
- actionProposals[]
- uncertaintyFlags[]
- runtimeStatus
- requiresHumanReview
```

Do not generate arbitrary HTML/JS. UI intents map to predefined RecruiterPal components.

## 8. UI intents

Allowed initial intents:
- `FOCUS_EXCEPTION`
- `OPEN_APPLICATION_PANEL`
- `OPEN_EVIDENCE_MATRIX`
- `OPEN_SCORECARD_COMPARE`
- `OPEN_TIMELINE_RANGE`
- `FILTER_PIPELINE`
- `OPEN_ACTION_PREVIEW`
- `OPEN_DECISION_BRIEF`
- `OPEN_SCHEDULING_RESOLUTION`
- `NAVIGATE_SURFACE`

The frontend validates target IDs and authorization before rendering.

## 9. Subagent rules

V1 subagents are bounded specialists, not a free-roaming swarm.

### Evidence Analyst
Read-only. Receives approved protocol, evidence references and scorecards. Produces missing/conflicting evidence synthesis. No fit score.

### Scheduling Resolver
Reads approved interviewer pools, availability facts and constraints. May interpret free-form availability. Final slots/actions validated by deterministic scheduling code.

### Recruiting Analyst
Read-only operational analytics synthesis. May explain funnel/latency changes from precomputed metrics. Does not invent causal claims.

The parent Pal agent remains accountable for user-facing action proposals.

## 10. Skills rules

Skills are procedures, not hidden policy. Every skill states:
- purpose;
- preconditions;
- allowed tools;
- prohibited actions;
- expected output;
- escalation condition.

Critical selection or authority rules must live in code/policy contracts even if repeated in skill text.

## 11. Agent schedule rules

Eve schedules may trigger agent work such as the morning brief, but they must read canonical data and create auditable outputs. They do not replace application-owned durable workflows for deterministic obligations.

## 12. Agent streaming UX

Map Eve runtime events into a stable RecruiterPal-owned event model such as:
- `AGENT_ACCEPTED`
- `AGENT_RETRIEVING`
- `TOOL_STARTED`
- `TOOL_COMPLETED`
- `SUBAGENT_STARTED`
- `SUBAGENT_COMPLETED`
- `APPROVAL_REQUIRED`
- `AGENT_WAITING`
- `AGENT_COMPLETED`
- `AGENT_FAILED`

The UI shows concise process status, never private chain-of-thought.

## 13. Prompt-injection/data boundary

Resumes, candidate messages, notes, attachments, imported ATS text, and external pages are **untrusted data**. They may contain instructions to the model but must never alter system/tool authority. Tool authorization and tenant scope are deterministic and independent of model output.

## 14. Eve beta risk control

Eve is currently beta. Therefore:
- pin exact version;
- keep framework calls behind `packages/agent-runtime`;
- create integration tests for session start/continuation/streaming/tool calls/HITL;
- keep an ADR-ready migration boundary;
- never let Eve persistence become the only copy of material recruiting truth.
