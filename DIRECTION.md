# FF_SmartControl — v1.0 Direction

**Status:** active direction. Locked in for v1.0 release.
**Last updated:** 2026-06-02
**Owner:** TD (Scrim Wiggins), Farm Friend Technologies (FFT)

---

## TL;DR

**FF_SmartControl (branded FarmPal on the operator side) is a software product.** We sell a *license + an SD card image*. The hardware — Raspberry Pi 5, smart plugs, sensors, relay boards — is the customer's hardware. We are not in the hardware business in v1.0.

Two SKUs at launch, both fundamentally software:

1. **FarmPal Software License** — `$299` one-time. Customer brings their own Pi (or any Linux box). License key unlocks the full feature set, ties to a device fingerprint (Pi serial / MAC), and ships with a 14-day trial.
2. **FarmPal Edition Pre-flashed SD Card** — `$449` one-time. A 64GB SD card we burned and tested, with the image pre-loaded and the boot wizard waiting. Customer flashes, plugs, browses to `farmpal.local`, walks through the 6-step wizard, and the lights come on.

We will *also* offer hardware kits (Pi 5 + Tasmotas + sensors) via a separate SKU once we have 25 paying customers and know the BOM. Hardware is a *fulfillment partner relationship*, not a core product line. Until then: **software is the product.**

> The word "FarmPal" refers to the operator-facing product surface (the dashboard, the wizard, the safety UI). "FF_SmartControl" is the GitHub repo / open-source-core name. "FFT_nano" is the parent host that runs the whole thing. All three names live in the same codebase, same release, same license.

## Why "software product" and not "hardware product"

We are not vertically integrated. We do not want to be vertically integrated. A hardware company has:

- A bill of materials to maintain (with constant part shortages and EOL notices)
- A warehouse to ship from
- A support burden that scales with each device sold, not with each license sold
- A liability profile (we are the manufacturer; we own the safety case for the box, the wire, the plug)
- Capital tied up in inventory
- A return / RMA pipeline
- Customs / import paperwork for any international sale
- A 2–6 month lead time on every hardware revision

A software product that ships as an SD card image has:

- Zero inventory (we burn to cards on demand, or a fulfillment partner does it for $5 per unit)
- Margin above 90% on the license line
- A support burden that scales *linearly with active installs*, not with units sold
- A 24-hour turnaround on every release
- The freedom to be a 1-person company

**Software is the right shape for a survival-and-thriving business.** Hardware is the *fulfillment detail* on top of the software.

## Who is v1.0 for

**Primary persona (first 90 days):** specialty / controlled-environment ag — greenhouses, indoor vertical, mushroom, aquaponics, microgreens, hops, herbs, small specialty-crop operations with 1–10 zones who already own Tasmota / Shelly / MQTT sensors and just need the autonomous control brain on a Pi.

