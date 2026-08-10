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

async function sendLeadEmail({ name, email, phone, city, message }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[EMAIL] SMTP credentials not configured. Skipping email dispatch.');
    return;
  }

  const adminEmail = process.env.SMTP_USER; // Send to the owner/admin

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
      <h2 style="color: #0A2540; border-bottom: 2px solid #0070F3; padding-bottom: 10px;">New Website Lead Received</h2>
      <p style="color: #333; font-size: 16px;">A new enquiry has been submitted through the website contact form.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; width: 120px; color: #555;">Name:</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; color: #111;">${name || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Email:</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; color: #111;">${email || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Phone:</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; color: #111;">${phone || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">City:</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; color: #111;">${city || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">Message:</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; color: #111;">${message || 'N/A'}</td>
        </tr>
      </table>

      <p style="color: #666; font-size: 14px; margin-top: 30px;">You can view and manage this lead in the database or admin panel.</p>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"Shreeja Finance Website" <${process.env.SMTP_USER}>`,
      to: adminEmail, // Sending to owner
      subject: `New Lead: ${name} from ${city || 'Website'}`,
      html: htmlContent,
    });
    console.log(`[EMAIL] Lead notification sent successfully to ${adminEmail}`);
    return info;
  } catch (error) {
    console.error(`[EMAIL] Failed to send lead notification email:`, error);
    // don't throw to prevent failing the API response
  }
}

module.exports = {
  sendOtpEmail,
  sendLeadEmail,
};
