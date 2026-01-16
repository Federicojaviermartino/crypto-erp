import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { EmailPayload, TemplateData } from './dto/email-payload.dto';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface CompanyInvitation {
  id: string;
  email: string;
  token: string;
  role: string;
  company: {
    id: string;
    name: string;
  };
  inviter: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly defaultFrom: string;
  private readonly webUrl: string;

  constructor(
    @Optional() @InjectQueue('email-send') private emailQueue: Queue | undefined,
    private configService: ConfigService,
  ) {
    this.defaultFrom = this.configService.get<string>('EMAIL_FROM', 'Crypto-ERP <noreply@crypto-erp.com>');
    this.webUrl = this.configService.get<string>('WEB_URL', 'http://localhost:4200');

    if (!this.emailQueue) {
      this.logger.warn('Email queue not available. Email notifications will be logged but not sent.');
    }
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(user: User): Promise<void> {
    const html = this.renderTemplate('welcome', {
      firstName: user.firstName,
      loginUrl: `${this.webUrl}/auth/login`,
    });

    await this.queueEmail({
      to: user.email,
      subject: 'Bienvenido a Crypto-ERP',
      html,
    });

    this.logger.log(`Welcome email queued for ${user.email}`);
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(user: User, resetToken: string): Promise<void> {
    const html = this.renderTemplate('password-reset', {
      firstName: user.firstName,
      resetUrl: `${this.webUrl}/auth/reset-password?token=${resetToken}`,
      expiresIn: '1 hora',
    });

    await this.queueEmail({
      to: user.email,
      subject: 'Restablecer contraseña - Crypto-ERP',
      html,
    });

    this.logger.log(`Password reset email queued for ${user.email}`);
  }

  /**
   * Send team invitation email
   */
  async sendTeamInvitation(invitation: CompanyInvitation): Promise<void> {
    const html = this.renderTemplate('team-invitation', {
      companyName: invitation.company.name,
      inviterName: invitation.inviter.firstName,
      role: this.getRoleDisplayName(invitation.role),
      acceptUrl: `${this.webUrl}/invitations/${invitation.token}`,
    });

    await this.queueEmail({
      to: invitation.email,
      subject: `Invitación a ${invitation.company.name} - Crypto-ERP`,
      html,
    });

    this.logger.log(`Team invitation email queued for ${invitation.email}`);
  }

  /**
   * Send invoice notification (for future use)
   */
  async sendInvoiceNotification(
    recipientEmail: string,
    invoiceNumber: string,
    pdfUrl?: string,
  ): Promise<void> {
    // Placeholder for future invoice email template
    const html = `
      <html>
        <body>
          <h1>Nueva Factura</h1>
          <p>Has recibido la factura ${invoiceNumber}</p>
          ${pdfUrl ? `<a href="${pdfUrl}">Descargar PDF</a>` : ''}
        </body>
      </html>
    `;

    await this.queueEmail({
      to: recipientEmail,
      subject: `Factura ${invoiceNumber}`,
      html,
    });

    this.logger.log(`Invoice notification queued for ${recipientEmail}`);
  }

  /**
   * Queue email for async processing
   */
  private async queueEmail(emailData: EmailPayload): Promise<void> {
    // Set default 'from' if not provided
    if (!emailData.from) {
      emailData.from = this.defaultFrom;
    }

    if (!this.emailQueue) {
      this.logger.warn(`Email would be sent to ${emailData.to}: ${emailData.subject} (queue not available)`);
      return;
    }

    await this.emailQueue.add('send-email', emailData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  /**
   * Render email template with data
   */
  private renderTemplate(templateName: string, data: TemplateData): string {
    const templatePath = path.join(__dirname, 'templates', `${templateName}.html`);

    try {
      let html = fs.readFileSync(templatePath, 'utf-8');

      // Simple template variable replacement
      Object.keys(data).forEach((key) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        html = html.replace(regex, String(data[key]));
      });

      return html;
    } catch (error) {
      this.logger.error(`Failed to render template ${templateName}:`, error);
      throw new Error(`Email template ${templateName} not found`);
    }
  }

  /**
   * Get display name for user role
   */
  private getRoleDisplayName(role: string): string {
    const roleNames: Record<string, string> = {
      OWNER: 'Propietario',
      ADMIN: 'Administrador',
      ACCOUNTANT: 'Contable',
      USER: 'Usuario',
      VIEWER: 'Visualizador',
    };

    return roleNames[role] || role;
  }

  /**
   * Send custom email (for admin use or testing)
   */
  async sendCustomEmail(
    to: string | string[],
    subject: string,
    html: string,
  ): Promise<void> {
    await this.queueEmail({
      to,
      subject,
      html,
    });

    this.logger.log(`Custom email queued for ${Array.isArray(to) ? to.join(', ') : to}`);
  }
}
