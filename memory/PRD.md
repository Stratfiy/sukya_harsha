# MedSphere — Doctor-Patient Premium Platform PRD

## Original Problem Statement
Build an interactive, relational doctor-patient platform — fully functional frontend + backend + auth + databases. Futuristic, most-secure, premium feel. Reference: https://ai4invest.in/ (glassy + advanced + simple). Light green + white color palette. Includes uploaded Design Brief PDF.

## Architecture
- **Backend**: FastAPI + MongoDB (motor) on `:8001`, prefix `/api`. JWT email/password auth (bcrypt, httpOnly cookies, brute-force protection, admin seed). Emergentintegrations + Claude Sonnet 4.5 for AI Health Assistant.
- **Frontend**: React 19 + React Router 7 + Tailwind + shadcn/ui. Glassmorphism mint palette (#EEFBF3 / #D4F5E2 / #34C472 / white). Instrument Serif headlines + Outfit body. Lucide icons.

## User Personas
- **Patient**: searches doctors, books appointments, sees prescriptions, chats with AI assistant.
- **Doctor**: manages availability, sees appointments, issues prescriptions.
- **Admin**: oversees users, approves doctors, sees analytics & revenue.

## Core Requirements
1. JWT email/password auth (register, login, logout, me, refresh, forgot/reset-password)
2. Role-based dashboards (patient / doctor / admin)
3. Doctor directory: search, filter by specialty, profile page
4. Booking flow: live slots → confirmation
5. Prescriptions issued by doctor, visible to patient
6. AI Health Assistant chat (Claude Sonnet 4.5)
7. Admin panel: stats, doctor approval, user list

## What's Been Implemented (May 15, 2026)
- ✅ Full auth (bcrypt, JWT cookies, brute-force, admin seed, password reset)
- ✅ MongoDB models: users, doctors, appointments, prescriptions, ai_messages
- ✅ 8 seeded doctors with realistic data + 5 days of availability
- ✅ Seeded admin (`admin@medsphere.com` / `admin123`) and patient (`patient@test.com` / `password123`)
- ✅ Landing, Login, Register, Doctors search, Doctor Profile + booking, Patient/Doctor/Admin dashboards
- ✅ Floating glassmorphism AI chat bubble (patient only)
- ✅ Mocked "Join consultation" button
- ✅ Custom Tailwind theme (mint palette + float/glow animations)

## Test Credentials
See `/app/memory/test_credentials.md`

## Backlog / Next Tasks
- P1: Real video consultation (Daily.co / Jitsi)
- P1: Email/SMS confirmation (Resend / Twilio)
- P2: Patient saved doctors / favorites
- P2: Reviews & ratings UI
- P2: Stripe/Razorpay payment for consultation fees
- P2: Doctor notes per appointment (separate from prescription)
- P2: Real-time appointment notifications (websocket)
- P2: 2FA for doctors and admins
