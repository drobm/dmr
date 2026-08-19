/* ============================================================
   Shared helpers for the serverless functions.
   Nothing in this file is sent to the browser.
   ============================================================ */

const crypto = require("crypto");
const { Pool } = require("pg");
const { EXERCISES, AREA_NAMES } = require("../public/data.js");

/* Keep in step with MAX_SAVED_PLANS in public/config.js. The UI
   value is a convenience; THIS one is the rule — the client can
   be edited by anyone with devtools open. */
const MAX_SAVED_PLANS = 2;

/* ------------------------------------------------------------
   DATABASE
   ------------------------------------------------------------ */
const CONNECTION_STRING =
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  "";

let pool = null;
let schemaReady = null;

function db() {
  if (!CONNECTION_STRING) {
    throw Object.assign(new Error("No database configured"), { code: "NO_DB" });
  }
  if (!pool) {
    pool = new Pool({
      connectionString: CONNECTION_STRING,
      // Managed Postgres (Neon, Supabase, Aurora) terminates TLS
      // with a chain Node doesn't ship a root for.
      ssl: { rejectUnauthorized: false },
      max: 1, // one connection per serverless instance
      idleTimeoutMillis: 10000,
    });
  }
  return pool;
}

/* Creates the tables on first use. Cheap enough to run per cold
   start and it means there is no migration step to forget. */
function ensureSchema() {
  if (!schemaReady) {
    schemaReady = db().query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id          BIGSERIAL PRIMARY KEY,
        name        TEXT NOT NULL,
        email       TEXT NOT NULL UNIQUE,
        handle      TEXT,
        phone       TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS saved_plans (
        id          BIGSERIAL PRIMARY KEY,
        profile_id  BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        label       TEXT NOT NULL,
        plan        JSONB NOT NULL,
        tips        TEXT,
        saved_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS saved_plans_profile_idx ON saved_plans(profile_id);
      CREATE TABLE IF NOT EXISTS login_tokens (
        token_hash  TEXT PRIMARY KEY,
        email       TEXT NOT NULL,
        expires_at  TIMESTAMPTZ NOT NULL,
        used_at     TIMESTAMPTZ
      );
    `).catch((err) => {
      schemaReady = null; // let the next request retry
      throw err;
    });
  }
  return schemaReady;
}

async function query(text, params) {
  await ensureSchema();
  return db().query(text, params);
}

/* ------------------------------------------------------------
   SESSIONS — signed cookie, no session table needed
   ------------------------------------------------------------ */
const SECRET = process.env.AUTH_SECRET || "";
const SESSION_DAYS = 60;

function sign(value) {
  return crypto.createHmac("sha256", SECRET).update(value).digest("base64url");
}

function makeSession(profileId) {
  const expires = Date.now() + SESSION_DAYS * 864e5;
  const payload = `${profileId}.${expires}`;
  return `${payload}.${sign(payload)}`;
}

function readSession(req) {
  if (!SECRET) return null;
  const raw = (req.headers.cookie || "")
    .split(";").map((c) => c.trim())
    .find((c) => c.startsWith("dmr_session="));
  if (!raw) return null;

  const parts = decodeURIComponent(raw.slice("dmr_session=".length)).split(".");
  if (parts.length !== 3) return null;
  const [id, expires, sig] = parts;

  const expected = sign(`${id}.${expires}`);
  // Constant-time compare so a wrong signature can't be brute-forced
  // one byte at a time by timing the response.
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  if (Number(expires) < Date.now()) return null;

  return { profileId: Number(id) };
}

function setSessionCookie(res, profileId) {
  const secure = process.env.NODE_ENV === "production" ? " Secure;" : "";
  res.setHeader("Set-Cookie",
    `dmr_session=${encodeURIComponent(makeSession(profileId))}; Path=/; HttpOnly;${secure} SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`);
}

/* ------------------------------------------------------------
   PLAN SHAPING — the caps live here, not in the browser
   ------------------------------------------------------------ */

/* Resolves model output against the real exercise database and
   enforces 2-3 per area / 8 total. A model that ignores the
   prompt, or a hand-crafted request, still cannot get past this. */
function hydratePlan(raw) {
  if (!raw || !Array.isArray(raw.plan)) return [];

  let sections = raw.plan
    .filter((p) => p && EXERCISES[p.area])
    .map((p) => ({
      area: p.area,
      note: typeof p.note === "string" ? p.note.slice(0, 300) : "",
      exercises: (Array.isArray(p.exercises) ? p.exercises : [])
        .map((name) => EXERCISES[p.area].find((e) => e.name === name))
        .filter(Boolean),
    }))
    .map((p) => ({
      ...p,
      exercises: (p.exercises.length ? p.exercises : EXERCISES[p.area].slice(0, 3)).slice(0, 3),
    }));

  // De-duplicate areas — the model occasionally repeats one.
  const seen = new Set();
  sections = sections.filter((p) => (seen.has(p.area) ? false : seen.add(p.area)));

  let total = sections.reduce((s, p) => s + p.exercises.length, 0);
  while (total > 8 && sections.length) {
    let idx = 0;
    sections.forEach((p, i) => {
      if (p.exercises.length >= sections[idx].exercises.length) idx = i;
    });
    if (sections[idx].exercises.length <= 1) break;
    sections[idx].exercises.pop();
    total--;
  }
  return sections;
}

/* Non-AI plan, used when the API key is missing or the call fails.
   Visitors get a usable plan rather than an error. */
function fallbackPlan(areas) {
  const valid = (areas || []).filter((a) => EXERCISES[a]);
  const list = valid.length ? valid : ["Lower Back"];
  return {
    plan: list.map((area) => ({
      area,
      exercises: EXERCISES[area].slice(0, list.length >= 3 ? 2 : 3).map((e) => e.name),
      note: "Start light, stay in pain-free ranges, and progress gradually.",
    })),
    tips: "Consistency beats intensity — short daily sessions win. If pain is sharp, worsening, or radiating, stop and get assessed in person.",
  };
}

/* ------------------------------------------------------------
   HTTP HELPERS
   ------------------------------------------------------------ */
function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(body));
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { return {}; }
}

/* Shapes a DB row into what the client expects. */
const rowToPlan = (r) => ({
  id: String(r.id),
  label: r.label,
  plan: r.plan,
  tips: r.tips,
  savedAt: r.saved_at,
});

async function plansFor(profileId) {
  const { rows } = await query(
    "SELECT id, label, plan, tips, saved_at FROM saved_plans WHERE profile_id = $1 ORDER BY saved_at ASC",
    [profileId]
  );
  return rows.map(rowToPlan);
}

const rowToProfile = (r) => ({ id: String(r.id), name: r.name, email: r.email, handle: r.handle, phone: r.phone });

module.exports = {
  MAX_SAVED_PLANS, EXERCISES, AREA_NAMES,
  query, ensureSchema,
  readSession, setSessionCookie,
  hydratePlan, fallbackPlan,
  json, readBody, plansFor, rowToProfile, rowToPlan,
  hasDb: () => !!CONNECTION_STRING,
  hasSecret: () => !!SECRET,
};
