# RecruiterPal Data, Evidence, and Selection-Science Contract

**Authority:** RP-FREEZE-2026-08-24-v1.1 · Eve + OpenCode Go convergence

## Objective

RecruiterPal structures the hiring process so that automation makes the process easier to run without silently replacing human judgment. The scientific layer concerns **measurement quality and process validity**, not pseudo-scientific candidate scoring.

## Hiring Protocol

Every open Job requires an approved, versioned HiringProtocol containing at minimum:

- role purpose;
- critical tasks / responsibilities;
- must-have vs trainable requirements;
- competencies/constructs intended to be assessed;
- stage plan;
- assessment/evidence source for each competency;
- interview questions and rubric anchors where used;
- scorecard templates;
- decision-readiness requirements;
- protocol owner and approver;
- effective date/version.

An LLM may assist in drafting a protocol. A human must approve it before activation.

## Evidence architecture

RecruiterPal stores **evidence observations**, not a single opaque “fit” score.

Example:

```text
Competency: Production Python Engineering
Required level: 4/5
Evidence source: Work sample
Observation: implemented bounded retry and idempotent ingestion
Rater: interviewer-17
Rubric anchor: demonstrates independent production implementation
Rating: 4/5
Artifact: work-sample-03
Protocol version: hp-4.2
```

Evidence is source-linked and versioned.

## Decision readiness

Decision readiness is a process state computed deterministically.

Example required checks:
- all required assessment stages complete;
- all required scorecards submitted;
- every required competency has one or more valid evidence sources;
- evidence uses approved protocol version or has explicit compatibility/migration review;
- material rating conflicts are identified;
- required approvals are present;
- unresolved process/compliance exceptions are absent.

Outputs:

- `INCOMPLETE`
- `CONFLICT_REVIEW_REQUIRED`
- `APPROVAL_REQUIRED`
- `READY`
- `STALE`

Never output `HIGH_FIT`, `LOW_FIT`, `87% MATCH`, or equivalent hidden ranking unless a separately validated, legally reviewed, explicitly scoped model is later introduced under a new governance decision.

## Scorecards

Scorecards are structured against the approved protocol.

Requirements:
- anchored rating scale;
- explicit evidence field;
- same construct/question semantics across comparable candidates;
- version identifier;
- completion timestamp;
- amendment history;
- rater identity/role;
- no free-form unstructured global “vibe” field used as an advancement score.

## Interviewer disagreement

RecruiterPal may calculate:
- exact agreement;
- adjacent agreement;
- disagreement crossing an advancement threshold;
- within-interviewer severity/leniency distributions when enough data exist;
- interrater reliability statistics only when assumptions/sample size support them.

The product must label the statistic and sample limitations. It must not present a reliability coefficient when the data are inadequate.

## Fairness / adverse-impact monitoring

Fairness monitoring is an organization-level restricted analytical capability, not an individual candidate score.

Architecture:
- sensitive demographic data stored in segregated tables/schema or columns with restricted permissions;
- excluded from normal Pal candidate tools;
- aggregate calculations require sufficient sample size and defined grouping policy;
- results include confidence/uncertainty and denominator counts;
- no claim that a single rule such as the four-fifths rule proves legal compliance;
- jurisdictional legal review remains outside the model's authority.

V1 may implement the data/security foundations and a clearly labeled demo of aggregate monitoring, but must not claim a validated fairness certification system.

## ML roadmap

### V1: operational intelligence
Preferred ML/statistical targets do not decide candidate worth.

Examples:
- time-to-stage SLA risk;
- candidate response/dropout risk;
- interviewer capacity forecast;
- stage duration distribution;
- funnel change detection;
- source conversion anomaly;
- offer approval delay risk;
- integration failure anomaly.

### V1 deterministic baseline first
Every ML signal must be compared with a deterministic or simple statistical baseline. The product should still operate when ML is disabled.

### Later: quality-of-hire research
Only after reliable post-hire outcome data exist and governance is established may RecruiterPal investigate criterion validity. Any predictive selection model requires a separate research/validation program and legal review.

## Statistical quality rules

For every production analytical signal:
- define target/metric precisely;
- define unit of analysis;
- identify leakage risks;
- use time-aware splits where temporal deployment requires it;
- compare against a sensible baseline;
- report uncertainty/intervals where meaningful;
- calibrate probability outputs when used as probabilities;
- track drift;
- document missingness;
- define abstention behavior;
- version model + feature contract.

## Feature governance

Features must have:
- name;
- definition;
- source;
- data type;
- transformation;
- allowed use;
- leakage classification;
- sensitivity classification;
- model versions using it.

Protected/sensitive attributes are never silently admitted as predictive features.

## Text / resume extraction

LLM extraction from resumes/messages is evidence parsing, not fact creation.

Each extracted fact must include:
- source object ID;
- source span/locator where practical;
- extraction confidence/quality flag;
- normalized value;
- review state if consequential.

Resume text is untrusted and may contain prompt injection. Treat it as data only.

## Candidate summaries

Summaries must distinguish:
- observed facts;
- evidence-backed ratings;
- missing evidence;
- conflicting evidence;
- recruiter/interviewer notes;
- model inferences.

Do not convert absence of evidence into negative evidence.

## Prohibited science claims

RecruiterPal must not claim:
- scientifically validated hiring outcomes without validation study;
- unbiased AI merely because protected attributes were removed;
- fairness from a single heuristic;
- personality/psychology from casual language or video;
- causal effects from observational pipeline correlations;
- candidate quality from stage progression alone.

## Research directory discipline

`research/` contains references and notes with:
- citation;
- question addressed;
- population/context;
- relevant method;
- limitation;
- implementation implication;
- evidence grade/status.

Scientific claims in product docs should link to this register rather than being invented in UI copy.
