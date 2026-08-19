/* ============================================================
   DMR Pain Relief Guide — application
   ------------------------------------------------------------
   Ported from the original single-file React component to plain
   JS. No React, no Babel, no Tailwind CDN — nothing to build and
   nothing to install, so this runs anywhere a static file can be
   served and stays editable on a machine without Node.

   Architecture: one `state` object, one `render()` that redraws
   the current page, and delegated event handlers keyed off
   data-action attributes. Text inputs deliberately do NOT trigger
   a re-render on keystroke (see `bindInputs`) — that would blow
   away focus and the caret mid-typing on mobile.

   Editable links/handles live in config.js. Content lives in
   data.js. Only rendering logic belongs here.
   ============================================================ */

/* ------------------------------------------------------------
   ICONS — inline SVG, replacing the lucide-react dependency
   ------------------------------------------------------------ */
const ICON_PATHS = {
  Instagram: '<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>',
  Loader2: '<path d="M21 12a9 9 0 1 1-6.219-8.56"/>',
  ChevronLeft: '<path d="m15 18-6-6 6-6"/>',
  Check: '<path d="M20 6 9 17l-5-5"/>',
  X: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  Lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  Activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  Dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11"/>',
  Expand: '<path d="m21 21-6-6m6 6v-4.8m0 4.8h-4.8"/><path d="M3 16.2V21m0 0h4.8M3 21l6-6"/><path d="M21 7.8V3m0 0h-4.8M21 3l-6 6"/><path d="M3 7.8V3m0 0h4.8M3 3l6 6"/>',
  MoveVertical: '<path d="M12 2v20"/><path d="m8 6 4-4 4 4"/><path d="m8 18 4 4 4-4"/>',
  Grip: '<circle cx="5" cy="9" r="1"/><circle cx="12" cy="9" r="1"/><circle cx="19" cy="9" r="1"/><circle cx="5" cy="15" r="1"/><circle cx="12" cy="15" r="1"/><circle cx="19" cy="15" r="1"/>',
  Hand: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12m0-6.5a1.5 1.5 0 0 1 3 0V12m0-4.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-.5a7 7 0 0 1-6-3.4l-1.9-3.3a1.5 1.5 0 0 1 2.6-1.5L8 15"/>',
  Flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  RotateCcw: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  Move: '<path d="M12 2v20M2 12h20"/><path d="m9 5 3-3 3 3M9 19l3 3 3-3M5 9l-3 3 3 3M19 9l3 3-3 3"/>',
  StretchHorizontal: '<rect x="2" y="4" width="20" height="6" rx="2"/><rect x="2" y="14" width="20" height="6" rx="2"/>',
  TrendingUp: '<path d="M22 7 13.5 15.5 8.5 10.5 2 17"/><path d="M16 7h6v6"/>',
  Footprints: '<ellipse cx="8" cy="7" rx="3" ry="4.5"/><circle cx="8" cy="14.5" r="1.5"/><ellipse cx="16" cy="12" rx="3" ry="4.5"/><circle cx="16" cy="19.5" r="1.5"/>',
  PersonStanding: '<circle cx="12" cy="5" r="2"/><path d="M12 7v6m0 0-3 8m3-8 3 8M8 10.5 12 9l4 1.5"/>',
};

function icon(name, cls = "") {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round" class="${cls}" aria-hidden="true">${ICON_PATHS[name] || ""}</svg>`;
}

const TIKTOK_ICON = (cls) =>
  `<svg viewBox="0 0 24 24" fill="currentColor" class="${cls}" aria-hidden="true"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>`;

/* ------------------------------------------------------------
   UTILITIES
   ------------------------------------------------------------ */

/* Everything user-supplied passes through here before it reaches
   innerHTML. Names and free-text descriptions are echoed back
   into the page, so this is the XSS boundary — do not remove. */
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const slugify = (name) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const MEDIA_BASE = "/media";
const RED_FLAG_RE = /(numb|tingl|radiat|shoot|weak|surger|fractur|dislocat|accident|fell|bladder|bowel|fever)/i;

const QUALIFIER_QUESTIONS = [
  { key: "feel", label: "What does it feel like? (tap all that apply)", options: ["Sharp", "Dull / achy", "Tight / stiff"], multi: true },
  { key: "timing", label: "When is it worst?", options: ["Morning", "After activity", "All day"] },
  { key: "flags", label: "Any numbness, tingling, or radiating pain?", options: ["Yes", "No"] },
];

/* ------------------------------------------------------------
   STATE
   ------------------------------------------------------------ */
const state = {
  view: "anterior",
  selected: [],
  description: "",
  loading: false,
  plan: null,          // { id, label, plan: [...], tips }
  error: null,
  page: "home",        // home | qualify | plan | myplans | login
  pendingMode: null,   // 'text' | 'diagram'
  qualifier: { feel: [], timing: null, flags: null },
  redFlag: false,
  profile: null,
  savedPlans: [],
  hovered: null,
  form: { name: "", email: "", handle: "", phone: "" },
  formErrors: {},
  loginEmail: "",
  loginSent: false,
  loginError: null,
  saving: false,
};

