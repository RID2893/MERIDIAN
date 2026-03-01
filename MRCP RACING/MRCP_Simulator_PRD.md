# MRCP Simulator — Product Requirements Document
## Claude Code Sprint Build Plan

**Document:** MRCP-SIM-PRD-v1.0  
**Owner:** Alpha Edge Ops Guild  
**Status:** READY FOR CLAUDE CODE EXECUTION  
**Date:** March 2025  
**Classification:** Internal — Development Use  

---

## Purpose

This PRD provides a complete, sprint-structured specification for Claude Code to build the **MRCP Racing Ecosystem Simulator** — a browser-based, fully dynamic demonstration of the Mission Racing Circuit Platform running the MRSSP protocol live.

The simulator is a **demo tool**, not a production system. Its purpose is to show investors, partners (Airspeeder, Jetson ONE, AAMI), and enterprise clients exactly how the MRCP platform operates — with live vehicles, real-time MRSSP scoring, dynamic mission gates, airspace visualization, and manual event control.

**Audience for this PRD:** Claude Code (primary builder), Alpha Edge Dev (reviewer)

---

## Target Output Description

When the simulator opens in a browser, the user sees:

```
┌─────────────────────────────────────────────────────────────────────┐
│  MRCP RACING ECOSYSTEM SIMULATOR            [ALPHA EDGE × MRSSP]    │
├──────────────────────────────┬──────────────────────────────────────┤
│                              │  LIVE MRSSP SCORES                   │
│    CIRCUIT MAP               │  ┌────────────────────────────────┐  │
│    (animated SVG)            │  │ Vehicle | Gate | Score | Class │  │
│                              │  └────────────────────────────────┘  │
│  ● Class A vehicles (orange) │                                       │
│  ● Class B vehicles (cyan)   │  MISSION GATE STATUS                  │
│                              │  [G1][G2][G3][G4][G5][FINISH]         │
│  ── Class A airspace band    │                                       │
│  ── Class B airspace band    │  LEADERBOARD                          │
│                              │  #1 AE-MK4-001 ████ 91.2             │
│  [Gate activations flash]    │  #2 JT-ONE-002 ███  88.7             │
│  [Abort events pulse red]    │  #3 AUTO-003   ██   82.1             │
│                              │                                       │
├──────────────────────────────┴──────────────────────────────────────┤
│  CONTROL PANEL                                                       │
│  [▶ START] [⏸ PAUSE] [↺ RESET] [🚨 ABORT] [⚡ FORCE GATE]          │
│  [Follow: Vehicle ▼] [Show: Class A ✓] [Show: Class B ✓]            │
└─────────────────────────────────────────────────────────────────────┘
```

**Visual Style:** Dark cyber — navy `#040810` background, cyan `#00D4FF` accent, orange `#FF6B00` manned class, white panels.

---

## Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Runtime | Single HTML file (no build step) | Opens anywhere, email-safe, zero install |
| Language | Vanilla JS + SVG + CSS | No dependencies, maximum portability |
| Simulation loop | `requestAnimationFrame` + delta time | Smooth 60fps animation |
| Data model | In-memory JS objects | No backend needed for demo |
| Vehicle paths | Bezier curves through gate waypoints | Smooth, realistic movement |
| Score engine | JS port of MRSSP 5-dimension algorithm | Faithful to PRD spec |
| State management | Single `RACE_STATE` object | Simple, debuggable, Claude Code friendly |

---

## Vehicle Configuration

### Class A — Manned (3 vehicles)

| ID | Name | Vehicle Type | Color | Speed Factor |
|----|------|-------------|-------|-------------|
| `AE-MK4-001` | Airspeeder Alpha | Airspeeder Mk4 | Orange `#FF6B00` | 1.0× |
| `AE-MK4-002` | Airspeeder Beta | Airspeeder Mk4 | Orange dark `#CC5500` | 0.95× |
| `JT-ONE-003` | Jetson Crew One | Jetson ONE | Gold `#FFB800` | 0.8× |

### Class B — Unmanned (3 vehicles)

