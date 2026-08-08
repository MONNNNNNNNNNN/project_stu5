import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly resendApiKey: string | null;
  private readonly from: string;
  private readonly frontendUrl: string;

  constructor(private config: ConfigService) {
    this.from = this.config.get<string>('SMTP_FROM') ?? 'GrowTH <onboarding@resend.dev>';
    this.frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';
    this.resendApiKey = this.config.get<string>('RESEND_API_KEY') ?? null;

    // Most free-tier PaaS hosts (Render included) block outbound SMTP ports entirely, so raw
    // SMTP silently times out there — prefer the Resend HTTP API (works over normal HTTPS) when
    // configured, and only fall back to SMTP for environments where it's actually reachable.
    if (!this.resendApiKey) {
      const host = this.config.get<string>('SMTP_HOST');
      const port = this.config.get<string>('SMTP_PORT');
      const user = this.config.get<string>('SMTP_USER');
      const pass = this.config.get<string>('SMTP_PASS');

      if (host && port && user && pass) {
        this.transporter = nodemailer.createTransport({
          host,
          port: Number(port),
          secure: Number(port) === 465,
          auth: { user, pass },
        });
      } else {
        this.logger.warn(
          'Neither RESEND_API_KEY nor SMTP_HOST/PORT/USER/PASS configured — password reset emails will not be sent.',
        );
      }
    }
  }

  get isConfigured() {
    return this.resendApiKey !== null || this.transporter !== null;
  }

  /** Returns true if the email was actually sent. */
  async sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
    const resetLink = `${this.frontendUrl}/reset-password?token=${resetToken}`;
    const subject = 'Reset your GrowTH password';
    const text = `We received a request to reset your GrowTH password. Open this link to choose a new one (expires in 1 hour):\n\n${resetLink}\n\nIf you didn't request this, you can ignore this email.`;
    const html = `
      <p>We received a request to reset your GrowTH password.</p>
      <p><a href="${resetLink}">Click here to choose a new password</a> (link expires in 1 hour).</p>
      <p>If you didn't request this, you can ignore this email.</p>
    `;

    if (this.resendApiKey) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ from: this.from, to: [email], subject, text, html }),
        });
        if (!res.ok) {
          this.logger.error(`Resend API returned ${res.status} sending to ${email}: ${await res.text()}`);
          return false;
        }
        return true;
      } catch (err) {
        this.logger.error(`Failed to send password reset email via Resend to ${email}`, err as Error);
        return false;
      }
    }

    if (this.transporter) {
      try {
        await this.transporter.sendMail({ from: this.from, to: email, subject, text, html });
        return true;
      } catch (err) {
        this.logger.error(`Failed to send password reset email via SMTP to ${email}`, err as Error);
        return false;
      }
    }

    return false;
  }
}
