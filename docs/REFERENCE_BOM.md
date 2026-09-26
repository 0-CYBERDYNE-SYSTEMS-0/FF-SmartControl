# FarmPal v1.0 Reference BOM — the "golden kit"

> **This is a reference list only. FarmPal stocks zero inventory and sells no
> hardware.** The golden kit is the **customer's purchase** — any equivalent
> off-the-shelf part works. This list exists so the discovery wizard's presets,
> the docs, and the v1.0 smoke test all describe the same validated set of
> devices (DIRECTION.md D3; ship-gate item 6).

Prices are rough USD street prices at the time of writing and will drift;
treat them as bands, not quotes.

## Host (required, one of each)

| Item | Role | Protocol | Price band (USD) | Wizard preset |
| --- | --- | --- | --- | --- |
| Raspberry Pi 5 (8GB) | FarmPal host — runs the SD card image | — (Ethernet/WiFi) | $75–$95 | n/a (host) |
| 64GB microSD card (A2-class) | Boot media for the FarmPal image | — | $10–$15 | n/a (host) |

Any Linux box works in place of the Pi (x86 or ARM). A pre-flashed 64GB card
is what the $449 SKU ships.

## Golden kit devices (the plugs and sensors the presets ship for)

| Item | Role | Protocol | Price band (USD) | Wizard preset (`src/hal/device-presets.ts`) |
| --- | --- | --- | --- | --- |
| Tasmota smart plug (e.g. Sonoff S31 flashed) | Lights / fans / pumps — relay + watts | HTTP (`tasmota`) | $10–$20 | `tasmota_plug` (scan: HTTP / Tasmota) |
| Shelly Plug / Plug S | Lights / fans / pumps — relay + watts | HTTP (`shelly`) | $15–$30 | `shelly_plug` (scan: HTTP / Shelly) |
| Kasa smart plug (HS103 / EP10 class) | Third plug ecosystem for mixed fleets | Kasa CLI (`kasa`) | $10–$20 | `kasa_plug` (add manually by IP) |
| Capacitive soil-moisture probe | The watering-gate sensor (D6) | Serial bridge (`serial`) | $10–$25 | `soil_moisture_probe` (scan: Serial) |
| Temp/humidity sensor (BME280 / SHT31 breakout) | Climate baseline | Serial bridge (`serial`) | $5–$20 | `temp_humidity_sensor` (scan: Serial) |

## Optional golden-kit extensions

| Item | Role | Protocol | Price band (USD) | Wizard preset |
| --- | --- | --- | --- | --- |
| CO2 sensor (SCD30/SCD40 or MH-Z19 class) | CO2 trend + exhaust suggestions | Serial bridge (`serial`) | $30–$70 | `co2_sensor` (scan: Serial) |
| Relay board (4-channel, 5V, opto-isolated) | Non-plug loads via GPIO | GPIO (`gpio`, pigpiod) | $8–$15 | `relay_board` (scan: GPIO) |

Core kit (host + required devices): roughly **$135–$225** all-in, purchased by
the customer from any retailer.

## Honest support status

The wizard presets and this BOM describe what the discovery wizard ships
presets **for** — they do not upgrade the SPEC.md hardware truth table. As of
this document: Tasmota/Shelly-gen1 HTTP is the working path; MQTT is
client-only pending a real-broker soak; DS18B20-class serial sensors and GPIO
relays are plausible-but-unexercised or scaffold. Update the truth table with
every integration that passes an unattended soak.

## Watering note (D6)

Watering control in v1.0 is gated on the soil-probe golden kit passing its
7-day soak (`FARMPAL_WATERING` flag, default off). If the customer already
runs smart irrigation — valves or pumps on smart plugs or relays — FarmPal
drives that existing hardware as-is; no new hardware category. See
`docs/SAFETY.md` for the recommended watering safety rule.
