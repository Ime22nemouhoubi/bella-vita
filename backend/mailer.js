// mailer.js — sends notification emails via SMTP
const nodemailer = require('nodemailer');
require('dotenv').config();

// SMTP credentials come from env vars. Configure these in Railway.
// For Gmail: use an "App Password" (NOT your normal password):
//   1. Enable 2FA on your Google account
//   2. https://myaccount.google.com/apppasswords → create app password
//   3. Paste the 16-char password into SMTP_PASSWORD
const SMTP_HOST   = process.env.SMTP_HOST   || 'smtp.gmail.com';
const SMTP_PORT   = Number(process.env.SMTP_PORT || 465);
const SMTP_SECURE = process.env.SMTP_SECURE !== 'false'; // true unless explicitly disabled
const SMTP_USER   = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || 'med.elasker@gmail.com';
const FROM_NAME = process.env.SMTP_FROM_NAME || 'Bella Vita';

let transporter = null;
function getTransporter() {
  if (!SMTP_USER || !SMTP_PASSWORD) return null;
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });
  return transporter;
}

/**
 * Send a "new order received" notification.
 * Fire-and-forget — never throws; logs errors instead so order flow isn't blocked.
 */
async function sendNewOrderEmail({ orderId, customer_name, customer_phone, wilaya, address, notes, total, items, created_at }) {
  const t = getTransporter();
  if (!t) {
    console.warn('⚠️  SMTP credentials not configured (SMTP_USER / SMTP_PASSWORD). Skipping email.');
    return;
  }

  const dateStr = new Date(created_at || Date.now()).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
  const itemsHtml = (items || [])
    .map(i => `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(i.product_name)} <span style="color:#888;">× ${i.quantity}</span></td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:600;">${Number(i.unit_price * i.quantity).toLocaleString('fr-FR')} DA</td>
    </tr>`)
    .join('');

  const itemsText = (items || [])
    .map(i => `- ${i.product_name} × ${i.quantity} = ${Number(i.unit_price * i.quantity).toLocaleString('fr-FR')} DA`)
    .join('\n');

  const subject = `🛒 Nouvelle commande #${orderId} — ${customer_name} (${Number(total).toLocaleString('fr-FR')} DA)`;

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#faf6f1;color:#1f1418;">
      <div style="background:#6b1e2a;color:#faf6f1;padding:20px 24px;border-radius:12px 12px 0 0;">
        <div style="font-size:24px;font-weight:600;">Bella Vita</div>
        <div style="font-size:14px;opacity:0.8;margin-top:4px;">Nouvelle commande reçue</div>
      </div>
      <div style="background:white;padding:24px;border-radius:0 0 12px 12px;">
        <h2 style="margin-top:0;color:#6b1e2a;">Commande #${orderId}</h2>
        <p style="color:#666;font-size:14px;">${escapeHtml(dateStr)}</p>

        <div style="background:#faf6f1;padding:16px;border-radius:8px;margin:16px 0;">
          <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:8px;">Client</div>
          <div style="font-size:16px;font-weight:600;margin-bottom:4px;">${escapeHtml(customer_name)}</div>
          <div style="font-size:14px;color:#666;">📞 ${escapeHtml(customer_phone)}</div>
          <div style="font-size:14px;color:#666;margin-top:4px;">📍 ${escapeHtml(wilaya)} — ${escapeHtml(address)}</div>
          ${notes ? `<div style="font-size:13px;color:#666;margin-top:8px;font-style:italic;">Notes : ${escapeHtml(notes)}</div>` : ''}
        </div>

        <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#888;margin:16px 0 8px;">Articles</div>
        <table style="width:100%;border-collapse:collapse;background:white;border:1px solid #eee;border-radius:8px;overflow:hidden;">
          ${itemsHtml}
          <tr>
            <td style="padding:12px;font-weight:600;text-align:right;">Total</td>
            <td style="padding:12px;text-align:right;font-weight:700;color:#6b1e2a;font-size:18px;">${Number(total).toLocaleString('fr-FR')} DA</td>
          </tr>
        </table>

        <p style="font-size:13px;color:#888;margin-top:24px;text-align:center;">
          Connectez-vous à l'espace admin pour gérer cette commande.
        </p>
      </div>
    </div>
  `;

  const text = `
Nouvelle commande #${orderId} — Bella Vita

Date : ${dateStr}

Client :
  ${customer_name}
  ${customer_phone}
  ${wilaya} — ${address}
${notes ? `  Notes : ${notes}\n` : ''}
Articles :
${itemsText}

Total : ${Number(total).toLocaleString('fr-FR')} DA
  `.trim();

  try {
    await t.sendMail({
      from: `"${FROM_NAME}" <${SMTP_USER}>`,
      to: NOTIFICATION_EMAIL,
      subject,
      text,
      html,
    });
    console.log(`✉️  Order notification email sent for order #${orderId}`);
  } catch (err) {
    console.error(`✗ Failed to send order email for #${orderId}:`, err.message);
  }
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = { sendNewOrderEmail };
