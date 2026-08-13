import { UserProfileData } from '../types';
import { getApiUrl } from './api';

export const DEFAULT_ANY2_WEBHOOK_URL = 'https://internai.app.n8n.cloud/webhook/3b56b40a-bf87-4ece-b07e-a46faeb2e770';

export const EMAIL_SUBJECT = 'Our team contacted you in 24 hours';

/**
 * Generate a responsive HTML Email string for Any2 / n8n automation
 */
export function generateAny2HtmlEmail(profile: UserProfileData): string {
  const firstName = profile.firstName || 'Valued Client';
  const email = profile.email || 'client@example.com';
  const phoneNumber = profile.phoneNumber || 'Not provided';
  const location = profile.location || 'Global';
  const otherDetails = profile.otherDetails || 'No additional details specified';
  const submittedAt = profile.updatedAt ? new Date(profile.updatedAt).toLocaleString() : new Date().toLocaleString();

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${EMAIL_SUBJECT}</title>
</head>
<body style="margin:0; padding:0; background-color:#0f172a; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color:#e2e8f0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0f172a; padding:40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:600px; background-color:#1e293b; border:1px solid #334155; border-radius:16px; overflow:hidden; box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background:linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding:32px 28px; text-align:center;">
              <h1 style="margin:0; color:#ffffff; font-size:26px; font-weight:800; letter-spacing:1px; text-transform:uppercase;">
                FLOWBOARD<span style="color:#93c5fd;">.AI</span>
              </h1>
              <p style="margin:8px 0 0 0; color:#dbeafe; font-size:14px; font-weight:500;">
                Client Registration & Automation Webhook Confirmation
              </p>
            </td>
          </tr>

          <!-- Main Body Content -->
          <tr>
            <td style="padding:32px 28px;">
              
              <!-- Greeting & Status Badge -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="display:inline-block; background-color:#10b981; color:#ffffff; font-size:12px; font-weight:700; padding:6px 14px; border-radius:20px; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:16px;">
                      ✓ Webhook Processed
                    </div>
                    <h2 style="margin:0 0 12px 0; color:#ffffff; font-size:20px; font-weight:700;">
                      Hello ${firstName},
                    </h2>
                    <p style="margin:0 0 20px 0; color:#94a3b8; font-size:15px; line-height:1.6;">
                      Thank you for logging in and filling out your registration form. <strong style="color:#38bdf8;">${EMAIL_SUBJECT}</strong> regarding your system architecture blueprint and details.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Client Summary Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0f172a; border:1px solid #334155; border-radius:12px; padding:20px; margin-bottom:24px;">
                <tr>
                  <td>
                    <h3 style="margin:0 0 14px 0; color:#38bdf8; font-size:14px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">
                      📋 Submitted Client Details
                    </h3>
                    
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="6" style="color:#e2e8f0; font-size:14px;">
                      <tr>
                        <td width="35%" style="color:#64748b; font-weight:600;">First Name:</td>
                        <td width="65%" style="color:#ffffff; font-weight:700;">${firstName}</td>
                      </tr>
                      <tr>
                        <td style="color:#64748b; font-weight:600;">Email ID:</td>
                        <td style="color:#38bdf8; font-weight:600;">${email}</td>
                      </tr>
                      <tr>
                        <td style="color:#64748b; font-weight:600;">Phone Number:</td>
                        <td style="color:#ffffff;">${phoneNumber}</td>
                      </tr>
                      <tr>
                        <td style="color:#64748b; font-weight:600;">Location:</td>
                        <td style="color:#ffffff;">${location}</td>
                      </tr>
                      <tr>
                        <td style="color:#64748b; font-weight:600; vertical-align:top;">Other Details:</td>
                        <td style="color:#cbd5e1; vertical-align:top;">${otherDetails}</td>
                      </tr>
                      <tr>
                        <td style="color:#64748b; font-weight:600;">Submitted At:</td>
                        <td style="color:#94a3b8; font-size:12px;">${submittedAt}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Action Callout Box -->
              <div style="background:linear-gradient(90deg, rgba(59,130,246,0.1) 0%, rgba(147,197,253,0.05) 100%); border-left:4px solid #3b82f6; padding:16px 20px; border-radius:8px; margin-bottom:28px;">
                <p style="margin:0; color:#93c5fd; font-size:14px; font-weight:600;">
                  ⏱️ 24-Hour Contact Guarantee:
                </p>
                <p style="margin:4px 0 0 0; color:#cbd5e1; font-size:13px; line-height:1.5;">
                  Our architecture team is reviewing your profile for <strong>${location}</strong>. Expect a direct follow-up via <strong>${email}</strong> or <strong>${phoneNumber}</strong>.
                </p>
              </div>

              <!-- Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="https://ai.studio/build" style="display:inline-block; background-color:#2563eb; color:#ffffff; font-size:15px; font-weight:700; text-decoration:none; padding:14px 32px; border-radius:10px; box-shadow:0 4px 12px rgba(37,99,235,0.4);">
                      Launch FlowBoard App →
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#0f172a; border-top:1px solid #334155; padding:20px 28px; text-align:center;">
              <p style="margin:0; color:#64748b; font-size:12px; line-height:1.5;">
                Automated webhook response generated by Any2 / n8n Expression Engine.<br>
                FlowBoard.ai Enterprise Platform
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

/**
 * Build full Any2 / n8n webhook expression payload JSON object
 */
export function buildAny2WebhookPayload(profile: UserProfileData) {
  const htmlBody = generateAny2HtmlEmail(profile);
  return {
    automationTool: 'Any2 / n8n',
    webhookType: 'expression',
    subject: EMAIL_SUBJECT,
    htmlBody: htmlBody,
    client: {
      firstName: profile.firstName,
      phoneNumber: profile.phoneNumber,
      email: profile.email,
      location: profile.location,
      otherDetails: profile.otherDetails,
    },
    meta: {
      source: 'FlowBoard Client Registration Form',
      submittedAt: profile.updatedAt || new Date().toISOString(),
      webhookUrl: DEFAULT_ANY2_WEBHOOK_URL,
    },
  };
}

/**
 * Sends client form data to Any2 / n8n webhook endpoint
 */
export async function sendProfileToAny2Webhook(
  profile: UserProfileData,
  webhookUrl: string = DEFAULT_ANY2_WEBHOOK_URL
): Promise<{ success: boolean; status?: number; responseText?: string; error?: string }> {
  try {
    // Call server endpoint proxy first or direct fetch
    const res = await fetch(getApiUrl('/api/webhook/trigger'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webhookUrl: webhookUrl || DEFAULT_ANY2_WEBHOOK_URL,
        profile,
      }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true, status: res.status, responseText: JSON.stringify(data.webhookResponse) };
    }

    // Direct fetch fallback if backend proxy fails
    const payload = buildAny2WebhookPayload(profile);
    const directRes = await fetch(webhookUrl || DEFAULT_ANY2_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await directRes.text();
    return {
      success: directRes.ok,
      status: directRes.status,
      responseText: text,
    };
  } catch (err: any) {
    console.error('Error triggering Any2 Webhook:', err);
    return {
      success: false,
      error: err?.message || 'Network error while triggering Webhook',
    };
  }
}
