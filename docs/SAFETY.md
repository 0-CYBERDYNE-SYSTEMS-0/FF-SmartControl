# FarmPal Safety Guide

**Audience: All operators | Reading Level: Grade 8 | ⚠️ Contains critical safety information**

FarmPal controls electrical equipment. Improper use can result in fire, electric shock, property damage, or injury. Read this guide completely before installing or operating FarmPal.

---

## ⚠️ IMPORTANT SAFETY WARNINGS

### Electrical Hazards

**DANGER: Electric Shock Risk**

- FarmPal's Raspberry Pi runs on **low voltage (5V DC)** — this part is safe to touch
- Connected equipment (grow lights, pumps, fans) may run on **high voltage (120V or 240V AC)** — this can kill you
- **Never** work on high-voltage wiring while the circuit is live
- **Always** turn off power at the breaker before working on any high-voltage circuit
- Use properly rated tools and equipment
- If you are not qualified to work with high voltage, **hire a licensed electrician**

**What "high voltage" means in this guide:**
Anything over 50V AC or DC is considered hazardous. Standard US household outlets are 120V. European outlets are 230V.

### Fire Hazards

**WARNING: Fire Risk**

- Overloaded circuits can overheat and cause fires
- Defective wiring can cause arcing and fires
- Do not use damaged cables or connectors
- Do not exceed the current rating of any relay or wire
- Keep flammable materials away from electrical equipment
- Install smoke detectors near your growing area
- Check your wiring regularly for signs of wear, heat damage, or corrosion

### Equipment Damage

- Use only the power supply included with your Raspberry Pi
- Use only approved USB devices
- Do not connect devices that draw more power than the Pi can supply
- Protect the Pi from moisture, dust, and extreme temperatures

---

## Grounding Requirements

**What is grounding?**
Grounding provides a safe path for electricity to flow if something goes wrong. Without proper grounding, a fault in your equipment could make the外壳 (enclosure/case) "live" with 120V — dangerous to touch.

### Proper Grounding Checklist

| Item | Requirement |
|---|---|
| Raspberry Pi | Use the official power supply (has a grounded plug) |
| Metal enclosures | Must be connected to your building's ground system |
| Sensor shields | Ground at one end only (not both) |
| USB devices | Use grounded USB hubs when available |
| Relay board | Ground wire must connect to Pi's ground |
| High-voltage equipment | Must have its own ground wire to the breaker panel |

### How to Verify Grounding

1. Use a multimeter set to continuity (Ω / resistance)
2. Place one probe on a metal part of the enclosure
3. Place the other probe on the ground pin of the power plug
4. The meter should read near 0 ohms (good ground)
5. If the meter reads "OL" (open loop / no connection), grounding is missing

---

## IP Ratings Explained

**What is an IP rating?**
IP stands for **Ingress Protection**. The IP rating tells you how well a device is protected against dust and water.

### Reading an IP Rating

```
IP  [Dust Protection]  [Water Protection]
    0-6                0-9K
```

| Dust (first digit) | Meaning | Water (second digit) | Meaning |
|---|---|---|---|
| 0 | No protection | 0 | No protection |
| 1 | >50mm objects | 1 | Dripping water |
| 2 | >12.5mm objects | 2 | Dripping water (tilted) |
| 3 | >2.5mm objects | 3 | Spraying water |
| 4 | >1mm objects | 4 | Splashing water |
| 5 | Dust protected | 5 | Water jets |
| 6 | Dust tight | 6 | Powerful water jets |
| 7 | — | 7 | Immersion (30 min) |
| 8 | — | 8 | Submersion (continuous) |
| 9K | — | 9K | High-pressure/steam cleaning |

### FarmPal IP Requirements

| Location | Minimum IP Rating |
|---|---|
| Indoor, clean environment | IP20 (touch protected, no water) |
| Indoor, dusty/grow tent | IP54 (dust tight, splash resistant) |
| Greenhouse | IP65 (dust tight, water jet resistant) |
| Outdoor, covered | IP65 minimum |
| Outdoor, exposed | IP67 (temporary immersion) |

**Important:** IP ratings are for fresh water. Saltwater and chemicals may cause damage even at high IP ratings.

---

## Environmental Limits

| Condition | Operating Range | Storage Range |
|---|---|---|
| Temperature | -10°C to 50°C (14°F to 122°F) | -20°C to 60°C (-4°F to 140°F) |
| Humidity | 10% to 80% non-condensing | 5% to 95% non-condensing |
| Altitude | Up to 3,000m (10,000 ft) | Same |

**Exceeding these limits can cause:**
- Unreliable sensor readings
- System crashes or freezes
- Permanent damage to components
- Fire or electrical hazard

---

## Relay Safety Limits

Each relay on a relay board has two ratings:

