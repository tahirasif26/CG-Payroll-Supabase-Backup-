import { Injectable, Logger } from '@nestjs/common';
import { TypedConfigService } from '@config/typed-config.service';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  category?: string;
}

/**
 * Dev mail transport — logs outgoing messages to the console so the password
 * reset / invitation / verification flows are end-to-end testable without an
 * SMTP provider. Replace the body of `send()` with a real provider (Resend,
 * SES, SMTP via nodemailer) in a later phase. The interface stays the same.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: TypedConfigService) {}

  async send(msg: MailMessage): Promise<void> {
    const from = this.config.get('MAIL_FROM');
    const banner = `[MAIL → ${msg.to}]`;
    this.logger.log(`${banner} from=${from} subject="${msg.subject}"${msg.category ? ` category=${msg.category}` : ''}`);
    this.logger.debug(`${banner} body:\n${msg.text}`);
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
    await this.send({
      to: input.to,
      category: 'invitation',
      subject: `You're invited to ${input.companyName}`,
      text:
        `${inviter}has invited you to join ${input.companyName} on cg-payroll.\n\n` +
        `Accept your invitation here: ${url}\n\n` +
        `This invitation expires in ${this.config.get('INVITATION_TTL_DAYS')} days.`,
    });
  }
}
