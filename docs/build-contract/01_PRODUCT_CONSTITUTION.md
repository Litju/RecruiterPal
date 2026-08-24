# RecruiterPal Product Constitution

**Authority:** RP-FREEZE-2026-08-24-v1.1 · Eve + OpenCode Go convergence

## Mission

RecruiterPal turns recruiting from a fragmented queue of manual coordination tasks into a continuously observed, evidence-aware execution system.

## Primary user problem

Recruiters operate many asynchronous hiring processes at once. Each process contains candidates, hiring managers, interviewers, calendars, messages, scorecards, approvals, changing requirements, and deadlines. Point solutions can accelerate individual tasks, but the recruiter remains responsible for maintaining the global control loop.

RecruiterPal owns that control loop while preserving human authority.

## Product promise

**Automate the administrative work. Structure the judgment. Preserve the evidence. Measure whether the hiring process works.**

## Product identity

RecruiterPal is:

- a recruiter workspace;
- an execution/orchestration system;
- an evidence and decision-readiness system;
- an analytical/ML system;
- an agent-driven interaction model.

RecruiterPal is not:

- a fully autonomous hiring decision-maker;
- a black-box candidate ranker;
- a resume keyword scorer;
- a generic chatbot;
- a replacement for all ATS products in V1;
- a surveillance product.

## Constitutional principles

### P1 — Deterministic first
If a task can be done deterministically, it must be implemented deterministically. LLMs are reserved for interpretation, synthesis, planning under ambiguity, and natural-language interaction.

### P2 — Business state is explicit
Every application, interview, scorecard, approval, exception, action, and workflow has typed state. No material business state exists only inside an LLM conversation.

### P3 — Human authority for consequential employment decisions
Pal may summarize, diagnose, recommend, and prepare evidence. It may not autonomously hire, reject, materially downgrade, or alter an approved selection protocol.

### P4 — Evidence before recommendation
Any consequential recommendation must identify the evidence and protocol basis supporting it. Unsupported “fit” language is prohibited.

### P5 — Process readiness is not candidate quality
`DecisionReadiness` measures whether the process has sufficient required evidence and approvals to make a decision. It is not a hidden candidate score.

### P6 — Protected attributes are not scoring features
Sensitive/protected demographic information, when legally and operationally appropriate to collect, is segregated for restricted aggregate monitoring and is not used as an input to candidate advancement or compensation recommendation logic.

### P7 — No pseudo-scientific inference
Prohibited: facial-expression scoring, emotion detection, attractiveness scoring, accent scoring, culture-fit inference from appearance, arbitrary personality inference from language, or fabricated psychometric scores.

### P8 — Provenance is mandatory
Every material automated action and recommendation must be attributable to actor, tenant, workflow, tool/action, input evidence, policy/authority, timestamp, and outcome.

### P9 — Automation is asymmetric
Automation authority depends on consequence. Administrative side effects can be automatic under policy; consequential decisions require approval.

### P10 — Pal is ambient
Pal must inherit workspace context and manipulate structured product views rather than forcing users into a separate chatbot context.

### P11 — Exceptions over raw workload
The home experience prioritizes deviations, blockers, risk, missing evidence, conflicts, and decisions rather than showing undifferentiated lists.

### P12 — Accessibility is part of quality
WCAG 2.2 AA minimum. Keyboard navigation, reduced motion, focus visibility, semantic color redundancy, and screen-reader semantics are release criteria.

### P13 — Security boundaries are deterministic
Authorization, tenancy, RLS, permissions, and side-effect approval are validated in code before every tool execution.

### P14 — No direct LLM database access
LLMs interact through typed tools with domain authorization and validation. They never receive DB credentials and never execute arbitrary production SQL.

### P15 — Build for inspection
Workflow state, tool calls, model outputs, approvals, retries, and errors must be inspectable without exposing private chain-of-thought.

## Product values translated to UI

- **Calm:** dense but not noisy.
- **Fast:** keyboard-first, low navigation cost, optimistic interaction.
- **Contextual:** Pal already knows where the user is.
- **Explainable:** evidence and reasons are visually adjacent to actions.
- **Alive:** state transitions appear immediately and continuously.
- **Trustworthy:** automation state and authority are visible.

## Prohibited implementation shortcuts

- LLM-generated SQL against production.
- LLM-owned application state.
- hidden automatic rejection.
- candidate “87% fit” scores.
- unversioned scorecards or hiring protocols.
- side effects from model text without typed action contracts.
- mixing tenant data in shared queries without enforced organization scope.
- building five autonomous agents before one Pal control loop works.
- introducing Kafka, Kubernetes, Elasticsearch, or an external vector DB without measured need.

## Definition of the V1 wedge

V1 centers on the `Today` control surface and the Recruiting State + Exception Engine. A recruiter must be able to:

1. see active roles and applications;
2. see what changed and what is blocked;
3. see overdue and missing stakeholder actions;
4. see required evidence and decision readiness;
5. let Pal execute approved low-risk actions;
6. approve consequential workflow actions;
7. inspect the audit trail;
8. ask contextual questions in natural language;
9. verify that the product never bypasses authority or evidence rules.
