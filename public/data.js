/* ============================================================
   DMR Pain Relief Guide — content data
   EXERCISES, IMG_DIMS and REGIONS are lifted verbatim from the
   original pain-relief-app.jsx. Treat this file as content, not
   code: edit the copy here, never the rendering logic in app.js.
   ============================================================ */

/* ------------------------------------------------------------
   EXERCISE DATABASE — 56 exercises / 13 categories
   ------------------------------------------------------------ */
const EXERCISES = {
  Neck: [
    { name: "Chin Tucks", dose: "3 × 10 reps, 5s hold", cue: "Glide the head straight back, make a double chin, keep eyes level.", level: "Beginner" },
    { name: "Levator Scapulae Stretch", dose: "3 × 30s each side", cue: "Look toward your armpit, gently assist with the same-side hand.", level: "Beginner" },
    { name: "Upper Trap Stretch", dose: "3 × 30s each side", cue: "Ear toward shoulder, opposite arm reaching down and slightly back.", level: "Beginner" },
    { name: "Neck Isometric Holds", dose: "2 × 10s each direction", cue: "Press your palm into your head — forward, back, both sides — without moving.", level: "Beginner" },
  ],
  Shoulders: [
    { name: "Band Pull-Aparts", dose: "3 × 15 reps", cue: "Arms straight, squeeze shoulder blades, control the return.", level: "Beginner" },
    { name: "Wall Slides", dose: "3 × 10 reps", cue: "Forearms on the wall, slide up without shrugging or arching the low back.", level: "Beginner" },
    { name: "Banded External Rotation", dose: "3 × 12 each side", cue: "Elbow pinned to your side, rotate the forearm out slowly.", level: "Beginner" },
    { name: "Scapular Push-Ups", dose: "3 × 12 reps", cue: "Arms locked, let the shoulder blades pinch then spread — small range.", level: "Intermediate" },
    { name: "Sleeper Stretch", dose: "3 × 30s each side", cue: "Side-lying, gently press the forearm toward the floor until a mild stretch.", level: "Intermediate" },
  ],
  Chest: [
    { name: "Doorway Pec Stretch", dose: "3 × 30s each side", cue: "Forearm on the frame at 90°, step through until you feel the front of the shoulder open.", level: "Beginner" },
    { name: "Pec Foam Roll / Ball Release", dose: "60–90s each side", cue: "Ball between chest and wall, slow rolls, pause on tender spots and breathe.", level: "Beginner" },
    { name: "Floor Angels", dose: "3 × 10 reps", cue: "Lying down, slide arms overhead keeping wrists and elbows on the floor.", level: "Beginner" },
    { name: "Open Book Stretch", dose: "3 × 8 each side", cue: "Side-lying, knees stacked, rotate the top arm open and follow it with your eyes.", level: "Beginner" },
  ],
  "Upper Back": [
    { name: "Thoracic Extension over Foam Roller", dose: "3 × 8 reps", cue: "Roller at mid-back, hands behind head, extend over it — don't flare the ribs.", level: "Beginner" },
    { name: "Cat-Cow", dose: "2 × 10 slow reps", cue: "Move one vertebra at a time, sync with your breathing.", level: "Beginner" },
    { name: "Thread the Needle", dose: "3 × 8 each side", cue: "From all fours, reach one arm under and across, let the upper back rotate.", level: "Beginner" },
    { name: "Prone Y Raises", dose: "3 × 10 reps", cue: "Face down, thumbs up, lift the arms in a Y without shrugging.", level: "Intermediate" },
    { name: "Dead Hang", dose: "3 × 20–30s", cue: "Full grip on the bar, let the lats and upper back decompress, breathe.", level: "Intermediate" },
  ],
  "Lower Back": [
    { name: "McGill Curl-Up", dose: "3 × 8 reps, 8s hold", cue: "Hands under the low back, lift head and shoulders an inch — brace, don't crunch.", level: "Beginner" },
    { name: "Bird Dog", dose: "3 × 8 each side", cue: "Opposite arm and leg, hips level, imagine a cup of water on your low back.", level: "Beginner" },
    { name: "Side Plank", dose: "3 × 20–30s each side", cue: "Straight line from head to feet, don't let the hips sag.", level: "Intermediate" },
    { name: "Child's Pose Reach", dose: "3 × 30s", cue: "Sit back to the heels, walk the hands forward and to each side.", level: "Beginner" },
    { name: "Hip Hinge Drill", dose: "3 × 10 reps", cue: "Dowel along the spine — head, mid-back, tailbone stay in contact as you hinge.", level: "Beginner" },
  ],
  "Elbow / Forearm": [
    { name: "Eccentric Wrist Extensions", dose: "3 × 12 reps, 3s lower", cue: "Light weight, lift with help, lower slowly with the working arm only.", level: "Beginner" },
    { name: "Eccentric Wrist Curls", dose: "3 × 12 reps, 3s lower", cue: "Palm up, slow controlled lowering — targets golfer's elbow patterns.", level: "Beginner" },
    { name: "Forearm Foam Roll / Ball Release", dose: "60–90s each side", cue: "Roll the forearm flexors and extensors, pause on hot spots.", level: "Beginner" },
    { name: "Hammer Rotations", dose: "3 × 10 each direction", cue: "Hold a hammer or light dumbbell, rotate palm up / palm down with control.", level: "Beginner" },
  ],
  "Wrist / Hand": [
    { name: "Wrist Flexor Stretch", dose: "3 × 30s each side", cue: "Arm straight, palm up, gently pull the fingers back.", level: "Beginner" },
    { name: "Wrist Extensor Stretch", dose: "3 × 30s each side", cue: "Arm straight, palm down, gently pull the hand toward you.", level: "Beginner" },
    { name: "Wrist CARs", dose: "2 × 5 each direction", cue: "Slow, full circles through the biggest pain-free range you have.", level: "Beginner" },
    { name: "Finger Extensions with Band", dose: "3 × 15 reps", cue: "Rubber band around the fingers, spread them apart against resistance.", level: "Beginner" },
  ],
  "Core / Abs": [
    { name: "Dead Bug", dose: "3 × 8 each side", cue: "Low back gently pressed down, opposite arm and leg extend slowly.", level: "Beginner" },
    { name: "Front Plank", dose: "3 × 20–40s", cue: "Squeeze glutes, tuck ribs, push the floor away through the forearms.", level: "Beginner" },
    { name: "Pallof Press", dose: "3 × 10 each side", cue: "Band at chest height, press out and resist the rotation.", level: "Intermediate" },
    { name: "Hollow Hold", dose: "3 × 15–20s", cue: "Low back glued to the floor, arms and legs long — shorten the levers if it arches.", level: "Intermediate" },
  ],
  "Hips / Hip Flexors": [
    { name: "Couch Stretch", dose: "2 × 45s each side", cue: "Rear foot up the wall, squeeze the glute of the down leg, stay tall.", level: "Intermediate" },
    { name: "90/90 Hip Switches", dose: "2 × 8 each side", cue: "Both legs at 90°, rotate side to side keeping the chest tall.", level: "Beginner" },
    { name: "Pigeon Stretch", dose: "3 × 30s each side", cue: "Front shin angled, hips square, fold forward only as far as comfortable.", level: "Beginner" },
    { name: "Banded Hip Flexor March", dose: "3 × 10 each side", cue: "Band around the feet, drive one knee up against resistance without leaning back.", level: "Intermediate" },
    { name: "World's Greatest Stretch", dose: "2 × 5 each side", cue: "Deep lunge, elbow toward the floor, then rotate and reach to the ceiling.", level: "Intermediate" },
  ],
  Glutes: [
    { name: "Glute Bridge", dose: "3 × 12 reps, 2s hold", cue: "Drive through the heels, finish with the glutes — not the low back.", level: "Beginner" },
    { name: "Clamshells", dose: "3 × 15 each side", cue: "Band above the knees, feet together, open the top knee without rolling back.", level: "Beginner" },
    { name: "Single-Leg Glute Bridge", dose: "3 × 8 each side", cue: "Hips stay level — if they drop, go back to two legs.", level: "Intermediate" },
    { name: "Fire Hydrants", dose: "3 × 12 each side", cue: "From all fours, lift the knee out to the side, keep the spine quiet.", level: "Beginner" },
  ],
  Hamstrings: [
    { name: "Hamstring Sliders", dose: "3 × 8 reps", cue: "Bridge up, slide the heels out slowly, pull back in with control.", level: "Intermediate" },
    { name: "Light Romanian Deadlift", dose: "3 × 10 reps", cue: "Soft knees, hinge at the hips, feel a stretch — never a strain.", level: "Intermediate" },
    { name: "Standing Hamstring Stretch", dose: "3 × 30s each side", cue: "Heel on a low surface, hinge forward with a flat back.", level: "Beginner" },
    { name: "Nordic Curl Negatives", dose: "3 × 5 reps", cue: "Anchor the ankles, lower as slowly as possible, push back up with hands.", level: "Advanced" },
  ],
  "Quads / Knees": [
    { name: "Terminal Knee Extensions", dose: "3 × 15 each side", cue: "Band behind the knee, straighten fully and squeeze the quad.", level: "Beginner" },
    { name: "Spanish Squat", dose: "3 × 10 reps, 3s hold", cue: "Thick band behind the knees, sit straight down — great for cranky knees.", level: "Intermediate" },
    { name: "Quad Foam Rolling", dose: "60–90s each side", cue: "Slow passes from hip to just above the knee, pause and bend the knee on tight spots.", level: "Beginner" },
    { name: "Step-Downs", dose: "3 × 8 each side", cue: "Slow lowering off a low step, knee tracking over the toes.", level: "Intermediate" },
  ],
  "Calves / Feet": [
    { name: "Calf Raises (Straight + Bent Knee)", dose: "3 × 12 each version", cue: "Full range, slow lowering — straight knee hits the gastroc, bent hits the soleus.", level: "Beginner" },
    { name: "Tibialis Raises", dose: "3 × 15 reps", cue: "Back against a wall, lift the toes toward the shins, lower with control.", level: "Beginner" },
    { name: "Plantar Fascia Ball Rolling", dose: "60–90s each foot", cue: "Lacrosse or golf ball under the arch, slow pressure — not pain.", level: "Beginner" },
    { name: "Ankle Dorsiflexion Rocks", dose: "2 × 10 each side", cue: "Half-kneeling, drive the knee over the toes, heel stays down.", level: "Beginner" },
  ],
};

