/**
 * Email rendering.
 *
 * Mail clients are a decade behind browsers, so nothing from the site's stylesheet
 * applies here: layout is tables, every style is inline, and no rule depends on a
 * feature Outlook's Word rendering engine lacks. The palette matches Cineora, but
 * the implementation is deliberately primitive.
 *
 * Two rules matter more than the styling. Every message ships a plain-text
 * alternative, because a text/plain part is what stops a message being scored as
 * spam and what a screen reader or a terminal client reads. And every interpolated
 * value is escaped, because a display name arrives from a text field.
 */

const PALETTE = {
  page: '#05060a',
  card: '#0d1017',
  cardEdge: '#1c2130',
  raised: '#12151d',
  heading: '#ffffff',
  body: '#bcc2d0',
  muted: '#7b8395',
  accent: '#d4213d',
  accentSoft: '#ff8b9f',
} as const;

const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export type MailBlock =
  | { kind: 'text'; text: string; tone?: 'body' | 'muted' }
  | { kind: 'button'; label: string; href: string }
  | { kind: 'code'; value: string; caption?: string }
  | { kind: 'fallback'; href: string; caption?: string }
  | { kind: 'facts'; rows: ReadonlyArray<readonly [string, string]> }
  | { kind: 'notice'; text: string }
  | { kind: 'divider' };

export interface MailDocument {
  subject: string;
  /** The line a client shows next to the subject in the inbox list. */
  preheader: string;
  heading: string;
  blocks: readonly MailBlock[];
  /** Small print under the divider. Plain sentences, no marketing. */
  footer?: readonly string[];
}

export interface RenderedMail {
  subject: string;
  html: string;
  text: string;
}

