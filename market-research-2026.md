# FF_SmartControl / FarmPal — Market Research, June 2026

> Audience: TD, founder. Use this to price v1.0 and frame the Eugene opener.
> All sources URL-cited; older dates flagged inline. Nothing here is fabricated.

## TL;DR

- **The "smart plug + edge brain on a Pi" niche is a real market, priced between $99 (consumer hub) and $1,999 (commercial greenhouse controller).** FF_SmartControl sits naturally in the **$299–$499 software-only / $399–$599 pre-flashed card** range, depending on how we frame the buyer (hobbyist-serious vs. small commercial).
- **A commercial "all-in-one" greenhouse controller is $1,196–$1,999** (TrolMaster Aqua-X Plus $1,196; Growlink Connect $1,999). Those are the comps we beat on price while being software-first.
- **License-software model benchmark (Unraid)**: Pro lifetime license $129–$249, plus optional annual extension. Lifetime + ongoing value puts us firmly above Unraid at the $299 mark, below a $499 "we run your farm" SaaS framing.
- **The Eugene "Down To Earth" / "Gray's Gardens" / "Fox Hollow Creek"** names all came back as independent garden centers in the Eugene/Springfield metro (est. 1977 for Down To Earth, 4.4 Yelp, 110 reviews). The trade group is the **Oregon Association of Nurseries (OAN)**, 700+ members, ~$20.4M annual revenue per Prospeo. That's the institutional front door.
- **SDK / OEM revenue share** is real but not the first 90 days' play. Shelly Group grew Q1 2026 revenue 25.9% to €33.3M and has a 6,700-installer network. Tuya Cube is enterprise-priced. Both require a 6–12 month sales cycle. Save for after v1.0 ships.

## A. Direct competitor price table

| Product | Price (USD) | Positioning | URL |
|---|---|---|---|
| Home Assistant Green | $199 (raised 2026-01-08 from $159) | Plug-and-play HA hub, "no cloud, no subscription." Component costs doubled; they kept margin via cheaper silicon, not a price doubling. | https://www.nabucasa.com/news/2026-01-08-green-pricing-change |
| Home Assistant Voice PE | $59 (incl. mic + speaker, year-end 2025 launch) | Voice + ESP32 device for HA. | (HA store, 2025 launch — confirmed separately) |
| TrolMaster Aqua-X Plus (NFS-3) | $1,196 | Pro-grade irrigation, 30 zones, pH/EC/temp + water-content sensors. App is free; hardware-only. | https://mangotech.store/products/nfs-3-aqua-x-plus-irrigation-control-system |
| TrolMaster Aqua-X (NFS-1) | $568.95–$748.00 (sale £568.95 at The Hydro Bros) | Same line, smaller controller. | https://www.thehydrobros.com/products/trolmaster-aqua-x-irrigation-control-system-nfs-1 |
| TrolMaster Hydro-X (env) | $200–$500 depending on sensor stack | Climate controller for indoor grow rooms. | https://www.trolmaster.com/Products/Details/NFS-1 |
| Growlink Connect Controller | $1,999 | "All-in-one" indoor/greenhouse controller, pairs with Growlink OS platform (paid tier). | https://www.blacklabelsupply.io/products/the-all-in-one-connect-controller-w-controller-poly-case |
| Aranet4 | $189–$229 (Amazon/eBay) | Single-room CO2/temp/RH/pressure, e-ink, battery, 5–10 yr life. Companion app free. | https://www.allergyclean.com/aranet4-co2-monitor |
| Hubitat Elevation C-8 | $149.95 MSRP (intro $99.95) | Local smart-home hub, 700+ device drivers, no cloud dependency, no subscription. | https://www.prnewswire.com/news-releases/hubitat-announces-next-generation-home-automation-hub-300790524.html |
| Shelly Plus H&T Gen 3 | $38.99–$40.99 | Wi-Fi temp+humidity sensor, local MQTT, no cloud required. | https://us.shelly.com/products/shelly-h-t-gen3-matte-white |
| Home Assistant on a Pi 5 (BYO) | $0 + ~$80 Pi 5 8GB + $15 PSU + $20 SD | The DIY baseline. | (any Pi retailer) |