| ID | Name | Vehicle Type | Color | Speed Factor |
|----|------|-------------|-------|-------------|
| `AUTO-001` | Autonomous Alpha | Racing Drone | Cyan `#00D4FF` | 1.1× |
| `AUTO-002` | Autonomous Beta | Racing Drone | Cyan dark `#0099CC` | 1.05× |
| `PAYLOAD-003` | Payload Craft | Payload Drone | Purple `#8B5CF6` | 0.75× |

---

## Gate Configuration

| Gate ID | Name | MRSSP Phase | X Position | Y Position | Mission Flash Color |
|---------|------|-------------|-----------|-----------|-------------------|
| `G1` | Recon Sector | Discovery | 15% | 25% | Muted gray |
| `G2` | Technical Zone | Assessment | 40% | 10% | Cyan |
| `G3` | Strategy Waypoint | Road-Map | 70% | 20% | Cyan |
| `G4` | Power Sector | Execution | 85% | 55% | Orange |
| `G5` | Final Push | Optimization | 65% | 80% | Orange |
| `FINISH` | Data Capture | Closure | 20% | 75% | Green |

Circuit path is a smooth closed loop connecting gates in order: G1 → G2 → G3 → G4 → G5 → FINISH → G1.

---

## MRSSP Scoring Engine (JS Implementation)

Each vehicle scored every 500ms on 5 dimensions (0–100 each):

```javascript
// Pseudocode for Claude Code to implement
function computeMRSSPScore(vehicle, gateContext) {
  return {
    gate_time:          computeTimeScore(vehicle.speed, gateContext.targetSpeed),
    mission_precision:  computePrecisionScore(vehicle.position, gateContext.targetPath),
    energy_efficiency:  computeEfficiencyScore(vehicle.battery, gateContext.expectedDrain),
    decision_speed:     computeDecisionScore(vehicle.reactionTime, vehicle.class),
    recovery_index:     computeRecoveryScore(vehicle.errorHistory),
    composite:          weightedComposite(scores) // 25/25/20/15/15
  };
}
```

Scores must include **random variance** (±8%) per tick to simulate live racing dynamics — scores should visibly fluctuate, not be static.

---

## Dynamic Events System

The simulator must fire these events automatically during race:

| Event | Trigger | Visual Effect | Duration |
|-------|---------|--------------|----------|
| Gate Activation | Vehicle within 5% radius of gate | Gate pulses bright, label flashes | 2s |
| Gate Complete | Vehicle exits gate radius | Gate turns green, score updates | 1s |
| Mission Objective | Gate activation | Overlay text shows mission brief | 3s |
| Sponsor Callout | Gate G4 (Power Sector) crossing | Branded banner slides in | 4s |
| Safety Abort | Manual trigger OR auto at 20% chance on lap 3 | All Class B vehicles pulse red, freeze | 5s |
| AAMI Certification Tick | Every 30s of race | AAMI panel shows new data point logged | 1s |
| Leaderboard Change | Score overtake | Position number animates | 0.5s |
| Class A / Class B overtake | Speed differential | Brief highlight flash on both vehicles | 1s |

---

## AAMI Panel Specification

The **Advanced Air Mobility Institute** is a full institutional partner. The simulator must include a dedicated AAMI data panel visible during race:

```
┌─────────────────────────────────────┐
│  AAMI — Advanced Air Mobility       │
│  Institute · MRSSP Certification    │
├─────────────────────────────────────┤
│  Telemetry Points Logged:  [LIVE]   │
│  Protocol Compliance:      99.7%    │
│  Safety Events Reviewed:   [count]  │
│  Certification Status:     ACTIVE   │
│  Next Audit:               Gate 4   │
└─────────────────────────────────────┘
```

- Telemetry count increments every 200ms (simulates 50Hz data)
- Protocol compliance fluctuates ±0.3% around 99.5–99.9% range
- Safety events count increments on any abort trigger
- Certification status flashes yellow on abort, returns green on recovery

---

## Control Panel Specification

### Button Behaviors

| Control | Action | State Change |
|---------|--------|-------------|
| ▶ START | Begin race loop, vehicles begin moving | Button becomes ⏸ PAUSE |
| ⏸ PAUSE | Freeze all animation, preserve state | Button becomes ▶ RESUME |
| ↺ RESET | Return all vehicles to start, reset scores, lap 1 | All state cleared |
| 🚨 ABORT | Trigger safety abort event on all Class B vehicles | All Class B freeze, pulse red |
| ⚡ FORCE GATE | Skip to next gate for followed vehicle | Gate activates immediately |

