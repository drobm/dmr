# Dynamic Muscle Recovery — website + Pain Relief Guide

The marketing site and the Pain Relief Guide in one deployment, one
domain, one repo. Previously two separate Vercel projects.

**Live:** https://dynamicmusclerecovery.com _(after the DNS step below)_

## Routes

| Route | What it is |
|---|---|
| `/` | Marketing home. Hero, services, about, FAQ. |
| `/relief-plan` | The Pain Relief Guide — the free tool the CTAs point at. |
| `/intake` | New-client intake form → Make.com → Airtable CRM → AI welcome email. |
| `/inquiry` | Short lead qualifier → Make.com → Claude scoring → tiered reply. |
| `/session` | Branded virtual session room (Daily.co). |

Every CTA on the marketing site now points at an internal route. Nothing
links out to a separate deployment any more.

---

## What you need to know first

There is **no build step**. No `npm install`, no compiler, no bundler.
The files in `public/` are the actual files the browser downloads. Edit
one, push, and Vercel redeploys it as-is.

This is deliberate: your Mac has no Node installed, so anything with a
build step would be a project you couldn't open and change. This one you
can edit in any text editor, forever.

The `api/` folder is the exception — those run on Vercel's servers, not
in the browser, and Vercel installs their dependencies for you.

---

## Where to change things

| I want to change... | Edit this file |
|---|---|
| Marketing home page (hero, services, FAQ) | `public/index.html` |
| Intake form | `public/intake.html` |
| Inquiry form | `public/inquiry.html` |
| Virtual session room | `public/session.html` |
| Where the guide's buttons send people | `public/config.js` |
| Exercise names, doses, coaching cues | `public/data.js` |
| Any wording on any screen | `public/app.js` |
| Colors, fonts, spacing | `public/styles.css` |
| Add exercise photos/videos | drop files in `public/media/` — no code change |

**`public/config.js`** controls where the guide's buttons send people.
Everything in it is filled in and live:

```js
SOCIAL.instagram / SOCIAL.tiktok   // instagram.com/derrick.dynamic, etc.
NEXT_STEPS.virtualSession          // "/intake"
NEXT_STEPS.library                 // "/intake"
```

Both `NEXT_STEPS` links point at the intake form, matching the "Book a
Session" and "Explore Programs" buttons on the marketing site — so every
route into paid work lands in the same Airtable pipeline. If you later
want "Explore Programs" to go straight to the My PT Hub library, put that
URL in `library`; external links automatically open in a new tab.

The social handles appear in two places — `config.js` for the guide and
`public/index.html` for the marketing footer. Change both together.

Never put an API key or password in `public/` — everything in that
folder is downloadable by anyone who visits the site.

---

## Exercise photos and videos

Drop files into `public/media/` named after the exercise. The full list
of the 56 expected filenames is in `public/media/media-filenames.txt`.

```
Chin Tucks  ->  chin-tucks.jpg   (thumbnail)
            ->  chin-tucks.mp4   (looping demo)
```

You do not need all of them, and you never touch code. A missing photo
falls back to the gold category icon; a missing video simply doesn't
render. Add them as you film them.

Keep videos short and compressed — most visitors are on cell data.
Under ~2MB each is a good target. They autoplay muted, so they need to
read clearly without sound.

---

## Deploying

### One-time setup

**1. Push to GitHub**

```bash
cd dmr-pain-relief
git add -A
git commit -m "Pain Relief Guide"
git remote add origin https://github.com/YOUR-USERNAME/dmr-pain-relief.git
git push -u origin main
```

**2. Connect Vercel**

vercel.com → Add New → Project → import the repo → Deploy.
Leave every build setting alone; `vercel.json` already says what to do.

From here, every `git push` redeploys automatically.

**3. Add the database** _(Vercel dashboard → Storage → Create Database → Postgres)_

Connect it to the project. Vercel injects `POSTGRES_URL` automatically —
you don't copy anything. The tables create themselves on first use.

To read your leads: Storage → your database → Data. You can sort,
filter, and export to CSV from there.

**4. Add email** _(Vercel dashboard → Marketplace → Resend → Install)_

Creates the account inline and injects `RESEND_API_KEY`. Powers both the
sign-in links and your new-lead alerts.

**5. Set the remaining environment variables**

Project → Settings → Environment Variables:

