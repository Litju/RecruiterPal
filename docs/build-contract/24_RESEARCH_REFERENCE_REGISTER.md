# RecruiterPal Research and Version Reference Register

**Freeze date:** 2026-08-24

This register records the public research basis used to freeze the architecture. It is not a substitute for reading current documentation during implementation when a dependency changed after the freeze.

## Recruiter workflow / market
- Aptitude Research — State of the Recruiter Experience (2026): recruiter overload, non-strategic work, integration fragmentation.
- Aptitude Research — AI adoption / agentic HR (2026): point automation vs decision support; integration/data barriers.
- Ashby Talent Trends / Recruiting Operations Benchmarks (2026): many small delays across review, scheduling, feedback and offers; scorecard disagreement/completion patterns.
- SHRM Recruiting Benchmarking (2026): recruiter requisition load and time-to-fill context.
- Greenhouse recruiting benchmarks/product research (2026): application-volume pressure and structured hiring/AI direction.

## Selection science / governance
- U.S. OPM job analysis and structured interview guidance.
- Sackett, Zhang, Berry & Lievens (2022) reanalysis of personnel selection validity estimates.
- EEOC algorithmic selection/discrimination guidance.
- NYC Local Law 144 AEDT requirements.
- EU AI Act employment/high-risk trajectory and transparency/oversight requirements.

## Eve
- Vercel `vercel/eve` repository and `eve.dev` documentation.
- Eve described as filesystem-first durable AI agent framework with tools, skills, channels, schedules, durable execution, HITL, subagents and evals.
- Eve is beta at freeze date; adapter boundary is mandatory.
- Verified user-project baseline in ShoppingPal: `eve@0.44.3` with OpenCode Go via AI SDK OpenAI Responses adapter.

## OpenCode Go
Verified topology from the user's ShoppingPal project:
- `OPENCODE_GO_API_KEY`
- `https://opencode.ai/zen/go/v1`
- OpenAI Responses-compatible adapter through `@ai-sdk/openai`
- `gpt-5.6-luna` qualified at the time of that release.

## Vercel Workflow
Vercel Workflows / Workflow SDK provides durable/resumable TypeScript execution with workflow/step directives, retries, waits and observability. Chosen over Temporal for V1 to reduce infrastructure and language/runtime duplication.

## Frontend/data stack
- Next.js 16.3-class + React 19.2-class
- Tailwind CSS 4.3-class
- PostgreSQL 18.x
- Neon
- Drizzle ORM
- shadcn/ui
- Motion

## Version-sensitive warning
At freeze time Vercel/Next.js had announced a security patch scheduled for 2026-08-26. The implementation agent must verify and apply the patched release before any public production claim.
