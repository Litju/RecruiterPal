# RecruiterPal Demo Seed and Golden Flows

**Authority:** RP-FREEZE-2026-08-24-v1.1

## Clean synthetic demo world

All demo data is newly generated for RecruiterPal. Do not derive or transform the PwC challenge dataset.

Create one synthetic organization: **Northstar Labs**.

Seed approximately:
- 1 recruiting lead
- 3 recruiters
- 6 hiring managers/interviewers
- 8 open/closing jobs
- 80–150 candidates
- 120–220 applications
- realistic stage histories across 60–90 days
- 30+ interviews
- scorecards with selected missing/conflicting cases
- candidate/stakeholder message threads
- pending approvals/obligations
- 12–20 current exceptions across severity levels

Use deterministic seeded generators so the same fixtures reproduce in CI.

## Must-have golden scenarios

### G1 — Competing offer
Sofia Martinez is in final-stage consideration for Senior ML Engineer. She states a competing offer deadline tomorrow. Evidence is largely complete but one material scorecard conflict exists. Pal must surface urgency without auto-hiring/advancing.

### G2 — Missing scorecard
An interviewer has not submitted a required scorecard after the configured SLA. Workflow sends a safe reminder, logs it, waits, and escalates if still absent.

### G3 — Scheduling capacity problem
Four Staff Backend candidates need panels but the primary pool has no feasible slots inside SLA. Pal/scheduling resolver identifies approved substitutes; action beyond automatic rules requires approval.

### G4 — Requirement drift
A Data Scientist job changed one must-have criterion eight days ago and screen conversion dropped. Analytics reports the temporal association and avoids claiming causality without evidence.

### G5 — Decision not ready
Interview stage says complete, but one required competency has no valid evidence source. UI must show `DECISION_NOT_READY` even though interviews are complete.

### G6 — Cross-tenant denial
A second small synthetic organization exists only for security tests. IDs from that tenant must be inaccessible to Northstar users and Pal tools.

### G7 — Safe automation summary
Today shows routine reminders/sync actions Pal/workflows completed while the recruiter was away, with audit drill-down.

## Demo narrative

A 90-second product demo should show:
1. Today prioritization;
2. one exception opened without navigation churn;
3. Pal command “why is this blocked?”;
4. evidence matrix focus via UI intent;
5. one safe automated reminder;
6. one approval-required action;
7. audit/activity proof;
8. one analytics signal;
9. keyboard command palette flow.

The demo must feel like a living recruiting cockpit, not a CRUD admin dashboard.
