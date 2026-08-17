import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Password-reset email, sent through Resend's HTTP API.
 *
 * There used to be a raw-SMTP fallback here. It was unreachable: this service prefers Resend
 * whenever RESEND_API_KEY is set, and Render — the only place this runs — blocks outbound
 * SMTP ports outright, so the fallback could not have delivered anything even if it had been
 * selected. Keeping five SMTP_* variables configured on production for a code path that
 * could never run just widened the set of secrets to look after.
 *
 * Local development needs no mail provider at all: with RESEND_API_KEY unset, AuthService
 * hands the reset token straight back in the response (outside production only).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly apiKey: string | null;
  private readonly from: string;
  private readonly frontendUrl: string;

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get<string>('RESEND_API_KEY') ?? null;
    // SMTP_FROM is the historical name and is still read so an existing deployment keeps
    // working without a coordinated env change.
    this.from =
      this.config.get<string>('MAIL_FROM') ??
      this.config.get<string>('SMTP_FROM') ??
      'GrowTH <onboarding@resend.dev>';
    this.frontendUrl =
      this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';

    if (!this.apiKey) {
      this.logger.warn(
        'RESEND_API_KEY is not set — password reset emails will not be sent.',
      );
    }
  }

  get isConfigured() {
    return this.apiKey !== null;
  }

  /** Returns true only if the provider accepted the message. */
  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
  ): Promise<boolean> {
    if (!this.apiKey) return false;

    const resetLink = `${this.frontendUrl.replace(/\/$/, '')}/reset-password?token=${resetToken}`;
    const subject = 'Reset your GrowTH password';
    const text =
      'We received a request to reset your GrowTH password. Open this link to choose a new one ' +
      `(expires in 1 hour):\n\n${resetLink}\n\nIf you didn't request this, you can ignore this email.`;
    const html = `
      <p>We received a request to reset your GrowTH password.</p>
      <p><a href="${resetLink}">Click here to choose a new password</a> (link expires in 1 hour).</p>
      <p>If you didn't request this, you can ignore this email.</p>
    `;

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.from,
          to: [email],
          subject,
          text,
          html,
        }),
      });
      if (!res.ok) {
        this.logger.error(
          `Resend returned ${res.status} sending to ${email}: ${await res.text()}`,
        );
        return false;
      }
      return true;
    } catch (err) {
      this.logger.error(
        `Failed to send password reset email to ${email}`,
        err as Error,
      );
      return false;
    }
  }
}