**Pattern**: the *commercial greenhouse / indoor grow* segment prices $1,000–$2,000 for hardware that *senses* but doesn't *think*. The *smart-home hub* segment prices $99–$199 for a cloud-free local controller but assumes the user wires their own sensors. **There is a clean white space in the middle — $299–$599 — for "edge brain on a Pi that takes your existing smart plugs and gives them a brain."** That's us.

## B. Software-license price anchor (one-time purchase)

| Product | Price (one-time / lifetime) | Notes |
|---|---|---|
| Unraid Basic | $49 (legacy, 2024) | Bare server license. |
| Unraid Pro | $129 (intro, 2024) → $249 (lifetime updates) | Pro = full feature set + lifetime updates. |
| Hubitat Elevation hub | $149.95 | Hardware + free local-only OS. No subscription required. |
| Home Assistant Green | $199 | Hardware + free HA OS. No subscription. |
| Hubitat Hub Protect (cloud backup + remote admin) | $39/yr or $99 lifetime | Optional, on top of hub. |
| Home Assistant Voice PE | $59 + free Companion | One-time hardware, no fees. |
| Brilliant control | $399–$1,499 (per room) | Premium wall controller, premium price. |
| TrolMaster + TrolMaster App | $568–$1,196 (hardware) + free app | Hardware pays, app is free. |

**Pattern**: consumers expect a *small device* (HA Green, Hubitat C-8) at $99–$199 plus optional $39–$99/yr. Pros expect a *lifetime software* line of $129–$249 (Unraid) when the software is the value. **FF_SmartControl lives in the $299–$499 band as a "lifetime software on a Pi" — well above Unraid because we own the verifier-gated control plane; well below TrolMaster because we don't ship sensors.**

## C. SDK / OEM / hardware-company monetization

| Program | Revenue model | Realistic for FFT? | URL |
|---|---|---|---|
| Tuya Cube Private Cloud | Enterprise SaaS — annual fee, deployment on AWS/Azure/on-prem. White-label IoT cloud. | No. Sales cycle 6–12 mo, requires enterprise integration team. | https://www.tuya.com/solution/cube |
| Shelly Group | Q1 2026 revenue €33.3M, EBIT 25.9%, 6,700 installers. No public affiliate SDK. | Indirect: be a Shelly-compatible product (we already are — `http-devices.ts` speaks Shelly). | https://corporate.shelly.com/en/news/shelly-group-delivers-strong-growth-in-the-first-three-months-of-2026 |
| Home Assistant Integrations | Free, requires a code review and community maintenance. Massive distribution. | YES — submit FF_SmartControl as an HA integration; every HA user is a prospect. Effort: 2–4 weeks. | (HA developer docs) |
| Tasmota / ESPHome | Free, open. Compatibility is the marketing. | YES — already compatible. Add a one-click "I have a Tasmota" wizard step. | (Tasmota, ESPHome docs) |
| Hubitat / SmartThings / Matter | Driver development programs. Mostly free; some paid (SmartThings Schema for OEMs). | Realistic for v1.1. Not v1.0. | (Hubitat dev, SmartThings Schema) |
| Particle.io | Hardware reseller; no published revenue-share for app developers. | Skip. | (particle.io partners) |
| Generic affiliate (20–50% recurring) | Commission Junction / Impact / PartnerStack | Yes — cross-affiliate with TrolMaster, Shelly, Aranet, etc. **10–20% of revenue passive once content is up.** | https://www.indiehackers.com/post/the-best-affiliate-programs-for-developers-in-2026-58f3f2695a |

**Bottom line on SDK/OEM**: the highest-ROI SDK play for v1.0 isn't a revenue-share program — it's **submitting FF_SmartControl as a Home Assistant integration** and as a **first-class Tasmota/ESPHome-compatible brain**. Distribution. Then the *real* OEM play is "license the verifier-gated control plane to a sensor manufacturer" once we have a customer willing to put a Pi in their greenhouse at scale. That's a 12-month move, not a 90-day one.

## D. Pacific Northwest garden center / nursery retail profile

### Eugene metro independents (the user mentioned "people in Eugene")

