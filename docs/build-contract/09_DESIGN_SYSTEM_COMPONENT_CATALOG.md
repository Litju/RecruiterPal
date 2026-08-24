# RecruiterPal Design System and Component Catalog

**Authority:** RP-FREEZE-2026-08-24-v1.1 · Eve + OpenCode Go convergence

## Design-system objective

Create a proprietary-looking operational UI using open, composable primitives. shadcn/ui + Base UI provide accessibility primitives; RecruiterPal owns the final visual and interaction layer.

## Theme tokens

Implementation should expose CSS variables/tokens for both light and dark themes.

### Core palette intent

Light:
- canvas: warm-neutral near-white;
- surface-1: white/near-white;
- surface-2: subtle neutral tint;
- text-primary: near-black graphite;
- text-secondary: muted graphite;
- border: low-contrast neutral;

Dark:
- canvas: deep graphite, not pure black;
- surface-1: elevated charcoal;
- surface-2: slightly lighter charcoal;
- text-primary: near-white;
- text-secondary: cool muted gray;

### Brand/Pal accent
A restrained violet family. Use for:
- Pal icon/state;
- agent-originated annotations;
- command focus;
- approved “Pal handled” markers.

Do not use violet for generic buttons simply to make the app look AI-themed.

### Semantic tokens
- info
- warning
- danger
- success
- attention
- selected
- focus-ring
- disabled

Each has foreground/background/border variants.

## Spacing

Use a 4px base grid with common steps:
`4, 8, 12, 16, 20, 24, 32, 40, 48`.

Operational density modes may use compact spacing, but never below accessible hit targets for interactive controls.

## Radius

Restrained:
- small control: 6–8px;
- card/panel: 10–14px;
- large overlay: 14–18px.

Avoid pill shapes unless semantic (status, tag) or compact control.

## Elevation

Prefer borders + subtle tonal separation. Use shadows sparingly for floating command surface, drawers, popovers, and drag state.

## Iconography

Use one consistent icon set. Icons never replace text when meaning is ambiguous. Pal has a distinct but minimal mark.

## Core primitive components

- Button
- IconButton
- LinkButton
- Input
- Textarea
- Select
- Combobox
- MultiSelect
- Checkbox
- RadioGroup
- Switch
- Slider where justified
- DatePicker
- TimePicker
- Popover
- Tooltip
- DropdownMenu
- ContextMenu
- CommandPalette
- Tabs
- SegmentedControl
- Accordion
- Collapsible
- Dialog
- Drawer
- Sheet
- Toast
- InlineNotice
- EmptyState
- Skeleton
- Spinner (limited use)
- Avatar
- Badge
- StatusBadge
- Tag
- Progress
- Divider
- ScrollArea
- DataTable
- VirtualList
- Timeline

## Layout components

- AppShell
- GlobalHeader
- PrimaryNav
- WorkspaceHeader
- WorkspaceSplitPane
- ContextPanel
- PalRail
- CommandDock
- ResponsiveDrawerNav
- FilterBar
- BulkActionBar
- StickyActionFooter

## Today components

### TodayHeader
Displays date, portfolio counts, role scope, and compact freshness status.

### ExceptionSection
Groups by priority and type without hiding the global order.

### ExceptionCard
Required fields:
- severity;
- object/job/candidate context;
- concise event statement;
- why it matters;
- SLA/deadline if relevant;
- Pal action status;
- primary next action;
- secondary inspect action.

### PalCompletedList
Shows completed automatic actions with timestamp and inspect link.

### PipelineSignalCard
Shows deterministic or ML signal, baseline/previous comparison, confidence/uncertainty when applicable, and investigation action.

### UpcomingCommitments
Interviews, candidate deadlines, debriefs, approvals.

## Job components

- JobSummaryHeader
- JobHealthStrip
- JobStakeholderList
- HiringProtocolSummary
- ProtocolVersionBadge
- ProtocolChangeBanner
- PipelineFunnel
- RoleSLAConfig
- JobActivityTimeline
- JobRiskPanel

