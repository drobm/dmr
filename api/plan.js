/* ============================================================
   POST /api/plan — AI plan generation
   ------------------------------------------------------------
   This replaces the browser's direct call to api.anthropic.com.
   The API key lives in the ANTHROPIC_API_KEY environment
   variable on Vercel and is never sent to the browser.

   If the key is missing or the call fails, this returns the
   non-AI fallback plan with `degraded: true` rather than an
   error — a visitor always gets a usable plan.
   ============================================================ */

const Anthropic = require("@anthropic-ai/sdk");
const {
  EXERCISES, AREA_NAMES, hydratePlan, fallbackPlan, json, readBody,
} = require("./_lib.js");

/* Claude picks from this catalog by exact name. */
const exerciseCatalog = () =>
  AREA_NAMES.map((a) => `${a}: ${EXERCISES[a].map((e) => e.name).join(", ")}`).join("\n");

/* The model is constrained to this shape by the API rather than
   by asking nicely in the prompt, so there is no markdown-fence
   stripping or JSON.parse guesswork on the way back. */
const PLAN_SCHEMA = {
  type: "object",
  properties: {
    plan: {
      type: "array",
      items: {
        type: "object",
        properties: {
          area: { type: "string", enum: AREA_NAMES },
          exercises: { type: "array", items: { type: "string" } },
          note: { type: "string" },
        },
        required: ["area", "exercises", "note"],
        additionalProperties: false,
      },
    },
    tips: { type: "string" },
  },
  required: ["plan", "tips"],
  additionalProperties: false,
};

const SYSTEM = `You are an expert corrective exercise and pain relief coach writing for a general-wellness audience.

Rules you must follow:
- Choose 2-3 exercises per selected area. NEVER more than 8 exercises total across all areas.
- Use exercise names EXACTLY as they appear in the catalog. Do not invent exercises.
- Use area names EXACTLY as given.
- One short coaching note per area (one sentence).
- "tips" is two sentences of general guidance.
- Stay in educational wellness territory. Do not diagnose, name conditions, or imply medical treatment.`;

function buildPrompt({ mode, areas, description, context }) {
  const catalog = exerciseCatalog();
  if (mode === "text") {
    return `A user describes their discomfort: "${description}"
Quick intake answers: ${context}

Valid body areas: ${AREA_NAMES.join(", ")}

Available exercises by area:
${catalog}

Identify the 1-4 most relevant areas and build the plan.`;
  }
  return `A user has discomfort in these body areas: ${areas.join(", ")}.
Quick intake answers: ${context}

Available exercises by area:
${catalog}

Build the plan for exactly these areas.`;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  const body = await readBody(req);
  const mode = body.mode === "text" ? "text" : "diagram";
  const areas = Array.isArray(body.areas) ? body.areas.filter((a) => EXERCISES[a]).slice(0, 4) : [];
  const description = typeof body.description === "string" ? body.description.slice(0, 1000) : "";
  const context = typeof body.context === "string" ? body.context.slice(0, 500) : "";

  if (mode === "diagram" && !areas.length) return json(res, 400, { error: "No valid areas selected" });
  if (mode === "text" && !description.trim()) return json(res, 400, { error: "No description provided" });

  const degrade = (reason) => {
    // "Lower Back" is the safe default for a free-text request we
    // couldn't analyze — it's the most common presenting complaint.
    const fb = fallbackPlan(mode === "text" ? ["Lower Back"] : areas);
    console.warn("Falling back to non-AI plan:", reason);
    return json(res, 200, { plan: hydratePlan(fb), tips: fb.tips, degraded: true });
  };

  if (!process.env.ANTHROPIC_API_KEY) return degrade("ANTHROPIC_API_KEY not set");

  try {
    const client = new Anthropic();

    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 4000,
      system: SYSTEM,
      // Low effort keeps this fast — a visitor is watching a spinner
      // on a phone. The task is constrained selection, not open
      // reasoning, so the extra depth buys nothing here.
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: PLAN_SCHEMA },
      },
      messages: [{ role: "user", content: buildPrompt({ mode, areas, description, context }) }],
    });

    if (response.stop_reason === "refusal") return degrade("model declined the request");

    const text = response.content.find((b) => b.type === "text");
    if (!text) return degrade("no text block in response");

    const raw = JSON.parse(text.text);
    const plan = hydratePlan(raw);
    if (!plan.length) return degrade("model returned no usable areas");

    return json(res, 200, { plan, tips: raw.tips, degraded: false });
  } catch (err) {
    return degrade(err && err.message ? err.message : "unknown error");
  }
};
