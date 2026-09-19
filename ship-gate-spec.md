# FF_SmartControl / FarmPal — v1.0 Ship-Gate Spec

> Prepared by Hermes for TD, June 2 2026.
> Read-only engineering analysis. No code changes proposed here are executed yet — they wait for your sign-off.

> **Addendum — 2026-09-18:** The v1.0 launch calls (D1–D8) are now recorded in `DIRECTION.md` (§ Decision log). Two supersede recommendations below: §4's "ship SUGGEST mode by default" → the factory default is **OBSERVE_ONLY** (as SPEC.md already ships), with a one-click SUGGEST offer as the wizard's final step; and the launch is gated only on the 4-hour smoke test — any public grow-cycle pilot runs post-launch as marketing. Everything else in this spec stands.

## 1. Current state of the build

- Typecheck: **clean** (after `npm install`)
- Tests: **619 / 623 pass** (after `npm rebuild better-sqlite3` — this rebuilt the native bindings; before the rebuild, 38 tests were falsely red from a Node 22.18 ABI mismatch, not real bugs)
- Skipped: 1
- Failing: **3** (all real, all the same root cause)
- 1 the runner reported as 4 because of suite-level vs leaf-test count discrepancy; the actual *leaf-test* count is 3.

```
not ok - parseHeartbeatActiveHours and isWithinHeartbeatActiveHours support day ranges
not ok - evaluateAction: denies outside allowed_schedule_windows
not ok - evaluateAction: schedule windows with days of week
```

## 2. The 3 real failures — root cause and fix sketch

**Root cause (one bug, three symptoms):** Both `src/safety/policy-engine.ts` and `src/heartbeat-policy.ts` evaluate "is this current time within the rule's window?" using **local time** (`now.getHours()`, `now.getDay()`), but the ISO timestamps in SQLite serialize as UTC and the tests pass UTC times. The Mac is currently in PDT (UTC-7), which moves everything off by 7 hours. Production behavior will be wrong on every customer device that isn't in the same timezone as the Pi.

### Fix 1 — `src/heartbeat-policy.ts` line 280 area

```ts
// Change in getDatePartsForTimezone: when no timezone is set, return UTC.
return {
  minute: now.getUTCHours() * 60 + now.getUTCMinutes(),
  day: now.getUTCDay(),
};
```

Effort: **S** (one hunk, no signature change). The `timezone` parameter still wins when set, which preserves `09:00-17:00@America/New_York` behavior.

### Fix 2 — `src/safety/policy-engine.ts` lines 627–629

```ts
// Change in evaluateAction / allowed_schedule_windows case:
const currentHour = now.getUTCHours();
const currentDay = now.getUTCDay();
```

Effort: **S** (one hunk, two lines).

### Test

`tests/heartbeat-policy.test.ts` and `tests/safety-policy-engine.test.ts` already encode the UTC behavior — no test changes required. After the two fixes, `npm test` should report **622 / 623 pass, 1 skipped**.

## 3. v1.0 ship-gate: what MUST be green, what can wait

### MUST be green for v1.0 (commercial release)