### Dropdown / Toggle Behaviors

| Control | Options | Effect |
|---------|---------|--------|
| Follow Vehicle | All 6 vehicle IDs | Map centers/highlights that vehicle |
| Show Class A | ON/OFF toggle | Hides/shows all Class A vehicles and their altitude band |
| Show Class B | ON/OFF toggle | Hides/shows all Class B vehicles and their altitude band |

---

## Airspace Visualization

The circuit map must show two distinct altitude bands as semi-transparent horizontal overlays:

- **Class A band** (orange, 20% opacity): Upper portion of map, label "30–80m AGL"
- **Class B band** (cyan, 15% opacity): Lower portion of map, label "0–30m AGL"  
- **Buffer zone** (red dashed line): Between bands, label "⚠ BUFFER ZONE"

Vehicles must render WITHIN their class band. Class A vehicles appear in upper portion of their rendered position. Class B in lower portion. This communicates airspace separation visually without requiring a true 3D render.

---

---

# SPRINT BUILD PLAN

> **Instructions for Claude Code:** Complete each sprint fully and validate before starting the next. Each sprint produces working, runnable code. Never skip a sprint. Each sprint builds on the previous.

---

## SPRINT 0 — Project Shell & Design System
**Goal:** One HTML file that opens in browser with correct visual style, no content yet.  
**Deliverable:** `mrcp-simulator.html`

### Tasks
- [ ] Create single `mrcp-simulator.html` file
- [ ] Embed all CSS in `<style>` tag — no external stylesheets
- [ ] Embed all JS in `<script>` tag — no external scripts
- [ ] Set page background to navy `#040810`
- [ ] Define CSS variables for full color palette:
  ```css
  --navy: #040810;
  --card: #0D1A35;
  --gate-bg: #1A2A4A;
  --cyan: #00D4FF;
  --orange: #FF6B00;
  --gold: #FFB800;
  --purple: #8B5CF6;
  --green: #00FF88;
  --red: #FF3B5C;
  --white: #FFFFFF;
  --muted: #8A9BB5;
  ```
- [ ] Build layout grid: left panel (60% — circuit map), right panel (40% — data), bottom bar (control panel)
- [ ] Add header bar: "MRCP RACING ECOSYSTEM SIMULATOR" + "ALPHA EDGE × AIRSPEEDER × JETSON ONE × AAMI"
- [ ] Verify renders correctly in browser with dark background and correct proportions

**Acceptance:** Open file in browser → dark layout visible, three regions defined, header showing.

---

## SPRINT 1 — Circuit Map & Gate Positions
**Goal:** SVG circuit with gates positioned, track path visible, gate labels shown.  
**Deliverable:** Updated `mrcp-simulator.html`

### Tasks
- [ ] Add `<svg>` element filling the left panel (responsive width/height)
- [ ] Draw the circuit track as a smooth closed SVG path (cubic bezier) connecting all 6 gates
- [ ] Style track: 3px stroke, cyan `#00D4FF`, 40% opacity
- [ ] Define gate positions as JS constants (% of SVG dimensions):
  ```javascript
  const GATES = {
    G1: { x: 0.15, y: 0.25, name: "Recon Sector",     mrssp: "Discovery"   },
    G2: { x: 0.40, y: 0.10, name: "Technical Zone",    mrssp: "Assessment"  },
    G3: { x: 0.70, y: 0.20, name: "Strategy Waypoint", mrssp: "Road-Map"    },
    G4: { x: 0.85, y: 0.55, name: "Power Sector",      mrssp: "Execution"   },
    G5: { x: 0.65, y: 0.80, name: "Final Push",        mrssp: "Optimization"},
    FINISH: { x: 0.20, y: 0.75, name: "Data Capture",  mrssp: "Closure"     },
  };
  ```
- [ ] Render each gate as: outer ring (circle, 24px, stroke only) + inner dot (8px filled) + label below
- [ ] Gate colors: G1 muted, G2–G3 cyan, G4–G5 orange, FINISH green
- [ ] Add MRSSP phase label in small text below gate name
- [ ] Add airspace band overlays: Class A (orange 15% opacity, top 60% of map) + Class B (cyan 10% opacity, bottom 40%)
- [ ] Add buffer zone dashed red line between bands
- [ ] Add band labels: "CLASS A · 30–80m AGL" and "CLASS B · 0–30m AGL"

