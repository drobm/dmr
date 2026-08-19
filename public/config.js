/* ============================================================
   DMR Pain Relief Guide — EDITABLE SETTINGS
   ------------------------------------------------------------
   This is the ONLY file Derrick needs to touch for links and
   handles. Change a value, save, push — Vercel redeploys.
   Everything below is public by design (it ends up in the
   browser). Never put an API key or password in this file.
   ============================================================ */

const SOCIAL = {
  // TODO(derrick): replace with the real DMR handles.
  instagram: "https://instagram.com/yourhandle",
  tiktok: "https://tiktok.com/@yourhandle",
};

const NEXT_STEPS = {
  // TODO(derrick): replace with the real My PT Hub URLs.
  // Both the booking link and the program library live on My PT Hub.
  virtualSession: "https://calendly.com/yourhandle/virtual-session",
  library: "https://dynamicmusclerecovery.com/library",
};

/* Free profiles hold this many saved plans. The server enforces
   the same number independently — if you change it here, change
   MAX_SAVED_PLANS in api/_lib.js to match. */
const MAX_SAVED_PLANS = 2;
