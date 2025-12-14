import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { Resend } from 'resend';

interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

@Processor('email-send', {
  concurrency: 5,
})
export class EmailSendProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailSendProcessor.name);
  private resendClient: Resend | null = null;
  private readonly enabled: boolean;

  constructor(private configService: ConfigService) {
    super();
    const apiKey = this.configService.get<string>('RESEND_API_KEY');

    if (apiKey) {
      this.resendClient = new Resend(apiKey);
      this.enabled = true;
      this.logger.log('Resend email client initialized');
    } else {
      this.enabled = false;
      this.logger.warn('RESEND_API_KEY not configured - emails will not be sent');
    }
  }

  async process(job: Job<EmailPayload>): Promise<void> {
    const { to, subject, html, from, replyTo, attachments } = job.data;

    if (!this.enabled) {
      this.logger.warn(
        `Email sending disabled - would have sent to ${Array.isArray(to) ? to.join(', ') : to}: ${subject}`,
      );
      return;
    }

    try {
      const result = await this.resendClient!.emails.send({
        from: from || 'Crypto-ERP <noreply@crypto-erp.com>',
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        replyTo: replyTo,
        attachments: attachments as any,
      });

      this.logger.log(
        `Email sent successfully to ${Array.isArray(to) ? to.join(', ') : to}: ${subject} (ID: ${result.data?.id})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${Array.isArray(to) ? to.join(', ') : to}: ${subject}`,
        error.stack,
      );
      throw error; // Let BullMQ retry
    }
  }
}
