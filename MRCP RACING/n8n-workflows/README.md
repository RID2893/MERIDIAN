# MRCP n8n Workflow Pipeline

Seven n8n workflows that form the MRCP production backend. These run on n8n Cloud and together implement the complete MRSSP protocol for live race events.

## Workflow Map

```
Vehicle Telemetry (real-time)
        │
        ▼
[1] mrcp-telemetry-ingest ──► [2] mrcp-score-engine
        │                              │
        ▼                              ▼
[3] mrcp-gate-trigger          [4] mrcp-safety-monitor
        │                              │
        ▼                              ▼
[5] mrcp-broadcast-push     Safety abort if needed
        │
        ▼
[6] mrcp-audit-export (AAMI data stream)
        │
        ▼
[7] mrcp-archive-session (post-race)
```

## Workflows

| # | File | Purpose | Trigger |
|---|------|---------|---------|
| 1 | `mrcp-telemetry-ingest.json` | Receive vehicle telemetry, normalize, validate | Webhook (10Hz per vehicle) |
| 2 | `mrcp-score-engine.json` | Compute MRSSP 5-dimension scores | Every 500ms (scheduled) |
| 3 | `mrcp-gate-trigger.json` | Detect gate activations, fire mission events | On proximity (from ingest) |
| 4 | `mrcp-safety-monitor.json` | Monitor separation, trigger abort if needed | Every 100ms (scheduled) |
| 5 | `mrcp-broadcast-push.json` | Push live data to broadcast API + OBS | On score update |
| 6 | `mrcp-audit-export.json` | Stream telemetry to AAMI certification pipeline | Every 20ms (AAMI 50Hz requirement) |
| 7 | `mrcp-archive-session.json` | Post-race: consolidate, compress, upload to Algorand + S3 | On race-end webhook |

## Environment Variables Required

```
MRCP_WEBHOOK_SECRET=<signing secret for vehicle telemetry>
ALGORAND_NODE_URL=<Algorand mainnet node>
ALGORAND_API_KEY=<API key>
AAMI_CERTIFICATION_ENDPOINT=<AAMI API>
AAMI_API_KEY=<AAMI key>
BROADCAST_API_URL=<streaming platform API>
BROADCAST_API_KEY=<key>
AWS_S3_BUCKET=mrcp-race-archive
AWS_REGION=us-west-2
MRCP_RACE_ID=<set at race start>
```
