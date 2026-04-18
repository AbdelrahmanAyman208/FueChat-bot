const nodemailer = require('nodemailer');

/**
 * Create a transporter.
 * For development, uses Ethereal (free fake SMTP).
 * For production, set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env
 */
let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST) {
    // Production — real SMTP
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Development — Ethereal fake email (catches all emails)
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log('📧 Using Ethereal test email account:', testAccount.user);
  }

  return transporter;
}

/**
 * Send a password reset email with a 6-digit code.
 */
async function sendResetEmail(toEmail, resetCode, userName) {
  const transport = await getTransporter();

  const info = await transport.sendMail({
    from: process.env.SMTP_FROM || '"FueBot Support" <noreply@fuebot.com>',
    to: toEmail,
    subject: 'FueBot — Password Reset Code',
    text: `Hi ${userName},\n\nYour password reset code is: ${resetCode}\n\nThis code expires in 15 minutes.\n\nIf you didn't request this, please ignore this email.\n\n— FueBot Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">🔐 Password Reset</h2>
        <p>Hi <strong>${userName}</strong>,</p>
        <p>Your password reset code is:</p>
        <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1e40af;">${resetCode}</span>
        </div>
        <p style="color: #64748b; font-size: 14px;">This code expires in <strong>15 minutes</strong>.</p>
        <p style="color: #64748b; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="color: #94a3b8; font-size: 12px;">— FueBot Team</p>
      </div>
    `,
  });

  // In development, log the preview URL
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log('📧 Preview email at:', previewUrl);
  }

  return { messageId: info.messageId, previewUrl };
}

module.exports = { sendResetEmail };