This is the only persona that simultaneously:
- Will pay $299+ without blinking (commercial PO budget, not hobbyist)
- Has equipment we can integrate with on day 1 (Tasmota / Shelly / Kasa)
- Can be reached via the warm network in OR / WA / TX (TD's access)
- Has a measurable ROI (one prevented crop loss pays for the Pi ten times over)

**Out of scope for v1.0:** industrial ag (12-month sales cycle), water utilities, cold storage, agri-processing (compliance + procurement). They become the Year-2 customer.

**Out of scope forever (probably):** "smart home hub" market — Home Assistant Green is $199 and we're not competing on that turf. We're the *specialty-grower* brain.

## Default mode at launch

**SUGGEST** — AI proposes, safety verifier evaluates, operator confirms in the dashboard or via Telegram.

Why SUGGEST and not AUTONOMOUS:

- The verifier still runs and gets exercised end-to-end, so we know the safety policy works.
- The customer sees the AI's reasoning and gets a chance to overrule. No surprise 2am actuator firings on a v1.0 customer.
- The customer can flip to AUTONOMOUS in Settings after a 7-day observation period. v1.1 enables that.
- The SUGGEST mode is *also* the data-collection mode. We get a corpus of "what would the AI have done" vs. "what the operator did" — that's the dataset that proves autonomy is safe and the marketing story for v1.1.

This is the same pattern as Tesla FSD: supervised first, unsupervised after data. We do not have a billion miles of data. We ship supervised.

## What we ship in v1.0

The codebase as of tag `v1.0.0` is exactly what was already built, *plus* the 2-line UTC fix already committed on `fix/utc-time-evaluation-policy-heartbeat`. No new features for v1.0 — only correctness, hardening, and the operator experience.

**In scope for v1.0:**
- All 9 commercialization milestones documented in `README-commercialization.md` (image, wizard, safety, dashboard, automation, service, security, updates, docs)
- The 8 operator guides in `docs/`
- The 40+ test case QA matrix in `docs/QA_MATRIX.md`
- The verifier-gated safety policy engine
- SUGGEST default mode
- License activation, device-bound key, 14-day trial, 30-day offline cache
- First-boot wizard at `farmpal.local`
- HTTPS with self-signed cert (LAN-only default, WAN opt-in)

**Out of scope for v1.0 (roll to v1.1):**
- Industrial-pilot feature gates
- OEM / SDK tier (license the control plane to a sensor manufacturer)
- Real-time multi-tenant telemetry aggregation
- Voice / push-to-talk
- Mobile app (Telegram is the mobile app)

## v1.0 ship-gate

Hard requirements before the v1.0 release tag is cut and the Stripe link goes live:

1. `npm test` → 622/623 pass, 0 fail
2. `npm run typecheck` → clean
3. `npm run doctor` → clean on a fresh Raspberry Pi 5 (8GB) install
4. `npm run secret-scan` → clean
5. `npm run release-check` → clean
6. One full end-to-end smoke test on real hardware: flash card → boot → wizard → discover Tasmota → run SUGGEST mode for 4 hours → verify operator veto UI works → verify E-Stop from dashboard → verify recovery
7. Operator guide walkthrough: every guide in `docs/` opened by a non-developer and confirmed to be followable
8. A Home Assistant integration PR filed (free distribution; highest-ROI SDK-adjacent play)
9. `CHANGELOG.md` updated with the v1.0 release notes
10. License fulfillment path tested end-to-end: fake purchase → license email arrives → key unlocks SUGGEST mode

The detailed ship-gate spec (with the per-test-fix reasoning) lives in `ship-gate-spec.md`. The market research that anchors the price (with the per-competitor table) lives in `market-research-2026.md`. Both are committed alongside this `DIRECTION.md`.

## How we go to market

| Week | Channel | Goal |
|---|---|---|
| 1 | TD's warm network (TX, OR, WA) — 5 in-person demos | Close on the spot. 5 × $899 = $4,495 if all 5 close on the Pro Kit |
| 2–3 | Garden centers — Down To Earth (Eugene), Gray's Gardens, Fox Hollow, +1-2 Portland/Salem stores | Wholesale + 10-15% referral. Display model + demo. 1-2 partner stores signed. |
| 3–4 | Oregon Association of Nurseries (OAN) + Garden Center Magazine 2026 conference | Trade-group introduction. Booth if budget allows. |
| 4–6 | Home Assistant integration PR | Free distribution to HA's 1M+ users. This is the SDK play. |
| 6+ | Industrial pilot | One real specialty operation, paid pilot, longer cycle. |

The Eugene garden-center opener is the single most leveraged relationship we have. One in-person demo at Down To Earth or Gray's Gardens, one Pi + one Tasmota + one moisture sensor on the front counter, and we have a channel partner and a sales pipeline for the entire Pacific Northwest.

## What is NOT the direction

For the avoidance of doubt, here is what we are *not* doing in v1.0:

- **Not** a smart-home hub. Home Assistant Green is $199 and we cannot beat it.
- **Not** a cloud platform. There is no farm-friend.com backend; the Pi is the product. Customers do not subscribe. The data never leaves the farm.
- **Not** a hardware manufacturer. We do not stock a Pi. We do not assemble enclosures. We do not warranty the wire.
- **Not** a general-purpose AI agent. FFT_nano the host can do a lot of things; v1.0 of the *product* is a smart farm controller. The host's flexibility is a platform capability, not a marketing claim.
- **Not** a developer tool. If the customer is `npm install`-ing on a Mac, we are not in the right room. The v1.0 product is the SD card image. Everything else is implementation detail.
- **Not** a multi-tenant SaaS. There is no `farmpal.farm-friend.com` dashboard. Customers log in to *their own Pi*, on *their own LAN*.

## What "shipped" means

A v1.0 customer experience looks like this:

1. They buy the software license ($299) OR a pre-flashed card ($449) from the Shopify store.
2. They receive an email with the license key (or the card arrives in the mail).
3. They plug a Pi 5 into their network, insert the card, plug in power.
4. They browse to `farmpal.local` from any device on the same LAN.
5. They walk through the 6-step wizard: admin password → farm name → timezone → WiFi (already configured if they used our card) → LLM provider + API key → Telegram (optional).
6. The HAL UI dashboard appears.
7. They click "Discover Devices," the Pi scans the LAN, finds the Tasmota plugs and MQTT sensors they already own, and registers them.
8. They pick a threshold. They switch to SUGGEST mode. They watch the AI propose actions; they confirm or veto.
9. After 7 days, they flip to AUTONOMOUS in Settings.
10. The Pi runs autonomously, texts them when something needs attention, and the lights come on when they're supposed to.

That is the product. Everything else in this repo — the chat agent, the LLM provider plumbing, the cron system, the license system, the test suite, the docs — exists to make those ten steps feel effortless and reliable.

---

**This document is the single source of truth for v1.0 direction. If a PR moves the product off this direction, this document is updated in the same PR.**

— Hermes, June 2 2026, on behalf of TD
