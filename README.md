# Duel Agents

The marketing site, the dashboard, and the proxy API for Duel Agents — the
IDE-native routing framework that runs prompts against multiple AI models
and picks the cheapest one whose answer still wins.

```
- Next.js 16 (App Router, RSC)        marketing carousel + dashboard + /v1 proxy
- TypeScript
- Tailwind CSS v4                     CSS-first @theme tokens
- Better-Auth                         magic-link auth, invite-only signup
- Drizzle ORM + Railway Postgres      product schema (users, accounts, calls, …)
- Upstash Redis                       quota counters + rate limits + waitlist persistence
- Resend                              transactional email
- GSAP + Lenis                        marketing site horizontal carousel
```

## Repository layout

```
app/                Next.js routes — marketing (carousel) + /dashboard + /api/auth + /api/waitlist
components/         Marketing-site React components (carousel, frames, design system)
lib/                Server-only helpers — auth.ts, session.ts, api-keys.ts, invites.ts
db/                 Drizzle schema, postgres-js client, migrations
public/             Static assets (logos, OG images, shadows, glb)
styles/             Design tokens, fonts
twitter/            Static X post templates
```

## Release flag

The Phase 1 product (login + dashboard + Better-Auth endpoints) is
gated behind `NEXT_PUBLIC_PRODUCT_LIVE`. While unset or `false`, the
site behaves exactly like the marketing-only build — `/login`,
`/dashboard`, and `/api/auth/*` all serve a 404. Flip to `true` in
your deploy environment when you're ready to expose the dashboard.

| Value                  | Effect                                              |
| ---------------------- | --------------------------------------------------- |
| (unset)                | Marketing-only mode. Dashboard surfaces 404.        |
| `false`                | Same — explicit off.                                |
| `true`                 | Login + dashboard + auth API are live.              |

## Phase 1 status (current — gated by release flag)

Foundations are in but invisible until the flag flips:

- Magic-link auth via Better-Auth + Resend
- Invite-only signup gated by `lib/invites.ts` (no public sign-up route)
- Drizzle schema covering users, accounts, account_members, duel_api_keys,
  subscriptions (forward-compatible with MoonPay), payment_provider, calls,
  invites, waitlist
- `/dashboard` shell with usage stat cards
- `/dashboard/settings` API key generation, revocation, and integration
  install snippets (Claude Code, Cursor, Codex CLI, Hermes Agent, Venice)

What's NOT in yet (future phases):

- The `/v1/messages` + `/v1/chat/completions` proxy (Phase 2)
- The display + real routers (Phase 2)
- MoonPay billing (Phase 3)
- `/admin` invite/quota UI (Phase 3)
- Dashboard analytics (Phase 4)
- `@duel-agents/install` CLI (Phase 5)

## Run locally

```bash
npm install
cp .env.example .env.local       # fill in the env vars below
npm run db:push                  # push the Drizzle schema to your Postgres
npm run dev
```

Without `DATABASE_URL` the marketing site still runs, but `/login`,
`/dashboard`, and `/api/auth/*` will fail on first DB query.

## Environment variables

`.env.example` enumerates everything. Defaults work in dev where possible.

| Key                          | Purpose                                                 |
| ---------------------------- | ------------------------------------------------------- |
| `NEXT_PUBLIC_PRODUCT_LIVE`   | `"true"` to expose login + dashboard; otherwise hidden  |
| `DATABASE_URL`               | Railway Postgres connection string                      |
| `BETTER_AUTH_SECRET`         | 32-byte random hex (`openssl rand -hex 32`)             |
| `BETTER_AUTH_URL`            | Site origin (e.g. `http://localhost:3000`)              |
| `DUEL_ADMIN_EMAILS`          | Comma-separated emails granted `/admin` access          |
| `ANTHROPIC_API_KEY`          | Server-side managed key (real backend, never to client) |
| `OPENAI_API_KEY`             | Server-side managed key                                 |
| `RESEND_API_KEY`             | Transactional email sender (sign-in, invites)           |
| `RESEND_FROM_EMAIL`          | `Duel Agents <hello@duel-agents.com>`                   |
| `RESEND_NOTIFY_EMAIL`        | Internal address for new-signup pings                   |
| `UPSTASH_REDIS_REST_URL`     | Quota counters + rate limits                            |
| `UPSTASH_REDIS_REST_TOKEN`   | Upstash REST token                                      |
| `MOONPAY_API_KEY`            | (Phase 3) MoonPay Commerce API key                      |
| `MOONPAY_WEBHOOK_SECRET`     | (Phase 3) Signature secret for webhook verification     |
| `MOONPAY_API_BASE_URL`       | `https://api.moonpay.com`                               |

## Scripts

```bash
npm run dev          # turbopack dev server
npm run build        # production build
npm run start        # serve the production build
npm run typecheck    # tsc --noEmit
npm run db:generate  # generate SQL migration from schema diff
npm run db:migrate   # apply pending migrations to DATABASE_URL
npm run db:push      # push schema directly (dev convenience; skips migrations folder)
npm run db:studio    # open Drizzle Studio against DATABASE_URL
```

## Bootstrapping the first invited user

