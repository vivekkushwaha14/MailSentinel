# MailSentinel Feature Implementation Tracker

This file tracks the next detection and investigation features requested for MailSentinel. Update each item when the backend, frontend, and verification steps are complete.

## Status Legend
- `Planned`: Not started.
- `In Progress`: Implementation has started.
- `Complete`: Backend, frontend, and validation are done.

## Features

| Feature | Status | Implementation Notes | Verification |
| --- | --- | --- | --- |
| Threat intelligence enrichment | Complete | Local domain/IP/hash/URL reputation enrichment is wired into analysis, persisted on `Analysis`, surfaced in investigation UI, and supports provider extension through `MAILSENTINEL_THREAT_INTEL_PROVIDER` or `registerThreatIntelProvider`. | Verified with lint, build, and server syntax checks. |
| URL redirect and sandbox-style analysis | Complete | URL analysis detects local risk signals, punycode/homographs, HTTPS gaps, suspicious params, ports, shorteners, lookalikes, and optional redirect-chain resolution with timeout/limit controls via `MAILSENTINEL_ENABLE_URL_FETCH=true`. | Verified with lint, build, and server syntax checks. |
| Email header route timeline | Complete | `Received` headers are parsed into hops, enriched with delay/anomaly metadata, persisted, and surfaced in the investigation timeline UI. | Verified with lint, build, and server syntax checks. |
| Attachment deep analysis | Complete | Attachment analysis flags MIME mismatch, risky signatures, embedded URLs, macro/archive risk, hashes, and exposes deep details in the investigation UI. | Verified with lint, build, and server syntax checks. |
| AI analyst explanation layer | Complete | Deterministic analyst summary, attack type, confidence, recommended actions, phishing probability estimate, and optional AI-provider extension through `MAILSENTINEL_AI_PROVIDER` or `registerAiProvider` are implemented. | Verified with lint, build, and server syntax checks. |
| Brand impersonation detection | Complete | Brand dictionary, display-name checks, reply-to/return-path mismatch, and sender/URL lookalike scoring are implemented. | Verified with lint, build, and server syntax checks. |
| Campaign correlation graph | Complete | Campaign graph API and React Flow visualization for shared indicators/emails are implemented. | Verified with lint, build, and server syntax checks. |
| Analyst verdict feedback | Complete | Analyst verdict, confidence, notes, reviewer, and review timestamp are stored and editable from the investigation UI. | Verified with lint, build, and server syntax checks. |
| Configurable rule engine | Complete | Rule metadata is visible/editable through API/UI, scoring consumes rule settings, and updates persist to `server/data/detectionRules.json`. | Verified with lint, build, and server syntax checks. |
| Detection report export | Complete | JSON report, IOC CSV export, and printable HTML report are implemented and downloadable from the investigation UI. | Verified with lint, build, and server syntax checks. |
| IP geolocation intelligence | Complete | IP intelligence resolves local geolocation metadata, supports a provider extension through `MAILSENTINEL_IP_GEO_PROVIDER` or `registerIpGeolocationProvider`, stores geo details on cached IP intel and email analyses, and displays IP locations in the investigation UI map/list. | Verified with lint, build, server syntax checks, Rules API check, IP intel API check, and upload/fetch smoke test. |

## Running Verification

Use these commands after implementation:

```bash
cd client && npm run lint && npm run build
cd server && find src -name '*.js' -exec node --check {} \;
```