## Pipeline components

- PipelineTable
- PipelineBoard
- StageColumn
- ApplicationRow
- CandidateCompactCard
- StageSLAIndicator
- EvidenceCompletenessIndicator
- CandidateDeadlineIndicator
- FilterBuilder
- SavedViewSelector
- BulkSelectionBar

Drag-and-drop cannot be the only stage-change mechanism. Stage changes invoke deterministic transition validation and approval policy.

## Candidate/application components

- CandidateContextPanel
- CandidateHeader
- ApplicationStatusHeader
- CandidateTimeline
- ResumeDocumentViewer
- ApplicationFacts
- CandidateDeadlineBanner
- CommunicationSummary
- ApplicationNextAction
- RelatedApplications

## Evidence / decision components

### EvidenceMatrix
Rows = competencies/requirements.  
Columns = required, source, evidence status, rating(s), conflict, protocol version.

### EvidenceObservationCard
Shows source, observation, rater, anchor, artifact, provenance.

### ScorecardCompare
Side-by-side / aligned competency comparison; highlights material threshold-crossing disagreements.

### DecisionReadinessPanel
Shows readiness state and deterministic reasons. Does not show candidate fit score.

### DecisionBrief
Concise evidence-based summary with:
- complete evidence;
- missing evidence;
- conflicts;
- approvals;
- next human decision.

### ProtocolMismatchBanner
Explicit when evidence/scorecard came from stale protocol version.

## Interview components

- InterviewQueue
- InterviewCalendar
- InterviewCard
- InterviewPanel
- InterviewerChip
- QualifiedSubstitutionList
- AvailabilityGrid
- SchedulingConflictCard
- ScorecardCompletionStrip
- InterviewKit

## Inbox components

- ThreadList
- ThreadView
- MessageComposer
- PalDraftControl
- DetectedFactChip
- CandidateDeadlineDetection
- PolicyEscalationBanner
- SuggestedActionBar

## Pal components

### PalCommandPalette
Search + action + natural-language entry.

### PalContextBar
Shows what Pal is currently scoped to: organization/job/application/etc.

### PalResponseCard
Supports concise text + evidence refs + UI actions.

### PalExecutionCard
Shows actual workflow/action progress.

### PalActionPreview
Displays proposed side effect and authority.

### PalApprovalCard
Human approval surface.

### PalEvidenceCitation
Internal object reference; opens exact evidence/source.

### PalUncertaintyNotice
States missing/ambiguous data without overclaiming.

### FullScreenPalMode
Task-oriented execution workspace for portfolio-level goals.

## Analytics components

- MetricCard (limited use)
- TimeSeriesChart
- DistributionChart
- FunnelChart
- SLAHeatmap
- CapacityChart
- InterviewerAgreementTable
- StageDurationTable
- SignalExplanationPanel
- DataFreshnessIndicator
- ModelVersionBadge
- UncertaintyInterval

Charts use accessible palette and are never used when a table/action list communicates more directly.

## Audit components

- AuditTimeline
- AuditRecordDrawer
- ActionProvenanceTree
- ApprovalHistory
- IntegrationSyncStatus
- ModelTraceLink (admin only; engineering metadata, not hidden reasoning)

## Settings components

- OrganizationProfile
- TeamMemberTable
- RolePermissionEditor
- AutomationPolicyEditor
- SLAEditor
- IntegrationCard
- OAuthConnectionFlow
- RetentionPolicyEditor
- NotificationPreferenceEditor

## Interaction states

Every interactive component defines:
- default
- hover
- focus-visible
- active
- loading
- disabled
- error
- success where appropriate

Every async action defines optimistic vs confirmed behavior explicitly.

## Component documentation

Use Storybook or an equivalent lightweight component catalog only if it materially helps development; otherwise maintain examples/tests in `packages/ui`. Regardless, every feature component must have interaction tests for critical states.
