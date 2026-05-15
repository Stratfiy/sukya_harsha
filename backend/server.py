from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
import uuid
import secrets
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from emergentintegrations.llm.chat import LlmChat, UserMessage


# ---------------- Setup ----------------
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

mongo_url = os.environ["MONGO_URL"]
mongo_client = AsyncIOMotorClient(mongo_url)
db = mongo_client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
EMERGENT_LLM_KEY = os.environ["EMERGENT_LLM_KEY"]

app = FastAPI(title="MedSphere API")
api = APIRouter(prefix="/api")


# ---------------- Helpers ----------------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id, "email": email, "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=12),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", max_age=12 * 3600, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True, samesite="none", max_age=7 * 24 * 3600, path="/")


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def require_role(*roles):
    async def dep(user: dict = Depends(get_current_user)):
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return dep


# ---------------- Models ----------------
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=2)
    role: str = Field(pattern="^(patient|doctor)$")
    phone: Optional[str] = None
    # Doctor-only fields (used when role=doctor)
    specialty: Optional[str] = None
    hospital: Optional[str] = None
    experience_years: Optional[int] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=6)


class DoctorPublic(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: Optional[str] = None
    specialty: str
    hospital: str
    experience_years: int
    rating: float
    reviews_count: int
    bio: str
    image_url: str
    consultation_fee: int
    languages: List[str] = []
    available_slots: List[str] = []
    approved: bool = True


class DoctorAvailabilityUpdate(BaseModel):
    available_slots: List[str]  # list of ISO datetime strings


class AppointmentCreate(BaseModel):
    doctor_id: str
    slot_time: str  # ISO datetime
    reason: Optional[str] = None


class AppointmentUpdate(BaseModel):
    status: Optional[str] = None  # confirmed, completed, cancelled
    notes: Optional[str] = None


class PrescriptionCreate(BaseModel):
    appointment_id: str
    patient_id: str
    diagnosis: str
    medications: List[str]
    instructions: Optional[str] = None


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class DoctorApprovalUpdate(BaseModel):
    approved: bool


# ---------------- Auth Endpoints ----------------
@api.post("/auth/register")
async def register(req: RegisterRequest, response: Response):
    email = req.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": email,
        "password_hash": hash_password(req.password),
        "name": req.name,
        "role": req.role,
        "phone": req.phone,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)

    # If doctor, also create a doctor profile (unapproved by default)
    if req.role == "doctor":
        doctor_doc = {
            "id": user_id,
            "user_id": user_id,
            "name": req.name,
            "email": email,
            "specialty": req.specialty or "General Physician",
            "hospital": req.hospital or "Independent Practice",
            "experience_years": req.experience_years or 1,
            "rating": 5.0,
            "reviews_count": 0,
            "bio": f"Dr. {req.name} is a {req.specialty or 'General Physician'} with {req.experience_years or 1}+ years of experience.",
            "image_url": "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&q=80",
            "consultation_fee": 1500,
            "languages": ["English"],
            "available_slots": [],
            "approved": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.doctors.insert_one(doctor_doc)

    access = create_access_token(user_id, email, req.role)
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh)
    return {
        "id": user_id, "email": email, "name": req.name, "role": req.role, "phone": req.phone,
        "access_token": access,
    }


