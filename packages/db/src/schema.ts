/**
 * RecruiterPal canonical schema (Drizzle / PostgreSQL).
 *
 * Rules enforced structurally:
 * - every tenant-owned table carries organization_id;
 * - protocol versions are immutable (append-only, no update path in code);
 * - stage history is append-only;
 * - audit/domain events are append-only;
 * - protected demographic data lives in a segregated table never joined by
 *   candidate-advancement code paths.
 */
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

// ---------------------------------------------------------------------------
// Tenancy / identity (Better Auth aligned)
// ---------------------------------------------------------------------------

export const organizations = pgTable("organizations", {
  id: id(),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  automationPolicyVersion: varchar("automation_policy_version", { length: 60 })
    .notNull()
    .default("ap-1.0.0"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const users = pgTable("users", {
  id: id(),
  name: varchar("name", { length: 200 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const sessions = pgTable("sessions", {
  id: id(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: varchar("ip_address", { length: 64 }),
  userAgent: text("user_agent"),
  activeOrganizationId: uuid("active_organization_id"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const accounts = pgTable("accounts", {
  id: id(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  issuer: varchar("issuer", { length: 255 }).notNull().default("local:credential"),
  providerId: varchar("provider_id", { length: 100 }).notNull(),
  accountId: varchar("account_id", { length: 255 }).notNull(),
  password: text("password_hash"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const verifications = pgTable("verifications", {
  id: id(),
  identifier: varchar("identifier", { length: 320 }).notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Organization membership with role. Roles: owner|admin|recruiter|hiring_manager|interviewer */
export const memberships = pgTable(
  "memberships",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 40 }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("memberships_org_user_idx").on(t.organizationId, t.userId),
    index("memberships_user_idx").on(t.userId),
  ],
);

// ---------------------------------------------------------------------------
// Recruiting
// ---------------------------------------------------------------------------

export const jobs = pgTable(
  "jobs",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    department: varchar("department", { length: 120 }),
    locationMode: varchar("location_mode", { length: 40 }).notNull().default("REMOTE"),
    employmentType: varchar("employment_type", { length: 40 }).notNull().default("FULL_TIME"),
    /** DRAFT|PENDING_APPROVAL|OPEN|ON_HOLD|CLOSED_FILLED|CLOSED_CANCELLED */
    status: varchar("status", { length: 40 }).notNull().default("DRAFT"),
    ownerRecruiterId: uuid("owner_recruiter_id").references(() => users.id),
    hiringManagerId: uuid("hiring_manager_id").references(() => users.id),
    activeProtocolVersionId: uuid("active_protocol_version_id"),
    openedAt: timestamp("opened_at", { withTimezone: true }),
    targetFillDate: timestamp("target_fill_date", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("jobs_org_status_idx").on(t.organizationId, t.status),
    index("jobs_org_owner_idx").on(t.organizationId, t.ownerRecruiterId),
  ],
);

export const hiringProtocols = pgTable(
  "hiring_protocols",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [index("hiring_protocols_job_idx").on(t.jobId)],
);

/** Immutable approved protocol versions. Never mutated in place. */
export const hiringProtocolVersions = pgTable(
  "hiring_protocol_versions",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    protocolId: uuid("protocol_id")
      .notNull()
      .references(() => hiringProtocols.id, { onDelete: "cascade" }),
    versionLabel: varchar("version_label", { length: 40 }).notNull(),
    status: varchar("status", { length: 40 }).notNull().default("DRAFT"), // DRAFT|APPROVED
    rolePurpose: text("role_purpose"),
    criticalTasks: jsonb("critical_tasks").$type<string[]>().notNull().default([]),
    mustHaveRequirements: jsonb("must_have_requirements").$type<string[]>().notNull().default([]),
    trainableRequirements: jsonb("trainable_requirements").$type<string[]>().notNull().default([]),
    /** Ordered stage names for this protocol's stage graph. */
    stages: jsonb("stages").$type<{ name: string; required: boolean }[]>().notNull().default([]),
    decisionReadinessRulesetVersion: varchar("decision_readiness_ruleset_version", { length: 60 })
      .notNull()
      .default("drr-1.0.0"),
    approvedByUserId: uuid("approved_by_user_id").references(() => users.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    effectiveAt: timestamp("effective_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("protocol_versions_unique_label_idx").on(t.protocolId, t.versionLabel),
    index("protocol_versions_org_idx").on(t.organizationId),
  ],
);

export const competencies = pgTable(
  "competencies",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    description: text("description"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("competencies_org_name_idx").on(t.organizationId, t.name)],
);

export const protocolCompetencies = pgTable(
  "protocol_competencies",
  {
    protocolVersionId: uuid("protocol_version_id")
      .notNull()
      .references(() => hiringProtocolVersions.id, { onDelete: "cascade" }),
    competencyId: uuid("competency_id")
      .notNull()
      .references(() => competencies.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    requiredLevel: integer("required_level").notNull().default(3),
    evidenceSource: varchar("evidence_source", { length: 80 })
      .notNull()
      .default("INTERVIEW_SCORECARD"),
    isRequired: boolean("is_required").notNull().default(true),
  },
  (t) => [
    primaryKey({ columns: [t.protocolVersionId, t.competencyId] }),
    index("protocol_competencies_org_idx").on(t.organizationId),
  ],
);

export const candidates = pgTable(
  "candidates",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    firstName: varchar("first_name", { length: 120 }).notNull(),
    lastName: varchar("last_name", { length: 120 }).notNull(),
    email: varchar("email", { length: 320 }),
    headline: varchar("headline", { length: 240 }),
    source: varchar("source", { length: 80 }),
    /** FTS vector maintained by trigger/expression index. */
    searchText: text("search_text"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("candidates_org_name_idx").on(t.organizationId),
    index("candidates_org_created_idx").on(t.organizationId, t.createdAt),
  ],
);

export const applications = pgTable(
  "applications",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    /** ACTIVE|WITHDRAWN|REJECTED|HIRED|CANCELLED */
    status: varchar("status", { length: 40 }).notNull().default("ACTIVE"),
    currentStage: varchar("current_stage", { length: 80 }).notNull().default("APPLIED"),
    source: varchar("source", { length: 80 }),
    ownerRecruiterId: uuid("owner_recruiter_id").references(() => users.id),
    protocolVersionId: uuid("protocol_version_id")
      .notNull()
      .references(() => hiringProtocolVersions.id),
    appliedAt: timestamp("applied_at", { withTimezone: true }).notNull().defaultNow(),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull().defaultNow(),
    nextExpectedActionAt: timestamp("next_expected_action_at", { withTimezone: true }),
    candidateDeadlineAt: timestamp("candidate_deadline_at", { withTimezone: true }),
    deadlineVerified: varchar("deadline_verified", { length: 20 }), // UNVERIFIED|CONFIRMED
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("applications_org_job_status_idx").on(t.organizationId, t.jobId, t.status),
    index("applications_org_stage_idx").on(t.organizationId, t.currentStage),
    index("applications_candidate_idx").on(t.candidateId),
    uniqueIndex("applications_job_candidate_uniq_idx").on(t.jobId, t.candidateId),
  ],
);

/** Append-only stage transition history. */
export const applicationStageEvents = pgTable(
  "application_stage_events",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    fromStage: varchar("from_stage", { length: 80 }),
    toStage: varchar("to_stage", { length: 80 }).notNull(),
    reason: text("reason"),
    actorType: varchar("actor_type", { length: 20 }).notNull(), // HUMAN|AGENT|WORKFLOW|INTEGRATION
    actorUserId: uuid("actor_user_id").references(() => users.id),
    humanAuthorityRecordRef: uuid("human_authority_record_ref"),
    protocolVersionId: uuid("protocol_version_id").references(() => hiringProtocolVersions.id),
    occurredAt: createdAt(),
  },
  (t) => [index("stage_events_application_idx").on(t.applicationId, t.occurredAt)],
);

/** Explicit pending obligations — no hidden queues. */
export const applicationObligations = pgTable(
  "application_obligations",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    applicationId: uuid("application_id").references(() => applications.id, {
      onDelete: "cascade",
    }),
    interviewId: uuid("interview_id"),
    obligationType: varchar("obligation_type", { length: 80 }).notNull(), // SCORECARD_SUBMISSION|CANDIDATE_RESPONSE|HM_REVIEW|...
    responsibleUserId: uuid("responsible_user_id").references(() => users.id),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    state: varchar("state", { length: 30 }).notNull().default("PENDING"), // PENDING|SATISFIED|ESCALATED|CANCELLED
    satisfiedAt: timestamp("satisfied_at", { withTimezone: true }),
    workflowRef: varchar("workflow_ref", { length: 255 }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("obligations_org_state_due_idx").on(t.organizationId, t.state, t.dueAt),
    index("obligations_responsible_idx").on(t.responsibleUserId, t.dueAt),
  ],
);

// ---------------------------------------------------------------------------
// Interviews / evidence
// ---------------------------------------------------------------------------

export const interviews = pgTable(
  "interviews",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 160 }).notNull(),
    /** PLANNED|AWAITING_AVAILABILITY|SCHEDULED|RESCHEDULE_REQUIRED|COMPLETED|CANCELLED|NO_SHOW */
    status: varchar("status", { length: 40 }).notNull().default("PLANNED"),
    scheduledStartAt: timestamp("scheduled_start_at", { withTimezone: true }),
    scheduledEndAt: timestamp("scheduled_end_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    requiresScorecardsFrom: integer("requires_scorecards_from").notNull().default(1),
    protocolVersionId: uuid("protocol_version_id")
      .notNull()
      .references(() => hiringProtocolVersions.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("interviews_org_status_idx").on(t.organizationId, t.status),
    index("interviews_application_idx").on(t.applicationId),
    index("interviews_start_idx").on(t.scheduledStartAt),
  ],
);

export const interviewParticipants = pgTable(
  "interview_participants",
  {
    interviewId: uuid("interview_id")
      .notNull()
      .references(() => interviews.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 40 }).notNull().default("INTERVIEWER"),
    required: boolean("required").notNull().default(true),
    declined: boolean("declined").notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.interviewId, t.userId] })],
);

export const scorecardTemplates = pgTable(
  "scorecard_templates",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    protocolVersionId: uuid("protocol_version_id")
      .notNull()
      .references(() => hiringProtocolVersions.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    rubricAnchors: jsonb("rubric_anchors").$type<Record<string, string>>().notNull().default({}),
    competencyIds: jsonb("competency_ids").$type<string[]>().notNull().default([]),
    createdAt: createdAt(),
  },
  (t) => [index("scorecard_templates_protocol_idx").on(t.protocolVersionId)],
);

export const scorecards = pgTable(
  "scorecards",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    interviewId: uuid("interview_id")
      .notNull()
      .references(() => interviews.id, { onDelete: "cascade" }),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    templateId: uuid("template_id")
      .notNull()
      .references(() => scorecardTemplates.id),
    raterUserId: uuid("rater_user_id")
      .notNull()
      .references(() => users.id),
    protocolVersionId: uuid("protocol_version_id")
      .notNull()
      .references(() => hiringProtocolVersions.id),
    /** NOT_OPEN|OPEN|SUBMITTED|AMENDED */
    status: varchar("status", { length: 20 }).notNull().default("NOT_OPEN"),
    amendmentOfScorecardId: uuid("amendment_of_scorecard_id"),
    openedAt: timestamp("opened_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("scorecards_interview_status_idx").on(t.interviewId, t.status),
    index("scorecards_application_idx").on(t.applicationId),
    index("scorecards_rater_idx").on(t.raterUserId),
  ],
);

export const scorecardRatings = pgTable(
  "scorecard_ratings",
  {
    scorecardId: uuid("scorecard_id")
      .notNull()
      .references(() => scorecards.id, { onDelete: "cascade" }),
    competencyId: uuid("competency_id")
      .notNull()
      .references(() => competencies.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    evidenceNote: text("evidence_note"),
    rubricAnchor: varchar("rubric_anchor", { length: 200 }),
  },
  (t) => [primaryKey({ columns: [t.scorecardId, t.competencyId] })],
);

/** Atomic evidence items with mandatory provenance. */
export const evidenceObservations = pgTable(
  "evidence_observations",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    competencyId: uuid("competency_id")
      .notNull()
      .references(() => competencies.id),
    protocolVersionId: uuid("protocol_version_id")
      .notNull()
      .references(() => hiringProtocolVersions.id),
    sourceType: varchar("source_type", { length: 60 }).notNull(), // INTERVIEW_SCORECARD|WORK_SAMPLE|SCREEN_NOTE|REFERENCE|MESSAGE
    sourceObjectId: varchar("source_object_id", { length: 200 }).notNull(),
    observation: text("observation").notNull(),
    raterUserId: uuid("rater_user_id").references(() => users.id),
    rating: integer("rating"),
    artifactReference: varchar("artifact_reference", { length: 300 }),
    provenance: varchar("provenance", { length: 60 }).notNull().default("HUMAN_ENTERED"),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("evidence_app_competency_idx").on(t.applicationId, t.competencyId),
    index("evidence_org_idx").on(t.organizationId, t.observedAt),
  ],
);

export const evidenceArtifacts = pgTable(
  "evidence_artifacts",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    applicationId: uuid("application_id").references(() => applications.id, {
      onDelete: "cascade",
    }),
    kind: varchar("kind", { length: 60 }).notNull(),
    reference: varchar("reference", { length: 400 }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("evidence_artifacts_app_idx").on(t.applicationId)],
);

/** Derived immutable snapshots of decision readiness at time T. */
export const decisionReadinessSnapshots = pgTable(
  "decision_readiness_snapshots",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    /** NOT_APPLICABLE|INCOMPLETE|CONFLICT_REVIEW_REQUIRED|APPROVAL_REQUIRED|READY|STALE */
    status: varchar("status", { length: 40 }).notNull(),
    reasons: jsonb("reasons").$type<string[]>().notNull().default([]),
    missingEvidence: jsonb("missing_evidence").$type<string[]>().notNull().default([]),
    conflicts: jsonb("conflicts")
      .$type<{ competency: string; description: string }[]>()
      .notNull()
      .default([]),
    missingApprovals: jsonb("missing_approvals").$type<string[]>().notNull().default([]),
    staleProtocolFlags: jsonb("stale_protocol_flags").$type<string[]>().notNull().default([]),
    rulesetVersion: varchar("ruleset_version", { length: 60 }).notNull(),
    computedByWorkflowRef: varchar("computed_by_workflow_ref", { length: 255 }),
    computedAt: createdAt(),
  },
  (t) => [index("readiness_snapshots_app_time_idx").on(t.applicationId, t.computedAt)],
);

export const decisionRecords = pgTable(
  "decision_records",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    decision: varchar("decision", { length: 40 }).notNull(), // HIRE|REJECT|ADVANCE|HOLD
    decidedByUserId: uuid("decided_by_user_id")
      .notNull()
      .references(() => users.id),
    readinessSnapshotId: uuid("readiness_snapshot_id").references(
      () => decisionReadinessSnapshots.id,
    ),
    rationale: text("rationale"),
    createdAt: createdAt(),
  },
  (t) => [index("decision_records_app_idx").on(t.applicationId)],
);

// ---------------------------------------------------------------------------
// Communications / scheduling facts
// ---------------------------------------------------------------------------

export const communicationThreads = pgTable(
  "communication_threads",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    applicationId: uuid("application_id").references(() => applications.id, {
      onDelete: "set null",
    }),
    subject: varchar("subject", { length: 300 }),
    channel: varchar("channel", { length: 40 }).notNull().default("EMAIL"),
    externalThreadId: varchar("external_thread_id", { length: 255 }),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("threads_app_idx").on(t.applicationId),
    index("threads_org_last_msg_idx").on(t.organizationId, t.lastMessageAt),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => communicationThreads.id, { onDelete: "cascade" }),
    direction: varchar("direction", { length: 10 }).notNull(), // INBOUND|OUTBOUND
    fromParty: varchar("from_party", { length: 40 }).notNull(), // CANDIDATE|RECRUITER|SYSTEM|INTERVIEWER
    body: text("body").notNull(),
    externalMessageId: varchar("external_message_id", { length: 255 }),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [index("messages_thread_sent_idx").on(t.threadId, t.sentAt)],
);

/**
 * Facts extracted by model parsing are reviewable proposals, not truth until
 * validated. Every fact carries its source reference.
 */
export const extractedFacts = pgTable(
  "extracted_facts",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    messageId: uuid("message_id").references(() => messages.id, { onDelete: "cascade" }),
    applicationId: uuid("application_id").references(() => applications.id, {
      onDelete: "cascade",
    }),
    factType: varchar("fact_type", { length: 80 }).notNull(), // COMPETING_OFFER_DEADLINE|START_DATE_CONSTRAINT|QUESTION|OTHER
    normalizedValue: jsonb("normalized_value").$type<unknown>(),
    confidence: varchar("confidence", { length: 20 }),
    /** UNREVIEWED|CONFIRMED|REJECTED */
    reviewState: varchar("review_state", { length: 20 }).notNull().default("UNREVIEWED"),
    reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id),
    sourceObjectId: varchar("source_object_id", { length: 200 }),
    createdAt: createdAt(),
  },
  (t) => [index("extracted_facts_app_type_idx").on(t.applicationId, t.factType)],
);

export const availabilityWindows = pgTable(
  "availability_windows",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    startUtc: timestamp("start_utc", { withTimezone: true }).notNull(),
    endUtc: timestamp("end_utc", { withTimezone: true }).notNull(),
    source: varchar("source", { length: 40 }).notNull().default("DECLARED"),
    createdAt: createdAt(),
  },
  (t) => [index("availability_user_range_idx").on(t.userId, t.startUtc)],
);

export const calendarEvents = pgTable(
  "calendar_events",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    interviewId: uuid("interview_id").references(() => interviews.id, { onDelete: "set null" }),
    externalEventId: varchar("external_event_id", { length: 255 }),
    provider: varchar("provider", { length: 40 }).notNull().default("SYNTHETIC"),
    startUtc: timestamp("start_utc", { withTimezone: true }).notNull(),
    endUtc: timestamp("end_utc", { withTimezone: true }).notNull(),
    status: varchar("status", { length: 30 }).notNull().default("BOOKED"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("calendar_interview_idx").on(t.interviewId)],
);

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

export const exceptions = pgTable(
  "exceptions",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    deduplicationKey: varchar("deduplication_key", { length: 320 }).notNull(),
    type: varchar("type", { length: 60 }).notNull(),
    severity: varchar("severity", { length: 20 }).notNull().default("MEDIUM"),
    jobId: uuid("job_id").references(() => jobs.id, { onDelete: "cascade" }),
    applicationId: uuid("application_id").references(() => applications.id, {
      onDelete: "cascade",
    }),
    interviewId: uuid("interview_id").references(() => interviews.id, { onDelete: "set null" }),
    title: varchar("title", { length: 300 }).notNull(),
    detail: text("detail").notNull(),
    /** OPEN|ACKNOWLEDGED|AUTO_RESOLVING|WAITING_EXTERNAL|WAITING_HUMAN|RESOLVED|DISMISSED_WITH_REASON */
    status: varchar("status", { length: 40 }).notNull().default("OPEN"),
    deadlineAt: timestamp("deadline_at", { withTimezone: true }),
    firstSeenAt: createdAt(),
    lastRecomputedAt: timestamp("last_recomputed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolutionReason: text("resolution_reason"),
  },
  (t) => [
    uniqueIndex("exceptions_dedup_key_idx").on(t.organizationId, t.deduplicationKey),
    index("exceptions_org_sev_status_idx").on(t.organizationId, t.severity, t.status),
    index("exceptions_deadline_idx").on(t.deadlineAt),
  ],
);

export const approvals = pgTable(
  "approvals",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    actionId: uuid("action_id"),
    requiredPermission: varchar("required_permission", { length: 80 }).notNull(),
    requestedByUserId: uuid("requested_by_user_id").references(() => users.id),
    decidedByUserId: uuid("decided_by_user_id").references(() => users.id),
    /** PENDING|APPROVED|REJECTED|EXPIRED */
    status: varchar("status", { length: 20 }).notNull().default("PENDING"),
    policyVersion: varchar("policy_version", { length: 60 }).notNull(),
    evidenceRefs: jsonb("evidence_refs").$type<string[]>().notNull().default([]),
    reason: text("reason"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index("approvals_org_pending_idx").on(t.organizationId, t.status),
    index("approvals_decider_idx").on(t.decidedByUserId, t.status),
  ],
);

/**
 * Canonical typed action lifecycle (ActionProposal contract). The model can
 * only create PROPOSED rows via tools; authority is derived here.
 */
export const actions = pgTable(
  "actions",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    actionType: varchar("action_type", { length: 80 }).notNull(),
    targetRefs: jsonb("target_refs").$type<string[]>().notNull().default([]),
    parameters: jsonb("parameters").$type<Record<string, unknown>>().notNull().default({}),
    rationale: text("rationale").notNull(),
    evidenceRefs: jsonb("evidence_refs").$type<string[]>().notNull().default([]),
    requestedAuthorityClass: varchar("requested_authority_class", { length: 4 }).notNull(),
    resolvedAuthorityClass: varchar("resolved_authority_class", { length: 4 }).notNull(),
    /** PROPOSED|AUTHORIZED_AUTOMATIC|AWAITING_APPROVAL|APPROVED|REJECTED|EXECUTING|WAITING_EXTERNAL|SUCCEEDED|FAILED_RETRYABLE|FAILED_FINAL|CANCELLED */
    status: varchar("status", { length: 30 }).notNull().default("PROPOSED"),
    createdByAgentSessionId: varchar("created_by_agent_session_id", { length: 255 }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id),
    approvalId: uuid("approval_id").references(() => approvals.id),
    idempotencyKey: varchar("idempotency_key", { length: 320 }),
    executionOutcome: jsonb("execution_outcome").$type<unknown>(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("actions_org_status_idx").on(t.organizationId, t.status),
    uniqueIndex("actions_idempotency_uniq_idx").on(t.idempotencyKey),
  ],
);

export const workflowInstances = pgTable(
  "workflow_instances",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    workflowType: varchar("workflow_type", { length: 80 }).notNull(),
    businessObjectId: varchar("business_object_id", { length: 200 }).notNull(),
    status: varchar("status", { length: 30 }).notNull().default("RUNNING"), // RUNNING|COMPLETED|FAILED|CANCELLED
    startedAt: createdAt(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    lastError: text("last_error"),
  },
  (t) => [
    uniqueIndex("workflow_instances_org_type_obj_idx").on(
      t.organizationId,
      t.workflowType,
      t.businessObjectId,
    ),
  ],
);

/** Queryable pending durable-workflow obligations (no hidden queues). */
export const workflowObligations = pgTable(
  "workflow_obligations",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    instanceId: uuid("instance_id").references(() => workflowInstances.id, { onDelete: "cascade" }),
    obligationKey: varchar("obligation_key", { length: 320 }).notNull(),
    summary: varchar("summary", { length: 400 }).notNull(),
    state: varchar("state", { length: 30 }).notNull().default("ACTIVE"), // ACTIVE|SATISFIED|CANCELLED
    visibleOnToday: boolean("visible_on_today").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("workflow_obligations_key_idx").on(t.obligationKey)],
);

export const integrationConnections = pgTable(
  "integration_connections",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 40 }).notNull(), // GMAIL|GOOGLE_CALENDAR|SYNTHETIC_ATS|SLACK
    mode: varchar("mode", { length: 20 }).notNull().default("SYNTHETIC"), // LIVE|SYNTHETIC
    status: varchar("status", { length: 30 }).notNull().default("DISCONNECTED"),
    /** Encrypted at rest via platform secret store when LIVE. Never logged. */
    credentialRef: text("credential_ref"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    lastWebhookAt: timestamp("last_webhook_at", { withTimezone: true }),
    healthDetail: text("health_detail"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("integration_connections_org_provider_idx").on(t.organizationId, t.provider)],
);

export const externalObjectLinks = pgTable(
  "external_object_links",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => integrationConnections.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 40 }).notNull(),
    objectType: varchar("object_type", { length: 60 }).notNull(),
    externalId: varchar("external_id", { length: 255 }).notNull(),
    internalResourceType: varchar("internal_resource_type", { length: 60 }).notNull(),
    internalResourceId: uuid("internal_resource_id"),
    syncCursor: varchar("sync_cursor", { length: 255 }),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("external_links_provider_extid_idx").on(t.provider, t.externalId),
    index("external_links_internal_idx").on(t.internalResourceType, t.internalResourceId),
  ],
);

