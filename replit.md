# RINGS Multi-City Network Simulator

## Overview
A 3D air traffic network simulator that visualizes aircraft flowing between two cities (San Diego and Los Angeles) through pipeline routes. Built with React, Three.js, and Zustand.

## Current State
The application is a fully functional 3D simulation with:
- Two city rings (San Diego and Los Angeles) with 112 gates each
- Aircraft orbiting rings, descending to gates, and transiting between cities
- N-S and E-W pipeline routes with animated flow particles
- Real-time metrics dashboard and event logging
- Simulation controls (Play/Pause/Reset, speed multipliers)

## Project Architecture

### Client Structure
```
client/src/
├── components/
│   ├── game/
│   │   ├── Aircraft.tsx     # 3D aircraft rendering (cones)
│   │   ├── CityRing.tsx     # City ring with gates
│   │   ├── HUD.tsx          # UI overlay (controls, metrics, events)
│   │   ├── Pipeline.tsx     # Pipeline routes with flow animation
│   │   └── Scene.tsx        # Main 3D scene setup
│   └── ui/                  # Reusable UI components
├── lib/
│   └── stores/
│       └── useSimulation.tsx # Zustand store for simulation state
├── App.tsx                  # Root component
└── index.css               # Futuristic themed styles
```

### Key Technologies
- **React Three Fiber**: 3D rendering with React
- **Drei**: Three.js utilities and helpers
- **Zustand**: State management for simulation
- **Tailwind CSS**: Styling (with custom futuristic theme)

## Simulation Logic

### Aircraft States
- `in_ring`: Orbiting around a city ring
- `descending`: Moving down to assigned gate
- `landed`: Parked at a gate
- `ascending`: Taking off from gate
- `in_pipeline`: Traveling between cities

### Gate Status Colors
- **GREEN**: Available for landing
- **YELLOW**: Congested area
- **RED**: Occupied or blocked

### Pipelines
- N-S Pipeline: San Diego North → Los Angeles North
- E-W Pipeline: San Diego East → Los Angeles West

## Running the Application
Start the development server:
```bash
npm run dev
```

The app will be available at http://0.0.0.0:5000

## Controls
- **Play/Pause**: Start or stop simulation
- **Reset**: Return to initial state
- **Speed**: 1x, 2x, 4x, 10x time acceleration
- **Scenario**: Different traffic patterns (future feature)
- **Camera**: Drag to rotate, scroll to zoom, shift+drag to pan

## Recent Changes
- Initial implementation of full simulation system
- 3D visualization of city rings, gates, aircraft, and pipelines
- Real-time metrics tracking and event logging
- Futuristic cyan/magenta themed UI

## User Preferences
- None recorded yet