function renderBlockHtml(block: MailBlock): string {
  switch (block.kind) {
    case 'text':
      return `<tr><td style="padding:0 0 16px 0;font-family:${FONT};font-size:15px;line-height:24px;color:${
        block.tone === 'muted' ? PALETTE.muted : PALETTE.body
      };mso-line-height-rule:exactly;">${escapeHtml(block.text)}</td></tr>`;

    case 'button':
      // A table wrapper is what gives the button a reliable hit area and lets
      // Outlook render the fill; padding on the anchor sizes it everywhere else.
      return `<tr><td style="padding:8px 0 24px 0;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr>
          <td align="center" bgcolor="${PALETTE.accent}" style="border-radius:999px;">
            <a href="${escapeHtml(block.href)}" style="display:inline-block;padding:14px 30px;font-family:${FONT};font-size:15px;font-weight:600;line-height:20px;color:#ffffff;text-decoration:none;border-radius:999px;">${escapeHtml(
              block.label,
            )}</a>
          </td>
        </tr></table>
      </td></tr>`;

    case 'code':
      return `<tr><td style="padding:0 0 20px 0;">
        ${
          block.caption
            ? `<div style="font-family:${FONT};font-size:13px;line-height:20px;color:${PALETTE.muted};padding-bottom:8px;">${escapeHtml(
                block.caption,
              )}</div>`
            : ''
        }
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr>
          <td align="center" bgcolor="${PALETTE.raised}" style="border:1px solid ${PALETTE.cardEdge};border-radius:14px;padding:18px 12px;font-family:${FONT};font-size:26px;font-weight:700;letter-spacing:6px;color:${PALETTE.heading};">${escapeHtml(
            block.value,
          )}</td>
        </tr></table>
      </td></tr>`;

    case 'fallback':
      return `<tr><td style="padding:0 0 20px 0;font-family:${FONT};font-size:13px;line-height:20px;color:${PALETTE.muted};">
        ${escapeHtml(block.caption ?? 'If the button does not work, copy this link into your browser:')}<br>
        <span style="color:${PALETTE.accentSoft};word-break:break-all;">${escapeHtml(block.href)}</span>
      </td></tr>`;

    case 'facts':
      return `<tr><td style="padding:0 0 20px 0;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid ${
          PALETTE.cardEdge
        };border-radius:14px;">
          ${block.rows
            .map(
              ([label, value], index) =>
                `<tr><td style="padding:12px 16px;font-family:${FONT};font-size:13px;line-height:18px;color:${
                  PALETTE.muted
                };${index > 0 ? `border-top:1px solid ${PALETTE.cardEdge};` : ''}">${escapeHtml(label)}</td>
                 <td align="right" style="padding:12px 16px;font-family:${FONT};font-size:13px;line-height:18px;color:${
                   PALETTE.heading
                 };${index > 0 ? `border-top:1px solid ${PALETTE.cardEdge};` : ''}">${escapeHtml(value)}</td></tr>`,
            )
            .join('')}
        </table>
      </td></tr>`;

    case 'notice':
      return `<tr><td style="padding:0 0 20px 0;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr>
          <td bgcolor="${PALETTE.raised}" style="border-left:3px solid ${PALETTE.accent};border-radius:6px;padding:14px 16px;font-family:${FONT};font-size:14px;line-height:21px;color:${PALETTE.body};">${escapeHtml(
            block.text,
          )}</td>
        </tr></table>
      </td></tr>`;

    case 'divider':
      return `<tr><td style="padding:4px 0 20px 0;"><div style="height:1px;background:${PALETTE.cardEdge};line-height:1px;font-size:0;">&nbsp;</div></td></tr>`;
  }
}

function renderBlockText(block: MailBlock): string | null {
  switch (block.kind) {
    case 'text':
      return block.text;
    case 'button':
      return `${block.label}: ${block.href}`;
    case 'code':
      return block.caption ? `${block.caption}\n${block.value}` : block.value;
    case 'fallback':
      return block.href;
    case 'facts':
      return block.rows.map(([label, value]) => `- ${label}: ${value}`).join('\n');
    case 'notice':
      return block.text;
    case 'divider':
      return '---';
  }
}

/**
 * Builds both parts of one message.
 *
 * The preheader trick — a hidden line followed by padding characters — is the only
 * way to control the preview text an inbox shows, and without it clients quote the
 * first visible words, which are the wordmark.
 */
export function renderMail(document: MailDocument): RenderedMail {
  const body = document.blocks.map(renderBlockHtml).join('');
  const footer = (document.footer ?? [])
    .map(
      (line) =>
        `<div style="font-family:${FONT};font-size:12px;line-height:19px;color:${PALETTE.muted};padding-bottom:6px;">${escapeHtml(
          line,
        )}</div>`,
    )
    .join('');

  const html = `<!doctype html>
<html lang="en" dir="ltr" style="background:${PALETTE.page};">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${escapeHtml(document.subject)}</title>
</head>
<body style="margin:0;padding:0;background:${PALETTE.page};-webkit-text-size-adjust:100%;">
<div style="display:none;font-size:1px;color:${PALETTE.page};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(
    document.preheader,
  )}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="${PALETTE.page}" style="background:${PALETTE.page};">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;">

      <tr><td style="padding:0 0 24px 0;">
        <span style="font-family:${FONT};font-size:19px;font-weight:700;letter-spacing:5px;color:${PALETTE.heading};text-transform:uppercase;">Cineora</span>
        <span style="display:inline-block;width:26px;height:3px;background:${PALETTE.accent};border-radius:3px;vertical-align:middle;margin-left:10px;"></span>
      </td></tr>

      <tr><td bgcolor="${PALETTE.card}" style="background:${PALETTE.card};border:1px solid ${PALETTE.cardEdge};border-radius:20px;padding:32px 28px 12px 28px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr><td style="padding:0 0 14px 0;font-family:${FONT};font-size:23px;line-height:31px;font-weight:700;color:${PALETTE.heading};mso-line-height-rule:exactly;">${escapeHtml(
            document.heading,
          )}</td></tr>
          ${body}
        </table>
      </td></tr>

      <tr><td style="padding:22px 4px 0 4px;">${footer}</td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  const text = [
    `CINEORA`,
    '',
    document.heading,
    '',
    ...document.blocks.map(renderBlockText).filter((line): line is string => line !== null),
    '',
    ...(document.footer ?? []),
  ].join('\n');

  return { subject: document.subject, html, text };
}