export const syncCursors = pgTable(
  "sync_cursors",
  {
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => integrationConnections.id, { onDelete: "cascade" }),
    resourceType: varchar("resource_type", { length: 60 }).notNull(),
    cursorValue: varchar("cursor_value", { length: 400 }),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.connectionId, t.resourceType] })],
);

/** Transactional outbox for side-effect initiation. */
export const outboxEvents = pgTable(
  "outbox_events",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    eventType: varchar("event_type", { length: 80 }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("outbox_unprocessed_idx").on(t.processedAt, t.createdAt)],
);

// ---------------------------------------------------------------------------
// Audit / agent
// ---------------------------------------------------------------------------

/** Append-only domain event ledger. */
export const domainEvents = pgTable(
  "domain_events",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    eventType: varchar("event_type", { length: 80 }).notNull(),
    aggregateType: varchar("aggregate_type", { length: 60 }).notNull(),
    aggregateId: varchar("aggregate_id", { length: 200 }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    actorType: varchar("actor_type", { length: 20 }).notNull(),
    actorId: varchar("actor_id", { length: 200 }),
    correlationId: varchar("correlation_id", { length: 200 }),
    occurredAt: createdAt(),
  },
  (t) => [
    index("domain_events_org_time_idx").on(t.organizationId, t.occurredAt),
    index("domain_events_aggregate_idx").on(t.aggregateType, t.aggregateId),
  ],
);

