import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly from: string;
  private readonly frontendUrl: string;

  constructor(private config: ConfigService) {
    this.from = this.config.get<string>('SMTP_FROM') ?? 'GrowTH <no-reply@growth.app>';
    this.frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';

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
      this.logger.warn('SMTP_HOST/PORT/USER/PASS not fully configured — password reset emails will not be sent.');
    }
  }

  get isConfigured() {
    return this.transporter !== null;
  }

  /** Returns true if the email was actually sent. */
  async sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
    if (!this.transporter) return false;

    const resetLink = `${this.frontendUrl}/reset-password?token=${resetToken}`;
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: email,
        subject: 'Reset your GrowTH password',
        text: `We received a request to reset your GrowTH password. Open this link to choose a new one (expires in 1 hour):\n\n${resetLink}\n\nIf you didn't request this, you can ignore this email.`,
        html: `
          <p>We received a request to reset your GrowTH password.</p>
          <p><a href="${resetLink}">Click here to choose a new password</a> (link expires in 1 hour).</p>
          <p>If you didn't request this, you can ignore this email.</p>
        `,
      });
      return true;
    } catch (err) {
      this.logger.error(`Failed to send password reset email to ${email}`, err as Error);
      return false;
    }
  }
}