const unlocked = () => !!state.profile;
const isCurrentSaved = () =>
  state.plan ? state.savedPlans.some((p) => String(p.id) === String(state.plan.id)) : false;

/* ------------------------------------------------------------
   SERVER CALLS
   ------------------------------------------------------------ */
async function api(path, opts = {}) {
  const res = await fetch(path, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.error || `Request failed (${res.status})`), { status: res.status, body });
  return body;
}

/* Plan generation now runs server-side (api/plan.js) so the
   Anthropic key stays in an environment variable. The server also
   re-applies the exercise caps, so a bad model response can't
   produce a 20-exercise plan even if this file is tampered with. */
async function requestPlan(payload) {
  return api("/api/plan", { method: "POST", body: JSON.stringify(payload) });
}

/* ------------------------------------------------------------
   SESSION — restore an existing login on load
   ------------------------------------------------------------ */
async function restoreSession() {
  try {
    const me = await api("/api/me");
    if (me && me.profile) {
      state.profile = me.profile;
      state.savedPlans = me.plans || [];
    }
  } catch (_) {
    /* Not signed in, or the backend isn't provisioned yet. Either
       way the app stays fully usable — it just can't persist. */
  }
}

/* ------------------------------------------------------------
   COMPONENTS
   ------------------------------------------------------------ */
function exerciseThumb(area, name, locked) {
  const iconKey = CATEGORY_ICON_KEYS[area] || "Activity";
  if (!locked) {
    // The <img> falls back to the category icon if no photo exists
    // yet. onerror swaps in the placeholder rather than showing a
    // broken image, so Derrick can add media files incrementally.
    return `<img src="${MEDIA_BASE}/${slugify(name)}.jpg" alt="${esc(name)}" loading="lazy"
      class="w-14 h-14 shrink-0 rounded-lg object-cover border border-stone-200"
      onerror="this.outerHTML=window.__thumbFallback('${esc(iconKey)}')">`;
  }
  return `<div class="w-14 h-14 shrink-0 rounded-lg flex items-center justify-center border bg-stone-100 border-stone-200">
    ${icon("Lock", "w-5 h-5 text-neutral-400")}</div>`;
}

window.__thumbFallback = (iconKey) =>
  `<div class="w-14 h-14 shrink-0 rounded-lg flex items-center justify-center border bg-neutral-900 border-neutral-900">
    ${icon(iconKey, "w-6 h-6 text-yellow-400")}</div>`;

function exerciseVideo(name) {
  return `<video src="${MEDIA_BASE}/${slugify(name)}.mp4" autoplay loop muted playsinline preload="none"
    class="mt-2 w-full max-w-sm rounded-lg border border-stone-200"
    onerror="this.remove()"></video>`;
}

function bodyDiagram() {
  const dims = IMG_DIMS[state.view];
  const regions = REGIONS[state.view];

  const fillFor = (area) => {
    if (state.selected.includes(area)) return "rgba(250,204,21,0.5)";
    if (state.hovered === area) return "rgba(253,230,138,0.45)";
    return "rgba(0,0,0,0)";
  };
  const strokeFor = (area) => {
    if (state.selected.includes(area)) return "#ca8a04";
    if (state.hovered === area) return "#eab308";
    return "rgba(0,0,0,0)";
  };

  const shapes = regions.map((r) =>
    r.shapes.map((s) => {
      const attrs = `fill="${fillFor(r.area)}" stroke="${strokeFor(r.area)}" stroke-width="4"
        style="cursor:pointer;transition:fill 150ms,stroke 150ms"
        data-action="toggle-area" data-area="${esc(r.area)}"`;
      return s.t === "ellipse"
        ? `<ellipse ${attrs} cx="${s.cx}" cy="${s.cy}" rx="${s.rx}" ry="${s.ry}"></ellipse>`
        : `<polygon ${attrs} points="${s.pts}"></polygon>`;
    }).join("")
  ).join("");

  return `<div class="relative w-full max-w-xs mx-auto select-none">
    <img src="/images/${state.view}-view.jpg" alt="${state.view} muscle anatomy diagram"
      class="w-full rounded-xl" draggable="false">
    <svg viewBox="0 0 ${dims.w} ${dims.h}" class="absolute inset-0 w-full h-full"
      role="img" aria-label="${state.view} clickable body regions">${shapes}</svg>
    ${state.hovered ? `<div class="absolute top-2 left-1/2 -translate-x-1/2 bg-neutral-900 text-yellow-400 text-xs font-semibold px-3 py-1 rounded-full pointer-events-none whitespace-nowrap">${esc(state.hovered)}</div>` : ""}
  </div>`;
}