@api.post("/auth/login")
async def login(req: LoginRequest, request: Request, response: Response):
    email = req.email.lower()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"

    # Brute force check
    attempts = await db.login_attempts.find_one({"identifier": identifier})
    if attempts and attempts.get("locked_until"):
        locked_until = datetime.fromisoformat(attempts["locked_until"])
        if locked_until > datetime.now(timezone.utc):
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again later.")

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(req.password, user["password_hash"]):
        # Record failed attempt
        new_count = (attempts["count"] + 1) if attempts else 1
        update = {"identifier": identifier, "count": new_count, "updated_at": datetime.now(timezone.utc).isoformat()}
        if new_count >= 5:
            update["locked_until"] = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
            update["count"] = 0
        await db.login_attempts.update_one({"identifier": identifier}, {"$set": update}, upsert=True)
        raise HTTPException(status_code=401, detail="Invalid email or password")

    await db.login_attempts.delete_one({"identifier": identifier})

    access = create_access_token(user["id"], user["email"], user["role"])
    refresh = create_refresh_token(user["id"])
    set_auth_cookies(response, access, refresh)
    return {
        "id": user["id"], "email": user["email"], "name": user["name"],
        "role": user["role"], "phone": user.get("phone"),
        "access_token": access,
    }


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out"}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@api.post("/auth/refresh")
async def refresh_token_endpoint(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        access = create_access_token(user["id"], user["email"], user["role"])
        response.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", max_age=12 * 3600, path="/")
        return {"access_token": access}
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@api.post("/auth/forgot-password")
async def forgot_password(req: ForgotPasswordRequest):
    user = await db.users.find_one({"email": req.email.lower()})
    if user:
        token = secrets.token_urlsafe(32)
        await db.password_reset_tokens.insert_one({
            "token": token, "user_id": user["id"],
            "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
            "used": False,
        })
        logger.info(f"[Password Reset] User: {user['email']} | Token: {token}")
    return {"message": "If the email exists, a reset link has been sent."}


@api.post("/auth/reset-password")
async def reset_password(req: ResetPasswordRequest):
    rec = await db.password_reset_tokens.find_one({"token": req.token, "used": False})
    if not rec:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    expires_at = rec["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token expired")
    await db.users.update_one({"id": rec["user_id"]}, {"$set": {"password_hash": hash_password(req.new_password)}})
    await db.password_reset_tokens.update_one({"token": req.token}, {"$set": {"used": True}})
    return {"message": "Password reset successful"}


# ---------------- Doctors ----------------
@api.get("/doctors")
async def list_doctors(specialty: Optional[str] = None, q: Optional[str] = None, approved_only: bool = True):
    query = {}
    if approved_only:
        query["approved"] = True
    if specialty and specialty.lower() != "all":
        query["specialty"] = specialty
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"specialty": {"$regex": q, "$options": "i"}},
            {"hospital": {"$regex": q, "$options": "i"}},
        ]
    docs = await db.doctors.find(query, {"_id": 0}).to_list(200)
    return docs


@api.get("/doctors/specialties")
async def list_specialties():
    pipeline = [{"$group": {"_id": "$specialty"}}, {"$sort": {"_id": 1}}]
    res = await db.doctors.aggregate(pipeline).to_list(100)
    return [r["_id"] for r in res if r["_id"]]


