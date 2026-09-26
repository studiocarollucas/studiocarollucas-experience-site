import type { z } from "zod";

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

export type TemplateData = Record<string, unknown>;

/**
 * A template version is immutable once shipped: changing copy means adding a new
 * version, because queued deliveries keep rendering the version pinned at enqueue.
 */
export type EmailTemplateDefinition<TData extends TemplateData> = {
  key: string;
  version: number;
  description: string;
  schema: z.ZodType<TData>;
  render: (data: TData) => RenderedEmail;
};

export type RegisteredEmailTemplate = {
  key: string;
  version: number;
  description: string;
  /** Validates and normalizes untrusted data; throws EmailTemplateDataError. */
  parse: (data: unknown) => TemplateData;
  render: (data: unknown) => RenderedEmail;
};

export class EmailTemplateDataError extends Error {
  constructor(templateId: string, fields: string[]) {
    // Only field paths — never the rejected values, which may be personal data.
    super(`dados inválidos para o template ${templateId}: ${fields.join(", ") || "(raiz)"}`);
    this.name = "EmailTemplateDataError";
  }
}

export function defineEmailTemplate<TData extends TemplateData>(
  definition: EmailTemplateDefinition<TData>,
): RegisteredEmailTemplate {
  const templateId = `${definition.key}@${definition.version}`;

  function parse(data: unknown): TData {
    const result = definition.schema.safeParse(data);
    if (!result.success) {
      const fields = Array.from(new Set(result.error.issues.map((issue) => issue.path.map(String).join("."))));
      throw new EmailTemplateDataError(templateId, fields);
    }
    return result.data;
  }

  return {
    key: definition.key,
    version: definition.version,
    description: definition.description,
    parse,
    render: (data) => definition.render(parse(data)),
  };
}