function upsellCards() {
  return `<div class="grid sm:grid-cols-2 gap-4">
    <div class="bg-neutral-800 rounded-xl p-5 flex flex-col">
      <h4 class="font-bold text-yellow-400">Virtual 1:1 Session</h4>
      <p class="text-sm text-neutral-300 mt-1 flex-1">Work with me live on your exact issue — targeted mobility and pain relief, built around your body.</p>
      <a href="${esc(NEXT_STEPS.virtualSession)}" target="_blank" rel="noreferrer"
        class="mt-4 block text-center bg-yellow-400 hover:bg-yellow-500 text-neutral-900 font-bold py-2.5 rounded-lg transition-colors">Book a Session</a>
    </div>
    <div class="bg-neutral-800 rounded-xl p-5 flex flex-col">
      <h4 class="font-bold text-yellow-400">Online Exercise Library</h4>
      <p class="text-sm text-neutral-300 mt-1 flex-1">Follow my full programs on your own schedule — guided routines for every area, updated monthly.</p>
      <a href="${esc(NEXT_STEPS.library)}" target="_blank" rel="noreferrer"
        class="mt-4 block text-center bg-yellow-400 hover:bg-yellow-500 text-neutral-900 font-bold py-2.5 rounded-lg transition-colors">Explore Programs</a>
    </div>
  </div>`;
}

function leadCaptureForm() {
  const field = (key, label, placeholder, type = "text", mode = "") => `
    <div>
      <label class="block text-sm font-medium text-neutral-300 mb-1" for="f-${key}">${label}</label>
      <input id="f-${key}" type="${type}" ${mode} value="${esc(state.form[key])}"
        data-input="form" data-key="${key}" placeholder="${esc(placeholder)}"
        class="w-full rounded-lg bg-neutral-800 border px-3 py-2.5 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 ${state.formErrors[key] ? "border-red-500" : "border-neutral-700"}">
      ${state.formErrors[key] ? `<p class="text-red-400 text-xs mt-1">${esc(state.formErrors[key])}</p>` : ""}
    </div>`;

  return `<div class="bg-neutral-900 rounded-2xl p-6">
    <h3 class="text-white text-lg font-bold">Unlock your full plan</h3>
    <p class="text-neutral-400 text-sm mt-1 mb-4">Create your free profile to unlock every exercise, and save up to ${MAX_SAVED_PLANS} plans to your account.</p>
    <div class="space-y-3">
      ${field("name", "Full name", "Jane Doe", "text", 'autocomplete="name"')}
      ${field("email", "Email", "jane@email.com", "email", 'autocomplete="email" inputmode="email"')}
      ${field("handle", "Instagram / TikTok handle", "@yourhandle")}
      ${field("phone", "Phone (optional)", "(555) 123-4567", "tel", 'autocomplete="tel" inputmode="tel"')}
    </div>
    ${state.formErrors._global ? `<p class="text-red-400 text-xs mt-3">${esc(state.formErrors._global)}</p>` : ""}
    <button data-action="submit-lead" ${state.saving ? "disabled" : ""}
      class="mt-5 w-full bg-yellow-400 hover:bg-yellow-500 disabled:opacity-40 text-neutral-900 font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
      ${state.saving ? icon("Loader2", "w-4 h-4 animate-spin") : ""}Unlock My Full Plan</button>
  </div>`;
}

function header() {
  return `<header class="bg-neutral-900 sticky top-0 z-20">
    <div class="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <svg viewBox="0 0 48 48" class="w-10 h-10" aria-hidden="true">
          <polygon points="24,3 43,13.5 43,34.5 24,45 5,34.5 5,13.5" fill="#facc15"></polygon>
          <polygon points="24,7 39.5,15.5 39.5,32.5 24,41 8.5,32.5 8.5,15.5" fill="#171717"></polygon>
          <text x="24" y="29" text-anchor="middle" font-size="13" font-weight="800" fill="#facc15" font-family="Georgia, serif">DMR</text>
        </svg>
        <span class="text-white font-bold text-lg tracking-tight">Pain Relief Guide</span>
      </div>
      <div class="flex items-center gap-3">
        <a href="${esc(SOCIAL.instagram)}" target="_blank" rel="noreferrer" aria-label="Instagram" class="text-neutral-400 hover:text-yellow-400 transition-colors">${icon("Instagram", "w-5 h-5")}</a>
        <a href="${esc(SOCIAL.tiktok)}" target="_blank" rel="noreferrer" aria-label="TikTok" class="text-neutral-400 hover:text-yellow-400 transition-colors">${TIKTOK_ICON("w-5 h-5")}</a>
        ${state.profile
          ? `<button data-action="goto-myplans" class="bg-yellow-400 hover:bg-yellow-500 text-neutral-900 font-bold text-sm px-4 py-2 rounded-lg transition-colors">My Plans (${state.savedPlans.length}/${MAX_SAVED_PLANS})</button>`
          : `<button data-action="goto-login" class="bg-yellow-400 hover:bg-yellow-500 text-neutral-900 font-bold text-sm px-4 py-2 rounded-lg transition-colors">Log In</button>`}
      </div>
    </div>
  </header>`;
}

/* ------------------------------------------------------------
   PAGES
   ------------------------------------------------------------ */
