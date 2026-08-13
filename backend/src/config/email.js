import nodemailer from 'nodemailer';
import { env } from './env.js';

/**
 * Creates a Nodemailer transporter using Gmail SMTP.
 * Requires SMTP_USER (Gmail address) and SMTP_PASS (Gmail App Password)
 * to be set as environment variables.
 *
 * Returns null if credentials are not configured, so callers can
 * gracefully handle the case without crashing the app.
 */
function createTransporter() {
  if (!env.smtp.user || !env.smtp.pass) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: env.smtp.user,
      pass: env.smtp.pass,
    },
  });
}

/**
 * Sends a worker invitation email with their temporary login credentials
 * and a prompt to change their password after first login.
 *
 * @param {object} opts
 * @param {string} opts.toEmail   - Recipient email address
 * @param {string} opts.toName    - Recipient display name
 * @param {string} opts.password  - Generated temporary password
 * @param {string} opts.loginUrl  - The URL of the web app for login
 * @returns {Promise<boolean>}    - true if sent, false if SMTP not configured
 */
export async function sendWorkerInviteEmail({ toEmail, toName, password, loginUrl }) {
  const transporter = createTransporter();

  if (!transporter) {
    console.warn(
      '[email] SMTP not configured. Set SMTP_USER and SMTP_PASS env vars to enable email delivery.'
    );
    return false;
  }

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 32px; border-radius: 12px;">
      <div style="background: linear-gradient(135deg, #7C3AED, #A855F7); padding: 24px; border-radius: 8px; text-align: center; margin-bottom: 24px;">
        <h1 style="color: white; margin: 0; font-size: 24px;">💇 Salon Pro</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0;">You've been invited to join the team!</p>
      </div>

      <p style="color: #333; font-size: 16px;">Hi <strong>${toName}</strong>,</p>
      <p style="color: #555; font-size: 15px; line-height: 1.6;">
        Your salon owner has created a login account for you on <strong>Salon Pro</strong>.
        You can use it to record your services and view your performance stats.
      </p>

      <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <p style="margin: 0 0 8px; color: #888; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Your Login Credentials</p>
        <p style="margin: 4px 0; font-size: 15px;"><strong>Email:</strong> ${toEmail}</p>
        <p style="margin: 4px 0; font-size: 15px;"><strong>Temporary Password:</strong>
          <code style="background: #f3f4f6; padding: 2px 8px; border-radius: 4px; font-size: 15px; letter-spacing: 0.05em;">${password}</code>
        </p>
      </div>

      <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px 16px; border-radius: 4px; margin-bottom: 24px;">
        <p style="margin: 0; color: #92400E; font-size: 14px;">
          ⚠️ <strong>Important:</strong> Please change your password immediately after your first login.
        </p>
      </div>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${loginUrl}" style="background: linear-gradient(135deg, #7C3AED, #A855F7); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: bold; display: inline-block;">
          Log In to Salon Pro →
        </a>
      </div>

      <p style="color: #999; font-size: 13px; text-align: center; margin-top: 24px;">
        If you were not expecting this email, you can safely ignore it.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: `"Salon Pro" <${env.smtp.from}>`,
    to: toEmail,
    subject: `Your Salon Pro login credentials`,
    html: htmlBody,
  });

  return true;
}
