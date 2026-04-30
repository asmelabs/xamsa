/** Approximates light theme `--primary` / `--foreground` / `--muted-foreground` from app UI */
const COLOR_PRIMARY = "#c9781a";
const COLOR_FOREGROUND = "#2b2b2b";
const COLOR_MUTED = "#545454";
const COLOR_BORDER = "#d9d4cc";
const COLOR_CARD = "#f7f6f4";

export function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/"/g, "&quot;");
}

export interface EmailLayoutOptions {
	title: string;
	introHtml: string;
	primaryButton?: { href: string; label: string };
	footerLinks?: { href: string; label: string }[];
}

/** Table-based transactional HTML for broad mail client compatibility. */
export function buildTransactionalHtml(options: EmailLayoutOptions): string {
	let buttonRow = "";
	if (options.primaryButton) {
		const { href, label } = options.primaryButton;
		buttonRow = `
<tr>
<td align="center" style="padding:8px 0 24px 0;">
  <a href="${href}" style="display:inline-block;padding:14px 28px;background:${COLOR_PRIMARY};color:#fdfcfa;text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;">
    ${escapeHtml(label)}
  </a>
</td>
</tr>`;
	}

	const footerLine = options.footerLinks?.length
		? options.footerLinks
				.map(
					(l) =>
						`<a href="${l.href}" style="color:${COLOR_MUTED};text-decoration:underline;margin:0 8px;font-size:12px;font-family:Helvetica,Arial,sans-serif;">${escapeHtml(l.label)}</a>`,
				)
				.join(" · ")
		: `<a href="https://xamsa.site" style="color:${COLOR_MUTED};text-decoration:underline;font-size:12px;font-family:Helvetica,Arial,sans-serif;">xamsa.site</a>`;

	const siteRoot = "https://xamsa.site";

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(options.title)}</title>
</head>
<body style="margin:0;background:${COLOR_CARD};padding:24px 12px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
<tr>
<td align="center">
  <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid ${COLOR_BORDER};border-collapse:collapse;">
  <tr>
    <td style="padding:28px 32px 16px 32px;">
      <p style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:15px;font-weight:700;color:${COLOR_PRIMARY};letter-spacing:-0.02em;">Xamsa</p>
      <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:700;color:${COLOR_FOREGROUND};line-height:1.25;">
        ${escapeHtml(options.title)}
      </h1>
      <div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:${COLOR_FOREGROUND};">
        ${options.introHtml}
      </div>
    </td>
  </tr>
  ${buttonRow}
  <tr>
    <td style="padding:20px 32px 28px;border-top:1px solid ${COLOR_BORDER};background:${COLOR_CARD};">
      <p style="margin:0 0 12px;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:${COLOR_MUTED};text-align:center;">
        ${footerLine}
      </p>
      <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:11px;line-height:1.4;color:${COLOR_MUTED};text-align:center;">
        You receive this email because of an action on your Xamsa account.<br/>
        <a href="${siteRoot}" style="color:${COLOR_MUTED};">Visit Xamsa</a>
      </p>
    </td>
  </tr>
  </table>
</td>
</tr>
</table>
</body>
</html>`;
}