function pageLogin() {
  return `${header()}
  <main class="max-w-xl mx-auto px-4 py-10">
    <button data-action="go-home" class="flex items-center gap-1 text-neutral-600 hover:text-neutral-900 text-sm font-medium mb-6">${icon("ChevronLeft", "w-4 h-4")} Home</button>
    <h1 class="text-3xl font-extrabold text-neutral-900 tracking-tight">Log in</h1>
    ${state.loginSent
      ? `<div class="mt-6 bg-neutral-900 rounded-2xl p-6">
           <h2 class="text-yellow-400 font-bold text-lg">Check your email</h2>
           <p class="text-neutral-300 text-sm mt-2">We sent a sign-in link to <strong>${esc(state.loginEmail)}</strong>. Tap it on this device and you'll land back here with your saved plans. The link works once and expires in 15 minutes.</p>
         </div>`
      : `<p class="text-neutral-500 mt-1">Enter the email you signed up with — we'll send you a one-tap sign-in link. No password to remember.</p>
         <div class="mt-8">
           <label class="block text-sm font-medium text-neutral-600 mb-1" for="login-email">Email</label>
           <input id="login-email" type="email" inputmode="email" autocomplete="email" value="${esc(state.loginEmail)}"
             data-input="login" placeholder="jane@email.com"
             class="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-yellow-400">
           ${state.loginError ? `<p class="text-red-400 text-xs mt-1">${esc(state.loginError)}</p>` : ""}
           <button data-action="send-magic-link" ${state.saving ? "disabled" : ""}
             class="mt-5 w-full bg-yellow-400 hover:bg-yellow-500 disabled:opacity-40 text-neutral-900 font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
             ${state.saving ? icon("Loader2", "w-4 h-4 animate-spin") : ""}Send My Sign-In Link</button>
         </div>`}
  </main>`;
}

function pageMyPlans() {
  const list = state.savedPlans.length === 0
    ? `<div class="mt-8 bg-white border border-stone-200 rounded-2xl p-8 text-center">
         <p class="text-neutral-600 font-medium">No saved plans yet.</p>
         <button data-action="go-home" class="mt-4 bg-yellow-400 hover:bg-yellow-500 text-neutral-900 font-bold px-6 py-3 rounded-lg transition-colors">Build a Plan</button>
       </div>`
    : `<div class="mt-6 space-y-4">
        ${state.savedPlans.map((sp) => `
          <div class="bg-white border border-stone-200 rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
            <div class="min-w-0">
              <p class="font-bold text-neutral-900 truncate">${esc(sp.label)}</p>
              <p class="text-sm text-neutral-500 mt-0.5">${sp.plan.length} area${sp.plan.length > 1 ? "s" : ""} · ${sp.plan.reduce((s, x) => s + x.exercises.length, 0)} exercises · saved ${esc(new Date(sp.savedAt).toLocaleDateString())}</p>
            </div>
            <div class="flex gap-2">
              <button data-action="view-plan" data-id="${esc(sp.id)}" class="bg-yellow-400 hover:bg-yellow-500 text-neutral-900 font-bold text-sm px-5 py-2.5 rounded-lg transition-colors">View</button>
              <button data-action="delete-plan" data-id="${esc(sp.id)}" class="bg-stone-100 hover:bg-stone-200 text-neutral-600 font-bold text-sm px-4 py-2.5 rounded-lg transition-colors">Delete</button>
            </div>
          </div>`).join("")}
        ${state.savedPlans.length >= MAX_SAVED_PLANS ? `<p class="text-sm text-neutral-500">Plan slots are full — delete a plan to save a new one, or go deeper with a 1:1 session.</p>` : ""}
       </div>`;

  return `${header()}
  <main class="max-w-3xl mx-auto px-4 py-8">
    <button data-action="go-home" class="flex items-center gap-1 text-neutral-600 hover:text-neutral-900 text-sm font-medium mb-6">${icon("ChevronLeft", "w-4 h-4")} Home</button>
    <h1 class="text-3xl font-extrabold text-neutral-900 tracking-tight">My Plans</h1>
    <p class="text-neutral-500 mt-1">${state.savedPlans.length} of ${MAX_SAVED_PLANS} plan slots used${state.profile ? ` — signed in as ${esc(state.profile.name)}` : ""}</p>
    ${list}
  </main>`;
}

