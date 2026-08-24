# RecruiterPal Clean-Room and Provenance Contract

**Authority:** RP-FREEZE-2026-08-24-v1.1

## Historical relationship

RecruiterPal is an independent new project inspired by general recruiting problems explored during earlier work. It is not a fork, continuation branch, renamed repository, or derivative data package of the PwC challenge repository.

## Forbidden transfer

Do not copy from `recruiting_insight_engine`:
- source code;
- CSV/ZIP/PDF challenge data;
- challenge instructions;
- PwC-branded documents;
- master prompts/module-generator files;
- screenshots;
- commit history;
- README text representing PwC deliverables;
- logos/trademarks implying endorsement.

## Allowed knowledge transfer

General engineering lessons are allowed, for example:
- data quality should gate conclusions;
- recruiting analytics benefits from provenance;
- cohort/process analysis can be useful;
- APIs/UI should have explicit boundaries;
- model outputs require validation.

These ideas must be newly implemented under RecruiterPal's own contracts.

## Synthetic data

All committed demo data is generated from RecruiterPal-owned deterministic generators. Do not recreate the exact prior salary dataset under different names.

## Public positioning

Safe concise origin wording:

> RecruiterPal is an independent agent-driven recruiting workspace. The idea grew from broader recruiting analytics problems I had previously explored in a technical assessment, but RecruiterPal was designed and implemented from scratch with its own architecture, data model, synthetic demo data, and governance boundaries.

Do not claim PwC sponsorship, partnership, endorsement, or that RecruiterPal contains PwC technology/data.

## Automated provenance scan

CI/pre-push should scan for challenge-specific filenames/phrases and fail on suspicious artifacts pending review.