**Acceptance:** Open file → SVG circuit visible, 6 gates labeled, track path connecting them, airspace bands overlaid.

---

## SPRINT 2 — Vehicle Engine & Movement
**Goal:** All 6 vehicles move along the circuit path in real time at different speeds.  
**Deliverable:** Updated `mrcp-simulator.html`

### Tasks
- [ ] Define vehicle data structure:
  ```javascript
  const VEHICLES = [
    { id: "AE-MK4-001", name: "Airspeeder Alpha", class: "A", type: "Airspeeder Mk4", color: "#FF6B00", speed: 1.0, t: 0.0,    battery: 100, lap: 1 },
    { id: "AE-MK4-002", name: "Airspeeder Beta",  class: "A", type: "Airspeeder Mk4", color: "#CC5500", speed: 0.95, t: 0.15, battery: 100, lap: 1 },
    { id: "JT-ONE-003",  name: "Jetson Crew One",  class: "A", type: "Jetson ONE",     color: "#FFB800", speed: 0.8,  t: 0.30, battery: 100, lap: 1 },
    { id: "AUTO-001",   name: "Autonomous Alpha",  class: "B", type: "Racing Drone",   color: "#00D4FF", speed: 1.1,  t: 0.05, battery: 100, lap: 1 },
    { id: "AUTO-002",   name: "Autonomous Beta",   class: "B", type: "Racing Drone",   color: "#0099CC", speed: 1.05, t: 0.20, battery: 100, lap: 1 },
    { id: "PAYLOAD-003",name: "Payload Craft",     class: "B", type: "Payload Drone",  color: "#8B5CF6", speed: 0.75, t: 0.40, battery: 100, lap: 1 },
  ];
  ```
- [ ] Implement `getPointOnPath(t)` — returns `{x, y}` for `t` in [0,1] along circuit bezier path
- [ ] Implement `RACE_STATE` object: `{ running: false, tick: 0, time: 0 }`
- [ ] Implement main animation loop with `requestAnimationFrame` + delta time
- [ ] Each frame: advance each vehicle's `t` by `(speed × baseSpeed × delta)` — wrap at 1.0, increment lap
- [ ] Render each vehicle as: filled circle (12px Class A, 10px Class B) at `getPointOnPath(t)`
- [ ] Add vehicle label tooltip on hover (show ID, class, speed, lap)
- [ ] Class A vehicles render in upper 60% Y zone — offset Y position slightly upward to stay in Class A band
- [ ] Class B vehicles render in lower 40% Y zone — offset Y position slightly downward
- [ ] Battery drains at `0.02% per tick` — resets at lap completion
- [ ] Vehicles only move when `RACE_STATE.running === true`

**Acceptance:** Click START → 6 vehicles move around circuit at different speeds, Class A visible in upper band, Class B in lower band.

---

## SPRINT 3 — MRSSP Scoring Engine
**Goal:** All 5 scoring dimensions computed live for each vehicle, updating every 500ms.  
**Deliverable:** Updated `mrcp-simulator.html`

### Tasks
- [ ] Add `scores` object to each vehicle:
  ```javascript
  scores: { gate_time: 75, mission_precision: 75, energy_efficiency: 75, decision_speed: 75, recovery_index: 75, composite: 75 }
  ```
- [ ] Implement scoring functions (each returns 0–100):
  ```javascript
  function scoreGateTime(vehicle)        { /* based on speed vs class average */ }
  function scorePrecision(vehicle)       { /* based on path deviation simulation */ }
  function scoreEfficiency(vehicle)      { /* based on battery drain rate */ }
  function scoreDecision(vehicle)        { /* Class A: random human variance. Class B: AI optimized */ }
  function scoreRecovery(vehicle)        { /* drops on error events, recovers over time */ }
  function computeComposite(scores)      { /* 25/25/20/15/15 weighted */ }
  ```
- [ ] Each score includes `±8%` random variance per update to simulate live dynamics
- [ ] Class B vehicles score 5–10% higher on `decision_speed` and `recovery_index` by default
- [ ] Class A vehicles score 5–10% higher on `mission_precision` (human touch advantage)
- [ ] Update all scores every 500ms using `setInterval`
- [ ] Clamp all scores to 0–100 range