### Electrical Rating (usually printed on the relay module)
| Rating | What It Means |
|---|---|
| AC Voltage | Maximum AC voltage the relay can switch (e.g., 250V AC) |
| AC Current | Maximum AC current the relay can switch (e.g., 10A) |
| DC Voltage | Maximum DC voltage the relay can switch (e.g., 30V DC) |
| DC Current | Maximum DC current the relay can switch (e.g., 10A) |

**⚠️ WARNING:** AC and DC ratings are different. A relay rated for "10A 250V AC" does NOT necessarily handle "10A 30V DC." DC relays handle DC, AC relays handle AC.

### Safe Operating Rules

1. **Never exceed the relay's rated voltage or current**
2. **Add a 20% safety margin** — if a device draws 8A, use a relay rated for at least 10A
3. **For inductive loads** (motors, pumps, compressors) — use a relay rated for 3-5x the device's running current (inrush current is much higher)
4. **Use properly sized wire** — undersized wire heats up and can cause fire

### Wire Gauge Reference

| Current | Minimum Wire Gauge (copper) |
|---|---|
| 5A | 20 AWG |
| 10A | 18 AWG |
| 15A | 16 AWG |
| 20A | 14 AWG |
| 30A | 12 AWG |

---

## Emergency Stop

FarmPal has an **Emergency Stop (E-Stop)** button in the dashboard header. This immediately:
1. Stops all autonomous decisions
2. Sets all relays to their configured safe states
3. Shows a red "EMERGENCY STOP ACTIVE" banner

**When to use E-Stop:**
- You smell burning or see smoke
- A device is behaving dangerously
- Water is leaking near electrical equipment
- You see any unsafe condition

**How to clear E-Stop:**
1. Fix the unsafe condition
2. Click **Clear Emergency Stop** in the red banner
3. Confirm with your admin password

---

## Safe States

Each relay should have a configured "safe state" — what it does when FarmPal shuts down safely or when E-Stop is triggered.

| Device | Safe State |
|---|---|
| Grow lights | OFF |
| Water pump | OFF |
| Exhaust fan | ON (keeps air moving) |
| CO₂ valve | OFF (closes) |
| Heating element | OFF |

**Configure safe states in:** Settings → Devices → [select device] → Safe State

---

## Routine Safety Checks

Perform these checks monthly:

### Visual Inspection
- [ ] No visible damage to cables, plugs, or connectors
- [ ] No signs of overheating (discoloration, melting, burning smell)
- [ ] No corrosion on terminals or connectors
- [ ] Enclosure is sealed and undamaged
- [ ] Cable glands and grommets are properly seated

### Electrical Checks
- [ ] All grounds are secure
- [ ] No warm or hot cables or devices
- [ ] No buzzing or humming from electrical equipment
- [ ] Circuit breakers are not warm

### Functional Checks
- [ ] E-Stop button works and all relays go to safe states
- [ ] FarmPal restarts cleanly after a power loss
- [ ] Sensors are reading within expected ranges

---

## What FarmPal Cannot Do

FarmPal is a tool to help manage your growing environment. It is **not a substitute for:**

- Human oversight and judgment
- Regular safety inspections
- Proper electrical installation by qualified persons
- Local building codes and regulations
- Insurance requirements

**You are responsible for the safe operation of your equipment.**

---

## Compliance and Standards

FarmPal is designed to comply with:
- **CE Marking** (European safety requirements)
- **FCC Part 15** (US electromagnetic interference)
- **RoHS** (restriction of hazardous substances)

Your installation must also comply with:
- Local electrical codes
- National Electrical Code (NEC) in the US
- IEE Regulations in the UK
- Relevant regional standards

---

## Support Contact

**For safety questions, hardware issues, or emergency support:**

🌐 Website: [farmpal.io/safety](https://farmpal.io/safety)
📧 Email: safety@farmpal.io
📞 Support: [farmpal.io/support](https://farmpal.io/support)
🕐 Hours: Monday–Friday, 9 AM – 5 PM (your local timezone)

**For immediate electrical emergencies, contact:**
- US/Canada: Call 911 and your local utility
- UK: Call 999 and your regional electricity provider
- Other regions: Contact your local emergency services

---

## Summary: Your Safety Responsibilities

As the equipment operator, you are responsible for:

1. ✅ Proper installation by qualified persons
2. ✅ Using equipment within rated specifications
3. ✅ Regular safety inspections
4. ✅ Keeping the area around equipment clear
5. ✅ Responding appropriately to alarms and alerts
6. ✅ Maintaining proper grounding
7. ✅ Using properly rated circuit protection (breakers, fuses)
8. ✅ Keeping emergency contact information posted

**If you are ever unsure about safety, stop and ask a qualified professional.**

---

*FarmPal is designed to make growing easier and safer. By following these guidelines, you can enjoy the benefits of automated growing while minimizing risks.*