/** Append-only product audit ledger (authoritative business accountability). */
export const auditRecords = pgTable(
  "audit_records",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    actorType: varchar("actor_type", { length: 20 }).notNull(), // HUMAN|AGENT|WORKFLOW|INTEGRATION
    actorId: varchar("actor_id", { length: 200 }),
    actionType: varchar("action_type", { length: 120 }).notNull(),
    targetType: varchar("target_type", { length: 60 }).notNull(),
    targetId: varchar("target_id", { length: 200 }).notNull(),
    authorityClass: varchar("authority_class", { length: 4 }).notNull(),
    policyVersion: varchar("policy_version", { length: 60 }).notNull(),
    evidenceRefs: jsonb("evidence_refs").$type<string[]>().notNull().default([]),
    approvalRef: uuid("approval_ref"),
    workflowRef: varchar("workflow_ref", { length: 255 }),
    beforeState: jsonb("before_state").$type<Record<string, unknown>>(),
    afterState: jsonb("after_state").$type<Record<string, unknown>>(),
    outcome: varchar("outcome", { length: 60 }).notNull(),
    errorCode: varchar("error_code", { length: 40 }),
    correlationId: varchar("correlation_id", { length: 200 }),
    occurredAt: createdAt(),
  },
  (t) => [
    index("audit_records_org_time_idx").on(t.organizationId, t.occurredAt),
    index("audit_records_target_idx").on(t.targetType, t.targetId),
  ],
);

