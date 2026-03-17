# MRCP — Mission Racing Circuit Platform
## Commercial Rulebook v1.0

**Classification:** Public / Partner Distribution
**Version:** 1.0 | March 2026
**Governing Body:** Alpha Edge AI × AAMI Racing Committee
**Effective Date:** Q2 2026 — Series Inaugural Season

---

## Preamble

The Mission Racing Circuit Platform (MRCP) is the world's first aerial racing series governed by a live safety-scoring protocol. Every race event is simultaneously a competitive spectacle and a MRSSP protocol validation exercise — all telemetry, scores, and safety events are logged to the Algorand blockchain and certified by the Advanced Air Mobility Institute (AAMI).

These rules govern all aspects of MRCP competition. They are designed to be:
- **Safe** — aviation safety is non-negotiable; all rules subordinate to MRSSP safety protocol
- **Fair** — class separation ensures manned and unmanned vehicles compete on equal terms
- **Transparent** — all scoring is live, on-chain, and auditable by any observer
- **Commercially viable** — clear prize structure, broadcast rights, and sponsorship framework

---

## Part 1: Race Structure

### 1.1 Series Format

| Element | Specification |
|---------|--------------|
| Events per season | 6–8 race events (inaugural season) |
| Event format | 2-day (Saturday: qualifying, Sunday: race) |
| Circuit | MRCP Circuit Alpha — 6 mission gates, closed loop |
| Race duration | 45 minutes (race time) or 12 laps, whichever comes first |
| Vehicle classes | Class A (Manned) and Class B (Unmanned) — simultaneous operation |

### 1.2 Event Schedule Structure

```
DAY 1 — QUALIFYING
09:00  Airspace activation & MRSSP system check
10:00  Class B qualifying runs (2 laps each, individual)
12:00  Class A qualifying runs (2 laps each, individual)
14:00  Qualifying results published (MRSSP composite score basis)
15:00  Grid order confirmed, published to blockchain

DAY 2 — RACE
08:00  Airspace activation & pre-race AAMI certification check
09:00  Class B grid formation (staggered start positions)
09:05  Class A grid formation (staggered start positions, separate altitude band)
10:00  Race START (both classes simultaneously)
10:45  Race END (or 12-lap completion)
11:00  Results confirmed (blockchain settlement)
12:00  Prize ceremony
14:00  Post-event AAMI data export (regulatory submission)
```

---

## Part 2: Vehicle Classes

### 2.1 Class A — Manned (Piloted Aircraft)

**Definition:** Human-piloted aerial vehicles operating in the 30–80m AGL altitude band.

| Specification | Requirement |
|--------------|-------------|
| Pilot | Licensed pilot with MRCP-specific type rating |
| Altitude band | 30–80m AGL (strictly enforced by MRSSP) |
| Maximum speed | 180 km/h in circuit |
| Minimum separation | 15m lateral / 10m vertical from other Class A vehicles |
| Communication | Active radio contact with MRCP Race Control throughout |

**Eligible Vehicles (Inaugural Season):**

| Vehicle | Operator | Class A Sub-Category | Speed Rating |
|---------|----------|---------------------|--------------|
| Airspeeder Mk4 | Airspeeder Ltd. | Open | 1.0× |
| Jetson ONE | Jetson ONE Racing | Light | 0.85× |
| Future homologated vehicles | TBD | Per certification | Per spec |

**Class A Pilot Requirements:**
- Valid private or commercial pilot certificate (any country)
- MRCP-specific type rating (issued by Alpha Edge/AAMI training program)
- Minimum 50 hours in class vehicle type
- Current medical certificate
- MRSSP protocol certification (issued by AAMI)

### 2.2 Class B — Unmanned (Autonomous Vehicles)

**Definition:** Autonomous aerial vehicles operating in the 0–30m AGL altitude band.

| Specification | Requirement |
|--------------|-------------|
| Operator | Licensed Remote Pilot with active Ground Station |
| Altitude band | 0–30m AGL (strictly enforced by MRSSP) |
| Maximum speed | 220 km/h in circuit |
| Minimum separation | 10m lateral / 5m vertical from other Class B vehicles |
| Autonomy level | Full autonomous (pilot at ground station for safety override only) |

**Eligible Vehicles (Inaugural Season):**

| Vehicle | Operator | Class B Sub-Category | Speed Rating |
|---------|----------|---------------------|--------------|
| Autonomous Alpha (Racing Drone) | Alpha Edge Racing | Performance | 1.1× |
| Autonomous Beta (Racing Drone) | Alpha Edge Racing | Performance | 1.05× |
| Payload Craft (Cargo Drone) | Alpha Edge Racing | Payload | 0.75× |
| Future homologated vehicles | TBD | Per certification | Per spec |