function pageQualify() {
  const allAnswered = QUALIFIER_QUESTIONS.every((q) => (q.multi ? state.qualifier[q.key].length > 0 : state.qualifier[q.key]));
  return `${header()}
  <main class="max-w-xl mx-auto px-4 py-10">
    <button data-action="go-home" class="flex items-center gap-1 text-neutral-600 hover:text-neutral-900 text-sm font-medium mb-6">${icon("ChevronLeft", "w-4 h-4")} Back</button>
    <h1 class="text-3xl font-extrabold text-neutral-900 tracking-tight">Quick check</h1>
    <p class="text-neutral-500 mt-1">Three taps — this sharpens your plan.</p>
    <div class="mt-8 space-y-7">
      ${QUALIFIER_QUESTIONS.map((q) => `
        <div>
          <p class="font-semibold text-neutral-900 mb-2">${esc(q.label)}</p>
          <div class="flex flex-wrap gap-2">
            ${q.options.map((opt) => {
              const on = q.multi ? state.qualifier[q.key].includes(opt) : state.qualifier[q.key] === opt;
              return `<button data-action="answer" data-key="${esc(q.key)}" data-opt="${esc(opt)}" data-multi="${q.multi ? "1" : ""}"
                class="px-5 py-2.5 rounded-full font-semibold text-sm transition-colors ${on ? "bg-yellow-400 text-neutral-900" : "bg-white border border-stone-300 text-neutral-600 hover:border-yellow-400"}">${esc(opt)}</button>`;
            }).join("")}
          </div>
        </div>`).join("")}
    </div>
    <button data-action="run-plan" ${!allAnswered || state.loading ? "disabled" : ""}
      class="mt-10 w-full bg-yellow-400 hover:bg-yellow-500 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-900 font-bold py-3.5 rounded-lg transition-colors flex items-center justify-center gap-2">
      ${state.loading ? icon("Loader2", "w-4 h-4 animate-spin") : ""}Build My Plan</button>
  </main>`;
}

function pagePlan() {
  const p = state.plan;
  const sections = p.plan.map((section) => `
    <section class="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <div class="bg-neutral-900 px-5 py-3 flex items-center justify-between">
        <h2 class="text-yellow-400 font-bold">${esc(section.area)}</h2>
        <span class="text-neutral-400 text-xs">${section.exercises.length} exercises</span>
      </div>
      <div class="p-5 space-y-4">
        ${section.note ? `<p class="text-neutral-600 text-sm italic">${esc(section.note)}</p>` : ""}
        ${section.exercises.map((ex, i) =>
          unlocked() || i === 0
            ? `<div class="flex gap-3 border-l-4 border-yellow-400 pl-4 py-1">
                 ${exerciseThumb(section.area, ex.name, false)}
                 <div class="flex-1 min-w-0">
                   <div class="flex items-baseline justify-between gap-3 flex-wrap">
                     <h3 class="font-semibold text-neutral-900">${esc(ex.name)}</h3>
                     <span class="text-xs font-medium text-neutral-500 bg-stone-100 rounded-full px-2.5 py-0.5">${esc(ex.level)}</span>
                   </div>
                   <p class="text-sm font-medium text-neutral-700 mt-0.5">${esc(ex.dose)}</p>
                   <p class="text-sm text-neutral-500 mt-0.5">${esc(ex.cue)}</p>
                   ${exerciseVideo(ex.name)}
                 </div>
               </div>`
            : `<div class="flex gap-3 border-l-4 border-stone-300 pl-4 py-1 opacity-80">
                 ${exerciseThumb(section.area, ex.name, true)}
                 <div class="flex-1 min-w-0">
                   <h3 class="font-semibold text-neutral-500">${esc(ex.name)}</h3>
                   <p class="text-sm text-neutral-400 mt-0.5 blur-[3px] select-none">${esc(ex.dose)} — ${esc(ex.cue)}</p>
                 </div>
               </div>`).join("")}
        ${!unlocked() && section.exercises.length > 1
          ? `<p class="text-xs font-semibold text-yellow-600">${section.exercises.length - 1} more unlocked with your free profile ↓</p>` : ""}
      </div>
    </section>`).join("");

  let footer;
  if (!state.profile) {
    footer = leadCaptureForm();
  } else if (isCurrentSaved()) {
    footer = `<div class="bg-neutral-900 text-white rounded-2xl p-6">
      <div class="text-center mb-6">
        <div class="w-12 h-12 rounded-full bg-yellow-400 flex items-center justify-center mx-auto mb-3">${icon("Check", "w-6 h-6 text-neutral-900")}</div>
        <p class="font-bold text-lg">Plan saved (${state.savedPlans.length}/${MAX_SAVED_PLANS} slots used)</p>
        <p class="text-neutral-400 text-sm mt-1">Here's how to take it further:</p>
      </div>${upsellCards()}</div>`;
  } else if (state.savedPlans.length < MAX_SAVED_PLANS) {
    footer = `<div class="bg-neutral-900 text-white rounded-2xl p-6 text-center">
      <p class="font-bold text-lg">Save this plan to your profile</p>
      <p class="text-neutral-400 text-sm mt-1">You've used ${state.savedPlans.length} of ${MAX_SAVED_PLANS} plan slots.</p>
      <button data-action="save-plan" ${state.saving ? "disabled" : ""}
        class="mt-4 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-40 text-neutral-900 font-bold px-8 py-3 rounded-lg transition-colors">Save This Plan</button>
    </div>`;
  } else {
    footer = `<div class="bg-neutral-900 text-white rounded-2xl p-6">
      <div class="text-center mb-6">
        <p class="font-bold text-lg text-yellow-400">Plan slots full (${MAX_SAVED_PLANS}/${MAX_SAVED_PLANS})</p>
        <p class="text-neutral-400 text-sm mt-1">Free profiles hold ${MAX_SAVED_PLANS} plans. Delete one in My Plans to make room — or go deeper:</p>
      </div>${upsellCards()}
      <button data-action="goto-myplans" class="mt-4 w-full bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-2.5 rounded-lg transition-colors">Manage My Plans</button>
    </div>`;
  }

  return `${header()}
  <main class="max-w-3xl mx-auto px-4 py-8">
    <button data-action="go-home" class="flex items-center gap-1 text-neutral-600 hover:text-neutral-900 text-sm font-medium mb-6">${icon("ChevronLeft", "w-4 h-4")} Start over</button>
    <h1 class="text-3xl font-extrabold text-neutral-900 tracking-tight">Your Relief Plan</h1>
    ${state.error ? `<div class="mt-3 bg-amber-50 border border-amber-300 text-amber-900 text-sm rounded-lg px-4 py-3">${esc(state.error)}</div>` : ""}
    ${state.redFlag ? `<div class="mt-5 bg-neutral-900 rounded-2xl p-6">
        <h2 class="text-yellow-400 font-bold text-lg">This deserves proper attention</h2>
        <p class="text-neutral-300 text-sm mt-2">Numbness, tingling, or radiating pain usually means the root is upstream of where you feel it. The plan below is a safe starting point — but this is exactly what a guided 1:1 session is for. Let's find the root together.</p>
        <a href="${esc(NEXT_STEPS.virtualSession)}" target="_blank" rel="noreferrer" class="mt-4 inline-block bg-yellow-400 hover:bg-yellow-500 text-neutral-900 font-bold px-6 py-3 rounded-lg transition-colors">Book a Virtual 1:1 Session</a>
      </div>` : ""}
    <div class="mt-6 space-y-5">${sections}</div>
    ${p.tips ? `<div class="mt-6 bg-yellow-50 border border-yellow-300 rounded-2xl px-5 py-4">
        <p class="text-sm font-semibold text-neutral-900 mb-1">Coach's tips</p>
        <p class="text-sm text-neutral-700">${esc(p.tips)}</p>
      </div>` : ""}
    <div class="mt-8">${footer}</div>
    <p class="mt-8 text-xs text-neutral-400 text-center">Educational content for general wellness — not medical advice, diagnosis, or treatment. If pain is severe, worsening, or from a recent injury, see a qualified healthcare provider.</p>
  </main>`;
}