export const agentSessions = pgTable(
  "agent_sessions",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    eveSessionRef: varchar("eve_session_ref", { length: 255 }),
    surface: varchar("surface", { length: 120 }),
    contextSnapshot: jsonb("context_snapshot").$type<Record<string, unknown>>(),
    providerName: varchar("provider_name", { length: 60 }).notNull().default("opencode-go"),
    modelName: varchar("model_name", { length: 120 }),
    promptVersion: varchar("prompt_version", { length: 60 }),
    startedAt: createdAt(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (t) => [index("agent_sessions_org_user_idx").on(t.organizationId, t.userId)],
);

/** Provenance link: agent session -> proposed action (canonical row lives in actions). */
export const agentActionProposals = pgTable(
  "agent_action_proposals",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    agentSessionId: uuid("agent_session_id").references(() => agentSessions.id, {
      onDelete: "set null",
    }),
    actionId: uuid("action_id")
      .notNull()
      .references(() => actions.id, { onDelete: "cascade" }),
    toolName: varchar("tool_name", { length: 120 }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("agent_action_proposals_session_idx").on(t.agentSessionId)],
);

export const agentFeedback = pgTable(
  "agent_feedback",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    agentSessionId: uuid("agent_session_id").references(() => agentSessions.id, {
      onDelete: "cascade",
    }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rating: varchar("rating", { length: 20 }).notNull(), // HELPFUL|NOT_HELPFUL
    comment: text("comment"),
    createdAt: createdAt(),
  },
  (t) => [index("agent_feedback_session_idx").on(t.agentSessionId)],
);

// ---------------------------------------------------------------------------
// Segregated protected demographic data.
// NEVER read by candidate advancement/compensation logic or Pal tools.
// Access requires RESTRICTED_DEMOGRAPHICS_READ permission + audit.
// ---------------------------------------------------------------------------

export const protectedDemographics = pgTable(
  "protected_demographics",
  {
    candidateId: uuid("candidate_id")
      .primaryKey()
      .references(() => candidates.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    /** Freeform restricted payload; excluded from all normal query paths. */
    attributes: jsonb("attributes").$type<Record<string, string>>().notNull().default({}),
    collectedAt: timestamp("collected_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("protected_demographics_org_idx").on(t.organizationId)],
);

// Convenience: expression for candidate search text kept consistent on write.
export const candidateSearchExpr = sql`coalesce(${candidates.firstName}, '') || ' ' || coalesce(${candidates.lastName}, '') || ' ' || coalesce(${candidates.headline}, '')`;
