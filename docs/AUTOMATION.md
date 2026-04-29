# FarmPal Automation Guide

**Audience: Operators using autonomous control | Reading Level: Grade 8**

FarmPal can run your grow environment automatically. This guide explains how automation works, how to configure it, and how to stay safe.

---

## What is Automation?

**Automation** means FarmPal makes decisions and takes actions without asking you first.

Instead of you watching the temperature and manually turning on the fan, FarmPal:
1. Checks the temperature sensor
2. Compares it to your settings
3. Turns on the fan if needed
4. Logs the decision

This runs 24/7, even when you are asleep.

---

## The Four Modes

FarmPal has four modes that control how much automation is active.

### Mode 1: Observe Only

**What it does:** FarmPal watches and records. Nothing happens automatically.

**When to use it:**
- You want to collect data before automating
- You are troubleshooting and want to see what is happening
- You want full manual control

**What you see:** Sensor readings and logs, but no device actions.

---

### Mode 2: Suggest

**What it does:** FarmPal watches and makes suggestions. Nothing happens automatically.

**When to use it:**
- You want to review FarmPal's ideas before they happen
- You want to approve or reject each decision

**What you see:** Pending suggestions appear in the Decisions view with status **"Pending Review."** You can approve or dismiss each one.

---

### Mode 3: Assisted Control

**What it does:** FarmPal proposes actions, waits briefly, then acts — unless you stop it.

**When to use it:**
- You want automation but with a safety net
- You want to see what FarmPal is planning

**How it works:**
1. FarmPal makes a decision
2. A notification appears: "FarmPal plans to turn on the fan in 30 seconds"
3. If you do nothing, the action happens after 30 seconds
4. If you click **Cancel**, the action is blocked

---

### Mode 4: Autonomous Control

**What it does:** FarmPal acts immediately without waiting.

**When to use it:**
- You trust the automation and want full hands-off operation
- You have tested the system and it is working correctly

**What you see:** Actions happen automatically. You see the results in the Decisions log.

---

## How to Change the Mode

1. Click the **mode badge** in the header (shows GROW, HARVEST, or MONITOR)
2. A menu shows the four modes:
   - Observe Only
   - Suggest
   - Assisted Control
   - Autonomous Control
3. Click your chosen mode
4. The badge color and the UI accent color change

**Note:** You need admin access to change modes.

---

## What FarmPal Controls Automatically

In Autonomous or Assisted mode, FarmPal can manage:

| Category | Examples |
|---|---|
| **Lighting** | Turn grow lights on/off based on schedule |
| **Irrigation** | Water plants based on soil moisture |
| **Ventilation** | Turn fans on/off based on temperature |
| **CO₂** | Add CO₂ based on levels |
| **Heating/Cooling** | Control heaters or AC based on temperature |

FarmPal only acts on devices you have configured and assigned to automation.

---

## Setting Up Automation

### Step 1: Add Your Devices

Before FarmPal can automate anything, you need to add your devices.

1. Go to the **Devices** tab
2. Click **Add Device**
3. Choose your device type and follow the instructions
4. Give each device a clear name (e.g., "Tent 1 Light", "Soil Sensor 1")

### Step 2: Configure Thresholds

**Thresholds** are the trigger points for automated actions.

**Example threshold:** "If temperature goes above 30°C, turn on the exhaust fan."

1. Go to **Settings** → **Automation**
2. Find the device you want to automate
3. Set your threshold values:
   - **Min value** — trigger when reading goes below this
   - **Max value** — trigger when reading goes above this

**Threshold examples:**

| Goal | Threshold Setting |
|---|---|
| Keep temperature between 22°C and 28°C | Min: 22°C, Max: 28°C |
| Water when soil is dry | Min: 30% moisture |
| Turn off lights at night | Schedule-based (not threshold-based) |

### Step 3: Create Automation Rules

A rule connects a threshold to an action.

**Example rule:** "If temperature > 28°C, turn on exhaust fan."

1. Go to **Settings** → **Automation** → **Rules**
2. Click **Add Rule**
3. Choose the **trigger** (e.g., "Temperature above 28°C")
4. Choose the **action** (e.g., "Turn on exhaust fan")
5. Choose what happens when conditions return to normal (e.g., "Turn off exhaust fan")
6. Click **Save**

### Step 4: Test Your Rules

Before relying on automation:

1. Set the mode to **Suggest** first
2. Watch the Decisions view for proposed actions
3. If everything looks correct, switch to **Assisted Control**
4. After a day of successful assisted decisions, switch to **Autonomous**

---

## Safety Policies

Safety policies are rules that **always** block dangerous actions, even in Autonomous mode.

### What Safety Policies Do

Safety policies prevent:
- Turning off ventilation when temperature is dangerously high
- Running irrigation when the soil is already saturated
- Activating devices that could cause damage

**Example safety policy:** "Never turn off the exhaust fan if temperature is above 35°C."

### Default Safety Policies

FarmPal comes with built-in safety policies:

| Policy | What It Blocks |
|---|---|
| **Temperature ceiling** | No device action that would raise temperature above 45°C |
| **Humidity floor** | No action that would raise humidity above 95% |
| **Minimum off time** | A relay cannot be turned back on within 60 seconds of turning off |
| **Maximum activations** | A relay cannot be switched more than 20 times per hour |

### Configuring Safety Policies

1. Go to **Settings** → **Safety**
2. Find the device you want to protect
3. Configure the safety limits:
   - **Max on duration** — how long a device can stay on continuously
   - **Min off duration** — minimum time a device must stay off between activations
   - **Max activations per hour** — how many times a device can switch per hour
   - **Dependency rules** — conditions that must be met for the device to operate

