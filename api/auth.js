/* ============================================================
   /api/auth — passwordless sign-in
     POST  { email }        -> emails a one-time link
     GET   ?token=...       -> verifies it and starts a session

   Only a hash of the token is stored, so a leaked database row
   can't be replayed as a login. Tokens are single-use and
   expire after 15 minutes.
   ============================================================ */

const crypto = require("crypto");
const {
  query, json, readBody, setSessionCookie, plansFor, rowToProfile, hasDb, hasSecret,
} = require("./_lib.js");
const { sendMagicLink } = require("./_email.js");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_MINUTES = 15;

/* The guide lives at /relief-plan; "/" is the marketing home.
   Sign-in links must land on the guide, so keep this in step with
   the filename of public/relief-plan.html if the route changes. */
const APP_PATH = "/relief-plan";

const hash = (t) => crypto.createHash("sha256").update(t).digest("hex");

function baseUrl(req) {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  return `${proto}://${host}`;
}

module.exports = async function handler(req, res) {
  if (!hasDb() || !hasSecret()) {
    return json(res, 503, { error: "Accounts aren't set up yet." });
  }

  /* ---------- request a link ---------- */
  if (req.method === "POST") {
    const { email: rawEmail } = await readBody(req);
    const email = String(rawEmail || "").trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return json(res, 400, { error: "Enter a valid email" });

    try {
      const token = crypto.randomBytes(32).toString("base64url");
      await query(
        `INSERT INTO login_tokens (token_hash, email, expires_at)
         VALUES ($1, $2, now() + ($3 || ' minutes')::interval)`,
        [hash(token), email, String(TOKEN_MINUTES)]
      );

      // Housekeeping: drop tokens that expired over a day ago.
      await query("DELETE FROM login_tokens WHERE expires_at < now() - interval '1 day'");

      await sendMagicLink({
        email,
        url: `${baseUrl(req)}${APP_PATH}?token=${encodeURIComponent(token)}`,
      });
    } catch (err) {
      console.error("Magic link failed:", err);
      return json(res, 500, { error: "Couldn't send the link right now." });
    }

    // Always the same response, whether or not that email has a
    // profile — otherwise this endpoint tells strangers who is
    // signed up.
    return json(res, 200, { sent: true });
  }

  /* ---------- verify a link ---------- */
  if (req.method === "GET") {
    const url = new URL(req.url, "http://localhost");
    const token = url.searchParams.get("token");
    if (!token) return json(res, 400, { error: "Missing token" });

    try {
      // Single-use: the UPDATE only matches a row that is unused
      // and unexpired, so a replayed link matches nothing.
      const { rows } = await query(
        `UPDATE login_tokens SET used_at = now()
         WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
         RETURNING email`,
        [hash(token)]
      );
      if (!rows.length) return json(res, 401, { error: "That link has expired or was already used." });

      const { rows: profiles } = await query(
        "SELECT id, name, email, handle, phone FROM profiles WHERE email = $1",
        [rows[0].email]
      );
      if (!profiles.length) return json(res, 404, { error: "No profile found for that email." });

      const profile = profiles[0];
      setSessionCookie(res, profile.id);
      return json(res, 200, { profile: rowToProfile(profile), plans: await plansFor(profile.id) });
    } catch (err) {
      console.error("Token verification failed:", err);
      return json(res, 500, { error: "Sign-in failed. Please request a new link." });
    }
  }

  return json(res, 405, { error: "Method not allowed" });
};