1. The 3 UTC bugs fixed and re-tested clean.
2. The full safety policy engine + simulator + manual-override test paths re-run from a clean `npm ci` on Node 20 LTS (not Node 22.18 — many farm Pis will run 20).
3. `npm run typecheck` clean.
4. `npm run doctor` clean on a fresh Raspberry Pi 5 (8GB) install.
5. `npm run secret-scan` clean.
6. README-commercialization claims (`OAN-style` "ready to ship" milestones 1-9) walked through and ticked: image flash, first-boot wizard, mDNS, safety, dashboard, automation modes, service reliability, security, update, docs.
7. At least one Home Assistant integration PR filed (the highest-ROI SDK/distribution play; free; gets us in front of HA's 1M+ user base).

### Acceptable to ship as v1.0 (but not to advertise beyond)

- The 1 skipped test (a known skipped test in the suite).
- Cosmetic CI / docs drift. The `tsconfig` already says Node 20+, and `engines` says `>=20`; we should not advertise Node 22 LTS as the supported runtime until we test it.
- `MQTT_PASSWORD=*** string fragment in `src/hal/mqtt.ts` — this is a copy-paste artifact, not a real secret. Verify, delete, and add a `.gitleaks.toml` rule.

### Roll to v1.1 (post-launch, 30-60 days)

- The non-test code gaps: `require('../hal/db.js')` inside ESM `verifier.ts`, silent `try/catch` in `discovery.ts`, `require('serialport')` in ESM `serial.ts`, no Node ABI guard at install.
- Full `npm run release-check` clean run on a real Pi 5 (HW-only validations: SD flash, WiFi, mDNS, GPIO, watchdog, MQTT, relays).
- All 4 `mqtt`, `http-devices`, `gpio`, `serial` driver paths validated with at least one real device each.
- The `factory-reset`, `cross-scheduled-task-timezone`, `cron-v2`, `ensureKnowledgeNightlyTask` long-tail tests should be green before v1.1, not v1.0.

## 4. v1.0 mode-of-operations recommendation

**Ship SUGGEST mode by default.** Reasons:

- The SUGGEST mode is the AI-proposes / operator-confirms path. The LLM thinks, the safety verifier evaluates, the operator sees the proposed action in the dashboard or Telegram and has to hit "go." This means the safety verifier test surface is *exercised* (so we know the rules engine works), but the customer never gets a surprise actuator firing while they're not watching.
- It is exactly the "four modes" demo we already built. The default flips from AUTONOMOUS (current default per `src/automation/modes.ts`) to SUGGEST for v1.0 only.
- When v1.1 lands, customers can flip to AUTONOMOUS in Settings after a 7-day observation period. This gives us a *natural* upsell moment AND a real-world telemetry corpus of "what would the AI have done?" → "did the operator do it?" → that's the dataset that proves autonomy is safe.
- This is the same pattern as Tesla FSD — supervised first, unsupervised after data. We do not have a billion miles of data, so we ship supervised, period.

**Alternative I'm rejecting for v1.0:** OBSERVE_ONLY. Too thin. The customer can't feel the AI thinking, so the value prop is "we made a dashboard." Not enough.

**Alternative I'm rejecting for v1.0:** AUTONOMOUS by default. The 3 UTC bugs being live is exactly the kind of "the lights came on at 2am" failure mode that gets a customer refunded and a tweet going. Not worth the risk.

## 5. SKU / pricing / packaging

(This is the answer to the question you said to decide myself. See `market-research-2026.md` for the full comparison.)

### Persona (the buyer for the first 90 days)

**Specialty / controlled-environment ag — greenhouses, indoor vertical, mushroom, aquaponics, small specialty-crop (hops, herbs, microgreens) operations with 1-10 zones who already own Tasmota / Shelly / MQTT sensors and just need the autonomous control brain on a Pi.**

This is the only persona that simultaneously:
- Will pay $299+ without blinking (commercial purchase order territory, not hobbyist)
- Has equipment we can actually integrate with (Tasmota/Shelly/Kasa is the bulk of the smart-plug installed base)
- Can be reached via the garden-center / OAN / trade-show channel in Oregon & Washington
- Has a clear, measurable ROI (one prevented crop loss pays for the Pi ten times over)

Small commercial farms, ag-adjacent / industrial IoT, and homesteaders are all real markets, but they need a different sales motion each. Don't dilute the first 90 days.

### Two-SKU launch

| SKU | Price | COGS | Channel |
|---|---|---|---|
| **FF_SmartControl — Software License** | $299 one-time | $0 | Shopify, instant download (license key) |
| **FarmPal Edition — Pre-flashed Card** | $449 one-time | $15-20 card + $5 shipping | Shopify + Etsy, ships in 3-5 days |

The $150 premium on the card covers the convenience and the support burden reduction (no "why won't my Pi boot" tickets). Home Assistant Green at $199 is the consumer reference; the convenience tier is $250 more than that, but the customer is buying *autonomous actuation + the verifier*, not a hub. 

If we want a 3rd SKU later: **FarmPal Pro** at $799 (lifetime + 1 year of device-driver updates + 2 hours of remote onboarding). Save for 60 days post-launch.

### One-time, no subscription

Matches your PII Guard / Shopify Digital Downloads cadence. Subscriptions on a control plane that touches physical equipment is a support tax nobody wants to pay.

### Bundle play (the real "hiding in plain sight" move)

A "FF_SmartControl + Tasmota 4-pack" bundle at $399 (license $299 + Tasmotas $50 cost, sold $399, $50 margin on the Tasmotas) gets the customer everything they need for a one-zone install. Use Tasmota affiliate link for the bulk order; they handle shipping. **This is the answer to "how do you sell a Pi to a 65-year-old farmer."** Make the cart have everything.

## 6. 1-week engineering calendar to v1.0-ready

Day 1: Fix the 2 source files (heartbeat-policy + safety policy). Re-run `npm test`. Verify all green.

Day 2: Spin up a fresh Pi 5 (or a Docker Pi 5 image) and run `npm run onboard:full`. Verify the 6-step wizard, mDNS, first-boot provisioning. Capture the screen record.

Day 3: Connect a Tasmota plug and a Shelly plug to a clean Pi. Run the discovery wizard. Verify both auto-register. Run SUGGEST mode for 4 hours with a fake sensor. Verify the operator veto UI works.

Day 4: Trigger the E-Stop from the dashboard. Verify the per-device safe state fires. Verify recovery. Verify the watchdog. Document any rough edges in `TROUBLESHOOTING.md`.

Day 5: Walk through the 8 operator guides and update anything that references a feature that doesn't work. Run `npm run release-check`. Run `npm run secret-scan`. Run `npm run farm:doctor`.

Day 6: Hand-build a PII-Guard-grade landing page at `farmpal.farm-friend.com` (or `ff-smartcontrol.com`). Story = "The autonomous farm brain on a Pi." 5 pages: hero, how it works, what's in the box, hardware compatibility, buy. Stripe wired. License fulfillment to a Postgres or SQLite table.

Day 7: Pre-launch. 3 emails to the OAN + 5 garden centers in the Eugene / Portland / Salem / Bend / Vancouver WA area. 1 LinkedIn post. 1 YouTube demo video (the screen record from Day 2). Stand by for the first ticket.

**That's 7 days from today, June 9 2026.** Reasonable.

## 7. The Eugene opener (Down To Earth, Gray's Gardens, et al.)

If the connection is **Down To Earth Home, Garden and Gift** (downtoeartheugene.com, est. 1977, 110 Yelp reviews, 4.4★), the opener that lands:

- **1-page deck** (3 slides): (1) "Smart garden is the next $1B category, your customers are already asking." (2) "This is FF_SmartControl. $299 software / $449 pre-flashed card. You make 10-15% on every sale." (3) "We're raising a $250K friends-and-family to scale this. We're inviting you in at the floor."
- **Demo**: 1 Pi + 1 Tasmota + 1 moisture sensor in a small propagator on the front counter. Runs the wizard, runs SUGGEST mode, lights up the dashboard. 5-minute demo, then leave it for a week.
- **Channel ask**: wholesale + 10-15% referral + 1 display model. They get margin and a story; we get a regional sales channel with no employees on our side.
- **Investor ask**: optional second conversation. Open with "the garden-center-as-channel is the more important thing for us right now, but if you ever want to talk about putting money in, I'm happy to." Don't lead with the raise; lead with the channel.

The trade group (OAN, 700+ members, ~$20.4M annual revenue) is the institutional front door. A second meeting should be with OAN's innovation committee. That's where the multi-store rollup happens.

## 8. What I want you to confirm before I touch any code

I will not start the Day 1 fixes until you say so. The Day 1 fix is small but it changes a *behavior* (time-of-day evaluation moves from local to UTC), and a customer with a Pi in a different timezone than the one they configured at onboarding could see the new behavior differently than the old. We should write the test to capture the existing local-time behavior too, or document the change in the changelog as a behavior change for v1.0.

Once you say go, this is the order I'll work in:
1. Patch `src/heartbeat-policy.ts` and `src/safety/policy-engine.ts` to use UTC by default.
2. Run `npm test` and report.
3. Run `npm run typecheck` and report.
4. Open a PR on the `fix/smartcontrol-production-hardening` branch.
5. Tag you for review.

Then we move to Day 2 of the calendar.

— Hermes, June 2 2026
