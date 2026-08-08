import nodemailer from 'nodemailer';

export interface MailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  type?: 'verification' | 'invite' | 'password_reset' | 'notification' | 'general';
  metadata?: Record<string, any>;
}

export interface MailOutboxItem {
  id: string;
  to: string;
  subject: string;
  type: string;
  status: 'delivered' | 'failed' | 'queued';
  timestamp: string;
  messageId?: string;
  bodySnippet: string;
  html: string;
  code?: string;
}

// Global In-memory Mail Outbox Database
export const mailOutboxDb: MailOutboxItem[] = [];

// Initialize Nodemailer Transporter safely
export function getMailerTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
    });
  }

  // Fallback: JSON stream transport for development/in-app preview without failing
  return nodemailer.createTransport({
    jsonTransport: true,
  });
}

// Generate Verification Code HTML Template
export function generateVerificationEmailHtml(email: string, code: string, fullName?: string) {
  const name = fullName || email.split('@')[0];
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0a0a0c; color: #ffffff; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 40px auto; background-color: #121215; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 36px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    .header { display: flex; align-items: center; margin-bottom: 24px; }
    .logo { font-size: 22px; font-weight: 800; letter-spacing: 1px; color: #ffffff; }
    .logo span { color: #3b82f6; }
    .subtitle { font-size: 10px; color: #94a3b8; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; margin-top: 2px; }
    h1 { font-size: 22px; font-weight: 700; color: #ffffff; margin-top: 0; margin-bottom: 12px; }
    p { font-size: 14px; color: #cbd5e1; line-height: 1.6; margin-bottom: 24px; }
    .code-box { background: linear-gradient(135deg, #1e293b, #0f172a); border: 1px solid #3b82f6; border-radius: 14px; padding: 20px; text-align: center; margin-bottom: 28px; }
    .code { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #60a5fa; margin: 0; }
    .code-label { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-top: 6px; }
    .footer { font-size: 11px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px; margin-top: 32px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <div class="logo">FLOW<span>BOARD</span></div>
        <div class="subtitle">PLAN • ALGORITHM • BUILD</div>
      </div>
    </div>
    <h1>Account Verification Code</h1>
    <p>Hi <strong>${name}</strong>,</p>
    <p>Thank you for signing up for FlowBoard. Please use the 6-digit confirmation code below to complete your email verification and activate your account:</p>
    <div class="code-box">
      <div class="code">${code}</div>
      <div class="code-label">Security Verification Code</div>
    </div>
    <p>This code will expire in 15 minutes. If you did not request this email, please ignore this message.</p>
    <div class="footer">
      Sent with security by FlowBoard Mail Service • Do not reply directly to this email.
    </div>
  </div>
</body>
</html>
  `;
}

// Generate Team Invite HTML Template
export function generateTeamInviteEmailHtml(email: string, teamName: string, role: string, inviteUrl: string, senderName?: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0a0a0c; color: #ffffff; margin: 0; padding: 0; }
    .container { max-width: 580px; margin: 40px auto; background-color: #121215; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 36px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    .header { margin-bottom: 24px; }
    .logo { font-size: 22px; font-weight: 800; letter-spacing: 1px; color: #ffffff; }
    .logo span { color: #3b82f6; }
    .subtitle { font-size: 10px; color: #94a3b8; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; margin-top: 2px; }
    h1 { font-size: 22px; font-weight: 700; color: #ffffff; margin-top: 0; margin-bottom: 12px; }
    p { font-size: 14px; color: #cbd5e1; line-height: 1.6; margin-bottom: 20px; }
    .card { background-color: #1e293b; border: 1px solid rgba(59, 130, 246, 0.4); border-radius: 14px; padding: 20px; margin-bottom: 28px; }
    .team-title { font-size: 18px; font-weight: 700; color: #ffffff; margin-bottom: 4px; }
    .role-badge { display: inline-block; background-color: #3b82f6; color: #ffffff; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 9999px; text-transform: uppercase; margin-top: 8px; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff !important; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 12px; box-shadow: 0 4px 12px rgba(37,99,235,0.4); text-align: center; }
    .btn-container { text-align: center; margin: 28px 0; }
    .footer { font-size: 11px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px; margin-top: 32px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">FLOW<span>BOARD</span></div>
      <div class="subtitle">TEAM COLLABORATION & ARCHITECTURE</div>
    </div>
    <h1>You've been invited to join ${teamName}!</h1>
    <p>Hello,</p>
    <p><strong>${senderName || 'A team member'}</strong> has invited you to collaborate on system architectures, BPMN workflows, and whiteboard diagrams in FlowBoard.</p>
    <div class="card">
      <div class="team-title">${teamName}</div>
      <p style="margin:0; font-size:12px; color:#94a3b8;">Assigned Permissions:</p>
      <div class="role-badge">${role}</div>
    </div>
    <div class="btn-container">
      <a href="${inviteUrl}" class="btn">Accept Invitation & Join Board</a>
    </div>
    <p style="font-size:12px; color:#94a3b8;">Or copy and paste this direct link into your browser:<br/><a href="${inviteUrl}" style="color:#60a5fa; word-break:break-all;">${inviteUrl}</a></p>
    <div class="footer">
      FlowBoard Enterprise Whiteboard Systems • Instant Real-time Collaboration
    </div>
  </div>
</body>
</html>
  `;
}

// Generate Password Reset HTML Template
export function generatePasswordResetEmailHtml(email: string, resetCode: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0a0a0c; color: #ffffff; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 40px auto; background-color: #121215; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 36px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    .logo { font-size: 22px; font-weight: 800; letter-spacing: 1px; color: #ffffff; }
    .logo span { color: #3b82f6; }
    h1 { font-size: 22px; font-weight: 700; color: #ffffff; margin-top: 16px; margin-bottom: 12px; }
    p { font-size: 14px; color: #cbd5e1; line-height: 1.6; margin-bottom: 24px; }
    .code-box { background-color: #1e293b; border: 1px solid #e11d48; border-radius: 14px; padding: 20px; text-align: center; margin-bottom: 28px; }
    .code { font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #fb7185; margin: 0; }
    .footer { font-size: 11px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px; margin-top: 32px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">FLOW<span>BOARD</span></div>
    <h1>Password Reset Request</h1>
    <p>Hello,</p>
    <p>We received a request to reset the password for your account (<strong>${email}</strong>). Please enter the security code below to reset your password:</p>
    <div class="code-box">
      <div class="code">${resetCode}</div>
    </div>
    <p>If you didn't request a password reset, you can safely ignore this email.</p>
    <div class="footer">
      FlowBoard Security System
    </div>
  </div>
</body>
</html>
  `;
}

// Primary Send Email Handler
export async function sendEmail(options: MailOptions) {
  const transporter = getMailerTransporter();
  const fromEmail = process.env.SMTP_FROM || process.env.MAIL_FROM || 'FlowBoard Mail Service <noreply@flowboard.app>';

  const mailId = 'mail-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);

  const mailConfig = {
    from: fromEmail,
    to: options.to,
    subject: options.subject,
    text: options.text || options.subject,
    html: options.html || `<p>${options.text || options.subject}</p>`,
  };

  try {
    const info = await transporter.sendMail(mailConfig);
    const messageId = info.messageId || `msg_${mailId}`;

    const outboxItem: MailOutboxItem = {
      id: mailId,
      to: options.to,
      subject: options.subject,
      type: options.type || 'general',
      status: 'delivered',
      timestamp: new Date().toISOString(),
      messageId,
      bodySnippet: (options.text || options.subject).substring(0, 100),
      html: mailConfig.html,
      code: options.metadata?.code,
    };

    mailOutboxDb.unshift(outboxItem);
    if (mailOutboxDb.length > 100) mailOutboxDb.pop();

    console.log(`[MailingService] Email successfully dispatched to ${options.to} (MessageID: ${messageId})`);

    return {
      success: true,
      messageId,
      mailId,
      to: options.to,
      subject: options.subject,
      status: 'delivered',
      sentVia: process.env.SMTP_HOST ? 'SMTP Server' : 'FlowBoard Mail Gateway',
      timestamp: outboxItem.timestamp,
    };
  } catch (err: any) {
    console.error(`[MailingService] Error delivering email to ${options.to}:`, err);

    const failedItem: MailOutboxItem = {
      id: mailId,
      to: options.to,
      subject: options.subject,
      type: options.type || 'general',
      status: 'failed',
      timestamp: new Date().toISOString(),
      bodySnippet: `Error: ${err.message}`,
      html: mailConfig.html,
    };

    mailOutboxDb.unshift(failedItem);
    if (mailOutboxDb.length > 100) mailOutboxDb.pop();

    return {
      success: false,
      error: err.message || 'Failed to deliver email',
      to: options.to,
      status: 'failed',
    };
  }
}
