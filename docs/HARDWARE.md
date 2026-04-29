# FarmPal Hardware Guide

**Audience: Users setting up physical equipment | Reading Level: Grade 8**

This guide covers wiring for the most common FarmPal hardware setups. Always follow electrical safety guidelines — if you are not sure, ask a qualified electrician.

---

## Understanding the Basics

### What is GPIO?
**GPIO** stands for **General Purpose Input/Output**. These are pins on the Raspberry Pi computer that can send or receive electrical signals. You use GPIO pins to connect sensors and relays.

### What is a Relay?
A **relay** is an electrically operated switch. When FarmPal sends a signal to the relay, the relay turns a connected device (like a light or pump) on or off.

### What is I2C?
**I2C** is a communication protocol (a language computers use to talk to devices). Many sensors use I2C to send data to the Pi.

### What is Serial (UART)?
**Serial** is another way devices communicate. USB sensors often use serial communication.

---

## Supported Hardware

FarmPal officially supports these devices ("Tier 1" — fully tested):

| Device Type | Examples | Connection |
|---|---|---|
| Temperature/Humidity/Pressure | BME280 | I2C or Serial |
| Soil Temperature | DS18B20 | 1-Wire |
| USB Relay Board | 8-channel USB relay | USB |
| Camera | USB webcam, Pi Camera Module 3 | USB or CSI |
| Smart Plug | Tasmota, Shelly | WiFi/Ethernet |

---

## Wiring Diagrams

### 🔴 IMPORTANT: Electrical Safety

**Before wiring anything:**
1. **Turn off power** to all devices
2. **Disconnect the Pi** from power
3. Wear an anti-static wrist strap if you have one
4. Never work on wiring while the circuit is live

**Warning:** Miswired relays can damage your Pi or cause fires. Double-check all connections before turning power back on.

---

## BME280 Temperature/Humidity/Pressure Sensor

The BME280 is a popular 3-in-1 sensor that measures:
- Temperature (how warm/cold)
- Humidity (moisture in the air)
- Pressure (air pressure)

### Wiring: I2C Connection

**Parts needed:**
- BME280 sensor module
- 4 female-to-female jumper wires
- (Optional) 4.7kΩ pull-up resistors

**Pin connections:**

```
BME280 Module     Raspberry Pi
─────────────     ────────────
VCC (or 3.3V)  →  Pin 1 (3.3V power)
GND           →  Pin 6 (Ground)
SDA           →  Pin 3 (GPIO 2 / SDA)
SCL           →  Pin 5 (GPIO 3 / SCL)
```

**To find the right pins on your Pi:**
Look at the corner of the Pi board. The pins are numbered starting from the top-left:

```
  3.3V  (1) (2)  5V
  GPIO2 (3) (4)  5V
  GPIO3 (5) (6)  GND
  GPIO4 (7) (8)  GPIO14
  GND   (9)(10) GPIO15
  ...
```

### Wiring: Serial Connection

Some BME280 modules use serial (TX/RX) instead of I2C:

```
BME280 Module     Raspberry Pi
─────────────     ────────────
VCC           →  Pin 1 (3.3V power)
GND           →  Pin 6 (Ground)
TX            →  Pin 10 (GPIO15 / RX)
RX            →  Pin 8 (GPIO14 / TX)
```

---

## DS18B20 Soil Temperature Sensor

The DS18B20 measures soil temperature. It uses the 1-Wire protocol, which lets you connect multiple sensors on just 2 wires.

### Wiring

**Parts needed:**
- DS18B20 temperature sensor (waterproof probe style recommended)
- 4.7kΩ pull-up resistor
- 2-3 female-to-female jumper wires

**Pin connections:**

```
DS18B20 Probe      Raspberry Pi
─────────────      ────────────
Red wire (VCC)   →  Pin 1 (3.3V power)
Black wire (GND) →  Pin 6 (Ground)
Yellow/White    →  Pin 7 (GPIO 4)
                ↑
         [4.7kΩ resistor between
          VCC and Data wires]
```

**Daisy-chaining multiple DS18B20 sensors:**
You can connect multiple DS18B20 sensors in parallel (all on the same 3 wires). Each sensor has a unique ID that FarmPal uses to tell them apart.

---

## USB Relay Board (8-Channel)

A USB relay board lets FarmPal control 8 separate devices (lights, pumps, fans, etc.). Each relay is an independent switch.

### Setup

1. Connect the USB relay board to any USB port on the Pi
2. FarmPal will detect it automatically — no wiring needed
3. Each relay has 3 screw terminals:
   - **NC** (Normally Closed) — connected when relay is OFF
   - **COM** (Common) — the middle terminal, connected to your device
   - **NO** (Normally Open) — connected when relay is ON

### Wiring a Device (e.g., a grow light)

```
Power Source (120V/240V) ─── COM terminal ─── Grow Light ─── NC terminal
                                   ↑
                              Relay Switch
                              (controlled by
                               FarmPal)
```

