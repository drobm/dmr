/* ============================================================
   POST /api/lead — create a free profile
   ------------------------------------------------------------
   This is the money endpoint: it unlocks the plan AND captures
   the lead. It writes the profile to Postgres, auto-saves the
   plan they just built, signs them in, and emails Derrick.

   The email is best-effort: a Resend outage must never stop a
   lead from being stored or a visitor from seeing their plan.
   ============================================================ */

const {
  MAX_SAVED_PLANS, query, json, readBody, setSessionCookie,
  plansFor, rowToProfile, hasDb,
} = require("./_lib.js");
const { notifyNewLead } = require("./_email.js");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  const body = await readBody(req);
  const p = body.profile || {};

  const name = String(p.name || "").trim().slice(0, 120);
  const email = String(p.email || "").trim().toLowerCase().slice(0, 200);
  const handle = String(p.handle || "").trim().replace(/^@/, "").slice(0, 120);
  const phone = p.phone ? String(p.phone).trim().slice(0, 40) : null;

  // Re-validate server-side — the browser checks are for UX only.
  if (!name) return json(res, 400, { error: "Full name is required" });
  if (!EMAIL_RE.test(email)) return json(res, 400, { error: "Enter a valid email" });
  if (!handle) return json(res, 400, { error: "Instagram or TikTok handle is required" });

  if (!hasDb()) {
    // No database provisioned yet. Let them through with the plan
    // unlocked rather than blocking the funnel on infrastructure.
    console.warn("LEAD (not persisted — no database configured):", { name, email, handle, phone });
    return json(res, 200, { profile: { name, email, handle, phone }, plans: [], persisted: false });
  }

  try {
    // Returning visitors re-submitting the form update their details
    // rather than colliding on the unique email.
    const { rows } = await query(
      `INSERT INTO profiles (name, email, handle, phone)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE
         SET name = EXCLUDED.name, handle = EXCLUDED.handle,
             phone = COALESCE(EXCLUDED.phone, profiles.phone)
       RETURNING id, name, email, handle, phone, created_at`,
      [name, email, handle, phone]
    );
    const profile = rows[0];

    const plan = body.plan;
    let saved = await plansFor(profile.id);
    if (plan && plan.plan && saved.length < MAX_SAVED_PLANS) {
      await query(
        "INSERT INTO saved_plans (profile_id, label, plan, tips) VALUES ($1, $2, $3, $4)",
        [profile.id, String(plan.label || "My plan").slice(0, 200), JSON.stringify(plan.plan), plan.tips || null]
      );
      saved = await plansFor(profile.id);
    }

    setSessionCookie(res, profile.id);

    // Fire-and-forget so a slow mail API doesn't hold up the response.
    notifyNewLead({ name, email, handle, phone, plan }).catch((e) =>
      console.error("Lead alert email failed:", e && e.message)
    );

    return json(res, 200, { profile: rowToProfile(profile), plans: saved, persisted: true });
  } catch (err) {
    console.error("Lead capture failed:", err);
    // Never trap the visitor behind our own outage.
    return json(res, 200, { profile: { name, email, handle, phone }, plans: [], persisted: false });
  }
};
