# RecruiterPal UX/UI Constitution

**Authority:** RP-FREEZE-2026-08-24-v1.1 · Eve + OpenCode Go convergence

## Experience target

RecruiterPal must feel like a **living recruiting cockpit**, not a collection of ATS pages and not a chatbot attached to an admin dashboard.

The interface is:
- immersive without being theatrical;
- information-dense without becoming noisy;
- fast enough for all-day use;
- keyboard-first for experts;
- discoverable for occasional users;
- contextual and continuous;
- calm, premium, and professional.

## Foundational UX law

**Pal is the interaction layer, not a destination.**

The user should rarely need to restate context. If the user is viewing `Senior ML Engineer / Sofia Martinez`, the command “why is this blocked?” resolves against that context unless ambiguity remains.

## Spatial model

Desktop primary layout:

```text
┌────────────────────────────────────────────────────────────────────┐
│ Brand / Scope     Universal Search + Pal       Status / Profile    │
├──────────────┬───────────────────────────────────────┬─────────────┤
│              │                                       │             │
│ Primary      │         CURRENT WORKSPACE             │ Context /   │
│ navigation   │                                       │ Pal pane    │
│              │                                       │             │
├──────────────┴───────────────────────────────────────┴─────────────┤
│ Contextual Pal command / keyboard action surface                  │
└────────────────────────────────────────────────────────────────────┘
```

### Left rail
- persistent product navigation;
- compact, collapsible;
- role/job scope where useful;
- no nested maze deeper than needed.

### Main workspace
- current job/pipeline/candidate/interview/decision surface;
- supports contextual detail panel without forcing full navigation.

### Right contextual intelligence pane
- appears when context benefits from Pal/evidence/action preview;
- can collapse to preserve working width;
- never becomes permanent noisy chat history.

### Universal command surface
`⌘K` / `Ctrl+K` opens navigation + commands + Pal intent.

Examples:
- “roles at risk”
- “Sofia”
- “candidates waiting >48h”
- “reschedule this interview”
- “prepare tomorrow's hiring review”

## Today — flagship surface

Today is not a metrics dashboard. It is an ordered execution surface.

Required sections:
- greeting/context summary;
- Critical;
- Blocked;
- Decision Ready / Human Input Required;
- Pipeline Signals;
- “Handled by Pal” activity;
- upcoming interviews/deadlines when relevant.

Every exception card answers:
1. what happened;
2. why it matters;
3. what Pal already did;
4. what can happen next;
5. whether the user must decide.

No chart should displace a concrete action simply because dashboards traditionally contain charts.

## Context preservation

Opening a candidate from Pipeline should normally use a contextual panel or spatial transition. Closing returns the user exactly to prior filters, scroll position, and selection.

Full navigation is reserved for deep work where the object becomes the workspace.

## Pal response philosophy

Before rendering prose, ask whether a structured view is better.

Preferred Pal outputs:
- focus/highlight an exception;
- open evidence matrix;
- filter a pipeline;
- show scorecard comparison;
- open timeline range;
- preview action plan;
- show decision brief;
- render concise explanation next to evidence.

Disallowed pattern:
- long conversational essay when a UI state/action can communicate the answer.

## Agent execution visibility

Expose process state without revealing private chain-of-thought.

Example:

```text
Pal is resolving 4 scheduling conflicts
✓ Checked panel availability
✓ Identified qualified substitutions
○ Waiting for candidate availability
○ Calendar update pending
```

Valid statuses:
- Understanding
- Planning
- Executing
- Waiting
- Needs approval
- Blocked
- Complete
- Failed

The status shown must correspond to real backend workflow/action state.

## Approval UX

Approval cards are calm, specific, and evidence-linked.

Show:
- proposed action;
- why it is proposed;
- evidence/inputs;
- consequence;
- required authority;
- approve/reject/review actions.

Never use manipulative defaults or preselected consequential approvals.

## Keyboard-first interaction

Minimum shortcuts:

```text
⌘/Ctrl+K     universal command / Pal
G then T     Today
G then J     Jobs
G then P     Pipeline
G then I     Interviews
J / K        next / previous actionable item
E            evidence
M            message
S            schedule
Esc          close contextual layer / return
⌘/Ctrl+Enter execute/send when safe in current context
```

Shortcuts must be discoverable and configurable if conflicts arise.

## Motion

Motion communicates spatial/state continuity.

Guidance:
- 100–180 ms microinteractions;
- 180–300 ms workspace transitions;
- shared-layout transitions for contextual expansion;
- optimistic state where safe;
- no decorative bouncing, parallax, floating particles, or “AI orb” theatrics;
- all animations respect `prefers-reduced-motion`.

## Loading / latency UX

Avoid spinner walls.

Use:
- optimistic updates for reversible low-risk local state;
- skeletons only when content shape is predictable;
- streaming Pal output where useful;
- explicit workflow state for long-running actions;
- stale-data indicator when integration state is not current.

## Visual character

Target: **premium, dense, quiet**.

Do not make the product look cyberpunk or generically “AI”.

Characteristics:
- neutral canvas;
- crisp typography;
- subtle borders/elevation;
- restrained radii;
- semantic accent use;
- strong hierarchy through spacing/weight/contrast;
- Pal accent used only for agent intelligence/actions.

## Color semantics

Color must never be the sole carrier of meaning.

Semantic families:
- neutral — normal / informational structure;
- blue — active/selected/informational;
- amber — attention / due soon / uncertainty;
- red — critical / blocked / destructive;
- green — ready / resolved / succeeded;
- violet — Pal intelligence / agent-originated action.

Both light and dark themes must preserve semantic contrast.

## Typography

Use a highly legible UI grotesk such as Geist/Inter-class typography. Lock one family in implementation.

Requirements:
- tabular numerals for metrics/time;
- limited type scale;
- no giant marketing headings inside operational screens;
- line lengths suitable for dense reading;
- role/candidate names visually dominant over metadata.

## Tables and large sets

Use tables only when tables are the right model.

Representations:
- Pipeline: compact table or board depending on task;
- Candidate: workspace/detail panel;
- Evidence: matrix;
- History: timeline;
- Exceptions: prioritized feed;
- Interviews: queue + calendar;
- Analytics: charts/tables;
- Pal: contextual layer.

Large tables require virtualization and preserved filters/sorts.

## Mobile / responsive

V1 is desktop-first but responsive.

Tablet: usable for review/approval.  
Mobile: basic Today, approval, message, and candidate glance are usable; full pipeline operations may degrade gracefully. Native mobile is not V1.

## Accessibility

WCAG 2.2 AA target.

Required:
- complete keyboard navigation;
- visible focus;
- semantic landmarks/headings;
- screen-reader labels for icon actions;
- minimum target sizes;
- contrast validation;
- reduced-motion path;
- non-color status cues;
- error messages associated with fields;
- dialog/drawer focus trapping and return;
- no inaccessible drag-only pipeline operation.

## UX anti-patterns

Prohibited by default:
- modal for every edit;
- wizard for trivial actions;
- chat bubble as sole agent access;
- dashboard card grid with no priority model;
- hidden background automation;
- toast as the only record of important state;
- full-page reload feeling between related objects;
- uncontrolled infinite chat history occupying the workspace;
- giant tables as the default for every problem.

## UX acceptance test

A recruiter should be able to start from Today, identify the most important blocker, inspect evidence, approve or delegate the next action, and return to the exact prior context in under one minute without needing to understand the underlying technical architecture.