**When the relay is OFF:** COM connects to NC — light is OFF
**When the relay is ON:** COM connects to NO — light is ON

### ⚠️ WARNING: High Voltage

**Never connect high voltage (120V or 240V) directly to the Pi.**
The relay board isolates (separates) the low-voltage Pi side from the high-voltage device side. This is safe.

**Always use the relay board's screw terminals for high-voltage connections.**

---

## GPIO Pinout Reference

### Raspberry Pi 5 / 4 GPIO Header

```
    3.3V  (1) (2)  5V
   GPIO2  (3) (4)  5V
   GPIO3  (5) (6)  GND
   GPIO4  (7) (8)  GPIO14 (UART TX)
     GND  (9)(10) GPIO15 (UART RX)
  GPIO17 (11)(12) GPIO18
  GPIO27 (13)(14) GND
  GPIO22 (15)(16) GPIO23
    3.3V (17)(18) GPIO24
  GPIO10 (19)(20) GND
   GPIO9 (21)(22) GPIO25
  GPIO11 (23)(24) GPIO8
     GND (25)(26) GPIO7
   GPIO0 (27)(28) GPIO1
   GPIO5 (29)(30) GND
   GPIO6 (31)(32) GPIO12
  GPIO13 (33)(34) GND
  GPIO19 (35)(36) GPIO16
  GPIO26 (37)(38) GPIO20
     GND (39)(40) GPIO21
```

### Safe GPIO Pins

**Recommended for sensors (input):** GPIO 4, 17, 27, 22, 5, 6, 13, 19, 26
**Recommended for relays (output):** GPIO 23, 24, 25, 12, 16, 20, 21

**Pins to avoid (have special functions):**
- GPIO 0, 1 (used for EEPROM)
- GPIO 2, 3 (used for I2C)
- GPIO 14, 15 (used for serial/UART console)

---

## Power Supply Requirements

### Raspberry Pi Power

| Pi Model | Minimum Power | Recommended |
|---|---|---|
| Pi 5 | 5V / 3A (15W) | 5V / 5A (25W) official Pi supply |
| Pi 4 | 5V / 3A (15W) | 5V / 3A official Pi supply |
| Pi 3 | 5V / 2.5A | 5V / 2.5A official Pi supply |

**Use the official Raspberry Pi power supply.** Cheap third-party supplies can cause random reboots and data corruption.

### USB Peripherals Power Budget

The Pi's USB ports share a limited amount of power:

| Pi Model | Total USB Power Budget |
|---|---|
| Pi 5 | 5V / 3A shared across all USB ports |
| Pi 4 | 5V / 1.2A shared across all USB ports |

**Tip:** If you have many USB devices (relay boards, cameras, external drives), use a **powered USB hub** to offload the power demand.

---

## Enclosure Requirements

FarmPal should be housed in an enclosure that protects it from:
- Dust and dirt (at least IP54 rating recommended)
- Water and humidity
- Extreme temperatures

### Recommended Enclosure Specifications

| Requirement | Specification |
|---|---|
| Material | ABS plastic or metal |
| IP Rating | IP54 minimum (dust tight, splash resistant) |
| Temperature Range | -10°C to 50°C operating |
| Vents | With fans or filters for airflow |
| Cable Entries | Grommets or cable glands for wiring |
| Mounting | DIN rail or wall mount |

### Enclosure Setup

1. Mount the Pi inside the enclosure using standoffs or DIN rail clips
2. Route cables through grommets (not loose openings)
3. Keep low-voltage wiring (sensors) separate from high-voltage wiring (relays)
4. Add desiccant packs inside if humidity is a concern
5. Seal the enclosure and verify no gaps

---

## Grounding

**Why grounding matters:** Proper grounding protects your equipment from electrical damage and reduces interference with sensor readings.

### Grounding Checklist

- [ ] The Pi's metal case (if using a metal case) is grounded through the power supply ground
- [ ] Sensor shield wires are grounded at one end only
- [ ] The relay board's ground wire is connected to the Pi's ground
- [ ] High-voltage equipment grounds are connected to your building's ground system

---

## Ethernet Cable Length

| Cable Type | Maximum Length |
|---|---|
| Cat5e | 100 meters |
| Cat6 | 100 meters |
| Cat6a | 100 meters |

For longer runs or noisy electrical environments, use shielded (STP) cables.

---

## Quick Wiring Checklist

Before turning on power, verify:

- [ ] All VCC/3.3V connections are correct
- [ ] All GND (ground) connections are correct
- [ ] No loose wires touching the wrong pins
- [ ] No wire bridges between adjacent pins
- [ ] All wire ferrules/crimp connectors are secure
- [ ] Power supply is adequate for all connected devices
- [ ] Enclosure is sealed (if using outdoors)

---

## Getting Help

For additional support:
- Visit [farmpal.io/support](https://farmpal.io/support)
- Email: support@farmpal.io

*Always disconnect power before working on wiring. When in doubt, consult a qualified electrician.*
