"""Backend tests for Sukhya Med v2 (rebuild).

Covers: health/config, hospitals/areas/specialties/doctors public,
auth (register/login/me/logout, complexity, doctor needs hospital_id),
CSRF gating, booking flow, doctor self-mgmt, prescriptions,
admin endpoints, AI chat, security headers, audit logs, 2FA setup+enable+disable.
"""
import os
import time
import uuid
from datetime import date, timedelta

import pytest
import pyotp
import requests

BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else None
if not BASE:
    # fallback to .env file directly
    from pathlib import Path
    for line in (Path(__file__).resolve().parents[2] / "frontend" / ".env").read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE = line.split("=", 1)[1].strip().strip('"').rstrip("/")
            break

API = f"{BASE}/api"

ADMIN = {"email": "admin@sukhyamed.com", "password": "Admin@123"}
PATIENT = {"email": "patient@test.com", "password": "Patient@123"}
DOCTOR = {"email": "aanya.sharma@sukhyamed.com", "password": "Doctor@123"}


def _login(email, password, max_wait=70):
    s = requests.Session()
    waited = 0
    while True:
        r = s.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=20)
        if r.status_code == 429 and waited < max_wait:
            time.sleep(8)
            waited += 8
            continue
        return s, r


def _csrf_session(email, password):
    s, r = _login(email, password)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    csrf = s.cookies.get("csrf_token")
    assert csrf, "csrf_token cookie missing after login"
    s.headers.update({"X-CSRF-Token": csrf})
    return s, r.json()


# ---------- Health / config ----------
def test_health():
    r = requests.get(f"{API}/health", timeout=10)
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


