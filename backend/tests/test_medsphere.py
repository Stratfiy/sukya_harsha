"""MedSphere backend API regression tests (pytest)."""
import os
import uuid
import time
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://medic-interact-hub.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@medsphere.com", "password": "admin123"}
PATIENT = {"email": "patient@test.com", "password": "password123"}
DOCTOR = {"email": "aanya.sharma@medsphere.com", "password": "password123"}


def _session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _login(s, creds):
    r = s.post(f"{API}/auth/login", json=creds)
    return r


# -------- Health --------
def test_health():
    r = requests.get(f"{API}/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_root():
    r = requests.get(f"{API}/")
    assert r.status_code == 200
    assert "MedSphere" in r.json().get("message", "")


# -------- Auth --------
def test_register_patient_and_login_and_me_and_logout():
    s = _session()
    unique = uuid.uuid4().hex[:8]
    email = f"TEST_patient_{unique}@example.com"
    payload = {"email": email, "password": "Passw0rd!", "name": "Test Reg Patient", "role": "patient"}
    r = s.post(f"{API}/auth/register", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    # Server lowercases emails
    assert data["email"] == email.lower() and data["role"] == "patient" and "id" in data
    email = email.lower()

    # /auth/me via cookie
    r2 = s.get(f"{API}/auth/me")
    assert r2.status_code == 200
    assert r2.json()["email"] == email

    # logout
    r3 = s.post(f"{API}/auth/logout")
    assert r3.status_code == 200

    # me should now fail
    s2 = _session()  # fresh session, no cookies
    r4 = s2.get(f"{API}/auth/me")
    assert r4.status_code == 401

    # Re-login
    r5 = s.post(f"{API}/auth/login", json={"email": email, "password": "Passw0rd!"})
    assert r5.status_code == 200


def test_register_doctor_creates_doctor_profile_unapproved():
    s = _session()
    unique = uuid.uuid4().hex[:8]
    email = f"TEST_doc_{unique}@example.com"
    payload = {
        "email": email, "password": "Passw0rd!", "name": "Dr. Test Doc",
        "role": "doctor", "specialty": "Cardiology",
        "hospital": "Test Hospital", "experience_years": 7,
    }
    r = s.post(f"{API}/auth/register", json=payload)
    assert r.status_code == 200, r.text
    user_id = r.json()["id"]

    # Doctor profile exists but unapproved → not in public listing
    rlist = requests.get(f"{API}/doctors?approved_only=true")
    assert rlist.status_code == 200
    assert all(d["id"] != user_id for d in rlist.json())

    # get /doctors/me/profile while logged in
    rprof = s.get(f"{API}/doctors/me/profile")
    assert rprof.status_code == 200
    assert rprof.json()["approved"] is False


def test_duplicate_email_register_rejected():
    s = _session()
    r = s.post(f"{API}/auth/register", json={
        "email": "patient@test.com", "password": "password123",
        "name": "Dup", "role": "patient",
    })
    assert r.status_code == 400


# -------- Doctors --------
def test_list_doctors_seeded():
    r = requests.get(f"{API}/doctors")
    assert r.status_code == 200
    docs = r.json()
    assert len(docs) >= 8
    # Each doc should not contain _id
    for d in docs:
        assert "_id" not in d


def test_specialties_endpoint():
    r = requests.get(f"{API}/doctors/specialties")
    assert r.status_code == 200
    sp = r.json()
    assert "Cardiology" in sp


def test_filter_doctors_by_specialty_and_q():
    r = requests.get(f"{API}/doctors", params={"specialty": "Cardiology", "q": "Aanya"})
    assert r.status_code == 200
    res = r.json()
    assert len(res) >= 1
    assert res[0]["specialty"] == "Cardiology"


def test_get_doctor_by_id_404():
    r = requests.get(f"{API}/doctors/nonexistent-id")
    assert r.status_code == 404


# -------- Doctor self-management --------
def test_doctor_login_profile_and_availability_update():
    s = _session()
    r = _login(s, DOCTOR)
    assert r.status_code == 200, r.text
    rprof = s.get(f"{API}/doctors/me/profile")
    assert rprof.status_code == 200
    prof = rprof.json()
    original_slots = prof.get("available_slots", [])
    assert isinstance(original_slots, list)

    # Update with new slots
    from datetime import datetime, timezone, timedelta
    new_slots = [(datetime.now(timezone.utc) + timedelta(days=2 + i, hours=10)).isoformat() for i in range(3)]
    r2 = s.put(f"{API}/doctors/me/availability", json={"available_slots": new_slots})
    assert r2.status_code == 200
    assert r2.json()["available_slots"] == new_slots

    # Verify via GET
    rprof2 = s.get(f"{API}/doctors/me/profile")
    assert rprof2.json()["available_slots"] == new_slots

    # restore original (so other tests can book)
    s.put(f"{API}/doctors/me/availability", json={"available_slots": original_slots or new_slots})


# -------- Appointments & Prescriptions --------
def test_booking_flow_role_checks_and_slot_removal():
    # Patient logs in
    sp = _session()
    rp = _login(sp, PATIENT)
    assert rp.status_code == 200

    # Pick Aanya (cardiology)
    docs = requests.get(f"{API}/doctors", params={"q": "Aanya"}).json()
    assert len(docs) > 0
    aanya = docs[0]
    if not aanya["available_slots"]:
        # repopulate
        sd = _session(); _login(sd, DOCTOR)
        from datetime import datetime, timezone, timedelta
        slots = [(datetime.now(timezone.utc) + timedelta(days=3, hours=10 + i)).isoformat() for i in range(3)]
        sd.put(f"{API}/doctors/me/availability", json={"available_slots": slots})
        aanya = requests.get(f"{API}/doctors/{aanya['id']}").json()

    slot = aanya["available_slots"][0]
    r = sp.post(f"{API}/appointments", json={
        "doctor_id": aanya["id"], "slot_time": slot, "reason": "Chest pain",
    })
    assert r.status_code == 200, r.text
    appt = r.json()
    assert appt["status"] == "confirmed"
    assert appt["patient_id"] and appt["doctor_id"] == aanya["id"]

    # Slot must be removed
    refreshed = requests.get(f"{API}/doctors/{aanya['id']}").json()
    assert slot not in refreshed["available_slots"]

    # Patient can list own appointments
    rl = sp.get(f"{API}/appointments")
    assert rl.status_code == 200
    assert any(a["id"] == appt["id"] for a in rl.json())

    # Doctor (other role) cannot book
    sd = _session(); _login(sd, DOCTOR)
    rdoc_book = sd.post(f"{API}/appointments", json={"doctor_id": aanya["id"], "slot_time": slot})
    assert rdoc_book.status_code == 403

    # Wrong patient cannot update this appointment
    sp2 = _session()
    unique = uuid.uuid4().hex[:6]
    sp2.post(f"{API}/auth/register", json={
        "email": f"TEST_other_{unique}@example.com", "password": "Passw0rd!",
        "name": "Other Pat", "role": "patient",
    })
    rforbid = sp2.patch(f"{API}/appointments/{appt['id']}", json={"status": "cancelled"})
    assert rforbid.status_code == 403

    # Doctor can mark completed
    rcomp = sd.patch(f"{API}/appointments/{appt['id']}", json={"status": "completed", "notes": "Done"})
    assert rcomp.status_code == 200

    # Doctor creates prescription
    rpres = sd.post(f"{API}/prescriptions", json={
        "appointment_id": appt["id"], "patient_id": appt["patient_id"],
        "diagnosis": "Mild hypertension", "medications": ["Amlodipine 5mg"],
        "instructions": "Daily once",
    })
    assert rpres.status_code == 200, rpres.text

    # Patient sees prescription
    rp2 = sp.get(f"{API}/prescriptions")
    assert any(p["diagnosis"] == "Mild hypertension" for p in rp2.json())


# -------- Admin --------
def test_admin_endpoints():
    s = _session()
    r = _login(s, ADMIN)
    assert r.status_code == 200
    rs = s.get(f"{API}/admin/stats")
    assert rs.status_code == 200
    assert "users" in rs.json() and "revenue" in rs.json()

    ru = s.get(f"{API}/admin/users")
    assert ru.status_code == 200 and isinstance(ru.json(), list)

    rd = s.get(f"{API}/admin/doctors")
    assert rd.status_code == 200
    docs = rd.json()
    assert len(docs) >= 8

    # Toggle approval on first doctor
    did = docs[0]["id"]
    orig = docs[0]["approved"]
    rapp = s.patch(f"{API}/admin/doctors/{did}/approval", json={"approved": not orig})
    assert rapp.status_code == 200
    # restore
    s.patch(f"{API}/admin/doctors/{did}/approval", json={"approved": orig})


def test_non_admin_cannot_access_admin():
    s = _session(); _login(s, PATIENT)
    r = s.get(f"{API}/admin/stats")
    assert r.status_code == 403


# -------- AI Chat --------
def test_ai_chat_and_history():
    s = _session(); _login(s, PATIENT)
    r = s.post(f"{API}/ai/chat", json={"message": "What helps with mild headaches?"}, timeout=60)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "reply" in data and isinstance(data["reply"], str) and len(data["reply"]) > 10
    sid = data["session_id"]

    time.sleep(1)
    rh = s.get(f"{API}/ai/history", params={"session_id": sid})
    assert rh.status_code == 200
    hist = rh.json()
    assert len(hist) >= 1
    assert hist[0]["user_message"] == "What helps with mild headaches?"


# -------- Brute force --------
def test_brute_force_lockout():
    # Use an isolated email so we don't lock out shared seeded accounts
    s = _session()
    unique = uuid.uuid4().hex[:8]
    email = f"TEST_lock_{unique}@example.com"
    s.post(f"{API}/auth/register", json={
        "email": email, "password": "Passw0rd!", "name": "LockTest", "role": "patient",
    })

    last_code = None
    for i in range(10):
        r = requests.post(f"{API}/auth/login", json={"email": email, "password": "wrongpass"})
        last_code = r.status_code
        if r.status_code == 429:
            break
        time.sleep(0.2)
    assert last_code == 429, f"Expected 429 after several attempts, got {last_code}"
