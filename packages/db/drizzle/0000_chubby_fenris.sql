CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider_id" varchar(100) NOT NULL,
	"account_id" varchar(255) NOT NULL,
	"password_hash" text,
	"access_token" text,
	"refresh_token" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"action_type" varchar(80) NOT NULL,
	"target_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"parameters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"rationale" text NOT NULL,
	"evidence_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"requested_authority_class" varchar(4) NOT NULL,
	"resolved_authority_class" varchar(4) NOT NULL,
	"status" varchar(30) DEFAULT 'PROPOSED' NOT NULL,
	"created_by_agent_session_id" varchar(255),
	"created_by_user_id" uuid,
	"approval_id" uuid,
	"idempotency_key" varchar(320),
	"execution_outcome" jsonb,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_action_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"agent_session_id" uuid,
	"action_id" uuid NOT NULL,
	"tool_name" varchar(120) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"agent_session_id" uuid,
	"user_id" uuid NOT NULL,
	"rating" varchar(20) NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"eve_session_ref" varchar(255),
	"surface" varchar(120),
	"context_snapshot" jsonb,
	"provider_name" varchar(60) DEFAULT 'opencode-go' NOT NULL,
	"model_name" varchar(120),
	"prompt_version" varchar(60),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "application_obligations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"application_id" uuid,
	"interview_id" uuid,
	"obligation_type" varchar(80) NOT NULL,
	"responsible_user_id" uuid,
	"due_at" timestamp with time zone NOT NULL,
	"state" varchar(30) DEFAULT 'PENDING' NOT NULL,
	"satisfied_at" timestamp with time zone,
	"workflow_ref" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "application_stage_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"from_stage" varchar(80),
	"to_stage" varchar(80) NOT NULL,
	"reason" text,
	"actor_type" varchar(20) NOT NULL,
	"actor_user_id" uuid,
	"human_authority_record_ref" uuid,
	"protocol_version_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"candidate_id" uuid NOT NULL,
	"status" varchar(40) DEFAULT 'ACTIVE' NOT NULL,
	"current_stage" varchar(80) DEFAULT 'APPLIED' NOT NULL,
	"source" varchar(80),
	"owner_recruiter_id" uuid,
	"protocol_version_id" uuid NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"next_expected_action_at" timestamp with time zone,
	"candidate_deadline_at" timestamp with time zone,
	"deadline_verified" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"action_id" uuid,
	"required_permission" varchar(80) NOT NULL,
	"requested_by_user_id" uuid,
	"decided_by_user_id" uuid,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"policy_version" varchar(60) NOT NULL,
	"evidence_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reason" text,
	"expires_at" timestamp with time zone,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"actor_type" varchar(20) NOT NULL,
	"actor_id" varchar(200),
	"action_type" varchar(120) NOT NULL,
	"target_type" varchar(60) NOT NULL,
	"target_id" varchar(200) NOT NULL,
	"authority_class" varchar(4) NOT NULL,
	"policy_version" varchar(60) NOT NULL,
	"evidence_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"approval_ref" uuid,
	"workflow_ref" varchar(255),
	"before_state" jsonb,
	"after_state" jsonb,
	"outcome" varchar(60) NOT NULL,
	"error_code" varchar(40),
	"correlation_id" varchar(200),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "availability_windows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"start_utc" timestamp with time zone NOT NULL,
	"end_utc" timestamp with time zone NOT NULL,
	"source" varchar(40) DEFAULT 'DECLARED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"interview_id" uuid,
	"external_event_id" varchar(255),
	"provider" varchar(40) DEFAULT 'SYNTHETIC' NOT NULL,
	"start_utc" timestamp with time zone NOT NULL,
	"end_utc" timestamp with time zone NOT NULL,
	"status" varchar(30) DEFAULT 'BOOKED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"first_name" varchar(120) NOT NULL,
	"last_name" varchar(120) NOT NULL,
	"email" varchar(320),
	"headline" varchar(240),
	"source" varchar(80),
	"search_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "communication_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"application_id" uuid,
	"subject" varchar(300),
	"channel" varchar(40) DEFAULT 'EMAIL' NOT NULL,
	"external_thread_id" varchar(255),
	"last_message_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "competencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decision_readiness_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"status" varchar(40) NOT NULL,
	"reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"missing_evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"conflicts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"missing_approvals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"stale_protocol_flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ruleset_version" varchar(60) NOT NULL,
	"computed_by_workflow_ref" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decision_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"decision" varchar(40) NOT NULL,
	"decided_by_user_id" uuid NOT NULL,
	"readiness_snapshot_id" uuid,
	"rationale" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "domain_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_type" varchar(80) NOT NULL,
	"aggregate_type" varchar(60) NOT NULL,
	"aggregate_id" varchar(200) NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"actor_type" varchar(20) NOT NULL,
	"actor_id" varchar(200),
	"correlation_id" varchar(200),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence_artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"application_id" uuid,
	"kind" varchar(60) NOT NULL,
	"reference" varchar(400) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"competency_id" uuid NOT NULL,
	"protocol_version_id" uuid NOT NULL,
	"source_type" varchar(60) NOT NULL,
	"source_object_id" varchar(200) NOT NULL,
	"observation" text NOT NULL,
	"rater_user_id" uuid,
	"rating" integer,
	"artifact_reference" varchar(300),
	"provenance" varchar(60) DEFAULT 'HUMAN_ENTERED' NOT NULL,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exceptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"deduplication_key" varchar(320) NOT NULL,
	"type" varchar(60) NOT NULL,
	"severity" varchar(20) DEFAULT 'MEDIUM' NOT NULL,
	"job_id" uuid,
	"application_id" uuid,
	"interview_id" uuid,
	"title" varchar(300) NOT NULL,
	"detail" text NOT NULL,
	"status" varchar(40) DEFAULT 'OPEN' NOT NULL,
	"deadline_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_recomputed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolution_reason" text
);
--> statement-breakpoint
CREATE TABLE "external_object_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"provider" varchar(40) NOT NULL,
	"object_type" varchar(60) NOT NULL,
	"external_id" varchar(255) NOT NULL,
	"internal_resource_type" varchar(60) NOT NULL,
	"internal_resource_id" uuid,
	"sync_cursor" varchar(255),
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extracted_facts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"message_id" uuid,
	"application_id" uuid,
	"fact_type" varchar(80) NOT NULL,
	"normalized_value" jsonb,
	"confidence" varchar(20),
	"review_state" varchar(20) DEFAULT 'UNREVIEWED' NOT NULL,
	"reviewed_by_user_id" uuid,
	"source_object_id" varchar(200),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hiring_protocol_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"protocol_id" uuid NOT NULL,
	"version_label" varchar(40) NOT NULL,
	"status" varchar(40) DEFAULT 'DRAFT' NOT NULL,
	"role_purpose" text,
	"critical_tasks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"must_have_requirements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"trainable_requirements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"stages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"decision_readiness_ruleset_version" varchar(60) DEFAULT 'drr-1.0.0' NOT NULL,
	"approved_by_user_id" uuid,
	"approved_at" timestamp with time zone,
	"effective_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hiring_protocols" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"provider" varchar(40) NOT NULL,
	"mode" varchar(20) DEFAULT 'SYNTHETIC' NOT NULL,
	"status" varchar(30) DEFAULT 'DISCONNECTED' NOT NULL,
	"credential_ref" text,
	"last_synced_at" timestamp with time zone,
	"last_webhook_at" timestamp with time zone,
	"health_detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interview_participants" (
	"interview_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"role" varchar(40) DEFAULT 'INTERVIEWER' NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"declined" boolean DEFAULT false NOT NULL,
	CONSTRAINT "interview_participants_interview_id_user_id_pk" PRIMARY KEY("interview_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "interviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"label" varchar(160) NOT NULL,
	"status" varchar(40) DEFAULT 'PLANNED' NOT NULL,
	"scheduled_start_at" timestamp with time zone,
	"scheduled_end_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"requires_scorecards_from" integer DEFAULT 1 NOT NULL,
	"protocol_version_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"department" varchar(120),
	"location_mode" varchar(40) DEFAULT 'REMOTE' NOT NULL,
	"employment_type" varchar(40) DEFAULT 'FULL_TIME' NOT NULL,
	"status" varchar(40) DEFAULT 'DRAFT' NOT NULL,
	"owner_recruiter_id" uuid,
	"hiring_manager_id" uuid,
	"active_protocol_version_id" uuid,
	"opened_at" timestamp with time zone,
	"target_fill_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(40) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"thread_id" uuid NOT NULL,
	"direction" varchar(10) NOT NULL,
	"from_party" varchar(40) NOT NULL,
	"body" text NOT NULL,
	"external_message_id" varchar(255),
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"automation_policy_version" varchar(60) DEFAULT 'ap-1.0.0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "outbox_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_type" varchar(80) NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "protected_demographics" (
	"candidate_id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"collected_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "protocol_competencies" (
	"protocol_version_id" uuid NOT NULL,
	"competency_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"required_level" integer DEFAULT 3 NOT NULL,
	"evidence_source" varchar(80) DEFAULT 'INTERVIEW_SCORECARD' NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	CONSTRAINT "protocol_competencies_protocol_version_id_competency_id_pk" PRIMARY KEY("protocol_version_id","competency_id")
);
--> statement-breakpoint
CREATE TABLE "scorecard_ratings" (
	"scorecard_id" uuid NOT NULL,
	"competency_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"evidence_note" text,
	"rubric_anchor" varchar(200),
	CONSTRAINT "scorecard_ratings_scorecard_id_competency_id_pk" PRIMARY KEY("scorecard_id","competency_id")
);
--> statement-breakpoint
CREATE TABLE "scorecard_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"protocol_version_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"rubric_anchors" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"competency_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scorecards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"interview_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"rater_user_id" uuid NOT NULL,
	"protocol_version_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'NOT_OPEN' NOT NULL,
	"amendment_of_scorecard_id" uuid,
	"opened_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" varchar(64),
	"user_agent" text,
	"active_organization_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "sync_cursors" (
	"connection_id" uuid NOT NULL,
	"resource_type" varchar(60) NOT NULL,
	"cursor_value" varchar(400),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sync_cursors_connection_id_resource_type_pk" PRIMARY KEY("connection_id","resource_type")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"email" varchar(320) NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" varchar(320) NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"workflow_type" varchar(80) NOT NULL,
	"business_object_id" varchar(200) NOT NULL,
	"status" varchar(30) DEFAULT 'RUNNING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"last_error" text
);
--> statement-breakpoint
CREATE TABLE "workflow_obligations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"instance_id" uuid,
	"obligation_key" varchar(320) NOT NULL,
	"summary" varchar(400) NOT NULL,
	"state" varchar(30) DEFAULT 'ACTIVE' NOT NULL,
	"visible_on_today" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actions" ADD CONSTRAINT "actions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actions" ADD CONSTRAINT "actions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actions" ADD CONSTRAINT "actions_approval_id_approvals_id_fk" FOREIGN KEY ("approval_id") REFERENCES "public"."approvals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_action_proposals" ADD CONSTRAINT "agent_action_proposals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_action_proposals" ADD CONSTRAINT "agent_action_proposals_agent_session_id_agent_sessions_id_fk" FOREIGN KEY ("agent_session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_action_proposals" ADD CONSTRAINT "agent_action_proposals_action_id_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."actions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_feedback" ADD CONSTRAINT "agent_feedback_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_feedback" ADD CONSTRAINT "agent_feedback_agent_session_id_agent_sessions_id_fk" FOREIGN KEY ("agent_session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_feedback" ADD CONSTRAINT "agent_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD CONSTRAINT "agent_sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD CONSTRAINT "agent_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_obligations" ADD CONSTRAINT "application_obligations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_obligations" ADD CONSTRAINT "application_obligations_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_obligations" ADD CONSTRAINT "application_obligations_responsible_user_id_users_id_fk" FOREIGN KEY ("responsible_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_stage_events" ADD CONSTRAINT "application_stage_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_stage_events" ADD CONSTRAINT "application_stage_events_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_stage_events" ADD CONSTRAINT "application_stage_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_stage_events" ADD CONSTRAINT "application_stage_events_protocol_version_id_hiring_protocol_versions_id_fk" FOREIGN KEY ("protocol_version_id") REFERENCES "public"."hiring_protocol_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_owner_recruiter_id_users_id_fk" FOREIGN KEY ("owner_recruiter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_protocol_version_id_hiring_protocol_versions_id_fk" FOREIGN KEY ("protocol_version_id") REFERENCES "public"."hiring_protocol_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_decided_by_user_id_users_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_records" ADD CONSTRAINT "audit_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_windows" ADD CONSTRAINT "availability_windows_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_windows" ADD CONSTRAINT "availability_windows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_interview_id_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interviews"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_threads" ADD CONSTRAINT "communication_threads_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_threads" ADD CONSTRAINT "communication_threads_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competencies" ADD CONSTRAINT "competencies_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_readiness_snapshots" ADD CONSTRAINT "decision_readiness_snapshots_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_readiness_snapshots" ADD CONSTRAINT "decision_readiness_snapshots_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_records" ADD CONSTRAINT "decision_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_records" ADD CONSTRAINT "decision_records_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_records" ADD CONSTRAINT "decision_records_decided_by_user_id_users_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_records" ADD CONSTRAINT "decision_records_readiness_snapshot_id_decision_readiness_snapshots_id_fk" FOREIGN KEY ("readiness_snapshot_id") REFERENCES "public"."decision_readiness_snapshots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domain_events" ADD CONSTRAINT "domain_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_artifacts" ADD CONSTRAINT "evidence_artifacts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_artifacts" ADD CONSTRAINT "evidence_artifacts_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_observations" ADD CONSTRAINT "evidence_observations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_observations" ADD CONSTRAINT "evidence_observations_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_observations" ADD CONSTRAINT "evidence_observations_competency_id_competencies_id_fk" FOREIGN KEY ("competency_id") REFERENCES "public"."competencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_observations" ADD CONSTRAINT "evidence_observations_protocol_version_id_hiring_protocol_versions_id_fk" FOREIGN KEY ("protocol_version_id") REFERENCES "public"."hiring_protocol_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_observations" ADD CONSTRAINT "evidence_observations_rater_user_id_users_id_fk" FOREIGN KEY ("rater_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exceptions" ADD CONSTRAINT "exceptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exceptions" ADD CONSTRAINT "exceptions_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exceptions" ADD CONSTRAINT "exceptions_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exceptions" ADD CONSTRAINT "exceptions_interview_id_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interviews"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_object_links" ADD CONSTRAINT "external_object_links_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_object_links" ADD CONSTRAINT "external_object_links_connection_id_integration_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."integration_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_facts" ADD CONSTRAINT "extracted_facts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_facts" ADD CONSTRAINT "extracted_facts_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_facts" ADD CONSTRAINT "extracted_facts_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_facts" ADD CONSTRAINT "extracted_facts_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hiring_protocol_versions" ADD CONSTRAINT "hiring_protocol_versions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hiring_protocol_versions" ADD CONSTRAINT "hiring_protocol_versions_protocol_id_hiring_protocols_id_fk" FOREIGN KEY ("protocol_id") REFERENCES "public"."hiring_protocols"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hiring_protocol_versions" ADD CONSTRAINT "hiring_protocol_versions_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hiring_protocols" ADD CONSTRAINT "hiring_protocols_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hiring_protocols" ADD CONSTRAINT "hiring_protocols_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_participants" ADD CONSTRAINT "interview_participants_interview_id_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_participants" ADD CONSTRAINT "interview_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_participants" ADD CONSTRAINT "interview_participants_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_protocol_version_id_hiring_protocol_versions_id_fk" FOREIGN KEY ("protocol_version_id") REFERENCES "public"."hiring_protocol_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_owner_recruiter_id_users_id_fk" FOREIGN KEY ("owner_recruiter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_hiring_manager_id_users_id_fk" FOREIGN KEY ("hiring_manager_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_thread_id_communication_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."communication_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protected_demographics" ADD CONSTRAINT "protected_demographics_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protected_demographics" ADD CONSTRAINT "protected_demographics_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_competencies" ADD CONSTRAINT "protocol_competencies_protocol_version_id_hiring_protocol_versions_id_fk" FOREIGN KEY ("protocol_version_id") REFERENCES "public"."hiring_protocol_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_competencies" ADD CONSTRAINT "protocol_competencies_competency_id_competencies_id_fk" FOREIGN KEY ("competency_id") REFERENCES "public"."competencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_competencies" ADD CONSTRAINT "protocol_competencies_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scorecard_ratings" ADD CONSTRAINT "scorecard_ratings_scorecard_id_scorecards_id_fk" FOREIGN KEY ("scorecard_id") REFERENCES "public"."scorecards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scorecard_ratings" ADD CONSTRAINT "scorecard_ratings_competency_id_competencies_id_fk" FOREIGN KEY ("competency_id") REFERENCES "public"."competencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scorecard_ratings" ADD CONSTRAINT "scorecard_ratings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scorecard_templates" ADD CONSTRAINT "scorecard_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scorecard_templates" ADD CONSTRAINT "scorecard_templates_protocol_version_id_hiring_protocol_versions_id_fk" FOREIGN KEY ("protocol_version_id") REFERENCES "public"."hiring_protocol_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scorecards" ADD CONSTRAINT "scorecards_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scorecards" ADD CONSTRAINT "scorecards_interview_id_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scorecards" ADD CONSTRAINT "scorecards_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scorecards" ADD CONSTRAINT "scorecards_template_id_scorecard_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."scorecard_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scorecards" ADD CONSTRAINT "scorecards_rater_user_id_users_id_fk" FOREIGN KEY ("rater_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scorecards" ADD CONSTRAINT "scorecards_protocol_version_id_hiring_protocol_versions_id_fk" FOREIGN KEY ("protocol_version_id") REFERENCES "public"."hiring_protocol_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_cursors" ADD CONSTRAINT "sync_cursors_connection_id_integration_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."integration_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_obligations" ADD CONSTRAINT "workflow_obligations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_obligations" ADD CONSTRAINT "workflow_obligations_instance_id_workflow_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."workflow_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "actions_org_status_idx" ON "actions" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "actions_idempotency_uniq_idx" ON "actions" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "agent_action_proposals_session_idx" ON "agent_action_proposals" USING btree ("agent_session_id");--> statement-breakpoint
CREATE INDEX "agent_feedback_session_idx" ON "agent_feedback" USING btree ("agent_session_id");--> statement-breakpoint
CREATE INDEX "agent_sessions_org_user_idx" ON "agent_sessions" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "obligations_org_state_due_idx" ON "application_obligations" USING btree ("organization_id","state","due_at");--> statement-breakpoint
CREATE INDEX "obligations_responsible_idx" ON "application_obligations" USING btree ("responsible_user_id","due_at");--> statement-breakpoint
CREATE INDEX "stage_events_application_idx" ON "application_stage_events" USING btree ("application_id","created_at");--> statement-breakpoint
CREATE INDEX "applications_org_job_status_idx" ON "applications" USING btree ("organization_id","job_id","status");--> statement-breakpoint
CREATE INDEX "applications_org_stage_idx" ON "applications" USING btree ("organization_id","current_stage");--> statement-breakpoint
CREATE INDEX "applications_candidate_idx" ON "applications" USING btree ("candidate_id");--> statement-breakpoint
CREATE UNIQUE INDEX "applications_job_candidate_uniq_idx" ON "applications" USING btree ("job_id","candidate_id");--> statement-breakpoint
CREATE INDEX "approvals_org_pending_idx" ON "approvals" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "approvals_decider_idx" ON "approvals" USING btree ("decided_by_user_id","status");--> statement-breakpoint
CREATE INDEX "audit_records_org_time_idx" ON "audit_records" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_records_target_idx" ON "audit_records" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "availability_user_range_idx" ON "availability_windows" USING btree ("user_id","start_utc");--> statement-breakpoint
CREATE INDEX "calendar_interview_idx" ON "calendar_events" USING btree ("interview_id");--> statement-breakpoint
CREATE INDEX "candidates_org_name_idx" ON "candidates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "candidates_org_created_idx" ON "candidates" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "threads_app_idx" ON "communication_threads" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "threads_org_last_msg_idx" ON "communication_threads" USING btree ("organization_id","last_message_at");--> statement-breakpoint
CREATE UNIQUE INDEX "competencies_org_name_idx" ON "competencies" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "readiness_snapshots_app_time_idx" ON "decision_readiness_snapshots" USING btree ("application_id","created_at");--> statement-breakpoint
CREATE INDEX "decision_records_app_idx" ON "decision_records" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "domain_events_org_time_idx" ON "domain_events" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "domain_events_aggregate_idx" ON "domain_events" USING btree ("aggregate_type","aggregate_id");--> statement-breakpoint
CREATE INDEX "evidence_artifacts_app_idx" ON "evidence_artifacts" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "evidence_app_competency_idx" ON "evidence_observations" USING btree ("application_id","competency_id");--> statement-breakpoint
CREATE INDEX "evidence_org_idx" ON "evidence_observations" USING btree ("organization_id","observed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "exceptions_dedup_key_idx" ON "exceptions" USING btree ("organization_id","deduplication_key");--> statement-breakpoint
CREATE INDEX "exceptions_org_sev_status_idx" ON "exceptions" USING btree ("organization_id","severity","status");--> statement-breakpoint
CREATE INDEX "exceptions_deadline_idx" ON "exceptions" USING btree ("deadline_at");--> statement-breakpoint
CREATE UNIQUE INDEX "external_links_provider_extid_idx" ON "external_object_links" USING btree ("provider","external_id");--> statement-breakpoint
CREATE INDEX "external_links_internal_idx" ON "external_object_links" USING btree ("internal_resource_type","internal_resource_id");--> statement-breakpoint
CREATE INDEX "extracted_facts_app_type_idx" ON "extracted_facts" USING btree ("application_id","fact_type");--> statement-breakpoint
CREATE UNIQUE INDEX "protocol_versions_unique_label_idx" ON "hiring_protocol_versions" USING btree ("protocol_id","version_label");--> statement-breakpoint
CREATE INDEX "protocol_versions_org_idx" ON "hiring_protocol_versions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "hiring_protocols_job_idx" ON "hiring_protocols" USING btree ("job_id");--> statement-breakpoint
CREATE UNIQUE INDEX "integration_connections_org_provider_idx" ON "integration_connections" USING btree ("organization_id","provider");--> statement-breakpoint
CREATE INDEX "interviews_org_status_idx" ON "interviews" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "interviews_application_idx" ON "interviews" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "interviews_start_idx" ON "interviews" USING btree ("scheduled_start_at");--> statement-breakpoint
CREATE INDEX "jobs_org_status_idx" ON "jobs" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "jobs_org_owner_idx" ON "jobs" USING btree ("organization_id","owner_recruiter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_org_user_idx" ON "memberships" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "memberships_user_idx" ON "memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "messages_thread_sent_idx" ON "messages" USING btree ("thread_id","sent_at");--> statement-breakpoint
CREATE INDEX "outbox_unprocessed_idx" ON "outbox_events" USING btree ("processed_at","created_at");--> statement-breakpoint
CREATE INDEX "protected_demographics_org_idx" ON "protected_demographics" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "protocol_competencies_org_idx" ON "protocol_competencies" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "scorecard_templates_protocol_idx" ON "scorecard_templates" USING btree ("protocol_version_id");--> statement-breakpoint
CREATE INDEX "scorecards_interview_status_idx" ON "scorecards" USING btree ("interview_id","status");--> statement-breakpoint
CREATE INDEX "scorecards_application_idx" ON "scorecards" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "scorecards_rater_idx" ON "scorecards" USING btree ("rater_user_id");--> statement-breakpoint
CREATE INDEX "workflow_instances_org_type_obj_idx" ON "workflow_instances" USING btree ("organization_id","workflow_type","business_object_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_obligations_key_idx" ON "workflow_obligations" USING btree ("obligation_key");