### Dependency Rules

**Dependency rules** are "guardrails" that keep related devices in safe states together.

**Example:** "The exhaust fan must stay on whenever the grow lights are on."

**How to set it:**
1. Go to **Settings** → **Safety** → **Dependencies**
2. Click **Add Dependency**
3. Set: "When [Grow Lights] is [ON], [Exhaust Fan] must be [ON]"

This ensures the fan runs whenever the lights are on, preventing heat buildup.

---

## How Decisions Are Made

FarmPal uses a "Generator/Verifier" system to make decisions safely.

### The Decision Flow

```
1. GENERATOR (AI thinks)
   FarmPal reads all sensor values
   ↓
2. VERIFIER (Safety checks)
   Safety policy engine checks: Is this action safe?
   ↓
3. APPROVED → Execute the action
   OR
3. DENIED → Log the denial, do not act
```

### Why This Matters

- **Generator:** The AI proposes actions based on sensor data
- **Verifier:** A separate safety engine checks every action against the rules — **before** it executes
- If the Verifier says "DENIED," the action never reaches the hardware

This means even if the AI makes a bad suggestion, the safety layer stops it.

---

## Monitoring Automation

### The Decisions Log

Every automated decision is logged in the **Decisions** view. Each entry shows:
- What was decided
- What the sensor readings were at the time
- Why the decision was made
- Whether it was executed or blocked

### Decision Confidence

Each decision shows a **confidence percentage**:
- **High confidence (80–100%)** — FarmPal is very sure this is the right action
- **Medium confidence (50–79%)** — FarmPal has some uncertainty
- **Low confidence (<50%)** — FarmPal is unsure; you may want to review

### Audit Log

For detailed tracking, the **Audit Log** records:
- Every hardware action
- Who/what triggered it (automation or manual)
- Sensor snapshot at the time
- Whether safety was checked (APPROVED or DENIED)
- Device response (success or failure)

Access the Audit Log from **Settings** → **Safety** → **View Audit Log**.

---

## Schedules

As well as threshold-based automation, you can set **schedules** for devices.

### Schedule Example

"Turn on grow lights at 6 AM, turn off at 10 PM."

1. Go to **Settings** → **Automation** → **Schedules**
2. Click **Add Schedule**
3. Choose the device (e.g., Grow Lights)
4. Set the on time (06:00)
5. Set the off time (22:00)
6. Choose which days (e.g., every day, or Mon–Fri)
7. Click **Save**

**Schedules vs. Thresholds:**

| Type | Trigger | Example |
|---|---|---|
| **Threshold** | Sensor reading crosses a value | "Turn on fan when temp > 28°C" |
| **Schedule** | Clock time | "Turn on lights at 6 AM" |
| **Both** | Both conditions must be true | "At 6 AM, if soil is dry, water" |

---

## Emergency Stop and Automation

The **Emergency Stop (E-Stop)** button stops all automation immediately.

When E-Stop is triggered:
- All autonomous decisions are suspended
- All relays go to their configured safe states
- A red banner appears: "EMERGENCY STOP ACTIVE"

**Clearing E-Stop:**
1. Fix the problem
2. Click **Clear Emergency Stop** in the red banner
3. Enter your admin password
4. Automation resumes

**Important:** FarmPal cannot restart autonomous operation after E-Stop without your admin password. This is intentional — it ensures a person checks the situation before resuming.

---

## Best Practices

### Start Conservative

1. **Begin in Observe Only mode** — let FarmPal collect data for a few days
2. **Move to Suggest mode** — review what FarmPal would do
3. **Move to Assisted Control** — let FarmPal act with your oversight
4. **Move to Autonomous Control** — only after the system has proven reliable

### Watch the Decisions Log

Check the Decisions log daily at first. Look for:
- Decisions that were DENIED (blocked by safety)
- Decisions that failed (hardware did not respond)
- Patterns that seem wrong

### Set Conservative Thresholds

- Start with wider ranges (e.g., 20°C–35°C)
- Tighten them gradually as you understand your setup
- Always leave headroom from dangerous values

### Keep Safety Policies Active

- Do not disable safety policies to "make automation work"
- If a policy keeps blocking your desired action, fix the underlying problem
- Safety policies protect your plants and equipment

### Have a Backup Plan

- Know how to manually operate your equipment
- Keep the E-Stop button accessible
- Check that alarms and alerts are working

---

## Troubleshooting Automation

| Problem | Likely Cause | Fix |
|---|---|---|
| Device not responding to automation | Device offline | Check wiring and power |
| FarmPal keeps blocking actions | Threshold too close to current reading | Adjust threshold |
| Actions happen at wrong times | Wrong timezone | Check Settings → Timezone |
| FarmPal ignores a sensor | Sensor offline | Check sensor connection |
| No autonomous decisions happening | Mode set to Observe or Suggest | Change mode to Autonomous |
| E-Stop keeps triggering | Safety policy too strict | Adjust safety policy thresholds |

For more help, see the **Troubleshooting Guide** (accessible from **Settings → Help → Troubleshooting**).

---

## Summary

| Concept | What It Means |
|---|---|
| **Automation** | FarmPal acts without asking you |
| **Modes** | Control how much FarmPal can act autonomously |
| **Thresholds** | Trigger points for automated actions |
| **Rules** | Connect thresholds to actions |
| **Safety Policies** | Always-on rules that prevent dangerous actions |
| **Generator/Verifier** | Two-step decision process (propose → safety check) |
| **E-Stop** | Stops all automation immediately |

---

*Start with Observe Only mode, collect data, then gradually increase automation as you trust the system.*

For additional support: [farmpal.io/support](https://farmpal.io/support)
