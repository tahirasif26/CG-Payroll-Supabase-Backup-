import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Resend } from 'resend';
import { TypedConfigService } from '@config/typed-config.service';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export interface SendEmailResult {
  ok: boolean;
  /** Resend's message id when delivery succeeded. */
  id?: string;
  /** Human-readable description of why delivery failed, if it did. */
  error?: string;
  /** True when `RESEND_API_KEY` is empty and we no-opped to console only. */
  skipped?: boolean;
}

const BRAND_NAME = 'HRConnect';

/**
 * Single delivery channel for every transactional email the API sends.
 * Talks to Resend; failures are logged but never thrown, so callers don't
 * have to wrap each `await` and a bad API key can't break user-facing flows.
 *
 * Set `RESEND_API_KEY` + `EMAIL_FROM` (on a domain verified in Resend) to
 * deliver mail. Leaving the key empty puts the service into a no-op mode
 * that simply logs the message — convenient for local dev and CI.
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private resend: Resend | null = null;
  private fromAddress = '';

  constructor(private readonly config: TypedConfigService) {}

  onModuleInit(): void {
    this.fromAddress = this.config.get('EMAIL_FROM');
    const apiKey = this.config.get('RESEND_API_KEY');

    if (!apiKey) {
      this.logger.warn(
        'RESEND_API_KEY is empty — emails will be logged to the console only. ' +
          'Set RESEND_API_KEY + a verified EMAIL_FROM domain to deliver mail.',
      );
      return;
    }

    this.resend = new Resend(apiKey);
    this.logger.log(`Resend mail transport ready (from=${this.fromAddress})`);
  }

  // ─────────────────────────── Generic send ──────────────────────────────

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    if (!this.resend) {
      this.logger.log(
        `[MAIL → ${input.to}] (no-op, RESEND_API_KEY missing) subject="${input.subject}"`,
      );
      return { ok: false, skipped: true, error: 'RESEND_API_KEY not configured' };
    }
    this.logger.log(
      `[MAIL] sending from="${this.fromAddress}" to="${input.to}" subject="${input.subject}"`,
    );
    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromAddress,
        to: input.to,
        subject: input.subject,
        html: input.html,
      });
      if (error) {
        const detail = JSON.stringify(error);
        this.logger.error(
          `[MAIL → ${input.to}] Resend rejected the send: ${detail}`,
        );
        return { ok: false, error: error.message ?? detail };
      }
      this.logger.log(
        `[MAIL → ${input.to}] sent id=${data?.id ?? 'unknown'} subject="${input.subject}"`,
      );
      return { ok: true, id: data?.id };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`[MAIL → ${input.to}] unexpected error: ${message}`);
      return { ok: false, error: message };
    }
  }

  // ─────────────────────────── Templates ─────────────────────────────────

  sendInvitation(input: {
    to: string;
    token: string;
    companyName: string;
    recipientName?: string | null;
  }): Promise<SendEmailResult> {
    const url = `${this.config.get('FRONTEND_URL')}/accept-invite?token=${encodeURIComponent(input.token)}`;
    return this.send({
      to: input.to,
      subject: `You have been invited to ${BRAND_NAME}`,
      html: renderInvitationEmail({
        recipientName: input.recipientName ?? null,
        companyName: input.companyName,
        url,
      }),
    });
  }

  sendPasswordReset(to: string, token: string): Promise<SendEmailResult> {
    const url = `${this.config.get('FRONTEND_URL')}/reset-password?token=${encodeURIComponent(token)}`;
    return this.send({
      to,
      subject: `Reset your ${BRAND_NAME} password`,
      html: renderPasswordResetEmail({ url }),
    });
  }

  sendEmailVerification(to: string, token: string): Promise<SendEmailResult> {
    const url = `${this.config.get('FRONTEND_URL')}/verify-email?token=${encodeURIComponent(token)}`;
    return this.send({
      to,
      subject: `Verify your ${BRAND_NAME} email`,
      html: renderEmailVerificationEmail({ url }),
    });
  }

  sendApprovalNotification(input: {
    to: string;
    approverName?: string | null;
    requestType: string; // 'leave' | 'expense' | 'loan' | 'advance' | 'payroll'
    submittedByName: string;
    detail: string; // "5 days (Mar 1 – Mar 5)" or "AED 1,200 — Client lunch"
    reviewUrl: string;
  }): Promise<SendEmailResult> {
    const subject =
      `Action Required: New ${input.requestType} request awaiting your approval`;
    return this.send({
      to: input.to,
      subject,
      html: renderApprovalEmail(input),
    });
  }
}

// ─── Templates ───────────────────────────────────────────────────────────

function renderInvitationEmail(input: {
  recipientName: string | null;
  companyName: string;
  url: string;
}): string {
  const greeting = input.recipientName ? `Hi ${escapeHtml(input.recipientName)},` : 'Hello,';
  return baseLayout({
    preheader: `You have been invited to ${input.companyName} on ${BRAND_NAME}.`,
    body: `
      <h1 style="${H1_STYLE}">Welcome to ${BRAND_NAME}</h1>
      <p style="${P_STYLE}">${greeting}</p>
      <p style="${P_STYLE}">
        You have been added to <strong>${escapeHtml(input.companyName)}</strong>'s
        HR platform on ${BRAND_NAME}. Click the button below to accept your
        invitation and set your password.
      </p>
      ${button({ href: input.url, label: 'Accept Invitation & Set Password' })}
      <p style="${MUTED_STYLE}">
        Or paste this link into your browser:<br />
        <a href="${input.url}" style="color:#4f46e5;word-break:break-all;">${input.url}</a>
      </p>
      <p style="${MUTED_STYLE}">This invitation link expires in 24 hours.</p>
    `,
  });
}

function renderPasswordResetEmail(input: { url: string }): string {
  return baseLayout({
    preheader: `Reset your ${BRAND_NAME} password.`,
    body: `
      <h1 style="${H1_STYLE}">Password reset requested</h1>
      <p style="${P_STYLE}">
        We received a request to reset your ${BRAND_NAME} password. Click the
        button below to choose a new one.
      </p>
      ${button({ href: input.url, label: 'Reset Password' })}
      <p style="${MUTED_STYLE}">
        Or paste this link into your browser:<br />
        <a href="${input.url}" style="color:#4f46e5;word-break:break-all;">${input.url}</a>
      </p>
      <p style="${MUTED_STYLE}">
        If you did not request a password reset, you can safely ignore this
        email — your password will stay the same.
      </p>
    `,
  });
}

function renderEmailVerificationEmail(input: { url: string }): string {
  return baseLayout({
    preheader: `Confirm your ${BRAND_NAME} email address.`,
    body: `
      <h1 style="${H1_STYLE}">Verify your email</h1>
      <p style="${P_STYLE}">
        Please confirm this email address belongs to you so we can keep your
        ${BRAND_NAME} account secure.
      </p>
      ${button({ href: input.url, label: 'Verify Email' })}
      <p style="${MUTED_STYLE}">
        Or paste this link into your browser:<br />
        <a href="${input.url}" style="color:#4f46e5;word-break:break-all;">${input.url}</a>
      </p>
    `,
  });
}

function renderApprovalEmail(input: {
  approverName?: string | null;
  requestType: string;
  submittedByName: string;
  detail: string;
  reviewUrl: string;
}): string {
  const greeting = input.approverName ? `Hi ${escapeHtml(input.approverName)},` : 'Hello,';
  const typeLabel = capitalize(input.requestType);
  return baseLayout({
    preheader: `A new ${input.requestType} request needs your approval on ${BRAND_NAME}.`,
    body: `
      <h1 style="${H1_STYLE}">Action required: ${escapeHtml(typeLabel)} request</h1>
      <p style="${P_STYLE}">${greeting}</p>
      <p style="${P_STYLE}">
        A new ${escapeHtml(input.requestType)} request is awaiting your
        approval on ${BRAND_NAME}.
      </p>
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:18px 0;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 0;color:#6b7280;font-size:14px;width:140px;">Submitted by</td>
          <td style="padding:8px 0;color:#111827;font-size:14px;"><strong>${escapeHtml(input.submittedByName)}</strong></td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;font-size:14px;">Request type</td>
          <td style="padding:8px 0;color:#111827;font-size:14px;">${escapeHtml(typeLabel)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;font-size:14px;vertical-align:top;">Details</td>
          <td style="padding:8px 0;color:#111827;font-size:14px;">${escapeHtml(input.detail)}</td>
        </tr>
      </table>
      ${button({ href: input.reviewUrl, label: 'Review Request' })}
      <p style="${MUTED_STYLE}">
        Or paste this link into your browser:<br />
        <a href="${input.reviewUrl}" style="color:#4f46e5;word-break:break-all;">${input.reviewUrl}</a>
      </p>
    `,
  });
}

// ─── Shared layout helpers ──────────────────────────────────────────────

const H1_STYLE =
  'margin:0 0 16px 0;font-size:22px;line-height:28px;color:#111827;font-weight:600;';
const P_STYLE =
  'margin:0 0 16px 0;font-size:15px;line-height:22px;color:#374151;';
const MUTED_STYLE =
  'margin:16px 0 0 0;font-size:13px;line-height:20px;color:#6b7280;';

function baseLayout(input: { preheader: string; body: string }): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${BRAND_NAME}</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <span style="display:none !important;visibility:hidden;mso-hide:all;font-size:1px;color:#f3f4f6;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(input.preheader)}</span>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f3f4f6;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.05);overflow:hidden;">
            <tr>
              <td style="padding:24px 32px;border-bottom:1px solid #e5e7eb;">
                <div style="font-size:18px;font-weight:700;color:#111827;letter-spacing:-0.01em;">${BRAND_NAME}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                ${input.body}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;border-top:1px solid #e5e7eb;background:#f9fafb;color:#9ca3af;font-size:12px;line-height:18px;">
                You're receiving this email because of activity on your ${BRAND_NAME} account.
                If you have questions, reply to this email.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function button(input: { href: string; label: string }): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
      <tr>
        <td bgcolor="#4f46e5" style="border-radius:8px;">
          <a href="${input.href}"
             style="display:inline-block;padding:12px 22px;background:#4f46e5;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;border-radius:8px;">
            ${escapeHtml(input.label)}
          </a>
        </td>
      </tr>
    </table>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}