**Acceptance:** Scores object populating on all vehicles, composite updating every 500ms, variance visible in console.

---

## SPRINT 4 — Right Panel — Score Display & Leaderboard
**Goal:** Right panel shows live MRSSP scores, gate status, and leaderboard — all updating in real time.  
**Deliverable:** Updated `mrcp-simulator.html`

### Tasks
- [ ] Build right panel sections with CSS grid (stack vertically):
  1. **MRSSP LIVE SCORES** table — top section
  2. **MISSION GATE STATUS** bar — middle
  3. **LEADERBOARD** — bottom
- [ ] **MRSSP Scores Table:** 7 columns: Vehicle | Gate | Speed | Precision | Efficiency | Decision | Composite
  - Update every 500ms
  - Composite column: color-coded (>85 green, 70–85 orange, <70 red)
  - Vehicle name truncated to fit, class icon prefix (🟠 Class A, 🔵 Class B)
- [ ] **Gate Status Bar:** 6 boxes (G1–FINISH), each showing:
  - Gate name (truncated)
  - Status: WAITING (gray) / ACTIVE (pulsing color) / COMPLETE (green) / NEXT (dim)
  - Gates activate as vehicles approach, turn green on clear
- [ ] **Leaderboard:** Ranked by composite score, updating every 1s
  - Position number (#1, #2...) 
  - Vehicle name
  - Composite score as progress bar + number
  - Lap count
  - Animate position changes with brief highlight
- [ ] Style all panels: `background: #0D1A35`, `border: 1px solid #1A2A4A`, `border-radius: 6px`, `padding: 12px`
- [ ] All text in `font-family: 'Courier New', monospace` for techy feel

**Acceptance:** Right panel shows 3 sections, scores update live, leaderboard reorders as scores change.

---

## SPRINT 5 — Gate Activation & Mission Events
**Goal:** Gates activate when vehicles approach, fire mission objective overlays, complete when cleared.  
**Deliverable:** Updated `mrcp-simulator.html`

### Tasks
- [ ] Implement `checkGateProximity(vehicle, gate)` — returns true if vehicle within 5% of gate position
- [ ] Gate state machine per gate: `WAITING → ACTIVE → COMPLETE → WAITING` (loops each lap)
- [ ] On gate `ACTIVE`:
  - Gate circle pulses (CSS animation: scale 1.0→1.3→1.0, 0.8s loop)
  - Gate stroke brightens to full opacity
  - Show mission objective overlay on circuit map (positioned near gate):
    ```
    ┌──────────────────────┐
    │ ⚡ GATE 4 ACTIVE      │
    │ MRSSP: Execution     │
    │ 🟠 Full throttle run │
    │ 🔵 Max velocity AI   │
    └──────────────────────┘
    ```
  - Overlay fades in 0.3s, auto-dismisses after 3s
- [ ] On gate `COMPLETE`:
  - Gate turns solid green
  - Brief score update flash on leaderboard
- [ ] Gate G4 (Power Sector): on activation, fire **Sponsor Callout**:
  - Slide-in banner from right: "⚡ POWERED BY [SPONSOR] · Power Sector · Gate 4 · MRSSP Execution Phase"
  - Cyan background, dark text, auto-dismisses after 4s
- [ ] FINISH gate completion: increment lap counter, reset gate states for next lap

**Acceptance:** Vehicles trigger gates, mission overlays appear and fade, G4 fires sponsor callout, FINISH resets lap.

---

## SPRINT 6 — Control Panel & Race Controls
**Goal:** All 5 control behaviors fully functional.  
**Deliverable:** Updated `mrcp-simulator.html`

### Tasks
- [ ] Build control panel as bottom bar, full width, dark background `#070F22`
- [ ] **START/PAUSE/RESUME button:**
  - START → sets `RACE_STATE.running = true`, button label = "⏸ PAUSE"
  - PAUSE → sets `RACE_STATE.running = false`, button label = "▶ RESUME"
  - Style: large button, cyan border, bright on hover
- [ ] **RESET button:**
  - Sets all vehicle positions to staggered starts (t values reset)
  - Resets all scores to 75
  - Resets all gate states to WAITING
  - Resets lap counters to 1
  - Resets RACE_STATE.running = false
  - Resets AAMI panel counters
- [ ] **🚨 ABORT button:**
  - Calls `triggerSafetyAbort()` function
  - Button pulses red for 2s on click
  - See Sprint 7 for abort visual implementation
- [ ] **⚡ FORCE GATE button:**
  - Teleports the "followed" vehicle to position of the next gate
  - Gate activates immediately
  - Score update fires
- [ ] **Follow Vehicle dropdown:**
  - Options: "None" + all 6 vehicle IDs
  - On selection: followed vehicle renders at 1.5× size with glow ring
  - Circuit map adds dotted trailing path showing followed vehicle's recent history
- [ ] **Class A / Class B toggles:**
  - Two checkboxes: "Show Class A" and "Show Class B"
  - When unchecked: vehicles of that class hidden, airspace band hidden, scores remain but label "(hidden)"

**Acceptance:** All 5 controls work correctly, followed vehicle highlights, class toggles hide/show correctly.

---

## SPRINT 7 — Safety Abort System
**Goal:** Full visual abort sequence triggering on manual control or auto-trigger.  
**Deliverable:** Updated `mrcp-simulator.html`

### Tasks
- [ ] Implement `triggerSafetyAbort(vehicleId = null)`:
  - If `vehicleId` is null: abort ALL Class B vehicles
  - If `vehicleId` specified: abort that vehicle only
- [ ] **Abort visual sequence (5 second event):**
  - Second 0: Red alert banner slides down from top: "🚨 MRSSP SAFETY ABORT — LEVEL 1 TRIGGERED · CLASS B EMERGENCY LANDING"
  - Second 0: All affected vehicles pulse red (CSS: border-color animation)
  - Second 0: All affected vehicles stop moving (`speed = 0` temporarily)
  - Second 0–5: Affected vehicles animate a slow spiral/descent (reduce radius of circle, move toward nearest safe zone)
  - Second 1: AAMI panel: "Safety Events: +1 · Protocol Response: ACTIVE"
  - Second 2: Secondary banner: "⚠ GROUND STATION OVERRIDE ACTIVE · RSO COMMAND CONFIRMED"
  - Second 3: Scoring panel shows "ABORT" label for affected vehicles in red
  - Second 5: Recovery — affected vehicles resume from nearest gate start position
  - Second 5: Banner: "✅ RECOVERY COMPLETE · MRSSP LOG ENTRY FILED · AAMI NOTIFIED"
- [ ] Auto-abort trigger: 15% probability on lap 3 completion for one random Class B vehicle
- [ ] Recovery index score for aborted vehicle drops to 40, recovers +5 per scoring tick

**Acceptance:** Click ABORT → full visual sequence plays, vehicles freeze and recover, AAMI panel updates.

---

## SPRINT 8 — AAMI Institutional Partner Panel
**Goal:** Dedicated AAMI panel showing live certification data, integrated into right panel.  
**Deliverable:** Updated `mrcp-simulator.html`

### Tasks
- [ ] Add AAMI panel as 4th section in right panel (below leaderboard)
- [ ] Panel header: AAMI logo area (stylized text) + "MRSSP Certification Active"
- [ ] Panel content — all values update dynamically:
  ```
  Advanced Air Mobility Institute
  ─────────────────────────────────
  Telemetry Points Logged:  [COUNTER — increments every 200ms simulating 50Hz]
  Protocol Compliance:      [99.5–99.9%, fluctuates ±0.2%]
  Safety Events Reviewed:   [count of abort events]
  Validation Hours:         [HH:MM:SS — live race timer]
  Certification Status:     [ACTIVE (green) / REVIEWING (yellow) / SUSPENDED (red)]
  Data Quality Score:       [98.1–99.9%, fluctuates]
  Next Scheduled Audit:     Gate [next uncompleted gate ID]
  ─────────────────────────────────
  AAMI Partner Since: 2025
  Regulatory Bodies: FAA · EASA · CASA
  ```
- [ ] Telemetry counter: starts at 0, increments by 1 every 20ms when race running (simulates 50Hz × 6 vehicles)
- [ ] On abort event: Certification Status flashes REVIEWING (yellow) for 8s, returns ACTIVE
- [ ] On RESET: all counters reset to 0
- [ ] Panel border: purple `#8B5CF6` (AAMI's distinct color in the system)
- [ ] Small badge: "🏛️ INDEPENDENT CERTIFICATION BODY"

**Acceptance:** AAMI panel shows, telemetry counter ticks in real time, status changes on abort.

---

## SPRINT 9 — Polish, Animations & Demo Mode
**Goal:** Simulator looks production-ready and presentation-worthy. Final QA pass.  
**Deliverable:** Final `mrcp-simulator.html` — COMPLETE

### Tasks
- [ ] **Header improvements:**
  - Add live race clock (MM:SS) in header right
  - Add lap indicator for leader: "LAP 2 · LEADER: AE-MK4-001"
  - Add blinking dot: "● LIVE" in cyan when race running
- [ ] **Circuit map polish:**
  - Add subtle grid lines to SVG background (like the deck aesthetic)
  - Add circuit name label: "MRCP CIRCUIT ALPHA · 6 GATES · MRSSP PROTOCOL ACTIVE"
  - Add vehicle trail: each vehicle leaves a 1s fading dotted trail
  - Gate hover: show gate detail card on mouse hover
- [ ] **Score table polish:**
  - Score cells flash briefly on update (background pulse)
  - New high score: brief gold highlight on cell
  - Sort leaderboard with CSS transition (0.3s)
- [ ] **Demo mode button (optional bonus):**
  - "🎬 DEMO MODE" button that auto-narrates: starts race, waits 10s, triggers abort, resumes, forces gate, etc.
  - Useful for hands-off demos to investors
- [ ] **Responsive layout:**
  - Minimum width: 1200px (add warning if narrower)
  - Circuit map SVG scales with window resize
- [ ] **Final QA checklist:**
  - [ ] All 6 vehicles move correctly
  - [ ] All 5 controls work
  - [ ] MRSSP scores update and vary
  - [ ] Leaderboard reorders correctly
  - [ ] Gates activate and complete correctly
  - [ ] Abort sequence fires completely
  - [ ] AAMI panel updates in real time
  - [ ] Class A/B toggles work
  - [ ] Follow vehicle works
  - [ ] No JS console errors
  - [ ] Opens correctly in Chrome, Firefox, Safari
  - [ ] Renders correctly at 1200px, 1440px, 1920px widths

**Acceptance:** Simulator fully functional, production-quality visual, zero console errors, demo-ready.

---

## Sprint Dependency Map

```
SPRINT 0 (Shell)
    │
    ▼
SPRINT 1 (Circuit Map)
    │
    ▼
SPRINT 2 (Vehicles) ──────────────────────────┐
    │                                          │
    ▼                                          ▼
SPRINT 3 (Scoring Engine)              SPRINT 6 (Controls)
    │                                          │
    ▼                                          ▼
SPRINT 4 (Score Display)           SPRINT 7 (Abort System)
    │                                          │
    ▼                                          ▼
SPRINT 5 (Gate Events) ────────────────────────┘
    │
    ▼
SPRINT 8 (AAMI Panel)
    │
    ▼
SPRINT 9 (Polish & QA)
```

---

## File Deliverable

**One file:** `mrcp-simulator.html`  
**Size target:** Under 1500 lines of clean, commented code  
**Open with:** Any modern browser — no server required  
**Share method:** Email attachment, GitHub, or direct URL if hosted  

---

## Glossary (Simulator-Specific)

| Term | Meaning in Simulator Context |
|------|------------------------------|
| `RACE_STATE` | Global JS object holding all simulation state |
| `t` | Vehicle position along path (0.0–1.0, loops) |
| `getPointOnPath(t)` | Function returning SVG {x,y} for path position t |
| `GATES` | Constant object with all gate positions and metadata |
| `VEHICLES` | Array of vehicle objects with all dynamic properties |
| `triggerSafetyAbort()` | Function initiating the 5-second abort sequence |
| `computeComposite()` | MRSSP 5-dimension weighted score calculator |
| Demo Mode | Auto-pilot sequence for hands-off investor presentations |

---

*MRCP-SIM-PRD-v1.0 · Alpha Edge · March 2025 · CONFIDENTIAL*
