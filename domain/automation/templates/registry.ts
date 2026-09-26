import type { RegisteredEmailTemplate, RenderedEmail } from "./define";
import { boasVindasV1 } from "./boas-vindas.v1";

/**
 * Every shipped template version stays registered for as long as a queued
 * delivery may reference it. Add new versions; never edit or remove old ones.
 */
export const emailTemplates: readonly RegisteredEmailTemplate[] = [boasVindasV1];

export class UnknownEmailTemplateError extends Error {
  constructor(key: string, version?: number) {
    super(`template de e-mail não registrado: ${version === undefined ? key : `${key}@${version}`}`);
    this.name = "UnknownEmailTemplateError";
  }
}

export function getEmailTemplate(key: string, version: number): RegisteredEmailTemplate {
  const template = emailTemplates.find((candidate) => candidate.key === key && candidate.version === version);
  if (!template) throw new UnknownEmailTemplateError(key, version);
  return template;
}

export function getLatestEmailTemplate(key: string): RegisteredEmailTemplate {
  let latest: RegisteredEmailTemplate | undefined;
  for (const candidate of emailTemplates) {
    if (candidate.key === key && (!latest || candidate.version > latest.version)) latest = candidate;
  }
  if (!latest) throw new UnknownEmailTemplateError(key);
  return latest;
}

export function renderEmailTemplate(key: string, version: number, data: unknown): RenderedEmail {
  return getEmailTemplate(key, version).render(data);
}
