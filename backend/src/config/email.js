import nodemailer from 'nodemailer';
import { env } from './env.js';

function createTransporter() {
  if (!env.smtp.user || !env.smtp.pass) return null;
  // Gmail App Passwords are displayed with spaces (e.g. "abcd efgh ijkl mnop")
  // but must be used without them — strip any spaces just in case.
  const pass = env.smtp.pass.replace(/\s+/g, '');
  // Use explicit host + port 587 (STARTTLS) instead of service:'gmail'
  // because cloud hosts like Render often block outbound port 465 (SSL).
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // STARTTLS — upgrades after connection
    auth: { user: env.smtp.user, pass },
    tls: {
      rejectUnauthorized: false, // allow self-signed certs in some proxied envs
    },
  });
}

async function send(to, subject, html) {
  const transporter = createTransporter();
  if (!transporter) {
    console.warn('[email] SMTP not configured — skipping email to', to);
    return false;
  }
  try {
    const info = await transporter.sendMail({
      from: `"Salon Pro" <${env.smtp.from}>`,
      to,
      subject,
      html,
    });
    console.log('[email] Sent to', to, '— messageId:', info.messageId);
    return true;
  } catch (err) {
    console.error('[email] FAILED to send to', to, '| Error:', err.message, '| Code:', err.code);
    return false;
  }
}

// ── Worker Invite ────────────────────────────────────────────────────────────

export async function sendWorkerInviteEmail({ toEmail, toName, password, loginUrl }) {
  return send(
    toEmail,
    'Your Salon Pro login credentials',
    `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:32px;border-radius:12px;">
      <div style="background:linear-gradient(135deg,#7C3AED,#A855F7);padding:24px;border-radius:8px;text-align:center;margin-bottom:24px;">
        <h1 style="color:white;margin:0;font-size:24px;">💇 Salon Pro</h1>
        <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;">You've been invited to join the team!</p>
      </div>
      <p style="color:#333;font-size:16px;">Hi <strong>${toName}</strong>,</p>
      <p style="color:#555;font-size:15px;line-height:1.6;">Your salon owner has created a login account for you on <strong>Salon Pro</strong>.</p>
      <div style="background:white;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin:24px 0;">
        <p style="margin:0 0 8px;color:#888;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;">Your Login Credentials</p>
        <p style="margin:4px 0;font-size:15px;"><strong>Email:</strong> ${toEmail}</p>
        <p style="margin:4px 0;font-size:15px;"><strong>Temporary Password:</strong>
          <code style="background:#f3f4f6;padding:2px 8px;border-radius:4px;">${password}</code>
        </p>
      </div>
      <div style="background:#FEF3C7;border-left:4px solid #F59E0B;padding:12px 16px;border-radius:4px;margin-bottom:24px;">
        <p style="margin:0;color:#92400E;font-size:14px;">⚠️ <strong>Important:</strong> Change your password immediately after your first login using the "Change Password" option in the sidebar.</p>
      </div>
      <div style="text-align:center;margin:28px 0;">
        <a href="${loginUrl}" style="background:linear-gradient(135deg,#7C3AED,#A855F7);color:white;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:bold;display:inline-block;">Log In to Salon Pro →</a>
      </div>
    </div>`
  );
}

// ── Daily Summary ────────────────────────────────────────────────────────────

export async function sendDailySummaryEmail({ toEmail, date, stats }) {
  const { serviceCount, revenue, expenses, tips, netProfit, topWorker, lowStockCount } = stats;
  const profitColor = netProfit >= 0 ? '#10B981' : '#EF4444';
  const sign = netProfit >= 0 ? '+' : '';

  return send(
    toEmail,
    `📊 Salon Pro Daily Summary — ${date}`,
    `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:32px;border-radius:12px;">
      <div style="background:linear-gradient(135deg,#7C3AED,#A855F7);padding:24px;border-radius:8px;text-align:center;margin-bottom:24px;">
        <h1 style="color:white;margin:0;font-size:22px;">📊 Daily Summary</h1>
        <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;">${date}</p>
      </div>
      <div style="display:grid;gap:12px;">
        ${statBox('✂️ Services Done', serviceCount, '#6366F1')}
        ${statBox('💰 Revenue', `₹${Number(revenue).toLocaleString('en-IN')}`, '#10B981')}
        ${statBox('📦 Expenses', `₹${Number(expenses).toLocaleString('en-IN')}`, '#F59E0B')}
        ${statBox('🎁 Tips Collected', `₹${Number(tips).toLocaleString('en-IN')}`, '#EC4899')}
        ${statBox('📈 Net Profit', `${sign}₹${Math.abs(netProfit).toLocaleString('en-IN')}`, profitColor)}
        ${topWorker ? statBox('🏆 Top Worker', topWorker, '#A855F7') : ''}
        ${lowStockCount > 0 ? statBox('⚠️ Low Stock Items', lowStockCount, '#EF4444') : ''}
      </div>
      <p style="color:#999;font-size:12px;text-align:center;margin-top:24px;">Salon Pro — Automated Daily Report</p>
    </div>`
  );
}

function statBox(label, value, color) {
  return `<div style="background:white;border-left:4px solid ${color};border-radius:8px;padding:16px;display:flex;justify-content:space-between;align-items:center;">
    <span style="color:#555;font-size:14px;">${label}</span>
    <span style="color:${color};font-weight:700;font-size:18px;">${value}</span>
  </div>`;
}

// ── Low Stock Alert ──────────────────────────────────────────────────────────

export async function sendLowStockAlert({ toEmail, lowProducts }) {
  const rows = lowProducts
    .map(p => `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-weight:600;">${p.name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#EF4444;">${p.remaining.toFixed(0)} ${p.unit}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#9CA3AF;">${p.lowStockThreshold} ${p.unit} threshold</td>
    </tr>`)
    .join('');

  return send(
    toEmail,
    `⚠️ Salon Pro — ${lowProducts.length} product(s) running low`,
    `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:32px;border-radius:12px;">
      <div style="background:linear-gradient(135deg,#EF4444,#F59E0B);padding:24px;border-radius:8px;text-align:center;margin-bottom:24px;">
        <h1 style="color:white;margin:0;font-size:22px;">⚠️ Low Stock Alert</h1>
        <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;">${lowProducts.length} product(s) need restocking</p>
      </div>
      <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden;">
        <thead><tr style="background:#f9fafb;">
          <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6B7280;">PRODUCT</th>
          <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6B7280;">REMAINING</th>
          <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6B7280;">THRESHOLD</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="color:#999;font-size:12px;text-align:center;margin-top:24px;">Log in to Salon Pro to restock.</p>
    </div>`
  );
}