**Class B Ground Station Requirements:**
- Active telemetry link <100ms latency
- Emergency override capability (manual abort within 1 second of command)
- Redundant communication channels (primary + backup)
- MRSSP protocol integration (direct feed to scoring engine)

---

## Part 3: MRCP Circuit

### 3.1 Circuit Layout

The MRCP Circuit Alpha is a closed-loop course defined by 6 mission gates. Gates must be navigated in sequence. The circuit loops continuously for the race duration.

```
        G2 — Technical Zone (Assessment)
       ╱                              ╲
G1 ──╱── START/FINISH                  ╲─── G3 — Apex A (Execution)
(Data Capture)                               │
     │                                       │
     │                                  G4 ──╯ Apex B (Road-Map)
     │                         ╲
     └──────────────────── G5 ──╯ Ring Exit (Optimization)
                       (Final Push)
```

### 3.2 Mission Gate Specifications

| Gate | Name | MRSSP Phase | Altitude Center | Gate Diameter | Activation Radius |
|------|------|-------------|----------------|---------------|------------------|
| G1 | START / FINISH | Race Start — Data Capture | 27.5m AGL | 10m | 15m |
| G2 | Sector 1 Entry | Technical Zone — Assessment | 27.5m AGL | 10m | 15m |
| G3 | Apex A | Power Sector — Execution | 27.5m AGL | 10m | 15m |
| G4 | Apex B | Strategy — Road-Map | 27.5m AGL | 10m | 15m |
| G5 | Ring Exit | Final Push — Optimization | 27.5m AGL | 10m | 15m |

**Gate activation:** MRSSP triggers gate ACTIVE state when any vehicle enters the 15m activation radius. Gate returns to WAITING after all vehicles have cleared.

### 3.3 Airspace Separation

The MRCP circuit enforces a mandatory **5m vertical buffer zone** between Class A and Class B altitude bands:

```
Altitude AGL:
80m ─────── Class A Upper Limit
             │
             │  CLASS A BAND (30–80m)
             │  Airspeeder Mk4, Jetson ONE
             │
35m ─────── Buffer Zone Upper ────── ⚠ NO AIRCRAFT
30m ─────── Buffer Zone Lower ─────────────────────
             │
             │  CLASS B BAND (0–30m)
             │  Racing Drones, Payload Craft
             │
 0m ─────── Ground Level
```

**Buffer zone violation = immediate MRSSP abort command for the violating vehicle.**

---

## Part 4: MRSSP Scoring (Racing Application)

### 4.1 Scoring Dimensions

All vehicles scored continuously using the MRSSP 5-dimension protocol. Scores update every 500ms and are visible on the live broadcast and AAMI data feed.

| Dimension | Weight | Class A Advantage | Class B Advantage | Measures |
|-----------|--------|-------------------|-------------------|---------|
| Gate Time (Speed) | 25% | — | Faster autonomous routing | Time through each gate vs theoretical minimum |
| Mission Precision | 25% | Human touch/judgment | — | Path deviation from optimal circuit line |
| Energy Efficiency | 20% | — | — | Battery/fuel consumption vs distance |
| Decision Speed | 15% | — | AI response optimization | Reaction time to gate activation / route changes |
| Recovery Index | 15% | — | Consistent recovery | Bounce-back from scoring penalties |
| **Composite** | **100%** | — | — | Weighted sum (25/25/20/15/15) |

**Class differentiation:** Class B vehicles score 5–10% higher on Decision Speed and Recovery by design (AI advantage). Class A vehicles score 5–10% higher on Mission Precision (human judgment advantage). This produces competitive balance across classes.

### 4.2 Score Color Coding (Live Display)

| Composite Score | Color | Status |
|----------------|-------|--------|
| > 85 | Green | Elite performance |
| 70–85 | Orange | Competitive |
| < 70 | Red | Below threshold |

### 4.3 Race Result Determination

**Within each class, ranking is determined by:**
1. **Laps completed** (primary)
2. **MRSSP composite score** (tiebreaker for equal laps)
3. **Last lap time** (final tiebreaker)

**Overall (cross-class) leaderboard:** Composite score only — for MRSSP protocol demonstration purposes. No cross-class prize awarded (see Part 6).

---

## Part 5: Safety Rules

