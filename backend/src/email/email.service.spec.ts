import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import { MetricsService } from '../metrics/metrics.service';

// Mock nodemailer - must use require-style reference to avoid hoisting issue
const mockSendMail = jest.fn();
jest.mock('nodemailer', () => {
  return {
    __esModule: true,
    default: {
      createTransport: jest.fn().mockImplementation(() => ({
        sendMail: mockSendMail,
      })),
    },
    createTransport: jest.fn().mockImplementation(() => ({
      sendMail: mockSendMail,
    })),
  };
});

describe('EmailService', () => {
  let service: EmailService;
  let metricsService: Record<string, any>;

  beforeEach(async () => {
    mockSendMail.mockReset();

    metricsService = {
      emailsSent: { inc: jest.fn() },
      emailsFailed: { inc: jest.fn() },
      emailSendDuration: { startTimer: jest.fn().mockReturnValue(jest.fn()) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: MetricsService, useValue: metricsService },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  describe('convertMarkdownToHtml', () => {
    it('should convert markdown to HTML', async () => {
      const html = await service.convertMarkdownToHtml('**bold text**');
      expect(html).toContain('<strong>');
      expect(html).toContain('bold text');
    });

    it('should convert headings', async () => {
      const html = await service.convertMarkdownToHtml('# Title');
      expect(html).toContain('<h1>');
    });
  });

  describe('buildStyledContent', () => {
    it('should split content by --- and build post blocks', () => {
      const markdown = `## Meta Engineering Blog
### Some Title

**핵심 요약**
This is the summary.

---

## Netflix Tech Blog
### Another Title

**핵심 요약**
Another summary.`;

      const result = service.buildStyledContent(markdown);
      expect(result).toContain('META');
      expect(result).toContain('NETFLIX');
      expect(result).toContain('Some Title');
      expect(result).toContain('Another Title');
    });

    it('should handle single post without divider', () => {
      const markdown = `## Amazon Engineering Blog
### AWS Lambda

**핵심 요약**
Summary here.`;

      const result = service.buildStyledContent(markdown);
      expect(result).toContain('AMAZON');
      expect(result).toContain('AWS Lambda');
    });
  });

  describe('buildEmailHtml', () => {
    it('should wrap content in full HTML template', () => {
      const html = service.buildEmailHtml('<tr><td>Content</td></tr>', 'unsub-token', 1);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('오늘을 만들었던 어제의 기술');
      expect(html).toContain('Content');
      expect(html).toContain('unsub-token');
      expect(html).toContain('구독 해지');
    });

    it('should include unsubscribe URL with token', () => {
      const html = service.buildEmailHtml('', 'my-token-123', 1);
      expect(html).toContain('token=my-token-123');
    });
  });

  describe('sendEmail', () => {
    it('should send email and increment success metric', async () => {
      mockSendMail.mockResolvedValue({ messageId: '123' });

      await service.sendEmail('test@example.com', 'Subject', '<p>Body</p>');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Subject',
          html: '<p>Body</p>',
        }),
      );
      expect(metricsService.emailsSent.inc).toHaveBeenCalledWith({ type: 'newsletter' });
      expect(metricsService.emailSendDuration.startTimer).toHaveBeenCalled();
    });

    it('should increment failure metric on error', async () => {
      mockSendMail.mockRejectedValue(new Error('SMTP error'));

      await expect(
        service.sendEmail('test@example.com', 'Subject', '<p>Body</p>'),
      ).rejects.toThrow('SMTP error');

      expect(metricsService.emailsFailed.inc).toHaveBeenCalled();
    });
  });

  describe('sendNewsletter', () => {
    it('should build styled content and send email', async () => {
      mockSendMail.mockResolvedValue({ messageId: '123' });

      const markdown = `## Meta Engineering Blog
### Test Title

**핵심 요약**
Test content.`;

      await service.sendNewsletter(
        'test@example.com',
        'Newsletter Title',
        markdown,
        'unsub-token',
        1,
      );

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const sentHtml = mockSendMail.mock.calls[0][0].html;
      expect(sentHtml).toContain('META');
      expect(sentHtml).toContain('Test Title');
      expect(sentHtml).toContain('unsub-token');
    });
  });
});
