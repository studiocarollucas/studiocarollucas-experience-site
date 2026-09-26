const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Every value interpolated into template HTML must pass through this. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character] ?? character);
}

type EmailLayoutInput = {
  /** Already-escaped inner HTML. */
  bodyHtml: string;
  /** Plain preview text shown by mail clients; escaped here. */
  preheader: string;
};

/**
 * Minimal, table-free layout with inline styles (mail clients strip <style>),
 * using the brand's warm neutrals. Shared by all templates so a visual change
 * never alters copy.
 */
export function renderEmailLayout({ bodyHtml, preheader }: EmailLayoutInput): string {
  return [
    "<!doctype html>",
    '<html lang="pt-BR">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    "<title>Stúdio Carol Lucas</title>",
    "</head>",
    '<body style="margin:0;padding:0;background:#f7f3ee;color:#2b2522;font-family:Georgia,\'Times New Roman\',serif;">',
    `<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preheader)}</div>`,
    '<div style="max-width:560px;margin:0 auto;padding:32px 24px;font-size:16px;line-height:1.6;">',
    '<p style="margin:0 0 24px;font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#8a7768;">Stúdio Carol Lucas</p>',
    bodyHtml,
    '<p style="margin:32px 0 0;font-size:12px;color:#8a7768;">Você recebeu este e-mail porque tem uma experiência com o Stúdio Carol Lucas.</p>',
    "</div>",
    "</body>",
    "</html>",
  ].join("\n");
}

/** Renders a call-to-action link; the URL must already be validated as http(s). */
export function renderEmailButton(label: string, url: string): string {
  return `<p style="margin:24px 0;"><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 24px;background:#2b2522;color:#f7f3ee;text-decoration:none;border-radius:2px;">${escapeHtml(label)}</a></p>`;
}
