/* ============================================================
   /api/plans — saved plans for the signed-in profile
     POST    { plan }   -> save (enforces the plan-slot limit)
     DELETE  ?id=...    -> remove one

   The MAX_SAVED_PLANS cap is enforced here, not in the browser.
   The UI limit is a nicety; this is the actual rule.
   ============================================================ */

const {
  MAX_SAVED_PLANS, query, json, readBody, readSession, plansFor, hasDb,
} = require("./_lib.js");

module.exports = async function handler(req, res) {
  if (!hasDb()) return json(res, 503, { error: "Saving isn't set up yet." });

  const session = readSession(req);
  if (!session) return json(res, 401, { error: "Not signed in" });

  /* ---------- save ---------- */
  if (req.method === "POST") {
    const { plan } = await readBody(req);
    if (!plan || !Array.isArray(plan.plan) || !plan.plan.length) {
      return json(res, 400, { error: "No plan supplied" });
    }

    try {
      const existing = await plansFor(session.profileId);
      if (existing.length >= MAX_SAVED_PLANS) {
        return json(res, 409, {
          error: `Free profiles hold ${MAX_SAVED_PLANS} plans.`,
          plans: existing,
        });
      }

      await query(
        "INSERT INTO saved_plans (profile_id, label, plan, tips) VALUES ($1, $2, $3, $4)",
        [
          session.profileId,
          String(plan.label || "My plan").slice(0, 200),
          JSON.stringify(plan.plan),
          plan.tips || null,
        ]
      );
      return json(res, 200, { plans: await plansFor(session.profileId) });
    } catch (err) {
      console.error("Save plan failed:", err);
      return json(res, 500, { error: "Couldn't save that plan." });
    }
  }

  /* ---------- delete ---------- */
  if (req.method === "DELETE") {
    const url = new URL(req.url, "http://localhost");
    const id = url.searchParams.get("id");
    if (!id) return json(res, 400, { error: "Missing plan id" });

    try {
      // Scoped to the session's profile so an id from another
      // account can't be deleted by guessing it.
      await query("DELETE FROM saved_plans WHERE id = $1 AND profile_id = $2", [id, session.profileId]);
      return json(res, 200, { plans: await plansFor(session.profileId) });
    } catch (err) {
      console.error("Delete plan failed:", err);
      return json(res, 500, { error: "Couldn't delete that plan." });
    }
  }

  return json(res, 405, { error: "Method not allowed" });
};
