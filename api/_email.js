/* ============================================================
   Email via Resend (installed from the Vercel Marketplace).
   Both functions are no-ops when RESEND_API_KEY is unset, so the
   app runs fine before the integration is installed.
   ============================================================ */

const { Resend } = require("resend");

const FROM = process.env.EMAIL_FROM || "Pain Relief Guide <onboarding@resend.dev>";
const ALERT_TO = process.env.LEAD_ALERT_TO || "";

function client() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

const esc = (s) =>
  String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function notifyNewLead({ name, email, handle, phone, plan }) {
  const r = client();
  if (!r || !ALERT_TO) return;

  const areas = plan && Array.isArray(plan.plan)
    ? plan.plan.map((s) => s.area).join(", ")
    : "—";

  await r.emails.send({
    from: FROM,
    to: ALERT_TO,
    replyTo: email,
    subject: `New lead: ${name} (${areas})`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:520px">
      <h2 style="color:#171717;margin:0 0 16px">New Pain Relief Guide lead</h2>
      <table style="font-size:14px;border-collapse:collapse">
        <tr><td style="padding:4px 12px 4px 0;color:#737373">Name</td><td><strong>${esc(name)}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#737373">Email</td><td><a href="mailto:${esc(email)}">${esc(email)}</a></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#737373">Handle</td><td>@${esc(handle)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#737373">Phone</td><td>${esc(phone || "—")}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#737373">Areas</td><td>${esc(areas)}</td></tr>
      </table>
      <p style="font-size:13px;color:#737373;margin-top:20px">
        Reply straight to this email to reach them.
      </p>
    </div>`,
  });
}

async function sendMagicLink({ email, url }) {
  const r = client();
  if (!r) throw new Error("RESEND_API_KEY not configured");

  await r.emails.send({
    from: FROM,
    to: email,
    subject: "Your sign-in link",
    html: `<div style="font-family:system-ui,sans-serif;max-width:520px">
      <h2 style="color:#171717;margin:0 0 8px">Sign in to your Relief Plans</h2>
      <p style="color:#525252;font-size:14px;margin:0 0 24px">
        Tap the button below to open your saved plans. This link works once and expires in 15 minutes.
      </p>
      <a href="${esc(url)}" style="display:inline-block;background:#facc15;color:#171717;font-weight:700;
        padding:14px 28px;border-radius:8px;text-decoration:none">Open My Plans</a>
      <p style="color:#a3a3a3;font-size:12px;margin-top:28px">
        If you didn't request this, you can ignore it — nothing will change.
      </p>
    </div>`,
  });
}

module.exports = { notifyNewLead, sendMagicLink };
