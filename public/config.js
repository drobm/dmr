/* ============================================================
   Pain Relief Guide — EDITABLE SETTINGS
   ------------------------------------------------------------
   This is the ONLY file to touch for links and handles. Change a
   value, save, push — Vercel redeploys.

   Everything below is public by design (it ends up in the
   browser). Never put an API key or password in this file.
   ============================================================ */

/* Same handles as the marketing site footer. If these ever
   change, update them here and in public/index.html. */
const SOCIAL = {
  instagram: "https://instagram.com/derrick.dynamic",
  tiktok: "https://tiktok.com/@derrick.dynamic",
};

/* Where the upsell cards and the red-flag banner send people.
   Both point at the intake form, matching the "Book a Session"
   and "Explore Programs" buttons on the marketing site — that
   form is what feeds the Airtable CRM and the AI welcome-email
   pipeline, so every route into paid work lands in one place.

   If you later want "Explore Programs" to go straight to the My
   PT Hub library instead, change `library` to that URL. */
const NEXT_STEPS = {
  virtualSession: "/intake",
  library: "/intake",
};

/* Free profiles hold this many saved plans. The server enforces
   the same number independently — if you change it here, change
   MAX_SAVED_PLANS in api/_lib.js to match. */
const MAX_SAVED_PLANS = 2;
