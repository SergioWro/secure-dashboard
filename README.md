# Secure Dashboard (Express + SQLite + WebAuthn)

## Local Quick Start
1) `cp .env.example .env` and set `SESSION_SECRET` (long random hex).
2) `npm install`
3) `npm run dev`
4) Open `http://localhost:3000`
5) Enroll admin passkey on `/login` (fingerprint button).

## Render Deploy (high level)
- Create a Web Service from this repo, Node.js runtime.
- Add environment variables: SESSION_SECRET, RP_ID, RP_ORIGIN, COOKIE_SECURE=true, REDIS_URL (from a Render Redis instance).
- Open the Render URL, enroll passkey, add users in /admin.
