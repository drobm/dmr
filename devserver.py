#!/usr/bin/env python3
"""
Local development server — NOT used in production.

Vercel runs the real serverless functions in api/*.js. This script
serves the same static files and stands in for those endpoints so
the whole UI can be exercised on a machine without Node installed.

  python3 devserver.py [port]      # default 8000

What it fakes:
  * /api/plan  always returns the built-in fallback plan. It does
    NOT call the Anthropic API — that path is exercised on Vercel,
    where the key lives. Responses are marked degraded:true, which
    is exactly what the real endpoint returns when the key is
    missing, so the UI takes the same branch either way.
  * profiles / plans / sessions live in memory and vanish on
    restart. Enough to click through every screen.
  * magic links are printed to this terminal instead of emailed.
  * clean URLs are emulated, matching vercel.json.
"""

import json
import os
import re
import sys
import uuid
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public")
MAX_SAVED_PLANS = 2

# ---------------------------------------------------------------
# Pull the exercise catalog out of public/data.js so the dev
# fallback matches production without a second copy of the data.
# ---------------------------------------------------------------
def load_exercises():
    """Returns {area: [{name, dose, cue, level}, ...]}.

    The client renders ex.name / ex.dose / ex.cue / ex.level, so the
    dev stub must return fully hydrated objects exactly like
    hydratePlan() in api/_lib.js does — not bare names.
    """
    src = open(os.path.join(ROOT, "data.js"), encoding="utf-8").read()
    block = src[src.index("const EXERCISES"): src.index("const IMG_DIMS")]
    field = lambda k, line: (re.search(k + r':\s*"((?:[^"\\]|\\.)*)"', line) or [None, ""])[1]
    areas, current = {}, None
    for line in block.splitlines():
        area = re.match(r'\s{2}(?:"([^"]+)"|([A-Za-z ]+?)):\s*\[', line)
        if area:
            current = area.group(1) or area.group(2)
            areas[current] = []
            continue
        if current and re.search(r'\{\s*name:\s*"', line):
            areas[current].append({
                "name": field("name", line).replace('\\"', '"'),
                "dose": field("dose", line).replace('\\"', '"'),
                "cue": field("cue", line).replace('\\"', '"'),
                "level": field("level", line).replace('\\"', '"'),
            })
    return areas


EXERCISES = load_exercises()

PROFILES = {}   # email -> profile
PLANS = {}      # email -> [plan]
SESSIONS = {}   # token -> email
TOKENS = {}     # magic-link token -> email


def fallback_plan(areas):
    valid = [a for a in areas if a in EXERCISES] or ["Lower Back"]
    per = 2 if len(valid) >= 3 else 3
    sections, total = [], 0
    for area in valid:
        picks = EXERCISES[area][:per]
        if total + len(picks) > 8:
            picks = picks[: max(0, 8 - total)]
        if not picks:
            break
        total += len(picks)
        sections.append({
            "area": area,
            "exercises": picks,
            "note": "Start light, stay in pain-free ranges, and progress gradually.",
        })
    return sections


