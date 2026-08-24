# RecruiterPal Deployment and Environments

**Authority:** RP-FREEZE-2026-08-24-v1.1

## Environments

### Local
- Next.js local server
- local/test PostgreSQL (Docker or equivalent) for integration tests; Neon dev branch optional
- Eve mounted into the app
- OpenCode Go only when `OPENCODE_GO_API_KEY` exists
- deterministic fake/provider fixtures for tests

### Preview
- Vercel preview deployment
- isolated Neon branch/schema with synthetic data only
- preview-specific Better Auth secrets
- OpenCode Go encrypted secret if live Pal is required
- no production candidate PII

### Production
- Vercel app + Workflows
- Neon production database
- encrypted secrets
- custom domain/HTTPS
- backups/PITR according to Neon plan
- monitoring/error alerts
- release only from protected main/release flow

## Secret inventory

Never commit values for:
- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `OPENCODE_GO_API_KEY`
- OAuth client secrets
- email/calendar integration credentials
- webhook signing secrets
- Sentry auth tokens

`.env.example` contains names and safe placeholders only.

## OpenCode Go

Provider contract:
- endpoint: `https://opencode.ai/zen/go/v1`
- protocol: OpenAI Responses-compatible
- environment variable: `OPENCODE_GO_API_KEY`
- initial model: `gpt-5.6-luna`

Startup/runtime must fail clearly when a live agent route requires credentials and they are absent. The rest of the deterministic product may remain available in a clearly labeled demo/degraded mode.

## Next.js security release gate

At freeze time, a critical Next.js security patch was scheduled for 2026-08-26. Public production must not ship on a known affected version. If the patch is unavailable at execution time, ship local qualification and controlled preview only, mark production `BLOCKED_NEXT_SECURITY_PATCH`, then apply the patch and re-run all gates when available.

## Database branching

Preview environments should use isolated Neon branches where practical. Never copy real candidate PII into preview merely for convenience.

## Release smoke

Hosted smoke must verify:
1. app loads;
2. auth works;
3. Today seed/production state loads;
4. authorized domain mutation works;
5. workflow starts/completes;
6. Eve session starts/streams/continues;
7. OpenCode Go model turn works when configured;
8. safe tool call works;
9. approval boundary works;
10. cross-tenant read fails;
11. no secrets in client bundle/log output.

## Deployment truth rule

Never claim a hosted/live capability that was not actually exercised. External provider unavailability is a blocker/limitation, not a reason to fabricate a pass.