function pageHome() {
  return `${header()}
  <main class="max-w-3xl mx-auto px-4 py-10">
    <h1 class="text-4xl font-extrabold text-neutral-900 tracking-tight text-center">Design Your Own Relief Plan</h1>
    <p class="text-neutral-500 text-center mt-2 max-w-xl mx-auto">Describe how you feel or tap where it hurts — get a targeted exercise plan in seconds.</p>

    <div class="mt-10 bg-white rounded-2xl border border-stone-200 p-6">
      <h2 class="font-bold text-neutral-900 text-lg">How are you feeling?</h2>
      <p class="text-sm text-neutral-500 mt-1">e.g. "My lower back is stiff every morning and my right shoulder pinches when I reach overhead"</p>
      <textarea data-input="description" rows="3" placeholder="Describe your pain or tightness in your own words..."
        class="mt-3 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none">${esc(state.description)}</textarea>
      <button data-action="start-text" ${!state.description.trim() || state.loading ? "disabled" : ""}
        class="mt-3 w-full sm:w-auto bg-yellow-400 hover:bg-yellow-500 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-900 font-bold px-8 py-3 rounded-lg transition-colors">Get Help</button>
    </div>

    <div class="flex items-center gap-4 my-8">
      <div class="flex-1 h-px bg-stone-300"></div>
      <span class="text-neutral-400 text-sm font-medium">or</span>
      <div class="flex-1 h-px bg-stone-300"></div>
    </div>

    <div class="bg-white rounded-2xl border border-stone-200 p-6">
      <h2 class="font-bold text-neutral-900 text-lg">Tap where it hurts</h2>
      <p class="text-sm text-neutral-500 mt-1">Select up to 4 areas, front or back.</p>
      <div class="flex justify-center gap-2 mt-4">
        ${["anterior", "posterior"].map((v) => `
          <button data-action="set-view" data-view="${v}"
            class="px-5 py-2 rounded-lg font-bold text-sm capitalize transition-colors ${state.view === v ? "bg-yellow-400 hover:bg-yellow-500 text-neutral-900" : "bg-stone-100 hover:bg-stone-200 text-neutral-600"}">${v}</button>`).join("")}
      </div>
      <div class="mt-4">${bodyDiagram()}</div>
      ${state.selected.length > 0 ? `<div class="flex flex-wrap justify-center gap-2 mt-2">
        ${state.selected.map((a) => `<button data-action="toggle-area" data-area="${esc(a)}" class="flex items-center gap-1.5 bg-neutral-900 text-yellow-400 text-xs font-semibold px-3 py-1.5 rounded-full">${esc(a)} ${icon("X", "w-3 h-3")}</button>`).join("")}
      </div>` : ""}
      ${state.selected.length >= 4 ? `<p class="text-center text-xs text-amber-600 mt-2">Maximum of 4 areas — remove one to add another.</p>` : ""}
      <button data-action="start-diagram" ${state.selected.length === 0 || state.loading ? "disabled" : ""}
        class="mt-5 w-full bg-yellow-400 hover:bg-yellow-500 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-900 font-bold py-3 rounded-lg transition-colors">Generate Plan ${state.selected.length > 0 ? `(${state.selected.length} area${state.selected.length > 1 ? "s" : ""})` : ""}</button>
    </div>

    <p class="mt-10 text-xs text-neutral-400 text-center">Educational content for general wellness — not medical advice, diagnosis, or treatment.</p>
  </main>`;
}