### 5.1 MRSSP Safety Protocol Authority

**The MRSSP safety protocol has supreme authority over all race decisions.** Race Control and drivers/operators must comply with all MRSSP safety commands without exception or appeal.

### 5.2 Three-Level Abort Sequence

When MRSSP or Race Control determines a safety hazard:

| Level | Trigger | Action | Duration |
|-------|---------|--------|---------|
| **Level 1** | Vehicle auto-land triggered | Affected vehicle(s) cease racing, initiate controlled landing | T+0 |
| **Level 2** | Ground station override confirmed | RSO confirms abort, vehicle enters recovery trajectory | T+1.5s |
| **Level 3** | Recovery complete | Vehicles resume from safe position or pit lane | T+5s |

**Level 1 triggers (automatic):**
- Altitude band violation (Class A below 30m AGL or Class B above 30m AGL)
- Separation violation (within minimum thresholds)
- Battery/fuel below 15% reserve
- Communication link loss >2 seconds (Class B only)
- MRSSP monitoring detects collision course (predicted T-impact <10 seconds)

**Level 1 triggers (manual — Race Control):**
- Weather limit exceedance
- Track obstruction
- Medical emergency
- At Race Director's discretion

**Abort penalty:** Aborted vehicle's Recovery Index score drops to 40. Recovery is +5 per 500ms scoring tick. Vehicle may rejoin if within 10 seconds of abort trigger (Level 1 only).

### 5.3 Red Flag (Full Race Stop)

Race Control may declare a Red Flag (full race stop) if:
- Multiple simultaneous aborts (3+ vehicles)
- Circuit breach (vehicle outside designated airspace)
- Emergency landing on circuit
- Medical emergency on circuit or in spectator areas

On Red Flag: all vehicles proceed to nearest safe landing zone. Race may be restarted (2 warm-up laps) or declared result stands at last completed lap.

### 5.4 Safety Equipment Requirements

**Class A Mandatory:**
- Helmet (meets FIA or equivalent standard)
- Fire-resistant race suit
- 4-point safety harness (Airspeeder) or full enclosure (Jetson ONE)
- Emergency transponder (ELT equivalent, auto-activates on impact)

**Class B Mandatory:**
- Ground station operator with RSO (Remote Safety Officer) certification
- Backup kill switch (hardware, <1 second activation)
- Position lights (strobe, visible 1nm)
- Automatic parachute system (for vehicles >10kg, altitude >15m)

---

## Part 6: Prize Structure

### 6.1 Season Points System

Points awarded per race event within each class:

| Position | Points |
|----------|--------|
| 1st | 25 |
| 2nd | 18 |
| 3rd | 15 |
| 4th | 12 |
| 5th | 10 |
| 6th | 8 |
| 7th | 6 |
| 8th | 4 |
| 9th | 2 |
| 10th | 1 |
| Fastest lap bonus | +1 |
| MRSSP score >90 bonus | +2 |

### 6.2 Prize Fund (Inaugural Season)

**Total prize pool: $500,000 USD**

| Award | Amount | Criteria |
|-------|--------|---------|
| Class A Season Champion | $150,000 | Most points, Class A |
| Class A Runner-Up | $75,000 | Second points, Class A |
| Class A Third Place | $40,000 | Third points, Class A |
| Class B Season Champion | $100,000 | Most points, Class B |
| Class B Runner-Up | $50,000 | Second points, Class B |
| Class B Third Place | $30,000 | Third points, Class B |
| MRSSP Excellence Award | $30,000 | Highest average composite score, full season |
| AAMI Safety Award | $25,000 | Fewest safety events, cleanest protocol record |

**Prize distribution:** Settled via MRSS smart contract within 4.5 seconds of season-end confirmation. Distributed in USD equivalent (stablecoin) or wire transfer per operator election.

### 6.3 Revenue Sharing Model

Per-event revenue split (mirroring MRSSP commercial protocol):

| Stakeholder | Share | Purpose |
|------------|-------|---------|
| Alpha Edge (Platform) | 50% | Platform operations, prize fund contribution |
| Airspeeder / Jetson ONE | 20% | Vehicle manufacturer partnership |
| AAMI | 15% | Certification and regulatory overhead |
| City/Venue | 10% | Venue access and local authority fees |
| Race teams | 5% | Supplemental team support fund |

---

## Part 7: Technical Regulations

### 7.1 Vehicle Homologation

All vehicles must be homologated by the MRCP Technical Committee (Alpha Edge + AAMI) before competing. Homologation covers:

