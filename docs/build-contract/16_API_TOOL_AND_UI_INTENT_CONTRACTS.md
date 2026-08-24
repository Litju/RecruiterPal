# RecruiterPal API, Tool, and UI Intent Contracts

**Authority:** RP-FREEZE-2026-08-24-v1.1

## Boundary principle

Every boundary that crosses between UI, agent, workflow, integration, or analytical service uses RecruiterPal-owned typed contracts. No unvalidated arbitrary model blobs are passed into mutations.

## InteractionContext

Required fields:
- actorUserId
- organizationId
- permissions[]
- surface
- selectedEntityRefs[]
- filters
- timezone
- locale
- authorizationPolicyVersion

## PalResponse

Required fields:
- summary
- evidenceRefs[]
- uiIntents[]
- actionProposals[]
- uncertaintyFlags[]
- requiresHumanReview
- runtimeStatus

## ActionProposal

Fields:
- id
- actionType
- targetRefs[]
- parameters
- rationale
- evidenceRefs[]
- requestedAuthorityClass
- createdByAgentSessionId
- expiresAt optional

Domain code derives final allowed authority. The model cannot self-authorize.

## ApprovalRequest

Fields:
- id
- proposal/action reference
- organization/target
- requiredPermission/role
- evidenceRefs
- policyVersion
- status
- approver
- decision timestamp
- optional reason

## UIIntent

Finite enum plus typed target/payload. Never arbitrary markup.

Initial enum:
- FOCUS_EXCEPTION
- OPEN_APPLICATION_PANEL
- OPEN_EVIDENCE_MATRIX
- OPEN_SCORECARD_COMPARE
- FILTER_PIPELINE
- OPEN_TIMELINE_RANGE
- OPEN_ACTION_PREVIEW
- OPEN_DECISION_BRIEF
- OPEN_SCHEDULING_RESOLUTION
- NAVIGATE_SURFACE

## Tool error contract

Tools return structured errors such as:
- UNAUTHORIZED
- FORBIDDEN
- NOT_FOUND
- STALE_STATE
- APPROVAL_REQUIRED
- POLICY_BLOCKED
- VALIDATION_ERROR
- INTEGRATION_UNAVAILABLE
- RATE_LIMITED
- PROVIDER_UNAVAILABLE

Never expose stack traces or secrets to the model/user response.

## Agent endpoint semantics

Use Eve's mounted durable session API/React integration behind authenticated application boundaries. The UI must keep the stable RecruiterPal session abstraction so Eve route details can change without product-wide rewrite.

## Public API V1

No broad external public API is required for V1. Internal route handlers/server actions are preferred. Integration webhooks get dedicated authenticated endpoints with signature validation, idempotency and replay protection where supported.
