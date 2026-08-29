# MailSentinel: Email Threat Detection and Forensic Intelligence Platform

## Overview
MailSentinel is a web-based platform designed to analyze suspicious `.eml` files, providing an explainable threat assessment and forensic investigation.

## Tech Stack
- **Frontend:** React.js, Vite, Tailwind CSS, React Router
- **Backend:** Node.js, Express.js
- **Database:** MongoDB, Mongoose
- **Utilities:** Multer (upload), mailparser (EML parsing), bcryptjs (auth), JWT (session)

## Project Structure
```text
/server
  /src
    /config, /controllers, /middleware, /models, /routes, /services, /utils
/client
  /src
    /assets, /components, /context, /pages, /services
```

## Setup & Running
1. **Backend:**
   - Navigate to `/server/`.
   - Ensure MongoDB is running.
   - Run `npm install`.
   - Run `npm run dev`.
2. **Frontend:**
   - Navigate to `/client/`.
   - Run `npm install`.
   - Run `npm run dev`.

## Core Features
1. **Email Ingestion & Parsing:** Upload `.eml`, extract headers/body/URLs/attachments, compute SHA-256 evidence hash.
2. **Heuristic Analysis:** 
   - Header Forensics (SPF/DKIM/DMARC)
   - Sender/Identity (Spoofing/Lookalike detection)
   - Keyword/Pattern Analysis (Urgency, Financial, BEC)
   - URL/Attachment Risk Assessment
3. **Threat Scoring:** Deterministic, explainable 0-100 score engine.
4. **Intelligence:** Infrastructure lookups (IP/DNS caching).
5. **Correlation:** Linking related emails, campaigns, and cases.
6. **Investigation Dashboard:** Visualizing threats, breakdown, and evidence.

## Developer Roadmap
- [ ] Phase 1: Auth & Database (Complete)
- [ ] Phase 2: Ingestion & Parsing (Complete)
- [ ] Phase 3: Heuristics & Analysis (Complete)
- [ ] Phase 4: UI/UX & Integration (Complete)

*Use this file as your primary roadmap for further development.*
