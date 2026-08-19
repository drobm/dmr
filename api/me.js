/* GET /api/me — restore a session on page load. */

const { query, json, readSession, plansFor, rowToProfile, hasDb } = require("./_lib.js");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });
  if (!hasDb()) return json(res, 200, { profile: null, plans: [] });

  const session = readSession(req);
  if (!session) return json(res, 200, { profile: null, plans: [] });

  try {
    const { rows } = await query(
      "SELECT id, name, email, handle, phone FROM profiles WHERE id = $1",
      [session.profileId]
    );
    if (!rows.length) return json(res, 200, { profile: null, plans: [] });

    return json(res, 200, {
      profile: rowToProfile(rows[0]),
      plans: await plansFor(rows[0].id),
    });
  } catch (err) {
    console.error("Session restore failed:", err);
    return json(res, 200, { profile: null, plans: [] });
  }
};