@api.get("/doctors/{doctor_id}")
async def get_doctor(doctor_id: str):
    doc = await db.doctors.find_one({"id": doctor_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return doc


@api.put("/doctors/me/availability")
async def update_my_availability(req: DoctorAvailabilityUpdate, user: dict = Depends(require_role("doctor"))):
    res = await db.doctors.update_one({"user_id": user["id"]}, {"$set": {"available_slots": req.available_slots}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
    return {"message": "Availability updated", "available_slots": req.available_slots}


@api.get("/doctors/me/profile")
async def get_my_doctor_profile(user: dict = Depends(require_role("doctor"))):
    doc = await db.doctors.find_one({"user_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
    return doc


# ---------------- Appointments ----------------
@api.post("/appointments")
async def book_appointment(req: AppointmentCreate, user: dict = Depends(require_role("patient"))):
    doctor = await db.doctors.find_one({"id": req.doctor_id}, {"_id": 0})
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    if req.slot_time not in doctor.get("available_slots", []):
        raise HTTPException(status_code=400, detail="Selected slot not available")

    appt_id = str(uuid.uuid4())
    appt = {
        "id": appt_id,
        "patient_id": user["id"],
        "patient_name": user["name"],
        "patient_email": user["email"],
        "doctor_id": req.doctor_id,
        "doctor_name": doctor["name"],
        "doctor_specialty": doctor["specialty"],
        "slot_time": req.slot_time,
        "reason": req.reason,
        "status": "confirmed",
        "notes": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.appointments.insert_one(appt)
    # Remove the slot from doctor availability
    new_slots = [s for s in doctor["available_slots"] if s != req.slot_time]
    await db.doctors.update_one({"id": req.doctor_id}, {"$set": {"available_slots": new_slots}})
    appt.pop("_id", None)
    return appt


@api.get("/appointments")
async def list_appointments(user: dict = Depends(get_current_user)):
    if user["role"] == "patient":
        query = {"patient_id": user["id"]}
    elif user["role"] == "doctor":
        query = {"doctor_id": user["id"]}
    else:  # admin
        query = {}
    appts = await db.appointments.find(query, {"_id": 0}).sort("slot_time", 1).to_list(500)
    return appts


@api.patch("/appointments/{appt_id}")
async def update_appointment(appt_id: str, req: AppointmentUpdate, user: dict = Depends(get_current_user)):
    appt = await db.appointments.find_one({"id": appt_id}, {"_id": 0})
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if user["role"] == "patient" and appt["patient_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    if user["role"] == "doctor" and appt["doctor_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    update = {k: v for k, v in req.model_dump(exclude_none=True).items()}
    if update:
        await db.appointments.update_one({"id": appt_id}, {"$set": update})
    return {**appt, **update}


# ---------------- Prescriptions ----------------
@api.post("/prescriptions")
async def create_prescription(req: PrescriptionCreate, user: dict = Depends(require_role("doctor"))):
    pres_id = str(uuid.uuid4())
    doc = {
        "id": pres_id,
        "appointment_id": req.appointment_id,
        "patient_id": req.patient_id,
        "doctor_id": user["id"],
        "doctor_name": user["name"],
        "diagnosis": req.diagnosis,
        "medications": req.medications,
        "instructions": req.instructions,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.prescriptions.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/prescriptions")
async def list_prescriptions(user: dict = Depends(get_current_user)):
    if user["role"] == "patient":
        query = {"patient_id": user["id"]}
    elif user["role"] == "doctor":
        query = {"doctor_id": user["id"]}
    else:
        query = {}
    res = await db.prescriptions.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return res


# ---------------- Admin ----------------
@api.get("/admin/stats")
async def admin_stats(user: dict = Depends(require_role("admin"))):
    return {
        "users": await db.users.count_documents({}),
        "patients": await db.users.count_documents({"role": "patient"}),
        "doctors": await db.users.count_documents({"role": "doctor"}),
        "doctor_profiles": await db.doctors.count_documents({}),
        "approved_doctors": await db.doctors.count_documents({"approved": True}),
        "pending_doctors": await db.doctors.count_documents({"approved": False}),
        "appointments": await db.appointments.count_documents({}),
        "confirmed_appointments": await db.appointments.count_documents({"status": "confirmed"}),
        "completed_appointments": await db.appointments.count_documents({"status": "completed"}),
        "revenue": await _calculate_revenue(),
    }


async def _calculate_revenue():
    pipeline = [
        {"$match": {"status": {"$in": ["confirmed", "completed"]}}},
        {"$lookup": {"from": "doctors", "localField": "doctor_id", "foreignField": "id", "as": "d"}},
        {"$unwind": "$d"},
        {"$group": {"_id": None, "total": {"$sum": "$d.consultation_fee"}}},
    ]
    res = await db.appointments.aggregate(pipeline).to_list(1)
    return res[0]["total"] if res else 0


@api.get("/admin/users")
async def admin_users(user: dict = Depends(require_role("admin"))):
    return await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(500)


@api.get("/admin/doctors")
async def admin_doctors(user: dict = Depends(require_role("admin"))):
    return await db.doctors.find({}, {"_id": 0}).to_list(500)


@api.patch("/admin/doctors/{doctor_id}/approval")
async def admin_approve_doctor(doctor_id: str, req: DoctorApprovalUpdate, user: dict = Depends(require_role("admin"))):
    res = await db.doctors.update_one({"id": doctor_id}, {"$set": {"approved": req.approved}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return {"id": doctor_id, "approved": req.approved}


# ---------------- AI Health Assistant ----------------
@api.post("/ai/chat")
async def ai_chat(req: ChatRequest, user: dict = Depends(get_current_user)):
    session_id = req.session_id or f"{user['id']}-{uuid.uuid4()}"
    system_message = (
        "You are MedSphere's AI Health Assistant — a warm, professional medical guide. "
        "You answer general health questions, explain medical concepts, and suggest when patients "
        "should consult a doctor on the platform. Keep answers concise (3-5 short paragraphs max), "
        "use simple language, and ALWAYS include a clear disclaimer that you do not replace professional "
        "medical advice. Never prescribe medications. If symptoms are severe, urge the user to book a "
        "consultation through MedSphere or visit an ER."
    )
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message=system_message,
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        reply = await chat.send_message(UserMessage(text=req.message))
        # Persist chat history
        await db.ai_messages.insert_one({
            "id": str(uuid.uuid4()),
            "session_id": session_id, "user_id": user["id"],
            "user_message": req.message, "assistant_reply": reply,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        return {"session_id": session_id, "reply": reply}
    except Exception as e:
        logger.exception("AI chat failed")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")


@api.get("/ai/history")
async def ai_history(session_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"user_id": user["id"]}
    if session_id:
        query["session_id"] = session_id
    msgs = await db.ai_messages.find(query, {"_id": 0}).sort("created_at", 1).to_list(200)
    return msgs


# ---------------- Misc ----------------
@api.get("/")
async def root():
    return {"message": "MedSphere API is running", "version": "1.0"}


@api.get("/health")
async def health():
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}


# Mount router
app.include_router(api)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------- Startup: indexes + seed ----------------
SEED_DOCTORS = [
    {
        "name": "Dr. Aanya Sharma", "email": "aanya.sharma@medsphere.com",
        "specialty": "Cardiology", "hospital": "Apollo Hospitals",
        "experience_years": 12, "rating": 4.9, "reviews_count": 312,
        "bio": "Interventional cardiologist specializing in complex angioplasty and preventive cardiology.",
        "image_url": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=600&q=80",
        "consultation_fee": 2200, "languages": ["English", "Hindi"],
    },
    {
        "name": "Dr. Rohan Mehta", "email": "rohan.mehta@medsphere.com",
        "specialty": "Dermatology", "hospital": "Fortis Healthcare",
        "experience_years": 9, "rating": 4.8, "reviews_count": 210,
        "bio": "Cosmetic and clinical dermatologist. Expert in acne, pigmentation and laser treatments.",
        "image_url": "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=600&q=80",
        "consultation_fee": 1800, "languages": ["English", "Hindi", "Gujarati"],
    },
    {
        "name": "Dr. Priya Iyer", "email": "priya.iyer@medsphere.com",
        "specialty": "Pediatrics", "hospital": "Manipal Hospitals",
        "experience_years": 14, "rating": 5.0, "reviews_count": 489,
        "bio": "Pediatrician with expertise in newborn care, developmental issues and adolescent health.",
        "image_url": "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=600&q=80",
        "consultation_fee": 1500, "languages": ["English", "Tamil", "Hindi"],
    },
    {
        "name": "Dr. Arjun Kapoor", "email": "arjun.kapoor@medsphere.com",
        "specialty": "Neurology", "hospital": "Max Super Speciality",
        "experience_years": 18, "rating": 4.9, "reviews_count": 401,
        "bio": "Senior neurologist treating epilepsy, stroke recovery and movement disorders.",
        "image_url": "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=600&q=80",
        "consultation_fee": 2500, "languages": ["English", "Hindi"],
    },
    {
        "name": "Dr. Sara Khan", "email": "sara.khan@medsphere.com",
        "specialty": "Gynecology", "hospital": "Cloudnine Hospitals",
        "experience_years": 11, "rating": 4.9, "reviews_count": 367,
        "bio": "Obstetrician & gynecologist specializing in high-risk pregnancies and women's wellness.",
        "image_url": "https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=600&q=80",
        "consultation_fee": 2000, "languages": ["English", "Hindi", "Urdu"],
    },
    {
        "name": "Dr. Kabir Singh", "email": "kabir.singh@medsphere.com",
        "specialty": "Orthopedics", "hospital": "AIIMS Delhi",
        "experience_years": 15, "rating": 4.7, "reviews_count": 256,
        "bio": "Orthopedic surgeon specializing in joint replacements and sports injuries.",
        "image_url": "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=600&q=80",
        "consultation_fee": 2300, "languages": ["English", "Hindi", "Punjabi"],
    },
    {
        "name": "Dr. Meera Reddy", "email": "meera.reddy@medsphere.com",
        "specialty": "Psychiatry", "hospital": "NIMHANS",
        "experience_years": 10, "rating": 4.9, "reviews_count": 198,
        "bio": "Psychiatrist focused on mood disorders, anxiety, and cognitive behavioural therapy.",
        "image_url": "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=600&q=80",
        "consultation_fee": 1900, "languages": ["English", "Telugu", "Hindi"],
    },
    {
        "name": "Dr. Daniel Joseph", "email": "daniel.joseph@medsphere.com",
        "specialty": "General Physician", "hospital": "Independent Practice",
        "experience_years": 8, "rating": 4.8, "reviews_count": 142,
        "bio": "Family physician offering primary care, preventive checks and chronic disease management.",
        "image_url": "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=600&q=80",
        "consultation_fee": 1200, "languages": ["English", "Malayalam"],
    },
]


def _generate_default_slots() -> List[str]:
    # Next 5 days, 4 slots per day
    slots = []
    base = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
    times = [(10, 0), (11, 30), (15, 0), (17, 30)]
    for d in range(5):
        for h, m in times:
            slot = base + timedelta(days=d, hours=h, minutes=m)
            slots.append(slot.isoformat())
    return slots


@app.on_event("startup")
async def on_startup():
    # Indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.doctors.create_index("id", unique=True)
    await db.doctors.create_index("specialty")
    await db.appointments.create_index("patient_id")
    await db.appointments.create_index("doctor_id")
    await db.login_attempts.create_index("identifier")
    await db.password_reset_tokens.create_index("token", unique=True)

    # Seed admin
    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_password = os.environ["ADMIN_PASSWORD"]
    existing_admin = await db.users.find_one({"email": admin_email})
    if not existing_admin:
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Platform Admin", "role": "admin",
            "phone": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info("Seeded admin user")
    elif not verify_password(admin_password, existing_admin["password_hash"]):
        await db.users.update_one({"email": admin_email},
                                  {"$set": {"password_hash": hash_password(admin_password)}})

    # Seed test patient
    test_patient_email = "patient@test.com"
    if not await db.users.find_one({"email": test_patient_email}):
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "email": test_patient_email,
            "password_hash": hash_password("password123"),
            "name": "Test Patient", "role": "patient",
            "phone": "+91-9999900000",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    # Seed doctors
    if await db.doctors.count_documents({}) == 0:
        for d in SEED_DOCTORS:
            uid = str(uuid.uuid4())
            await db.users.insert_one({
                "id": uid, "email": d["email"],
                "password_hash": hash_password("password123"),
                "name": d["name"], "role": "doctor",
                "phone": None,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            await db.doctors.insert_one({
                "id": uid, "user_id": uid,
                **d,
                "available_slots": _generate_default_slots(),
                "approved": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
        logger.info("Seeded %d doctors", len(SEED_DOCTORS))


@app.on_event("shutdown")
async def on_shutdown():
    mongo_client.close()
