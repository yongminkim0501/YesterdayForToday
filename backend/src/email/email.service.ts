import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { marked } from 'marked';
import { MetricsService } from '../metrics/metrics.service';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly metricsService: MetricsService) {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async convertMarkdownToHtml(markdown: string): Promise<string> {
    return await marked(markdown);
  }

  /**
   * 마크다운 뉴스레터 콘텐츠를 스타일링된 HTML 블록으로 변환
   */
  buildStyledContent(markdown: string): string {
    const posts = markdown.split(/\n---\n/).filter((s) => s.trim());
    const styledPosts = posts.map((post) => this.buildPostBlock(post));

    const divider = `
      <tr>
        <td style="padding: 32px 40px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="border-top: 1px solid #e0e0e0;"></td>
            </tr>
          </table>
        </td>
      </tr>
    `;

    return styledPosts.join(divider);
  }

  private buildPostBlock(postMarkdown: string): string {
    const lines = postMarkdown.trim().split('\n');

    let company = '';
    let title = '';
    const sections: { label: string; content: string }[] = [];
    let sourceUrl = '';
    let sourceText = '';
    let currentSection = '';
    let currentContent = '';

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('## ')) {
        company = trimmed.replace('## ', '').replace(' Engineering Blog', '').replace(' Tech Blog', '').trim();
        continue;
      }

      if (trimmed.startsWith('### ')) {
        title = trimmed.replace('### ', '').trim();
        continue;
      }

      // **라벨** 형태 감지
      const labelMatch = trimmed.match(/^\*\*([^*]+)\*\*$/);
      if (labelMatch) {
        if (currentSection && currentContent.trim()) {
          sections.push({ label: currentSection, content: currentContent.trim() });
        }
        currentSection = labelMatch[1];
        currentContent = '';
        continue;
      }

      const linkMatch = trimmed.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch && !trimmed.startsWith('-') && !trimmed.startsWith('*')) {
        sourceText = linkMatch[1];
        sourceUrl = linkMatch[2];
        continue;
      }

      if (trimmed.startsWith('>')) continue;

      if (trimmed && currentSection) {
        currentContent += (currentContent ? '\n' : '') + trimmed;
      }
    }

    // 마지막 섹션 저장
    if (currentSection && currentContent.trim()) {
      sections.push({ label: currentSection, content: currentContent.trim() });
    }

    const companyDisplay = escapeHtml(company.toUpperCase());
    const escapedTitle = escapeHtml(title);

    // 섹션 HTML 생성
    const sectionsHtml = sections
      .map(
        (s) => `
      <tr>
        <td style="padding: 20px 40px 0;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding-bottom: 10px;">
                <span style="display: inline-block; background-color: #111111; color: #ffffff; padding: 4px 12px; font-size: 11px; font-weight: 700; letter-spacing: 1.5px;">
                  ${escapeHtml(s.label)}
                </span>
              </td>
            </tr>
            <tr>
              <td>
                <p style="margin: 0; font-size: 15px; line-height: 1.85; color: #333333; word-break: keep-all;">
                  ${escapeHtml(s.content).replace(/\*\*([^*]+)\*\*/g, '<strong style="color: #111;">$1</strong>').replace(/\n/g, '<br>')}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `,
      )
      .join('');

    const escapedSourceUrl = escapeHtml(sourceUrl);
    const escapedSourceText = escapeHtml(sourceText || '원문 보기');

    return `
      <!-- Company & Title -->
      <tr>
        <td style="padding: 32px 40px 0;">
          <p style="margin: 0 0 10px 0; font-size: 12px; font-weight: 600; color: #999999; letter-spacing: 3px;">
            ${companyDisplay}
          </p>
          <h2 style="margin: 0; font-size: 21px; font-weight: 700; color: #111111; line-height: 1.45; letter-spacing: -0.3px;">
            ${escapedTitle}
          </h2>
        </td>
      </tr>
      ${sectionsHtml}
      ${
        sourceUrl
          ? `
      <tr>
        <td style="padding: 24px 40px 0;">
          <a href="${escapedSourceUrl}" style="display: inline-block; padding: 9px 20px; border: 1px solid #cccccc; color: #555555; text-decoration: none; font-size: 12px; font-weight: 600; letter-spacing: 0.5px;">
            ${escapedSourceText} →
          </a>
        </td>
      </tr>
      `
          : ''
      }
    `;
  }

  buildEmailHtml(
    contentHtml: string,
    unsubscribeToken: string,
    newsletterId: number,
  ): string {
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim();
    const unsubscribeUrl = `${frontendUrl}/unsubscribe?token=${unsubscribeToken}`;

    return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f0f0f0; font-family: -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0f0f0;">
    <tr>
      <td align="center" style="padding: 24px 0;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background-color: #111111; padding: 32px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 900; letter-spacing: 3px;">
                오늘을 만들었던 어제의 기술
              </h1>
            </td>
          </tr>

          <!-- Content -->
          ${contentHtml}

          <!-- Bottom Spacer -->
          <tr>
            <td style="padding: 32px 0;"></td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #111111; padding: 24px 40px; text-align: center;">
              <p style="margin: 0 0 12px 0; font-size: 11px; color: #555555; letter-spacing: 1px;">
                &copy; 오늘을 만들었던 어제의 기술
              </p>
              <a href="${unsubscribeUrl}" style="color: #777777; font-size: 11px; text-decoration: underline;">
                구독 해지
              </a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  async sendEmail(
    to: string,
    subject: string,
    html: string,
    options?: { unsubscribeUrl?: string },
  ): Promise<{ success: boolean; error?: string }> {
    const end = this.metricsService.emailSendDuration.startTimer();
    try {
      const mailOptions: nodemailer.SendMailOptions = {
        from: `"오늘을 만들었던 어제의 기술" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to,
        subject,
        html,
      };

      if (options?.unsubscribeUrl) {
        mailOptions.headers = {
          'List-Unsubscribe': `<${options.unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        };
      }

      await this.transporter.sendMail(mailOptions);
      this.metricsService.emailsSent.inc({ type: 'newsletter' });
      this.logger.log(`Email sent to ${to}`);
      return { success: true };
    } catch (error) {
      this.metricsService.emailsFailed.inc();
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Detect SMTP bounce errors (5xx codes)
      if (errorMessage.match(/\b5[0-9]{2}\b/) || errorMessage.toLowerCase().includes('bounce')) {
        this.logger.warn(`Bounced email detected for ${to}: ${errorMessage}`);
      } else {
        this.logger.error(`Failed to send email to ${to}`, error);
      }

      return { success: false, error: errorMessage };
    } finally {
      end();
    }
  }

  async sendNewsletter(
    to: string,
    subject: string,
    markdownContent: string,
    unsubscribeToken: string,
    newsletterId: number,
  ): Promise<{ success: boolean; error?: string }> {
    const styledContent = this.buildStyledContent(markdownContent);
    const fullHtml = this.buildEmailHtml(styledContent, unsubscribeToken, newsletterId);
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim();
    const unsubscribeUrl = `${frontendUrl}/unsubscribe?token=${unsubscribeToken}`;
    return this.sendEmail(to, subject, fullHtml, { unsubscribeUrl });
  }
}