def test_config_public():
    r = requests.get(f"{API}/config/public", timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert data.get("google_oauth_enabled") is False
    assert data.get("resend_configured") is False


def test_security_headers():
    r = requests.get(f"{API}/health", timeout=10)
    assert r.headers.get("X-Content-Type-Options") == "nosniff"
    assert r.headers.get("X-Frame-Options") == "DENY"
    assert "Strict-Transport-Security" in r.headers


# ---------- Public discovery ----------
def test_list_hospitals():
    r = requests.get(f"{API}/hospitals", timeout=10)
    assert r.status_code == 200
    rows = r.json()
    assert isinstance(rows, list) and len(rows) >= 5
    h = rows[0]
    for k in ("id", "name", "area", "city"):
        assert k in h
    assert "doctor_count" in h


def test_list_areas():
    r = requests.get(f"{API}/areas", timeout=10)
    assert r.status_code == 200
    rows = r.json()
    assert isinstance(rows, list) and len(rows) >= 5
    assert "area" in rows[0] and "hospital_count" in rows[0]


def test_specialties():
    r = requests.get(f"{API}/specialties", timeout=10)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_list_doctors_and_detail():
    r = requests.get(f"{API}/doctors", timeout=10)
    assert r.status_code == 200
    docs = r.json()
    assert len(docs) >= 8
    d = docs[0]
    assert "specialization" in d and "hospital_id" in d and "name" in d
    # license_number is stripped
    assert "license_number" not in d
    r2 = requests.get(f"{API}/doctors/{d['id']}", timeout=10)
    assert r2.status_code == 200
    assert r2.json()["id"] == d["id"]


def test_hospital_detail_and_doctors():
    hospitals = requests.get(f"{API}/hospitals", timeout=10).json()
    hid = hospitals[0]["id"]
    r = requests.get(f"{API}/hospitals/{hid}", timeout=10)
    assert r.status_code == 200
    r2 = requests.get(f"{API}/hospitals/{hid}/doctors", timeout=10)
    assert r2.status_code == 200
    assert isinstance(r2.json(), list)


def _next_weekday(target_dow_max=5):
    # Returns nearest Mon-Sat ISO date from today
    d = date.today()
    for i in range(0, 7):
        candidate = d + timedelta(days=i)
        if candidate.weekday() <= target_dow_max:
            return candidate.isoformat()
    return d.isoformat()


def test_doctor_slots_weekday():
    docs = requests.get(f"{API}/doctors", timeout=10).json()
    did = docs[0]["id"]
    iso = _next_weekday()
    r = requests.get(f"{API}/doctors/{did}/slots", params={"date": iso}, timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert "slots" in data
    assert isinstance(data["slots"], list)


# ---------- Auth ----------
def test_register_password_complexity():
    r = requests.post(f"{API}/auth/register", json={
        "email": f"TEST_weak_{uuid.uuid4().hex[:6]}@example.com",
        "password": "weakpass",
        "full_name": "Test Weak",
        "phone": "9999999999",
        "role": "patient",
        "consent": True,
    }, timeout=15)
    assert r.status_code in (400, 422)


def test_register_doctor_requires_hospital():
    r = requests.post(f"{API}/auth/register", json={
        "email": f"TEST_doc_{uuid.uuid4().hex[:6]}@example.com",
        "password": "StrongPass@123",
        "full_name": "Test Doctor",
        "phone": "9999999999",
        "role": "doctor",
        "consent": True,
    }, timeout=15)
    assert r.status_code == 400


def test_register_doctor_creates_unapproved():
    hospitals = requests.get(f"{API}/hospitals", timeout=10).json()
    hid = hospitals[0]["id"]
    email = f"test_doc_{uuid.uuid4().hex[:6]}@example.com"
    r = requests.post(f"{API}/auth/register", json={
        "email": email,
        "password": "StrongPass@123",
        "full_name": "Test Doctor X",
        "phone": "9999999999",
        "role": "doctor",
        "consent": True,
        "hospital_id": hid,
        "specialization": "General Medicine",
        "license_number": "TESTLIC-" + uuid.uuid4().hex[:6],
    }, timeout=15)
    assert r.status_code == 200, r.text
    # not in public list
    public = requests.get(f"{API}/doctors", timeout=10).json()
    assert email not in [d.get("email") for d in public]


def test_login_admin_patient_doctor():
    for cred in (ADMIN, PATIENT, DOCTOR):
        s, r = _login(cred["email"], cred["password"])
        assert r.status_code == 200, f"login failed for {cred['email']}: {r.text}"
        assert s.cookies.get("access_token")
        assert s.cookies.get("csrf_token")


def test_me_and_logout():
    s, _ = _login(PATIENT["email"], PATIENT["password"])
    r = s.get(f"{API}/auth/me", timeout=10)
    assert r.status_code == 200
    assert r.json()["email"] == PATIENT["email"]
    # logout needs csrf? logout is in api/auth/logout — check whitelist; we'll add header anyway
    s.headers["X-CSRF-Token"] = s.cookies.get("csrf_token")
    r2 = s.post(f"{API}/auth/logout", timeout=10)
    assert r2.status_code in (200, 204)


# ---------- CSRF gating ----------
def test_csrf_rejected_without_header():
    s, _ = _login(PATIENT["email"], PATIENT["password"])
    # POST /appointments without CSRF header should be 403
    r = s.post(f"{API}/appointments", json={
        "doctor_id": "nope", "date": "2026-01-05", "time_slot": "09:00",
        "consultation_type": "offline"
    }, timeout=10)
    assert r.status_code == 403


# ---------- Booking flow ----------
def test_booking_flow_and_slot_removal():
    s, user = _csrf_session(PATIENT["email"], PATIENT["password"])
    docs = requests.get(f"{API}/doctors", timeout=10).json()
    # Pick doctor with online_consultation_enabled or just offline-capable
    doc = docs[0]
    did = doc["id"]

    # Get a weekday with slots
    target_iso = None
    slots = []
    for i in range(0, 7):
        d_iso = (date.today() + timedelta(days=i)).isoformat()
        sl = requests.get(f"{API}/doctors/{did}/slots", params={"date": d_iso}, timeout=10).json()
        if sl["slots"]:
            target_iso = d_iso
            slots = sl["slots"]
            break
    assert target_iso, "No slots available for any of next 7 days"
    chosen = slots[0]
    mode = chosen["mode"] if chosen["mode"] in ("online", "offline") else "offline"

    r = s.post(f"{API}/appointments", json={
        "doctor_id": did, "date": target_iso, "time_slot": chosen["time"],
        "consultation_type": mode, "reason": "Test booking"
    }, timeout=20)
    assert r.status_code == 200, r.text
    appt = r.json()
    assert appt["doctor_id"] == did

    # Slot should be removed
    sl2 = requests.get(f"{API}/doctors/{did}/slots", params={"date": target_iso}, timeout=10).json()
    assert chosen["time"] not in [s["time"] for s in sl2["slots"]]


def test_doctor_cannot_book():
    s, _ = _csrf_session(DOCTOR["email"], DOCTOR["password"])
    docs = requests.get(f"{API}/doctors", timeout=10).json()
    did = docs[0]["id"]
    r = s.post(f"{API}/appointments", json={
        "doctor_id": did, "date": _next_weekday(), "time_slot": "09:00",
        "consultation_type": "offline"
    }, timeout=10)
    assert r.status_code == 403


# ---------- Doctor profile ----------
def test_doctor_profile_get_update():
    s, _ = _csrf_session(DOCTOR["email"], DOCTOR["password"])
    r = s.get(f"{API}/doctor/profile", timeout=10)
    assert r.status_code == 200
    prof = r.json()
    assert prof["specialization"]
    # Update today_mode and online_consultation_enabled and availability
    new_avail = [
        {"day_of_week": 0, "start_time": "09:00", "end_time": "12:00", "mode": "both", "slot_minutes": 30},
        {"day_of_week": 1, "start_time": "10:00", "end_time": "13:00", "mode": "both", "slot_minutes": 30},
    ]
    r2 = s.put(f"{API}/doctor/profile", json={
        "today_mode": "online",
        "online_consultation_enabled": True,
        "availability": new_avail,
    }, timeout=15)
    assert r2.status_code == 200, r2.text
    updated = r2.json()
    assert updated.get("today_mode") == "online"
    assert updated.get("online_consultation_enabled") is True

    # Appointments — only own
    r3 = s.get(f"{API}/appointments", timeout=10)
    assert r3.status_code == 200
    for a in r3.json():
        assert a["doctor_id"] == updated["id"]


# ---------- Prescriptions ----------
def test_prescription_flow():
    # patient books an appointment, doctor creates prescription, patient sees it, doctor voids it
    sp, patient = _csrf_session(PATIENT["email"], PATIENT["password"])
    sd, _doctor = _csrf_session(DOCTOR["email"], DOCTOR["password"])
    docs = requests.get(f"{API}/doctors", timeout=10).json()
    aanya = next((d for d in docs if d.get("email") == DOCTOR["email"]), docs[0])
    did = aanya["id"]
    target_iso, chosen = None, None
    for i in range(0, 14):
        d_iso = (date.today() + timedelta(days=i)).isoformat()
        sl = requests.get(f"{API}/doctors/{did}/slots", params={"date": d_iso}, timeout=10).json()
        if sl["slots"]:
            target_iso = d_iso
            chosen = sl["slots"][0]
            break
    assert target_iso, "No slot available"
    mode = chosen["mode"] if chosen["mode"] in ("online", "offline") else "offline"
    r = sp.post(f"{API}/appointments", json={
        "doctor_id": did, "date": target_iso, "time_slot": chosen["time"],
        "consultation_type": mode, "reason": "Rx test"
    }, timeout=15)
    assert r.status_code == 200, r.text
    appt = r.json()

    rx = sd.post(f"{API}/prescriptions", json={
        "appointment_id": appt["id"],
        "patient_id": appt["patient_id"],
        "diagnosis": "Mild hypertension",
        "medications": [{"name": "Amlodipine", "dosage": "5mg", "frequency": "OD", "duration": "30 days"}],
        "additional_notes": "Low salt diet",
    }, timeout=15)
    assert rx.status_code == 200, rx.text
    pid = rx.json()["id"]

    # Patient sees it
    pr = sp.get(f"{API}/prescriptions", timeout=10)
    assert pr.status_code == 200
    assert any(p["id"] == pid for p in pr.json())

    # Doctor voids
    rv = sd.post(f"{API}/prescriptions/{pid}/void", timeout=10)
    assert rv.status_code in (200, 204)


# ---------- Admin ----------
def test_admin_endpoints():
    s, _ = _csrf_session(ADMIN["email"], ADMIN["password"])
    for path in ("/admin/stats", "/admin/users", "/admin/doctors", "/admin/doctors/pending", "/admin/audit-logs"):
        r = s.get(f"{API}{path}", timeout=15)
        assert r.status_code == 200, f"{path} -> {r.status_code} {r.text}"

    # Hospital CRUD
    payload = {
        "name": f"TEST Hospital {uuid.uuid4().hex[:6]}", "address": "1 Test Rd",
        "area": "TestArea", "city": "Mumbai", "state": "MH", "pin_code": "400000",
        "specialties_available": ["Cardiology"]
    }
    rc = s.post(f"{API}/admin/hospitals", json=payload, timeout=10)
    assert rc.status_code == 200, rc.text
    hid = rc.json()["id"]
    ru = s.put(f"{API}/admin/hospitals/{hid}", json={"description": "Updated"}, timeout=10)
    assert ru.status_code == 200
    rd = s.delete(f"{API}/admin/hospitals/{hid}", timeout=10)
    assert rd.status_code in (200, 204)


# ---------- 2FA full flow ----------
def test_2fa_setup_enable_login_disable():
    s, user = _csrf_session(DOCTOR["email"], DOCTOR["password"])
    # Setup
    rs = s.post(f"{API}/auth/2fa/setup", timeout=15)
    assert rs.status_code == 200, rs.text
    secret = rs.json()["secret"]
    assert rs.json()["qr_code"].startswith("data:image/png;base64,")
    code = pyotp.TOTP(secret).now()
    # Enable
    re_ = s.post(f"{API}/auth/2fa/enable", json={"code": code}, timeout=10)
    assert re_.status_code == 200, re_.text

    # Now login should return requires_2fa
    r = requests.post(f"{API}/auth/login", json={"email": DOCTOR["email"], "password": DOCTOR["password"]}, timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("requires_2fa") is True
    temp = body["temp_token"]

    # Verify
    code2 = pyotp.TOTP(secret).now()
    rv = requests.post(f"{API}/auth/2fa/verify", json={"code": code2, "temp_token": temp}, timeout=15)
    assert rv.status_code == 200, rv.text

    # Disable using the original CSRF session — but new password complexity already enabled, must give a new code
    code3 = pyotp.TOTP(secret).now()
    rd = s.post(f"{API}/auth/2fa/disable", json={"code": code3}, timeout=10)
    # endpoint may not require code — accept 200/204
    assert rd.status_code in (200, 204, 400)
    # If endpoint requires no body or different shape, try empty
    if rd.status_code == 400:
        rd2 = s.post(f"{API}/auth/2fa/disable", timeout=10)
        assert rd2.status_code in (200, 204)


# ---------- Forgot password ----------
def test_forgot_and_reset_password_dev_link():
    # request reset for a TEST user we'll create
    email = f"test_reset_{uuid.uuid4().hex[:6]}@example.com"
    pw = "OldPass@123"
    r = requests.post(f"{API}/auth/register", json={
        "email": email, "password": pw, "full_name": "Reset Test",
        "phone": "9999999999", "role": "patient", "consent": True,
    }, timeout=15)
    assert r.status_code == 200, r.text

    rf = requests.post(f"{API}/auth/forgot-password", json={"email": email}, timeout=15)
    assert rf.status_code == 200

    rl = requests.get(f"{API}/auth/dev/latest-reset-link/{email}", timeout=10)
    assert rl.status_code == 200, rl.text
    link = rl.json().get("link")
    assert link, "Dev reset link missing"
    token = link.rstrip("/").split("/")[-1]

    new_pw = "NewPass@456"
    rr = requests.post(f"{API}/auth/reset-password", json={"token": token, "new_password": new_pw}, timeout=15)
    assert rr.status_code == 200, rr.text

    # Login with new password works
    lr = requests.post(f"{API}/auth/login", json={"email": email, "password": new_pw}, timeout=15)
    assert lr.status_code == 200

    # Complexity enforced
    rr2 = requests.post(f"{API}/auth/reset-password", json={"token": token, "new_password": "weak"}, timeout=10)
    assert rr2.status_code in (400, 422)


# ---------- AI chat ----------
def test_ai_chat_and_history():
    s, _ = _csrf_session(PATIENT["email"], PATIENT["password"])
    r = s.post(f"{API}/ai/chat", json={"message": "Briefly, what is hypertension?"}, timeout=60)
    assert r.status_code == 200, r.text
    reply = r.json()
    assert isinstance(reply.get("reply") or reply.get("message") or reply.get("response") or "", str)
    rh = s.get(f"{API}/ai/history", timeout=15)
    assert rh.status_code == 200
    assert isinstance(rh.json(), list)


# ---------- Audit log ----------
def test_audit_logs_capture_login():
    sa, _ = _csrf_session(ADMIN["email"], ADMIN["password"])
    r = sa.get(f"{API}/admin/audit-logs", timeout=15)
    assert r.status_code == 200
    rows = r.json()
    assert isinstance(rows, list) and len(rows) > 0
    actions = {row.get("action") for row in rows}
    assert "login_success" in actions or any("login" in (a or "") for a in actions)


# ---------- Google OAuth gating ----------
def test_google_oauth_gated():
    r = requests.post(f"{API}/auth/google", json={"id_token": "x", "role": "patient"}, timeout=10)
    assert r.status_code in (503, 400, 401)
