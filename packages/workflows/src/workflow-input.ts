import { z } from "zod";

export const WORKFLOW_TYPES = [
  "scorecard_chase",
  "candidate_follow_up",
  "scheduling_resolution",
  "interviewer_decline_replacement",
  "integration_reconciliation",
  "stale_exception_reconciliation",
  "deadline_candidate_escalation",
] as const;
export type WorkflowType = (typeof WORKFLOW_TYPES)[number];

const workflowInputSchema = z.object({
  workflowType: z.enum(WORKFLOW_TYPES),
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
  businessObjectId: z.string().min(1).max(200),
  applicationId: z.string().uuid().optional(),
  interviewId: z.string().uuid().optional(),
  jobId: z.string().uuid().optional(),
  resumeAt: z.coerce.date().optional(),
  now: z.coerce.date().optional(),
  gracePeriodMs: z.number().int().nonnegative().default(24 * 60 * 60 * 1000),
  escalationPeriodMs: z.number().int().positive().default(24 * 60 * 60 * 1000),
  staleAfterMs: z.number().int().positive().default(24 * 60 * 60 * 1000),
  maxAttempts: z.number().int().positive().default(2),
});

export type WorkflowInput = z.input<typeof workflowInputSchema>;
export type ParsedWorkflowInput = z.output<typeof workflowInputSchema>;

export function normalizeWorkflowInput(input: unknown): ParsedWorkflowInput {
  return workflowInputSchema.parse(input);
}

export interface WorkflowSnapshot {
  now: Date;
  applicationId?: string;
  interviewId?: string;
  jobId?: string;
  interviewStatus?: string;
  interviewCompletedAt?: Date | null;
  requiredScorecards?: number;
  submittedScorecards?: number;
  activeObligationId?: string;
  obligationDueAt?: Date | null;
  candidateResponded?: boolean;
  candidateFollowUpDueAt?: Date | null;
  followUpAttempt?: number;
  declinedParticipantCount?: number;
  noFeasibleSlot?: boolean;
  integrationDrift?: boolean;
  staleExceptionCount?: number;
  confirmedOfferDeadlineAt?: Date | null;
}

export type WorkflowPlanStep =
  | { kind: "obligation"; key: string; obligationType: string; dueAt: Date; summary: string }
  | { kind: "resolve_obligation"; key: string; obligationId: string }
  | { kind: "action"; key: string; actionType: "send_scorecard_reminder" | "send_candidate_follow_up" | "send_status_update"; summary: string }
  | { kind: "exception"; key: string; type: string; severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"; title: string; detail: string; deadlineAt?: Date | null }
  | { kind: "approval"; key: string; actionType: "request_interviewer_substitution" | "book_calendar_event" | "reschedule_interview"; requiredPermission: string; rationale: string };

export interface WorkflowPlan {
  status: "COMPLETE" | "WAITING" | "BLOCKED" | "EXECUTING";
  nextWakeAt: Date | null;
  steps: WorkflowPlanStep[];
}

export interface WorkflowResult {
  workflowType: WorkflowType;
  workflowInstanceId: string;
  status: WorkflowPlan["status"];
  replayed: boolean;
  stepKeys: string[];
  nextWakeAt: Date | null;
}