- Airworthiness certification (country of origin + MRCP-specific assessment)
- MRSSP telemetry interface (vehicle must transmit required data fields)
- Safety systems certification (abort response, parachute, ELT)
- Performance classification (speed factor assigned by technical testing)

**Homologation application:** Submit to mrcp-technical@alpha-edge.ai minimum 60 days before first intended race.

### 7.2 Required Telemetry Output

All vehicles must transmit the following data at minimum 10Hz to the MRSSP scoring engine:

| Data Field | Rate | Unit |
|-----------|------|------|
| GPS position (lat/lon/alt) | 10 Hz | Decimal degrees / ft AGL |
| Ground speed | 10 Hz | km/h |
| Battery/fuel state of charge | 1 Hz | % remaining |
| Vehicle health status | 1 Hz | OK / WARNING / CRITICAL |
| Pilot/operator ID | On change | String |
| Abort status | On event | Boolean |

### 7.3 Prohibited Modifications

- No modifications to MRSSP telemetry output (tampering = disqualification + blacklist)
- No altitude band spoofing
- No signal jamming or interference with other vehicles
- No ground station AI that exploits MRSSP scoring predictability (algorithmic manipulation)

---

## Part 8: Broadcast & Media Rights

### 8.1 Official Broadcast Partner

MRCP events are broadcast live via the Alpha Edge streaming platform and partner networks. All broadcast data is sourced directly from the MRSSP live feed — scores, gate activations, and telemetry are real and unmodified.

### 8.2 Data Feed for Broadcasters

Official broadcast partners receive a real-time MRSSP data API:
- Vehicle positions (map overlay)
- Live MRSSP scores (all 5 dimensions, updating every 500ms)
- Gate activations (trigger for camera cuts and graphic overlays)
- Abort events (special broadcast package — mandatory coverage)
- AAMI certification counter (telemetry points, compliance %)

### 8.3 Team Media Obligations

All teams are required to:
- Provide on-board camera footage (if technically feasible per vehicle class)
- Make drivers/operators available for post-race interviews (minimum 15 minutes)
- Display MRCP and AAMI branding on vehicles (location specified in homologation)

---

## Part 9: Governance & Dispute Resolution

### 9.1 Stewards Panel

Each race event is governed by a 3-person Stewards Panel:
- 1 Alpha Edge Race Director
- 1 AAMI-appointed independent steward
- 1 Competitor-elected representative (elected before each season)

### 9.2 Dispute Process

1. **Protest filed** within 30 minutes of race result publication
2. **MRSSP blockchain record pulled** — on-chain data is primary evidence
3. **Stewards deliberate** — maximum 60 minutes
4. **Decision published** — posted to MRCP official channels and blockchain
5. **No further appeal** (blockchain record is immutable — final)

### 9.3 Penalties

| Infringement | Penalty |
|-------------|---------|
| Altitude band violation (unintentional) | 10-second time penalty |
| Altitude band violation (deliberate) | Disqualification from event |
| Telemetry tampering | Season disqualification + 2-year ban |
| Safety protocol non-compliance | Event disqualification |
| Unsporting conduct | Warning → points deduction → ban |

---

## Appendix A: MRSSP Gate Mission Briefings (Racing Context)

| Gate | MRSSP Phase | Mission Brief (Racing) |
|------|-------------|----------------------|
| G1 START/FINISH | Race Start — Data Capture | Maximum acceleration zone; all scoring dimensions reset |
| G2 Sector 1 Entry | Technical Zone — Assessment | Precision sector — tight line rewarded in Mission Precision score |
| G3 Apex A | Power Sector — Execution | Full throttle run; Gate Time score heavily weighted here |
| G4 Apex B | Strategy — Road-Map | Energy management critical; Decision Speed tested by routing options |
| G5 Ring Exit | Final Push — Optimization | Recovery index tested; final sector before START/FINISH |

---

## Appendix B: Contact Directory

| Role | Contact |
|------|---------|
| Technical Regulations | mrcp-technical@alpha-edge.ai |
| Entry & Homologation | mrcp-entries@alpha-edge.ai |
| Media & Broadcast | mrcp-media@alpha-edge.ai |
| AAMI Certification | certification@aami-institute.org |
| Safety & Protest | mrcp-stewards@alpha-edge.ai |

---

*MRCP Commercial Rulebook v1.0 · Alpha Edge AI × AAMI · March 2026*
*Classification: Public · Effective Q2 2026 Inaugural Season*
*Alpha Edge × Airspeeder × Jetson ONE × AAMI*
