"use client";

export const PAL_PROMPT_EVENT = "recruiterpal:prompt";

export interface PalPromptContext {
  entityType?: string;
  entityId?: string;
  applicationId?: string | null;
  title?: string;
}

export interface PalPromptDetail {
  prompt: string;
  context?: PalPromptContext;
}

export function requestPalPrompt(detail: PalPromptDetail) {
  window.dispatchEvent(new CustomEvent<PalPromptDetail>(PAL_PROMPT_EVENT, { detail }));
}
