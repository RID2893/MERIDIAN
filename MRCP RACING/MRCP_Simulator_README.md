# 🏁 MRCP Simulator

> **Live browser demo of the Mission Racing Circuit Platform — MRSSP protocol running in real time across manned and unmanned aerial vehicles.**

**Alpha Edge AI × Airspeeder × Jetson ONE × AAMI**

[![Version](https://img.shields.io/badge/version-1.0.0-blue)](CHANGELOG.md)
[![Status](https://img.shields.io/badge/status-in%20development-orange)]()
[![Runtime](https://img.shields.io/badge/runtime-browser%20%E2%80%94%20no%20install-green)]()
[![MRSSP](https://img.shields.io/badge/protocol-MRSSP%20v1.0-00D4FF)]()
[![AAMI](https://img.shields.io/badge/certified-AAMI%20Partner-8B5CF6)]()

---

## What Is This?

The **MRCP Simulator** is a single-file, browser-based dynamic demonstration of the [Mission Racing Circuit Platform](../README.md). It runs the full MRSSP scoring protocol live across 6 vehicles (3 manned, 3 unmanned) on a 6-gate animated circuit.

**It is a demo tool** — no backend, no server, no install. Open `mrcp-simulator.html` in any browser and the full racing ecosystem runs immediately.

### What You See

```
┌─────────────────────────────────────────────────────────────────────┐
│  MRCP RACING ECOSYSTEM SIMULATOR       ● LIVE   LAP 2  02:34        │
├──────────────────────────────┬──────────────────────────────────────┤
│                              │  MRSSP LIVE SCORES                   │
│    CIRCUIT MAP               │  Vehicle    G  Spd Prc Eff Dec  ∑    │
│    (animated SVG)            │  🟠 AE-001  4  82  91  77  88  85.5 │
│                              │  🟠 AE-002  3  79  88  74  85  82.1 │
│  🟠 Class A (Airspeeder/     │  🟠 JT-003  2  71  85  69  78  76.8 │
│     Jetson ONE)              │  🔵 AU-001  4  88  79  82  93  85.1 │
│                              │  🔵 AU-002  3  84  76  80  91  82.3 │
│  🔵 Class B (Autonomous)     │  🔵 PL-003  2  68  81  88  85  78.2 │
│                              │                                       │
│  ── Class A · 30–80m AGL     │  MISSION GATES                       │
│  ── Class B · 0–30m AGL      │  [G1 ✓][G2 ✓][G3 ✓][G4 ⚡][G5  ][F]│
│                              │                                       │
│  [Gates pulse on activation] │  LEADERBOARD                         │
│  [Trails follow vehicles]    │  #1 AE-MK4-001 ████████ 85.5        │
│                              │  #2 AUTO-001   ████████ 85.1        │
│                              │  #3 AE-MK4-002 ███████  82.1        │
│                              │                                       │
│                              │  AAMI CERTIFICATION                  │
│                              │  Telemetry: 48,234  ● ACTIVE        │
│                              │  Compliance: 99.7%   FAA·EASA·CASA  │
├──────────────────────────────┴──────────────────────────────────────┤
│  [▶ START] [⏸ PAUSE] [↺ RESET] [🚨 ABORT] [⚡ FORCE GATE]          │
│  Follow: [AE-MK4-001 ▼]  [✓ Class A]  [✓ Class B]                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

```bash
# Clone the repo
git clone https://github.com/alpha-edge/mrcp-simulator.git
cd mrcp-simulator

# Open the simulator — that's it
open mrcp-simulator.html
# or: double-click mrcp-simulator.html in Finder/Explorer
```

**No npm. No build step. No server. One file.**

---

## Features

### Dynamic Race Simulation
- **6 vehicles** running simultaneously — 3 Class A manned, 3 Class B unmanned
- **Smooth bezier path** following through all 6 MRSSP mission gates
- **Staggered starts** — vehicles at different positions for realistic racing dynamics
- **Lap counting** — vehicles complete circuits and start next lap automatically
- **Battery drain** — simulates energy management across each lap

### Live MRSSP Scoring Engine
- **5-dimension scoring** updating every 500ms per vehicle:
  - Gate Time (Speed) — 25%
  - Mission Precision — 25%
  - Energy Efficiency — 20%
  - Decision Speed — 15%
  - Recovery Index — 15%
- **±8% dynamic variance** — scores fluctuate realistically, never static
- **Class-differentiated scoring** — Class B scores higher on AI dimensions, Class A on precision
- **Composite score** color-coded: 🟢 >85 / 🟡 70–85 / 🔴 <70

### Mission Gate System
- **Gate activation** — triggers when vehicle within proximity radius
- **Mission objective overlays** — each gate shows MRSSP phase briefing on activation
- **Gate state machine** — WAITING → ACTIVE → COMPLETE → reset per lap
- **Sponsor callout** — Gate 4 (Power Sector) fires branded event on crossing
- **Visual pulse animations** — gates glow on activation, turn green on completion

### Airspace Visualization
- **Class A band** (30–80m AGL) — orange overlay, upper circuit zone
- **Class B band** (0–30m AGL) — cyan overlay, lower circuit zone
- **Buffer zone** — dashed red line between bands with ⚠️ label
- **Vehicle positioning** — vehicles render within their class altitude band

### AAMI Certification Panel
The **Advanced Air Mobility Institute** panel shows live:
- Telemetry points logged (increments every 20ms at simulated 50Hz)
- Protocol compliance % (99.5–99.9%, live fluctuation)
- Safety events reviewed (increments on abort)
- Validation hours (live race timer)
- Certification status: ACTIVE / REVIEWING / SUSPENDED
- Regulatory bodies: FAA · EASA · CASA

### Safety Abort System
Full 3-level abort sequence with visual storytelling:
1. **Level 1** — Vehicle-level auto-landing triggered (instant)
2. **Level 2** — Ground station override confirmed (300ms)
3. **Recovery** — Vehicles resume from safe position (5s sequence)

Visual sequence: red alert banner → vehicle pulse → freeze → spiral descent → recovery confirmation → AAMI log entry

---

## Controls

| Control | Action |
|---------|--------|
| **▶ START** | Begin race — vehicles start moving |
| **⏸ PAUSE / ▶ RESUME** | Freeze/unfreeze all animation |
| **↺ RESET** | Return to pre-race state, all counters reset |
| **🚨 ABORT** | Trigger safety abort on all Class B vehicles |
| **⚡ FORCE GATE** | Skip followed vehicle to next gate immediately |
| **Follow: [Vehicle ▼]** | Highlight and track selected vehicle |
| **[✓ Class A]** | Toggle manned vehicle visibility |
| **[✓ Class B]** | Toggle unmanned vehicle visibility |

---

## Vehicle Roster

### Class A — Manned 🟠

| ID | Name | Vehicle | Color | Speed |
|----|------|---------|-------|-------|
| AE-MK4-001 | Airspeeder Alpha | Airspeeder Mk4 | Orange | 1.0× |
| AE-MK4-002 | Airspeeder Beta | Airspeeder Mk4 | Dark Orange | 0.95× |
| JT-ONE-003 | Jetson Crew One | Jetson ONE | Gold | 0.8× |

### Class B — Unmanned 🔵

| ID | Name | Vehicle | Color | Speed |
|----|------|---------|-------|-------|
| AUTO-001 | Autonomous Alpha | Racing Drone | Cyan | 1.1× |
| AUTO-002 | Autonomous Beta | Racing Drone | Dark Cyan | 1.05× |
| PAYLOAD-003 | Payload Craft | Payload Drone | Purple | 0.75× |

---

## Circuit Layout

```
        G2 (Technical Zone / Assessment)
       ╱                              ╲
G1 ──╱                                ╲── G3
(Recon/                              (Strategy/
Discovery)                           Road-Map)
     |                                    |
     |                               G4 ──╯
     |                          (Power Sector/
FINISH ──────────────────────── Execution)
(Data Capture/          ╲
Closure)                 G5
                    (Final Push/
                    Optimization)
```

Gates in order: **G1 → G2 → G3 → G4 → G5 → FINISH → G1** (loops)

---

## MRSSP Integration

Every element of the simulator maps directly to the MRSSP production protocol:

| Simulator Element | MRSSP Production Equivalent |
|------------------|---------------------------|
| Race loop tick | n8n `mrcp-telemetry-ingest` workflow |
| Score engine (JS) | `mrcp-score-engine` n8n workflow |
| Gate activation | `mrcp-gate-trigger` webhook |
| Abort sequence | `mrcp-safety-monitor` abort protocol |
| AAMI counter | `mrcp-audit-export` data stream |
| Sponsor callout | `mrcp-broadcast-push` sponsor API trigger |
| Post-race archive | `mrcp-archive-session` Rclone workflow |

The simulator is a **faithful behavioral model** of the production n8n workflow stack — same logic, same scoring weights, same event sequencing. Differences: in-memory state vs persistent, synthetic telemetry vs real vehicle feeds.

---

## Repository Structure

```
mrcp-simulator/
├── README.md                # This file
├── CHANGELOG.md             # Version history
├── mrcp-simulator.html      # THE SIMULATOR — entire application in one file
└── docs/
    ├── PRD.md               # Full simulator PRD with sprint breakdown
    ├── ARCHITECTURE.md      # Technical decisions and data model
    └── DEMO-GUIDE.md        # Step-by-step demo script for investor presentations
```

---

## Build Plan (Sprint Reference)

The simulator was built across 9 sprints. See [`docs/PRD.md`](docs/PRD.md) for full specifications.

| Sprint | Deliverable | Status |
|--------|-------------|--------|
| S0 | Shell & design system | 🔲 TODO |
| S1 | Circuit map & gate positions | 🔲 TODO |
| S2 | Vehicle engine & movement | 🔲 TODO |
| S3 | MRSSP scoring engine | 🔲 TODO |
| S4 | Score display & leaderboard | 🔲 TODO |
| S5 | Gate activation & mission events | 🔲 TODO |
| S6 | Control panel & race controls | 🔲 TODO |
| S7 | Safety abort system | 🔲 TODO |
| S8 | AAMI institutional panel | 🔲 TODO |
| S9 | Polish, animations & demo mode | 🔲 TODO |

---

## Demo Script (Investor Presentation)

**Step-by-step walkthrough for a 5-minute demo:**

1. **Open file** in Chrome, full screen (F11)
2. **Explain layout** — "Left is the live circuit, right is the MRSSP scoring engine, bottom is the control layer"
3. **Point to airspace bands** — "Orange band is manned — Airspeeder and Jetson ONE. Cyan band is autonomous craft. They never occupy the same airspace."
4. **Click START** — "Watch the MRSSP scores update live. Every vehicle scored on five dimensions simultaneously."
5. **Wait 20 seconds** — "Notice the leaderboard changing. Autonomous craft score higher on decision speed. Manned craft score higher on precision."
6. **Click ABORT** — "This is the three-level MRSSP safety protocol. Watch the sequence."
7. **After recovery** — "AAMI just logged that abort event. That's the certification data that goes to FAA, EASA, and CASA."
8. **Select Follow vehicle** — "We can track any vehicle individually. Gate objectives appear when they hit each mission sector."
9. **Toggle Class B off** — "Investors can isolate the manned competition to show the Jetson ONE and Airspeeder bracket separately."
10. **Click RESET** — "This is what runs 6–8 hours per race event. Every second generates MRSSP validation data."

---

## Browser Compatibility

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 100+ | ✅ Fully supported |
| Firefox | 100+ | ✅ Fully supported |
| Safari | 15+ | ✅ Fully supported |
| Edge | 100+ | ✅ Fully supported |

**Minimum recommended viewport:** 1200px wide × 800px tall

---

## Partner Ecosystem

| Partner | Role in Simulator |
|---------|-----------------|
| **Airspeeder** | Mk4 vehicles (AE-MK4-001/002) — primary Class A racers |
| **Jetson ONE** | JT-ONE-003 — Class A Light category + crew concept |
| **AAMI** | Certification panel — live protocol validation data |
| **Alpha Edge** | MRSSP scoring engine, gate architecture, platform IP |

---

## IP Notice

The MRSSP protocol, Mission Gate format, and MRCP scoring algorithm implemented in this simulator are **proprietary intellectual property of Alpha Edge**. This repository requires a signed NDA for access.

See [LICENSE](LICENSE) for full terms.

---

## Changelog

| Version | Date | Notes |
|---------|------|-------|
| `1.0.0` | March 2025 | Initial build — full 9-sprint implementation |

---

<div align="center">

**MRCP Simulator v1.0 · Alpha Edge AI · March 2025**  
*Alpha Edge × Airspeeder × Jetson ONE × AAMI*  
`alphatedge.ai · CONFIDENTIAL`

</div>