const IMG_DIMS = {
  anterior: { w: 724, h: 1024 },
  posterior: { w: 740, h: 1024 },
};

const REGIONS = {
  anterior: [
    { area: "Neck", shapes: [{ t: "poly", pts: "316,158 392,158 398,208 310,208" }] },
    { area: "Shoulders", shapes: [{ t: "ellipse", cx: 242, cy: 252, rx: 50, ry: 55 }, { t: "ellipse", cx: 468, cy: 252, rx: 50, ry: 55 }] },
    { area: "Chest", shapes: [{ t: "poly", pts: "272,208 355,196 440,208 435,322 355,340 276,322" }] },
    { area: "Core / Abs", shapes: [{ t: "poly", pts: "302,332 412,332 422,478 357,500 294,478" }] },
    { area: "Hips / Hip Flexors", shapes: [{ t: "poly", pts: "284,455 434,455 448,552 357,600 272,552" }] },
    { area: "Elbow / Forearm", shapes: [{ t: "poly", pts: "196,300 242,318 216,522 168,508" }, { t: "poly", pts: "516,300 470,318 496,522 544,508" }] },
    { area: "Wrist / Hand", shapes: [{ t: "ellipse", cx: 180, cy: 560, rx: 32, ry: 50 }, { t: "ellipse", cx: 532, cy: 560, rx: 32, ry: 50 }] },
    { area: "Quads / Knees", shapes: [{ t: "poly", pts: "235,562 317,600 309,730 241,722" }, { t: "poly", pts: "479,562 399,600 407,730 475,722" }] },
    { area: "Calves / Feet", shapes: [{ t: "poly", pts: "217,738 285,738 273,898 299,948 173,948 203,882" }, { t: "poly", pts: "499,738 431,738 443,898 417,948 543,948 513,882" }] },
  ],
  posterior: [
    { area: "Neck", shapes: [{ t: "poly", pts: "318,132 392,132 402,215 308,215" }] },
    { area: "Shoulders", shapes: [{ t: "ellipse", cx: 250, cy: 265, rx: 50, ry: 52 }, { t: "ellipse", cx: 482, cy: 265, rx: 50, ry: 52 }] },
    { area: "Upper Back", shapes: [{ t: "poly", pts: "288,218 448,218 442,338 366,350 294,338" }] },
    { area: "Lower Back", shapes: [{ t: "poly", pts: "304,362 410,362 406,437 354,452 308,437" }] },
    { area: "Elbow / Forearm", shapes: [{ t: "poly", pts: "202,315 248,330 226,507 178,491" }, { t: "poly", pts: "524,315 478,330 500,507 548,491" }] },
    { area: "Wrist / Hand", shapes: [{ t: "ellipse", cx: 190, cy: 543, rx: 32, ry: 50 }, { t: "ellipse", cx: 538, cy: 543, rx: 32, ry: 50 }] },
    { area: "Glutes", shapes: [{ t: "poly", pts: "280,437 434,437 446,544 354,580 268,544" }] },
    { area: "Hamstrings", shapes: [{ t: "poly", pts: "253,545 323,569 313,697 257,691" }, { t: "poly", pts: "483,545 413,569 423,697 479,691" }] },
    { area: "Calves / Feet", shapes: [{ t: "poly", pts: "221,730 285,730 269,890 293,927 169,927 199,857" }, { t: "poly", pts: "491,730 427,730 443,890 419,927 543,927 513,857" }] },
  ],
};

/* Category fallback icon keys — resolved to inline SVG in app.js */
const CATEGORY_ICON_KEYS = {
  Neck: "PersonStanding",
  Shoulders: "Dumbbell",
  Chest: "Expand",
  "Upper Back": "MoveVertical",
  "Lower Back": "Activity",
  "Elbow / Forearm": "Grip",
  "Wrist / Hand": "Hand",
  "Core / Abs": "Flame",
  "Hips / Hip Flexors": "RotateCcw",
  Glutes: "Move",
  Hamstrings: "StretchHorizontal",
  "Quads / Knees": "TrendingUp",
  "Calves / Feet": "Footprints",
};

const AREA_NAMES = Object.keys(EXERCISES);

/* Single source of truth for both the browser and the serverless
   functions. In the browser `module` is undefined and this is a
   no-op; under Node the API routes require() this same file, so
   the exercise list can never drift between client and server. */
if (typeof module !== "undefined" && module.exports) {
  module.exports = { EXERCISES, AREA_NAMES, CATEGORY_ICON_KEYS, IMG_DIMS, REGIONS };
}
