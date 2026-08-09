'use strict';
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Sends an OTP email
 * @param {Object} options
 * @param {string} options.email - The recipient's email address
 * @param {string} options.otp - The 6-digit OTP code
 * @param {string} [options.name] - The recipient's name (optional)
 */
async function sendOtpEmail({ email, otp, name = 'User' }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[EMAIL] SMTP credentials not configured. Skipping email dispatch.');
    return;
  }

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
      <h2 style="color: #0A2540; text-align: center;">Welcome to Shreeja Dealers</h2>
      <p style="color: #333; font-size: 16px;">Hello ${name},</p>
      <p style="color: #333; font-size: 16px;">Your One-Time Password (OTP) for login is:</p>
      <div style="text-align: center; margin: 30px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #0070F3; background-color: #F0F7FF; padding: 15px 25px; border-radius: 8px;">${otp}</span>
      </div>
      <p style="color: #666; font-size: 14px; text-align: center;">This code will expire in 10 minutes. Do not share this code with anyone.</p>
      <hr style="border: none; border-top: 1px solid #eaeaea; margin: 30px 0;" />
      <p style="color: #999; font-size: 12px; text-align: center;">&copy; ${new Date().getFullYear()} Shreeja Finance Private Limited. All rights reserved.</p>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"Shreeja Finance" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Your Login OTP - Shreeja Finance',
      html: htmlContent,
    });
    console.log(`[EMAIL] Message sent successfully to ${email} (Message ID: ${info.messageId})`);
    return info;
  } catch (error) {
    console.error(`[EMAIL] Failed to send email to ${email}:`, error);
    throw new Error('Failed to send OTP email');
  }
}

module.exports = {
  sendOtpEmail,
};