/* ------------------------------------------------------------
   RENDER
   ------------------------------------------------------------ */
const root = document.getElementById("root");

function render() {
  let html;
  if (state.page === "login") html = pageLogin();
  else if (state.page === "myplans") html = pageMyPlans();
  else if (state.page === "qualify") html = pageQualify();
  else if (state.page === "plan" && state.plan) html = pagePlan();
  else html = pageHome();
  root.className = "min-h-screen bg-stone-50";
  root.innerHTML = html;
}

/* Text fields update state without re-rendering. Re-rendering on
   every keystroke would destroy and recreate the input, losing
   focus and dismissing the iOS keyboard mid-word. */
function bindInputs() {
  root.addEventListener("input", (e) => {
    const el = e.target.closest("[data-input]");
    if (!el) return;
    const kind = el.dataset.input;
    if (kind === "description") {
      state.description = el.value;
      // Only the disabled state of one button depends on this.
      const btn = root.querySelector('[data-action="start-text"]');
      if (btn) btn.disabled = !state.description.trim() || state.loading;
    } else if (kind === "form") {
      state.form[el.dataset.key] = el.value;
    } else if (kind === "login") {
      state.loginEmail = el.value;
    }
  });
}

const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

/* ------------------------------------------------------------
   ACTIONS
   ------------------------------------------------------------ */
const actions = {
  "set-view": (el) => { state.view = el.dataset.view; state.hovered = null; render(); },

  "toggle-area": (el) => {
    const area = el.dataset.area;
    if (state.selected.includes(area)) state.selected = state.selected.filter((a) => a !== area);
    else if (state.selected.length < 4) state.selected = [...state.selected, area];
    render();
  },

  "start-text": () => startQualify("text"),
  "start-diagram": () => startQualify("diagram"),

  "answer": (el) => {
    const { key, opt, multi } = el.dataset;
    if (multi) {
      const cur = state.qualifier[key];
      state.qualifier[key] = cur.includes(opt) ? cur.filter((o) => o !== opt) : [...cur, opt];
    } else {
      state.qualifier[key] = opt;
    }
    render();
  },

  "run-plan": runPlan,

  "go-home": () => {
    state.page = "home"; state.plan = null; state.redFlag = false; state.error = null;
    render(); scrollTop();
  },
  "goto-myplans": () => { state.page = "myplans"; render(); scrollTop(); },
  "goto-login": () => { state.page = "login"; state.loginSent = false; state.loginError = null; render(); scrollTop(); },

  "view-plan": (el) => {
    const sp = state.savedPlans.find((p) => String(p.id) === el.dataset.id);
    if (!sp) return;
    state.plan = sp; state.redFlag = false; state.error = null; state.page = "plan";
    render(); scrollTop();
  },

  "delete-plan": async (el) => {
    const id = el.dataset.id;
    state.savedPlans = state.savedPlans.filter((p) => String(p.id) !== id);
    render();
    try { await api(`/api/plans?id=${encodeURIComponent(id)}`, { method: "DELETE" }); }
    catch (err) { console.error("Delete failed:", err); }
  },

  "submit-lead": submitLead,
  "save-plan": savePlan,
  "send-magic-link": sendMagicLink,
};

function startQualify(mode) {
  state.pendingMode = mode;
  state.qualifier = { feel: [], timing: null, flags: null };
  state.page = "qualify";
  render(); scrollTop();
}

async function runPlan() {
  const mode = state.pendingMode;
  const context = `pain quality: ${state.qualifier.feel.join(", ")}; worst: ${state.qualifier.timing}; numbness/tingling/radiating: ${state.qualifier.flags}`;
  state.redFlag = state.qualifier.flags === "Yes" || (mode === "text" && RED_FLAG_RE.test(state.description));
  state.loading = true;
  state.error = null;
  render();

  const label = mode === "text"
    ? state.description.trim().slice(0, 48) + (state.description.trim().length > 48 ? "…" : "")
    : state.selected.join(", ");

  try {
    const res = await requestPlan({
      mode,
      areas: state.selected,
      description: state.description.trim(),
      context,
    });
    if (!res.plan || !res.plan.length) throw new Error("empty plan");
    state.plan = { id: Date.now(), label, plan: res.plan, tips: res.tips };
    // The server tells us when it fell back to the non-AI plan for
    // a free-text request, so the user still gets the nudge toward
    // the diagram for more precise targeting.
    if (res.degraded && mode === "text") {
      state.error = "We couldn't fully analyze your description, so here's a general starting plan. Try the body diagram for more precise targeting.";
    }
  } catch (err) {
    console.error("Plan generation failed:", err);
    state.error = "Something went wrong building your plan. Please try again in a moment.";
    state.plan = null;
    state.loading = false;
    render();
    return;
  }

  state.loading = false;
  state.page = "plan";
  render(); scrollTop();
}

