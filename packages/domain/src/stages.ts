/**
 * Stage transitions are job/protocol-specific. Allowed edges are explicit,
 * defined per protocol version, and validated by this module. No LLM may
 * mutate stage state directly; every consequential terminal transition
 * requires an authorized human action record.
 */
import { IllegalTransitionError } from "./state-machines";

export const CANONICAL_STAGE_ORDER = [
  "APPLIED",
  "RECRUITER_REVIEW",
  "RECRUITER_SCREEN",
  "HM_REVIEW",
  "TECHNICAL_ASSESSMENT",
  "INTERVIEW_LOOP",
  "DECISION",
  "OFFER",
  "HIRED",
] as const;
export type CanonicalStageName = (typeof CANONICAL_STAGE_ORDER)[number];

export interface StageDefinition {
  readonly name: string;
  readonly required: boolean;
}

/** Explicit allowed edges for a protocol's stage graph. */
export type StageEdgeMap = Readonly<Record<string, readonly string[]>>;

/**
 * Build the default linear stage graph. Every non-final stage can advance to
 * its successor or exit via REJECTED; any stage may exit via WITHDRAWN.
 */
export function defaultStageGraph(stageNames: readonly string[]): StageEdgeMap {
  const edges: Record<string, string[]> = {};
  for (let i = 0; i < stageNames.length; i++) {
    const current = stageNames[i] as string;
    const next = stageNames[i + 1];
    edges[current] = next ? [next] : [];
  }
  for (const stage of Object.keys(edges)) {
    if (!edges[stage]?.includes("REJECTED")) {
      edges[stage] = [...(edges[stage] ?? []), "REJECTED"];
    }
    if (!edges[stage]?.includes("WITHDRAWN")) {
      edges[stage] = [...(edges[stage] ?? []), "WITHDRAWN"];
    }
  }
  return edges;
}

export function canTransitionStage(edges: StageEdgeMap, from: string, to: string): boolean {
  const allowed = edges[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

export function assertStageTransition(
  edges: StageEdgeMap,
  from: string,
  to: string,
): void {
  if (!canTransitionStage(edges, from, to)) {
    throw new IllegalTransitionError("application_stage", from, to);
  }
}
