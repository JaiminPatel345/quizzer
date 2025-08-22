import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { logger } from '../utils/logger.js';
import { Notification } from '../models/index.js';
import type { ObjectId, NotificationContent, NotificationDelivery } from '../types/index.js';

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer;
  }>;
}

interface QuizResultEmailData {
  username: string;
  quizTitle: string;
  score: number;
  totalQuestions: number;
  suggestions: string[];
  grade: string;
}

class EmailService {
  private transporter: Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    try {
      const emailHost = process.env.EMAIL_HOST;
      const emailPort = parseInt(process.env.EMAIL_PORT || '587');
      const emailUser = process.env.EMAIL_USER;
      const emailPassword = process.env.EMAIL_PASSWORD;

      if (!emailHost || !emailUser || !emailPassword) {
        throw new Error('Email configuration missing in environment variables');
      }

      this.transporter = nodemailer.createTransport({
        host: emailHost,
        port: emailPort,
        secure: emailPort === 465,
        auth: {
          user: emailUser,
          pass: emailPassword,
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Verify connection
      this.transporter.verify((error, success) => {
        if (error) {
          logger.error('Email service verification failed:', error);
        } else {
          logger.info('Email service ready');
        }
      });

    } catch (error) {
      logger.error('Failed to initialize email service:', error);
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments
      };

      const info = await this.transporter.sendMail(mailOptions);

      logger.info('Email sent successfully:', {
        messageId: info.messageId,
        to: options.to,
        subject: options.subject
      });

      return true;
    } catch (error) {
      logger.error('Email sending failed:', {
        to: options.to,
        subject: options.subject,
        error
      });
      return false;
    }
  }

  async sendQuizResultEmail(
      userId: ObjectId,
      userEmail: string,
      quizData: QuizResultEmailData
  ): Promise<boolean> {
    try {
      const subject = `Quiz Results: ${quizData.quizTitle}`;
      const html = this.generateQuizResultHTML(quizData);
      const text = this.generateQuizResultText(quizData);

      // Create notification record
      const notification = new Notification({
        userId,
        type: 'quiz_result' as const,
        content: {
          subject,
          body: text,
          attachments: []
        },
        delivery: {
          status: 'pending' as const,
          emailProvider: 'gmail' as const
        },
        relatedData: {
          score: quizData.score
        }
      });

      const emailSent = await this.sendEmail({
        to: userEmail,
        subject,
        text,
        html
      });

      // Update notification status
      notification.delivery.status = emailSent ? 'sent' : 'failed';
      if (emailSent) {
        notification.delivery.sentAt = new Date();
        notification.delivery.deliveredAt = new Date();
      } else {
        notification.delivery.errorMessage = 'Failed to send email';
      }

      await notification.save();

      return emailSent;
    } catch (error) {
      logger.error('Quiz result email failed:', { userId, userEmail, error });
      return false;
    }
  }

  private generateQuizResultHTML(data: QuizResultEmailData): string {
    const gradeColor = this.getGradeColor(data.grade);

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Quiz Results</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        .score-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .grade { font-size: 48px; font-weight: bold; color: ${gradeColor}; text-align: center; margin: 10px 0; }
        .suggestions { background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .suggestion { margin: 10px 0; padding: 10px; background: white; border-radius: 4px; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Quiz Results</h1>
          <p>Congratulations ${data.username}!</p>
        </div>
        <div class="content">
          <div class="score-card">
            <h2>${data.quizTitle}</h2>
            <div class="grade">${data.grade}</div>
            <p style="text-align: center; font-size: 18px;">
              <strong>${data.score}%</strong> - You got ${Math.round((data.score / 100) * data.totalQuestions)} out of ${data.totalQuestions} questions correct!
            </p>
          </div>
          
          ${data.suggestions.length > 0 ? `
          <div class="suggestions">
            <h3>💡 Improvement Suggestions</h3>
            ${data.suggestions.map(suggestion => `
              <div class="suggestion">${suggestion}</div>
            `).join('')}
          </div>
          ` : ''}
          
          <p>Keep up the great work! Continue practicing to improve your performance.</p>
        </div>
        <div class="footer">
          <p>This is an automated message from Quiz App</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  private generateQuizResultText(data: QuizResultEmailData): string {
    let text = `
Quiz Results for ${data.username}

Quiz: ${data.quizTitle}
Grade: ${data.grade}
Score: ${data.score}% (${Math.round((data.score / 100) * data.totalQuestions)}/${data.totalQuestions} correct)

`;

    if (data.suggestions.length > 0) {
      text += `Improvement Suggestions:
${data.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}

`;
    }

    text += `Keep practicing to improve your performance!

---
Quiz App Team
    `;

    return text;
  }

  private getGradeColor(grade: string): string {
    switch (grade) {
      case 'A': return '#4CAF50';
      case 'B': return '#8BC34A';
      case 'C': return '#FF9800';
      case 'D': return '#FF5722';
      case 'F': return '#F44336';
      default: return '#757575';
    }
  }
}

export const emailService = new EmailService();