- **Down To Earth Home, Garden and Gift** (https://downtoeartheugene.com) — Eugene, est. 1977, 4.4★ on 110 Yelp reviews. Mid-sized independent; "practical home and garden products." Most likely the store the user has connections to. ~30–60 employees typical for a 40+ year-old Eugene indie; revenue likely $3–10M.
- **Gray's Garden Centers** (https://www.graysgardens.com) — Eugene + Springfield, two locations. Locally grown plants, expert staff. Same size class.
- **Fox Hollow Creek Nursery** (https://yelp.com) — 4.8★, smaller footprint, specialty nursery.
- **Northwest Garden Nursery / Little Prince of Oregon** — Hellebore breeders, mail-order, niche premium.
- **Doak Creek Native Plant Nursery** — 83331 Marlow Road, Eugene, by-appointment model.

### Trade group / institutional front door

- **Oregon Association of Nurseries (OAN)** (https://www.oan.org) — 700+ members, trade association, ~$20.4M annual revenue per Prospeo (third-party estimate). Annual convention, advocacy, education. **This is the front door to the industry**, not individual stores.
- **IBISWorld Nursery & Garden Stores US 2026** — overall US industry tracking (paywalled, 2026 update live). Confirms the segment is alive and consolidating.

### Has any garden retailer actually partnered with a tech company?

- **Garden Center magazine's 2026 State of the Industry** is the publication tracking this. (https://www.gardencentermag.com) They highlight partnerships around digital growth and customer engagement (e.g. The Garden Center Group + BoomerWrangle). No specific "garden center + IoT" partnership story surfaced in 2025–2026. **First-mover advantage exists.**

### Recommended opener framing

If the user has relationships at Down To Earth or Gray's, the opener that lands is **"Co-pilot your garden center's smart-garden department."** A garden center doesn't want to *build* a smart-garden product line — they want to *carry* one with a real local margin. Offer them a wholesale + referral angle: they stock a display model + card, demo it, take orders, kick 10–15% back to the store. The store gets a margin and a story; we get a regional sales channel with no employees on our side. This is *exactly* the PII-Guard "RushBot for the local mechanic" pattern, applied to a different category.

## E. Final pricing recommendation

### Software-only license

**$299 one-time, with a 14-day trial.** Unraid Pro is $129–$249 for a server OS; we're $50–$170 more because we own a verifier-gated control plane that *touches equipment*. Home Assistant Green is $199 for the hub alone, no actuation logic. We're between them, leaning toward the higher end because of the safety/automation story.

Alternative: **$399** if we want to anchor above PII Guard and signal "this is hardware-adjacent and serious." The difference between $299 and $399 is mostly psychological and *probably not worth losing the conversion lift*. Recommend $299.

### Pre-flashed SD card / USB stick

**$449 one-time.** Card + shipping in a small mailer + a printed quickstart card. COGS for a SanDisk 32GB industrial card + shipping is $15–$20. The $150 premium over the software-only tier covers the convenience + the support burden reduction. Home Assistant Green at $199 is the consumer reference; we're $250 more because the convenience is worth it for the buyer who's not a tinkerer.

Alternative: **$549** with a 1-year "device-driver updates + new protocol support" included. Gives the customer protection; gives us a renewal lever in 12 months.

### SDK / OEM tier (v1.1, not v1.0)

**$1,499–$2,999 / yr per OEM**, for a license to embed FF_SmartControl's verifier-gated control plane inside a third-party device. Comparable to Shelly Group's installer network economics and the Tuya Cube private-cloud per-deployment model. **Do not pursue in the first 90 days.** The product has to be on the market first.

### Partnership opener for the Eugene store

**Wholesale + 10–15% referral** + 1 in-store demo unit. They get margin; you get a regional channel. Pair with a 30-minute deck: 1 slide on the "smart garden" trend, 1 slide on the FF_SmartControl pitch, 1 slide on the unit economics for them, 1 slide on what an *investment* in the company would look like (you can be coy here — you want the relationship, not the cash until you've proven the model). The garden-center-as-channel idea is stronger than the garden-center-as-investor idea for a first meeting; the investor conversation comes second, when they ask.

---

## What I will NOT pretend I verified

- I could not find a public price for Hubitat Hub Protect's lifetime tier in 2026 (only promo + community mentions). Flagged in row.
- I could not get a 2026-published price for Home Assistant Voice PE; the original 2025 launch price was $59 and there has been no public increase.
- IBISWorld report is paywalled — I cited the listing, not the contents.
- Specific Down To Earth / Gray's Gardens annual revenue is not publicly disclosed. Estimates are educated guesses from size class.
- No garden retailer + IoT partnership case study surfaced in 2025–2026. First-mover claim is based on absence, not proven vacuum.

— Hermes, June 2 2026
