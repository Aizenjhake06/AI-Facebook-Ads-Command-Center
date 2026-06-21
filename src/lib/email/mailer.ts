/**
 * Email Service using Nodemailer
 */

import nodemailer from 'nodemailer'
import { logger } from '../logger'

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  attachments?: Array<{
    filename: string
    path?: string
    content?: Buffer
  }>
}

/**
 * Create email transporter
 */
function createTransporter() {
  const config = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  }

  // In development, use ethereal email for testing
  if (process.env.NODE_ENV === 'development' && !process.env.SMTP_USER) {
    logger.info('Email: Using ethereal test account (no real emails sent)')
    // Ethereal account needs to be created first
    // This will be a no-op if not configured
    return null
  }

  return nodemailer.createTransport(config)
}

/**
 * Send email
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const transporter = createTransporter()
    
    if (!transporter) {
      logger.warn('Email transporter not configured, skipping email', {
        to: options.to,
        subject: options.subject,
      })
      return false
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || '"AdPilot AI" <noreply@adpilot.ai>',
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments,
    }

    const info = await transporter.sendMail(mailOptions)
    
    logger.info('Email sent successfully', {
      messageId: info.messageId,
      to: options.to,
      subject: options.subject,
    })

    return true
  } catch (error) {
    logger.error('Email sending failed', error, {
      to: options.to,
      subject: options.subject,
    })
    return false
  }
}

/**
 * Send email notification (wrapper for common use case)
 */
export async function sendNotificationEmail(
  to: string,
  subject: string,
  message: string,
  actionUrl?: string,
  actionText?: string
): Promise<boolean> {
  const html = renderNotificationTemplate({
    subject,
    message,
    actionUrl,
    actionText,
  })

  return sendEmail({
    to,
    subject,
    html,
    text: message,
  })
}

/**
 * Render notification email template
 */
function renderNotificationTemplate(data: {
  subject: string
  message: string
  actionUrl?: string
  actionText?: string
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.subject}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f4f4f4;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #4F46E5;
    }
    .content {
      margin-bottom: 30px;
    }
    .message {
      font-size: 16px;
      color: #555;
      margin-bottom: 20px;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background-color: #4F46E5;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      text-align: center;
    }
    .button:hover {
      background-color: #4338CA;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e5e5;
      font-size: 12px;
      color: #999;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🚀 AdPilot AI</div>
    </div>
    <div class="content">
      <h2>${data.subject}</h2>
      <p class="message">${data.message}</p>
      ${data.actionUrl && data.actionText ? `
        <p style="text-align: center;">
          <a href="${data.actionUrl}" class="button">${data.actionText}</a>
        </p>
      ` : ''}
    </div>
    <div class="footer">
      <p>
        This is an automated message from AdPilot AI.<br>
        If you didn't expect this email, please ignore it.
      </p>
      <p>
        © ${new Date().getFullYear()} AdPilot AI. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

export default sendEmail