/* The server assigns its own id when it stores a plan, so the
   locally-generated id on state.plan no longer matches anything in
   the saved list. Re-point state.plan at the stored row, otherwise
   isCurrentSaved() stays false and the UI keeps offering to save a
   plan that is already saved. */
function adoptSavedPlan(plans) {
  if (!state.plan || !Array.isArray(plans)) return;
  const match = [...plans].reverse().find((p) => p.label === state.plan.label);
  if (match) state.plan = match;
}

async function submitLead() {
  const f = state.form;
  const e = {};
  if (!f.name.trim()) e.name = "Full name is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = "Enter a valid email";
  if (!f.handle.trim()) e.handle = "Instagram or TikTok handle is required";
  if (f.phone.trim() && !/^[\d\s()+.-]{7,20}$/.test(f.phone.trim())) e.phone = "Enter a valid phone number";
  state.formErrors = e;
  if (Object.keys(e).length) { render(); return; }

  state.saving = true;
  render();

  const profile = {
    name: f.name.trim(),
    email: f.email.trim(),
    handle: f.handle.trim().replace(/^@/, ""),
    phone: f.phone.trim() || null,
  };

  try {
    const res = await api("/api/lead", {
      method: "POST",
      body: JSON.stringify({ profile, plan: state.plan }),
    });
    state.profile = res.profile;
    state.savedPlans = res.plans || [];
    adoptSavedPlan(state.savedPlans);
    state.formErrors = {};
  } catch (err) {
    console.error("Lead capture failed:", err);
    // The plan is the thing they came for — unlock it locally
    // rather than trapping them behind a backend outage.
    state.profile = profile;
    state.savedPlans = state.plan ? [{ ...state.plan, savedAt: new Date().toISOString() }] : [];
    state.formErrors = {};
  }

  state.saving = false;
  render();
}

async function savePlan() {
  if (!state.plan || state.savedPlans.length >= MAX_SAVED_PLANS || isCurrentSaved()) return;
  state.saving = true;
  render();
  try {
    const res = await api("/api/plans", { method: "POST", body: JSON.stringify({ plan: state.plan }) });
    state.savedPlans = res.plans;
    adoptSavedPlan(state.savedPlans);
  } catch (err) {
    console.error("Save failed:", err);
    const entry = { ...state.plan, savedAt: new Date().toISOString() };
    state.savedPlans = [...state.savedPlans, entry];
    state.plan = entry;
  }
  state.saving = false;
  render();
}

async function sendMagicLink() {
  const email = state.loginEmail.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    state.loginError = "Enter a valid email";
    render();
    return;
  }
  state.saving = true;
  state.loginError = null;
  render();
  try {
    await api("/api/auth", { method: "POST", body: JSON.stringify({ email }) });
    state.loginSent = true;
  } catch (err) {
    state.loginError = "We couldn't send that link right now. Please try again shortly.";
  }
  state.saving = false;
  render();
}

/* ------------------------------------------------------------
   EVENT WIRING
   ------------------------------------------------------------ */
root.addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.action];
  if (fn) fn(el);
});

// Hover highlight on the diagram, pointer devices only.
root.addEventListener("mouseover", (e) => {
  const el = e.target.closest('[data-action="toggle-area"][data-area]');
  if (!el || !el.closest("svg")) return;
  if (state.hovered !== el.dataset.area) { state.hovered = el.dataset.area; render(); }
});
root.addEventListener("mouseout", (e) => {
  const el = e.target.closest('[data-action="toggle-area"][data-area]');
  if (el && el.closest("svg") && state.hovered) { state.hovered = null; render(); }
});

bindInputs();

/* ------------------------------------------------------------
   BOOT
   ------------------------------------------------------------ */
(async function boot() {
  render();
  // A magic-link click lands on /?token=… — verify it, then strip
  // the token from the URL so it isn't left in history or shared.
  const params = new URLSearchParams(location.search);
  const token = params.get("token");
  if (token) {
    history.replaceState({}, "", location.pathname);
    try {
      const res = await api("/api/auth?token=" + encodeURIComponent(token));
      state.profile = res.profile;
      state.savedPlans = res.plans || [];
      state.page = state.savedPlans.length ? "myplans" : "home";
    } catch (err) {
      state.page = "login";
      state.loginError = "That sign-in link has expired or was already used. Send yourself a fresh one.";
    }
    render();
    return;
  }
  await restoreSession();
  render();
})();