In the v1 invite-only beta there's no public sign-up flow. The first
account is created by running the `inviteEmail` helper directly.
Easiest path: `node --import tsx scripts/invite.mts you@yourdomain.com`
(create the script ad-hoc) or run a one-shot in `npm run db:studio`.
The `/admin` UI in Phase 3 replaces this manual step.

## Architecture (one-paragraph version)

A persistent fixed Viewport renders an inner Track that's `frameCount × 100vw`
wide. The body itself is `frameCount × 100vh` tall — GSAP ScrollTrigger maps
that vertical scroll progress to the Track's `translateX`. Lenis wraps the
wheel input with inertia. Below `md` (768px) and under `prefers-reduced-motion`,
the carousel collapses to a normal vertical stack — see globals.css.

```
app/page.tsx
└─ <HorizontalCarousel frames=[10 frames] />
    ├─ Provider (frames, activeIndex, progressRef, subscribeProgress)
    ├─ <DepthStage />   layers parallax behind the track
    ├─ <Navbar />       fixed top
    ├─ <Footer />       fixed bottom, mono progress + swatch + version
    ├─ <CustomCursor /> mono crosshair w/ frame index
    ├─ <GrainOverlay /> single SVG <feTurbulence>
    └─ <main proxy h=1000vh>
        └─ <div viewport fixed inset-0>
            └─ <div track w=1000vw>
                ├─ <HeroFrame />
                ├─ <ManifestoFrame />
                └─ … 8 more
```

The high-frequency scroll progress is exposed via a ref + subscriber pattern
(`useScrollProgress(cb)`) so 60fps parallax doesn't trigger React renders.
Only `activeIndex` is in React state.

## Shadow asset generation

The site ships with procedural SVG placeholders so every frame is fully
laid-out without a single real image. Drop transparent PNG/WebP files into
`public/shadows/` and pass the path to the corresponding `ShadowLayer` or
`GhostFigure` and the placeholder resolves to the real asset.

### Base prompt

Use this for every shadow. Swap the `{SUBJECT}` line as listed below.

> Black-and-white scanned analog studio document aesthetic, heavy silver-gelatin
> film grain, ISO 1600 noise, photocopy degradation, dust, scratches, scanner
> artifacts, soft motion blur with a visible doubled ghost shifted ~10px,
> X-ray translucency. Cool light pebble-grey paper background that will be
> removed (the subject must read as a half-dissolved shadow on transparent).
> Subject: **{SUBJECT}**, massively zoomed in, cropped, bleeding off frame
> edges. Quiet, technical, melancholic mood. No text, no logos, no colour,
> no UI. 2560×1440 minimum, transparent background.

### Per-frame subjects

| File                              | Subject                                                                                                              |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `shadows/01-hero-head.png`        | a Unitree G1 humanoid robot head and shoulders, right-edge composition, only ~60% visible                            |
| `shadows/03-gpu-stack.png`        | four high-end consumer GPUs stacked vertically (RTX style), oversized macro, slight downward tilt                    |
| `shadows/04-runner-a.png` … `04-runner-d.png` | four separate ghosted humanoid runners at staggered horizontal positions, each at a slightly different blur intensity |
| `shadows/05-head-fragmented.png`  | the same hero head split into 6–9 fragments scattering outward, each fragment with its own motion-blur ghost          |
| `shadows/07-rackmount.png`        | a server rack interior with cables and blade servers, 3/4 angle, deep blur                                           |
| `shadows/08-laptop.png`           | an open laptop in 3/4 profile, faint Cursor/VS Code window outline barely visible, keyboard partially in shadow      |
| `shadows/09-chip.png`             | a CPU/GPU die macro with visible pin grid array, edge-on perspective                                                 |
| `shadows/10-ram.png`              | a single DIMM RAM stick macro, partial frame, gold contacts catching faint light                                     |
| `og-image.png` (1200×630)         | oversized "Duel Agents" Literata logotype lower-left on the cool pebble paper, hero-head shadow ghosting from right, single rust dot in a small `ERR 00` line |
| `favicon.svg`                     | minimal rust-on-paper mark — small crosshair-in-circle, or stylized monogram "D|A" with one rust pixel               |

### Wiring real assets

Once a PNG exists at `public/shadows/01-hero-head.png`, swap the layer in
`app/page.tsx`:

```tsx
{
  anchorIndex: 0,
  depth: 0.85,
  src: "/shadows/01-hero-head.png",   // <- added
  top: "5vh",
  right: "-22vw",
  width: "85vw",
  height: "100vh",
  blur: 14,
  opacity: 0.72,
}
```

In-frame ghosts (e.g. `GhostFigure shape="laptop"` inside the IDE frame) accept
the same `src` prop.

## Keyboard / a11y

- `←` / `PageUp` — previous frame
- `→` / `PageDown` — next frame
- `Home` — first frame
- `End` — last frame
- Tab — skip-to-waitlist link, then through interactive elements
- `aria-live` announces frame changes (`"Frame 4 of 10: Concurrence"`)
- `prefers-reduced-motion: reduce` collapses to a vertical stack with no
  scroll-driven animation

## DA enforcement

Rust accent usage is capped at two spots per frame by `RustAccentScope`.
In development the console warns when a frame exceeds the budget.

## Deploy

Pushes to `main` deploy to Vercel. Set the four env vars under
Settings → Environment Variables and you're done.
