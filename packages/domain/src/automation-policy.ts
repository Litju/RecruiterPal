/**
 * AutomationPolicy: versioned rules deciding which action types may execute
 * automatically (A1), which require approval (A2), and which are human-only
 * (A3). Domain code derives final authority; the model can never self-authorize.
 */
import type { AuthorityClass } from "./authority";

export const AUTOMATION_POLICY_VERSION = "ap-1.0.0";

export const ACTION_TYPES = [
  "send_scorecard_reminder",
  "send_candidate_follow_up",
  "send_status_update",
  "draft_message",
  "propose_stage_transition",
  "execute_stage_transition",
  "request_interviewer_substitution",
  "book_calendar_event",
  "reschedule_interview",
  "reject_candidate",
  "hire_candidate",
  "set_compensation",
  "change_hiring_protocol",
] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

/** Default authority mapping frozen for V1. Changes require policy review. */
export const DEFAULT_ACTION_AUTHORITY: Readonly<Record<ActionType, AuthorityClass>> = {
  send_scorecard_reminder: "A1",
  send_candidate_follow_up: "A1",
  send_status_update: "A1",
  draft_message: "A2",
  propose_stage_transition: "A0",
  execute_stage_transition: "A2",
  request_interviewer_substitution: "A2",
  book_calendar_event: "A2",
  reschedule_interview: "A2",
  reject_candidate: "A3",
  hire_candidate: "A3",
  set_compensation: "A3",
  change_hiring_protocol: "A3",
};

export function authorityFor(actionType: ActionType): AuthorityClass {
  return DEFAULT_ACTION_AUTHORITY[actionType];
}

export function isAutomatic(actionType: ActionType): boolean {
  return DEFAULT_ACTION_AUTHORITY[actionType] === "A1";
}

export function requiresApproval(actionType: ActionType): boolean {
  return DEFAULT_ACTION_AUTHORITY[actionType] === "A2";
}

export function isHumanOnly(actionType: ActionType): boolean {
  return DEFAULT_ACTION_AUTHORITY[actionType] === "A3";
}
