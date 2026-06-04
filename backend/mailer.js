// mailer.js — sends order notification emails via Resend (HTTPS API).
// Why Resend instead of SMTP: Railway blocks outbound SMTP ports (25, 465, 587).
// Resend works over HTTPS so it's unaffected by those restrictions.
//
// Required env vars (set in Railway → Variables):
//   RESEND_API_KEY        — starts with re_... (get from https://resend.com/api-keys)
//   NOTIFICATION_EMAIL    — where to send order alerts (e.g. med.elasker@gmail.com)
// Optional:
//   RESEND_FROM           — sender address (default: "Bella Vita <onboarding@resend.dev>")
require('dotenv').config();

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || 'med.elasker@gmail.com';
const RESEND_FROM = process.env.RESEND_FROM || 'Bella Vita <onboarding@resend.dev>';

let resendClient = null;
function getClient() {
  if (!RESEND_API_KEY) return null;
  if (resendClient) return resendClient;
  // Lazy-load the SDK so missing dep doesn't break server startup
  const { Resend } = require('resend');
  resendClient = new Resend(RESEND_API_KEY);
  return resendClient;
}

/**
 * Send a "new order received" notification.
 * Fire-and-forget — never throws; logs errors instead so order flow isn't blocked.
 */
async function sendNewOrderEmail({ orderId, customer_name, customer_phone, wilaya, address, notes, total, items, created_at }) {
  const resend = getClient();
  if (!resend) {
    console.warn('⚠️  RESEND_API_KEY not configured. Skipping order email.');
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
    const { data, error } = await resend.emails.send({
      from: RESEND_FROM,
      to: NOTIFICATION_EMAIL,
      subject,
      html,
      text,
    });
    if (error) {
      console.error(`✗ Resend rejected email for order #${orderId}:`, error.message || error);
    } else {
      console.log(`✉️  Order notification email sent for order #${orderId} (id=${data?.id})`);
    }
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
