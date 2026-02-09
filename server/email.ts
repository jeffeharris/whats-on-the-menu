import { Resend } from 'resend';

export const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
export const APP_URL = process.env.APP_URL || 'http://localhost:5173';
export const EMAIL_FROM = "What's On The Menu <noreply@whatsonthemenu.app>";

// ============================================================
// Branded email template
// ============================================================

// Table-based HTML for maximum email client compatibility.
// Colors from the app design system: primary #5B8DEE, bg #FAFAF8.

interface EmailOptions {
  preheader?: string;
  heading: string;
  body: string;           // HTML for the main content area
  buttonText: string;
  buttonUrl: string;
  footnote?: string;      // small text below button
  footer?: string;        // override default footer
}

export function emailTemplate(opts: EmailOptions): string {
  const {
    preheader = '',
    heading,
    body,
    buttonText,
    buttonUrl,
    footnote,
    footer = "If you didn't expect this email, you can safely ignore it.",
  } = opts;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${heading}</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    body, table, td { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    a { color: #5B8DEE; }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f4f4f2; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">
  ${preheader ? `<div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">${preheader}</div>` : ''}

  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f2;">
    <tr>
      <td align="center" style="padding: 40px 16px;">

        <!-- Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">

          <!-- Logo bar -->
          <tr>
            <td align="center" style="padding: 32px 32px 0 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#5B8DEE; width:48px; height:48px; border-radius:12px; text-align:center; vertical-align:middle; font-size:24px; color:#ffffff; font-weight:bold;">
                    W
                  </td>
                </tr>
              </table>
              <p style="margin: 12px 0 0 0; font-size:18px; font-weight:700; color:#1a1a1a; letter-spacing:-0.3px;">
                What's On The Menu
              </p>
            </td>
          </tr>

          <!-- Heading -->
          <tr>
            <td align="center" style="padding: 24px 32px 0 32px;">
              <h1 style="margin:0; font-size:22px; font-weight:700; color:#1a1a1a; line-height:1.3;">
                ${heading}
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 16px 32px 0 32px; font-size:15px; line-height:1.6; color:#4a4a4a;">
              ${body}
            </td>
          </tr>

          <!-- Button -->
          <tr>
            <td align="center" style="padding: 24px 32px 0 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#5B8DEE; border-radius:12px;">
                    <a href="${buttonUrl}" target="_blank" style="display:inline-block; padding:14px 32px; font-size:15px; font-weight:600; color:#ffffff; text-decoration:none; border-radius:12px;">
                      ${buttonText}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${footnote ? `
          <!-- Footnote -->
          <tr>
            <td align="center" style="padding: 12px 32px 0 32px;">
              <p style="margin:0; font-size:13px; color:#9a9a9a;">${footnote}</p>
            </td>
          </tr>
          ` : ''}

          <!-- Divider + footer -->
          <tr>
            <td style="padding: 24px 32px 0 32px;">
              <hr style="border:none; border-top:1px solid #eee; margin:0;" />
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 16px 32px 32px 32px;">
              <p style="margin:0; font-size:12px; color:#b0b0b0; line-height:1.5;">
                ${footer}
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>
</body>
</html>`;
}