| Name | Value |
|---|---|
| `ANTHROPIC_API_KEY` | From console.anthropic.com |
| `AUTH_SECRET` | Run `openssl rand -base64 32` and paste the result |
| `LEAD_ALERT_TO` | The inbox where new-lead emails should land |
| `EMAIL_FROM` | `Pain Relief Guide <hello@dynamicmusclerecovery.com>` |
| `PUBLIC_BASE_URL` | `https://dynamicmusclerecovery.com` |

Then redeploy once (Deployments → ⋯ → Redeploy) so they take effect.

> `EMAIL_FROM` must use a domain you've verified inside Resend. Until you
> verify one, leave it unset — the default only delivers to your own
> address, which is fine for testing but won't reach customers.

**6. Point the domain at it**

- Vercel → Project → Settings → Domains → add `dynamicmusclerecovery.com`
- Vercel shows you a CNAME record
- Wix → Domains → DNS → add that record
- If you still have the old `app.dynamicmusclerecovery.com` subdomain
  pointing at the previous deployment, redirect it to
  `dynamicmusclerecovery.com/relief-plan` so old links keep working
- Wait a few minutes for DNS to propagate

### Everyday updates

```bash
git add -A
git commit -m "what changed"
git push
```

That's the whole loop. Vercel builds and deploys within a minute.

---

## What happens if something isn't set up

The app is built to degrade instead of break:

| Missing | Effect |
|---|---|
| `ANTHROPIC_API_KEY` | Plans still generate, using the built-in logic instead of AI. Visitors see a normal plan. |
| Database | Plans still generate and unlock. Leads are logged to Vercel's function logs but not stored. |
| `RESEND_API_KEY` | No lead-alert emails and no sign-in links. Everything else works. |
| `AUTH_SECRET` | Login is disabled. Profiles still unlock plans for that visit. |

So you can ship after step 2 and add the rest as you go.

---

## Working on it locally

```bash
python3 devserver.py
```

Then open http://localhost:8000. All five routes work locally, including
clean URLs.

`devserver.py` is a local-only stand-in for the `api/` functions so the
whole interface can be clicked through on a machine without Node. It
does **not** call the Anthropic API — it always serves the built-in
fallback plan — and its profiles and plans live in memory, so they
disappear when you stop it. Sign-in links print to the terminal instead
of being emailed.

It is not deployed and has no effect on the live site.

> **If you use an AI coding tool with a built-in preview launcher:** it
> may not be able to start this server for you. On this Mac, that
> launcher runs without permission to read `~/Documents`, so it fails
> with `Operation not permitted` on any file in this project — the
> script and the site files alike. Start the server yourself with the
> command above and point the preview at `http://localhost:8000`
> instead. This is a macOS privacy setting, not a problem with the
> project.

---

## Project layout

```
public/            ← everything the browser downloads
  index.html       ← marketing home ("/")
  intake.html      ← "/intake"
  inquiry.html     ← "/inquiry"
  session.html     ← "/session"
  relief-plan.html ← the guide ("/relief-plan")
  config.js        ← the guide's links and handles
  data.js          ← the 56 exercises + body-diagram hotspots
  app.js           ← all screens and interaction logic
  styles.css       ← the design system
  images/          ← the two anatomy diagrams
  media/           ← exercise photos and videos go here

api/               ← runs on Vercel's servers, never in the browser
  plan.js          ← AI plan generation (holds the API key)
  lead.js          ← profile creation + lead capture + alert email
  plans.js         ← save / delete saved plans
  auth.js          ← passwordless sign-in links
  me.js            ← restores a session on page load
  _lib.js          ← database, sessions, exercise-count enforcement
  _email.js        ← Resend templates

devserver.py       ← local development only, not deployed
```

---

## Notes on how it's built

**The exercise caps are enforced on the server.** 2–3 exercises per
area, never more than 8 total, and 2 saved plans per profile. The
browser enforces them too, but the browser can be edited by anyone with
developer tools open, so `api/_lib.js` re-applies them independently.

**The AI can't invent exercises.** The model picks from your catalog by
name and its response is checked against `data.js` before rendering. If
it returns something that isn't in your list, that entry is dropped.

**One external request.** The brand fonts (Archivo + Inter) load from
Google Fonts. Everything else is served from your own domain. To remove
even that, download the font files into `public/`, add `@font-face`
rules to `styles.css`, and delete the `fonts.googleapis.com` lines from
`index.html`.

**Compliance.** The wellness disclaimer appears on the home and plan
screens, and the red-flag banner routes numbness/tingling/radiating pain
toward a 1:1 session. The prompt in `api/plan.js` instructs the model to
stay in educational wellness territory and avoid diagnosis language. If
you change that prompt, keep those instructions.
