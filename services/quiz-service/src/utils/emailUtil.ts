import nodemailer from 'nodemailer';
import { logger } from './logger.js';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

interface AnalyticsEmailData {
  username: string;
  quizTitle: string;
  score: number;
  grade: string;
  suggestions: string[];
  strengths: string[];
  weaknesses: string[];
}

export const sendAnalyticsEmail = async (userEmail: string, data: AnalyticsEmailData): Promise<void> => {
  try {
    const htmlContent = `
      <h2>Quiz Analytics Report</h2>
      <p>Hello ${data.username},</p>
      
      <h3>Quiz: ${data.quizTitle}</h3>
      <p><strong>Score:</strong> ${data.score}% (Grade: ${data.grade})</p>
      
      <h4>Strengths:</h4>
      <ul>
        ${data.strengths.map(strength => `<li>${strength}</li>`).join('')}
      </ul>
      
      <h4>Areas for Improvement:</h4>
      <ul>
        ${data.weaknesses.map(weakness => `<li>${weakness}</li>`).join('')}
      </ul>
      
      <h4>Suggestions:</h4>
      <ul>
        ${data.suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
      </ul>
      
      <p>Keep up the good work!</p>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@quizapp.com',
      to: userEmail,
      subject: `Quiz Analytics Report - ${data.quizTitle}`,
      html: htmlContent
    });

    logger.info('Analytics email sent successfully:', { userEmail, quizTitle: data.quizTitle });
  } catch (error) {
    logger.error('Failed to send analytics email:', error);
    throw error;
  }
};
