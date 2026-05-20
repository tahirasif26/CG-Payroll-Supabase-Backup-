import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import sgMail from '@sendgrid/mail';
import { Resend } from 'resend';
import { TypedConfigService } from '@config/typed-config.service';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  category?: string;
}

type Transport = 'console' | 'sendgrid' | 'resend';

/**
 * Pluggable mail transport. Selected by `MAIL_PROVIDER`:
 *   - `console`  → logs the message; used when no provider key is configured.
 *   - `sendgrid` → @sendgrid/mail; needs `SENDGRID_API_KEY` + a verified sender.
 *   - `resend`   → resend SDK;     needs `RESEND_API_KEY` + a verified domain.
 *
 * Switching is a single env change + restart. If the chosen provider is
 * misconfigured (key missing), we log a warning and fall back to console so the
 * app still boots.
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transport: Transport = 'console';
  private resend: Resend | null = null;

  constructor(private readonly config: TypedConfigService) {}

  onModuleInit(): void {
    const provider = this.config.get('MAIL_PROVIDER') as Transport;
    const from = this.config.get('MAIL_FROM');

    if (provider === 'sendgrid') {
      const key = this.config.get('SENDGRID_API_KEY');
      if (!key) {
        this.logger.warn(
          'MAIL_PROVIDER=sendgrid but SENDGRID_API_KEY is empty — falling back to console transport',
        );
        return;
      }
      sgMail.setApiKey(key);
      this.transport = 'sendgrid';
      this.logger.log(`Mail transport: SendGrid (from=${from})`);
      return;
    }

    if (provider === 'resend') {
      const key = this.config.get('RESEND_API_KEY');
      if (!key) {
        this.logger.warn(
          'MAIL_PROVIDER=resend but RESEND_API_KEY is empty — falling back to console transport',
        );
        return;
      }
      this.resend = new Resend(key);
      this.transport = 'resend';
      this.logger.log(`Mail transport: Resend (from=${from})`);
      return;
    }

    this.logger.warn(
      'Mail transport: console (no real email will be sent). Set MAIL_PROVIDER=sendgrid|resend + the matching API key to deliver mail.',
    );
  }

  async send(msg: MailMessage): Promise<void> {
    if (this.transport === 'console') return this.sendViaConsole(msg);
    if (this.transport === 'sendgrid') return this.sendViaSendGrid(msg);
    if (this.transport === 'resend') return this.sendViaResend(msg);
  }

  private sendViaConsole(msg: MailMessage): void {
    const from = this.config.get('MAIL_FROM');
    const banner = `[MAIL → ${msg.to}]`;
    this.logger.log(
      `${banner} from=${from} subject="${msg.subject}"${msg.category ? ` category=${msg.category}` : ''}`,
    );
    this.logger.debug(`${banner} body:\n${msg.text}`);
  }

  private async sendViaSendGrid(msg: MailMessage): Promise<void> {
    const fromEmail = this.config.get('MAIL_FROM');
    const fromName = this.config.get('MAIL_FROM_NAME');
    try {
      await sgMail.send({
        to: msg.to,
        from: { email: fromEmail, name: fromName },
        subject: msg.subject,
        text: msg.text,
        html: msg.html ?? this.textToHtml(msg.text),
        ...(msg.category ? { categories: [msg.category] } : {}),
      });
      this.logger.log(`[MAIL → ${msg.to}] sent via SendGrid subject="${msg.subject}"`);
    } catch (err: unknown) {
      const detail =
        (err as { response?: { body?: unknown } }).response?.body ??
        (err instanceof Error ? err.message : String(err));
      this.logger.error(
        `[MAIL → ${msg.to}] SendGrid send failed: ${JSON.stringify(detail)}`,
      );
      throw err;
    }
  }

  private async sendViaResend(msg: MailMessage): Promise<void> {
    if (!this.resend) throw new Error('Resend SDK not initialised');
    const fromEmail = this.config.get('MAIL_FROM');
    const fromName = this.config.get('MAIL_FROM_NAME');
    const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
    const { error } = await this.resend.emails.send({
      from,
      to: msg.to,
      subject: msg.subject,
      text: msg.text,
      html: msg.html ?? this.textToHtml(msg.text),
      ...(msg.category ? { tags: [{ name: 'category', value: msg.category }] } : {}),
    });
    if (error) {
      this.logger.error(
        `[MAIL → ${msg.to}] Resend send failed: ${JSON.stringify(error)}`,
      );
      throw new Error(`Resend send failed: ${error.message ?? 'unknown'}`);
    }
    this.logger.log(`[MAIL → ${msg.to}] sent via Resend subject="${msg.subject}"`);
  }

  // ─── Convenience builders for Phase 1 flows ────────────────────────────────

  async sendPasswordReset(to: string, token: string): Promise<void> {
    const url = `${this.config.get('FRONTEND_URL')}/reset-password?token=${encodeURIComponent(token)}`;
    await this.send({
      to,
      category: 'password_reset',
      subject: 'Reset your cg-payroll password',
      text:
        `Someone (hopefully you) requested a password reset.\n\n` +
        `Reset link: ${url}\n\n` +
        `This link expires in ${this.config.get('PASSWORD_RESET_TOKEN_TTL_MIN')} minutes. ` +
        `If you didn't request this, you can ignore this email.`,
    });
  }

  async sendEmailVerification(to: string, token: string): Promise<void> {
    const url = `${this.config.get('FRONTEND_URL')}/verify-email?token=${encodeURIComponent(token)}`;
    await this.send({
      to,
      category: 'email_verification',
      subject: 'Verify your email',
      text: `Confirm your email address by visiting: ${url}`,
    });
  }

  async sendInvitation(input: {
    to: string;
    token: string;
    companyName: string;
    inviterName?: string | null;
  }): Promise<void> {
    const url = `${this.config.get('FRONTEND_URL')}/accept-invite?token=${encodeURIComponent(input.token)}`;
    const inviter = input.inviterName ? `${input.inviterName} ` : '';
    const days = this.config.get('INVITATION_TTL_DAYS');
    await this.send({
      to: input.to,
      category: 'invitation',
      subject: `You're invited to ${input.companyName}`,
      text:
        `${inviter}has invited you to join ${input.companyName} on CG Payroll.\n\n` +
        `Accept your invitation here: ${url}\n\n` +
        `This invitation expires in ${days} days.`,
      html:
        `<p>${inviter ? `<strong>${escapeHtml(inviter.trim())}</strong> has` : 'You have been'} invited to join <strong>${escapeHtml(input.companyName)}</strong> on CG Payroll.</p>` +
        `<p><a href="${url}" style="display:inline-block;padding:10px 18px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;">Accept invitation</a></p>` +
        `<p>Or paste this link into your browser:<br><code>${url}</code></p>` +
        `<p style="color:#6b7280;font-size:12px;">This invitation expires in ${days} days.</p>`,
    });
  }

  private textToHtml(text: string): string {
    return `<pre style="font-family:inherit;white-space:pre-wrap;">${escapeHtml(text)}</pre>`;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