TIPS = ("Consistency beats intensity — short daily sessions win. If pain is sharp, "
        "worsening, or radiating, stop and get assessed in person.")


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def log_message(self, fmt, *args):
        if "/api/" in (self.path or ""):
            sys.stderr.write("  %s %s\n" % (self.command, self.path))

    # ---- helpers ----
    def send_json(self, status, payload):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        for c in getattr(self, "_cookies", []):
            self.send_header("Set-Cookie", c)
        self.end_headers()
        self.wfile.write(body)

    def read_json(self):
        n = int(self.headers.get("Content-Length") or 0)
        if not n:
            return {}
        try:
            return json.loads(self.rfile.read(n))
        except Exception:
            return {}

    def session_email(self):
        raw = self.headers.get("Cookie") or ""
        for part in raw.split(";"):
            part = part.strip()
            if part.startswith("dmr_session="):
                return SESSIONS.get(part[len("dmr_session="):])
        return None

    def sign_in(self, email):
        token = uuid.uuid4().hex
        SESSIONS[token] = email
        self._cookies = [f"dmr_session={token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=5184000"]

    # ---- routing ----
    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/me":
            email = self.session_email()
            if not email:
                return self.send_json(200, {"profile": None, "plans": []})
            return self.send_json(200, {"profile": PROFILES[email], "plans": PLANS.get(email, [])})

        if path == "/api/auth":
            token = (parse_qs(urlparse(self.path).query).get("token") or [""])[0]
            email = TOKENS.pop(token, None)
            if not email:
                return self.send_json(401, {"error": "That link has expired or was already used."})
            if email not in PROFILES:
                return self.send_json(404, {"error": "No profile found for that email."})
            self.sign_in(email)
            return self.send_json(200, {"profile": PROFILES[email], "plans": PLANS.get(email, [])})

        if path.startswith("/api/"):
            return self.send_json(405, {"error": "Method not allowed"})

        # Emulate Vercel's cleanUrls: /intake serves intake.html, so
        # local routing matches production instead of 404ing.
        if path != "/" and not os.path.splitext(path)[1]:
            candidate = os.path.join(ROOT, path.lstrip("/") + ".html")
            if os.path.isfile(candidate):
                self.path = path + ".html"

        return super().do_GET()

    def do_POST(self):
        path = urlparse(self.path).path
        body = self.read_json()

        if path == "/api/plan":
            mode = body.get("mode")
            areas = body.get("areas") or []
            plan = fallback_plan(["Lower Back"] if mode == "text" else areas)
            if not plan:
                return self.send_json(400, {"error": "No valid areas selected"})
            return self.send_json(200, {"plan": plan, "tips": TIPS, "degraded": True})

        if path == "/api/lead":
            p = body.get("profile") or {}
            email = (p.get("email") or "").strip().lower()
            if not email:
                return self.send_json(400, {"error": "Enter a valid email"})
            profile = {"id": email, "name": p.get("name"), "email": email,
                       "handle": p.get("handle"), "phone": p.get("phone")}
            PROFILES[email] = profile
            PLANS.setdefault(email, [])
            incoming = body.get("plan")
            if incoming and len(PLANS[email]) < MAX_SAVED_PLANS:
                PLANS[email].append({**incoming, "id": uuid.uuid4().hex,
                                     "savedAt": "2026-08-18T00:00:00Z"})
            self.sign_in(email)
            print(f"\n  *** LEAD: {profile['name']} <{email}> @{profile['handle']}\n", flush=True)
            return self.send_json(200, {"profile": profile, "plans": PLANS[email], "persisted": True})

        if path == "/api/plans":
            email = self.session_email()
            if not email:
                return self.send_json(401, {"error": "Not signed in"})
            saved = PLANS.setdefault(email, [])
            if len(saved) >= MAX_SAVED_PLANS:
                return self.send_json(409, {"error": "Plan slots full", "plans": saved})
            saved.append({**body.get("plan", {}), "id": uuid.uuid4().hex,
                          "savedAt": "2026-08-18T00:00:00Z"})
            return self.send_json(200, {"plans": saved})

        if path == "/api/auth":
            email = (body.get("email") or "").strip().lower()
            token = uuid.uuid4().hex
            TOKENS[token] = email
            print(f"\n  *** MAGIC LINK for {email}:\n      http://localhost:{PORT}/relief-plan?token={token}\n", flush=True)
            return self.send_json(200, {"sent": True})

        return self.send_json(404, {"error": "Not found"})

    def do_DELETE(self):
        path = urlparse(self.path).path
        if path == "/api/plans":
            email = self.session_email()
            if not email:
                return self.send_json(401, {"error": "Not signed in"})
            pid = (parse_qs(urlparse(self.path).query).get("id") or [""])[0]
            PLANS[email] = [p for p in PLANS.get(email, []) if str(p.get("id")) != pid]
            return self.send_json(200, {"plans": PLANS[email]})
        return self.send_json(404, {"error": "Not found"})


if __name__ == "__main__":
    PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    total = sum(len(v) for v in EXERCISES.values())
    print(f"Loaded {len(EXERCISES)} areas / {total} exercises from public/data.js")
    print(f"Dev server on http://localhost:{PORT}  (Ctrl-C to stop)")
    ThreadingHTTPServer(("", PORT), Handler).serve_forever()
