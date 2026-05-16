# Sukhya Med — Doctor-Patient Premium Platform PRD (v2 rebuild)

## Original Problem Statement
Rebuild as Sukhya Med — a doctor-patient platform with hospital-first discovery. Glassmorphism, mint+white palette. Most-secure (medical data). Reference: ai4invest.in. Color: #EEFBF3, #D4F5E2, #34C472, white. Typography: Instrument Serif headlines + Outfit body.

## Architecture
- **Backend**: FastAPI + MongoDB (motor) on :8001, prefix /api. Single `/app/backend/server.py`.
- **Frontend**: React 19 + React Router 7 + Tailwind + shadcn/ui + framer-motion + @react-oauth/google.
- **Auth**: JWT httpOnly cookies + bcrypt (rounds=12) + brute-force per-account + 2FA TOTP (pyotp) + CSRF (double-submit) + rate limiting (slowapi) + password complexity + audit logs.

## User Personas
- Patient: discovers care by area → hospital → doctor → books appointment → chats with AI.
- Doctor: manages weekly availability + today's mode + online toggle + prescriptions + Google Calendar sync.
- Admin: approves doctors, manages hospitals, sees stats + audit logs.

## Core Requirements
1. Email/password JWT auth with password complexity (8+ chars, upper, lower, digit, special)
2. Google OAuth (custom client) — code complete, gated until keys provided
3. Forgot/Reset password via Resend — code complete, gated; dev-mode helper exposes link
4. 2FA TOTP for doctors and admins
5. Role-based dashboards (patient / doctor / admin)
6. Hospital-based discovery: Area → Hospital → Doctor → Booking
7. Live slot computation from doctor's availability template + today_mode + blocked dates + booked slots
8. Prescriptions (immutable; voidable by doctor)
9. AI Health Assistant (Claude Sonnet 4.5 via Emergent LLM key) — patients only
10. Google Calendar OAuth flow for doctors — code complete, gated until keys
11. Admin: doctor approval queue, hospital CRUD, user enable/disable, audit log viewer
12. Security: CSRF (X-CSRF-Token header from non-httpOnly cookie), security headers (X-Content-Type-Options, X-Frame-Options, HSTS, Referrer-Policy, Permissions-Policy), per-route rate limiting

## Test Credentials
See `/app/memory/test_credentials.md`.

## What's Been Implemented (May 16, 2026 — v2 rebuild)
- ✅ Backend rewritten with all new features (single file, ~1000 lines)
- ✅ Frontend rewritten with new flow: 14 pages + 5 reusable components
- ✅ Seed: 1 admin + 1 patient + 8 doctors (pre-approved) + 5 hospitals (Vashi, Nerul, Koparkhairane, Panvel, Thane West)
- ✅ Backend tests: **25/25 pass**
- ✅ Frontend e2e tests: all critical paths pass (~95%) — no app bugs

## Backlog
- P1: Real Google Cloud credentials (user will supply) — flip from gated to live
- P1: Resend domain verification (user will supply) — flip from dev-fallback to live email
- P1: Real video consultation SDK (Daily.co / Jitsi) — currently mocked
- P2: Stripe / Razorpay for consultation fees
- P2: Patient saved doctors / favourites
- P2: Reviews & ratings UI for patients to submit feedback after visit
- P2: WebSocket real-time appointment notifications
- P2: Doctor-side rich text notes per appointment
- P2: Email scoping for rate-limit + X-Forwarded-For in slowapi `key_func`

## Known Gates (awaiting credentials)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (backend/.env) — controls Google OAuth + Google Calendar
- `RESEND_API_KEY` / `RESEND_FROM_EMAIL` (backend/.env) — controls password reset emails
- All other features fully live.
