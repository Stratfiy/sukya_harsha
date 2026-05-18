from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")
import re
import os
import io
import base64
import logging
import secrets
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

import bcrypt
import jwt
import pyotp
import qrcode
import resend
import httpx
from cryptography.fernet import Fernet
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict, field_validator
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials as GoogleCreds

# ---------------- Logging ----------------
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("sukhyamed")

# ---------------- Mongo ----------------
mongo_client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = mongo_client[os.environ["DB_NAME"]]

# ---------------- Constants ----------------
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"
ACCESS_TOKEN_MIN = 15
REFRESH_TOKEN_DAYS = 7
CSRF_SECRET = os.environ["CSRF_SECRET"]
FERNET = Fernet(os.environ["FERNET_KEY"].encode())
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
RESEND_FROM = os.environ.get("RESEND_FROM_EMAIL", "no-reply@sukhyamed.com")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

resend.api_key = RESEND_API_KEY

# Cookies are same-origin behind ingress so use samesite=lax. secure=True for HTTPS preview.
COOKIE_OPTS = dict(httponly=True, secure=True, samesite="lax", path="/", domain=os.environ.get("COOKIE_DOMAIN", ""))

# ---------------- App ----------------
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="Sukhya Med API", version="2.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
api = APIRouter(prefix="/api")


# ---------------- Security middleware ----------------
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https:; frame-ancestors 'none'"
        return response


app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------- Helpers ----------------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt(rounds=12)).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def validate_password_complexity(pw: str) -> Optional[str]:
    if len(pw) < 8:
        return "Password must be at least 8 characters."
    if not any(c.isupper() for c in pw):
        return "Password must contain at least one uppercase letter."
    if not any(c.islower() for c in pw):
        return "Password must contain at least one lowercase letter."
    if not any(c.isdigit() for c in pw):
        return "Password must contain at least one digit."
    if not any(c in "!@#$%^&*()-_=+[]{};:,.<>/?\\|`~'\"" for c in pw):
        return "Password must contain at least one special character."
    return None


def create_access_token(user_id: str, email: str, role: str, extra: Dict[str, Any] | None = None) -> str:
    payload = {
        "sub": user_id, "email": email, "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_MIN),
        "type": "access",
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_DAYS),
        "type": "refresh",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def create_2fa_pending_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
        "type": "2fa_pending",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def set_session_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, max_age=ACCESS_TOKEN_MIN * 60, **COOKIE_OPTS)
    response.set_cookie("refresh_token", refresh, max_age=REFRESH_TOKEN_DAYS * 86400, **COOKIE_OPTS)
    # CSRF token — readable by JS (NOT httpOnly), double-submit pattern
    csrf = secrets.token_urlsafe(32)
    response.set_cookie("csrf_token", csrf, max_age=REFRESH_TOKEN_DAYS * 86400,
                        httponly=False, secure=True, samesite="lax", path="/",
                        domain=os.environ.get("COOKIE_DOMAIN", ""))


def clear_session_cookies(response: Response):
    for k in ("access_token", "refresh_token", "csrf_token"):
        response.delete_cookie(k, path="/")


def encrypt_field(value: str) -> str:
    return FERNET.encrypt(value.encode()).decode()


def decrypt_field(value: str) -> str:
    return FERNET.decrypt(value.encode()).decode()


async def write_audit(user_id: Optional[str], action: str, resource_type: str,
                      resource_id: Optional[str], request: Request, details: Optional[Dict[str, Any]] = None):
    try:
        await db.audit_logs.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "ip_address": request.client.host if request.client else "unknown",
            "user_agent": request.headers.get("user-agent", "")[:300],
            "details": details or {},
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    except Exception as e:
        logger.warning("audit log failed: %s", e)


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0, "two_factor_secret": 0})
        if not user or not user.get("is_active", True):
            raise HTTPException(status_code=401, detail="User not found or inactive")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def require_role(*roles):
    async def dep(user: dict = Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return dep


async def verify_csrf(request: Request):
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return
    cookie_token = request.cookies.get("csrf_token")
    header_token = request.headers.get("x-csrf-token")
    if not cookie_token or not header_token or cookie_token != header_token:
        # We allow auth endpoints to skip CSRF since they don't yet have a session cookie
        path = request.url.path
        if path.startswith("/api/auth/login") or path.startswith("/api/auth/register") \
                or path.startswith("/api/auth/google") or path.startswith("/api/auth/forgot-password") \
                or path.startswith("/api/auth/reset-password") or path.startswith("/api/auth/refresh") \
                or path.startswith("/api/auth/2fa/verify"):
            return
        raise HTTPException(status_code=403, detail="CSRF token missing or invalid")


# ---------------- Models ----------------
class PasswordField(BaseModel):
    password: str

    @field_validator("password")
    @classmethod
    def check_complexity(cls, v: str):
        err = validate_password_complexity(v)
        if err:
            raise ValueError(err)
        return v


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=4, max_length=30)
    role: str = Field(pattern="^(patient|doctor)$")
    consent: bool = True
    # Doctor-only
    hospital_id: Optional[str] = None
    specialization: Optional[str] = None
    years_of_experience: Optional[int] = None
    license_number: Optional[str] = None
    bio: Optional[str] = None
    profile_photo_url: Optional[str] = None
    consultation_fee: Optional[int] = None

    @field_validator("password")
    @classmethod
    def check_complexity(cls, v: str):
        err = validate_password_complexity(v)
        if err:
            raise ValueError(err)
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleLoginRequest(BaseModel):
    id_token: str
    role: Optional[str] = "patient"  # role on first signup


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def check_complexity(cls, v: str):
        err = validate_password_complexity(v)
        if err:
            raise ValueError(err)
        return v


class TwoFactorVerifyRequest(BaseModel):
    code: str = Field(min_length=6, max_length=6)
    temp_token: Optional[str] = None  # if mid-login


class TwoFactorEnableRequest(BaseModel):
    code: str = Field(min_length=6, max_length=6)


class HospitalCreate(BaseModel):
    name: str
    address: str
    area: str
    city: str
    state: str
    pin_code: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    description: Optional[str] = None
    specialties_available: List[str] = []
    image_url: Optional[str] = None


class HospitalUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    area: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pin_code: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    description: Optional[str] = None
    specialties_available: Optional[List[str]] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None


class AvailabilityEntry(BaseModel):
    day_of_week: int  # 0 (Mon) – 6 (Sun)
    start_time: str   # "09:00"
    end_time: str     # "17:00"
    mode: str = Field(pattern="^(online|offline|both)$")
    slot_minutes: int = 30


class DoctorProfileUpdate(BaseModel):
    bio: Optional[str] = None
    specialization: Optional[str] = None
    years_of_experience: Optional[int] = None
    license_number: Optional[str] = None
    profile_photo_url: Optional[str] = None
    hospital_id: Optional[str] = None
    consultation_fee: Optional[int] = None
    online_consultation_enabled: Optional[bool] = None
    availability: Optional[List[AvailabilityEntry]] = None
    blocked_dates: Optional[List[str]] = None
    today_mode: Optional[str] = None  # online|offline|both


class AppointmentCreate(BaseModel):
    doctor_id: str
    date: str  # YYYY-MM-DD
    time_slot: str  # "HH:MM"
    consultation_type: str = Field(pattern="^(online|offline)$")
    reason: Optional[str] = None


class AppointmentUpdate(BaseModel):
    status: Optional[str] = Field(default=None, pattern="^(booked|completed|cancelled|no_show)$")
    notes: Optional[str] = None
    cancellation_reason: Optional[str] = None


class PrescriptionMedication(BaseModel):
    name: str
    dosage: str
    frequency: str
    duration: str
    notes: Optional[str] = None


class PrescriptionCreate(BaseModel):
    appointment_id: str
    patient_id: str
    diagnosis: str
    medications: List[PrescriptionMedication]
    additional_notes: Optional[str] = None


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class DoctorApprovalAction(BaseModel):
    reason: Optional[str] = None


# ---------------- AUTH ----------------
@api.post("/auth/register")
@limiter.limit("5/minute")
async def register(req: RegisterRequest, request: Request, response: Response):
    email = req.email.lower()
    if not req.consent:
        raise HTTPException(status_code=400, detail="You must accept the consent terms to continue.")
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id, "email": email, "password_hash": hash_password(req.password),
        "full_name": req.full_name, "phone": req.phone, "role": req.role,
        "google_id": None, "avatar_url": None,
        "is_active": True, "is_verified": False,
        "failed_login_attempts": 0, "locked_until": None,
        "two_factor_secret": None, "two_factor_enabled": False,
        "consent_given_at": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)

    if req.role == "doctor":
        if not (req.hospital_id and req.specialization and req.license_number):
            raise HTTPException(status_code=400, detail="hospital_id, specialization and license_number are required for doctors")
        hospital = await db.hospitals.find_one({"id": req.hospital_id})
        if not hospital:
            raise HTTPException(status_code=400, detail="Invalid hospital_id")
        await db.doctors.insert_one({
            "id": user_id, "user_id": user_id, "hospital_id": req.hospital_id,
            "name": req.full_name, "email": email,
            "specialization": req.specialization,
            "years_of_experience": req.years_of_experience or 1,
            "license_number": req.license_number,
            "bio": req.bio or "",
            "profile_photo_url": req.profile_photo_url or "",
            "consultation_fee": req.consultation_fee or 1000,
            "is_approved": False, "approved_by": None, "approved_at": None,
            "online_consultation_enabled": False,
            "availability": [],
            "blocked_dates": [],
            "today_mode": "both",
            "google_calendar_connected": False,
            "google_calendar_token": None,
            "rating": 5.0, "reviews_count": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })

    await write_audit(user_id, "register", "user", user_id, request, {"role": req.role})

    access = create_access_token(user_id, email, req.role)
    refresh = create_refresh_token(user_id)
    set_session_cookies(response, access, refresh)
    return _public_user(user_doc)


def _public_user(doc: dict) -> dict:
    return {
        "id": doc["id"], "email": doc["email"], "full_name": doc.get("full_name"),
        "phone": doc.get("phone"), "role": doc.get("role"),
        "avatar_url": doc.get("avatar_url"),
        "two_factor_enabled": doc.get("two_factor_enabled", False),
        "is_verified": doc.get("is_verified", False),
    }


@api.post("/auth/login")
@limiter.limit("10/minute")
async def login(req: LoginRequest, request: Request, response: Response):
    email = req.email.lower()
    user = await db.users.find_one({"email": email})
    if not user:
        await write_audit(None, "login_failed", "user", None, request, {"email": email, "reason": "user_not_found"})
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if user.get("locked_until"):
        locked_until = datetime.fromisoformat(user["locked_until"])
        if locked_until > datetime.now(timezone.utc):
            raise HTTPException(status_code=429, detail="Account is temporarily locked. Try again later.")

    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is disabled")

    if not verify_password(req.password, user["password_hash"]):
        attempts = user.get("failed_login_attempts", 0) + 1
        update = {"failed_login_attempts": attempts}
        if attempts >= 5:
            update["locked_until"] = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
            update["failed_login_attempts"] = 0
        await db.users.update_one({"id": user["id"]}, {"$set": update})
        await write_audit(user["id"], "login_failed", "user", user["id"], request, {"reason": "wrong_password"})
        raise HTTPException(status_code=401, detail="Invalid email or password")

    await db.users.update_one({"id": user["id"]}, {"$set": {"failed_login_attempts": 0, "locked_until": None}})

    if user.get("two_factor_enabled"):
        temp = create_2fa_pending_token(user["id"])
        await write_audit(user["id"], "login_2fa_required", "user", user["id"], request)
        return {"requires_2fa": True, "temp_token": temp}

    access = create_access_token(user["id"], user["email"], user["role"])
    refresh = create_refresh_token(user["id"])
    set_session_cookies(response, access, refresh)
    await write_audit(user["id"], "login_success", "user", user["id"], request)
    return _public_user(user)


@api.post("/auth/2fa/verify")
@limiter.limit("10/minute")
async def verify_2fa(req: TwoFactorVerifyRequest, request: Request, response: Response):
    if not req.temp_token:
        raise HTTPException(status_code=400, detail="Missing temp token")
    try:
        payload = jwt.decode(req.temp_token, JWT_SECRET, algorithms=[JWT_ALG])
        if payload.get("type") != "2fa_pending":
            raise HTTPException(status_code=400, detail="Invalid token")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    user = await db.users.find_one({"id": payload["sub"]})
    if not user or not user.get("two_factor_secret"):
        raise HTTPException(status_code=400, detail="2FA not configured")
    secret = decrypt_field(user["two_factor_secret"])
    if not pyotp.TOTP(secret).verify(req.code, valid_window=1):
        await write_audit(user["id"], "2fa_failed", "user", user["id"], request)
        raise HTTPException(status_code=401, detail="Invalid 2FA code")

    access = create_access_token(user["id"], user["email"], user["role"])
    refresh = create_refresh_token(user["id"])
    set_session_cookies(response, access, refresh)
    await write_audit(user["id"], "login_success_2fa", "user", user["id"], request)
    return _public_user(user)


@api.post("/auth/2fa/setup")
async def setup_2fa(request: Request, user: dict = Depends(require_role("doctor", "admin"))):
    secret = pyotp.random_base32()
    uri = pyotp.TOTP(secret).provisioning_uri(name=user["email"], issuer_name="Sukhya Med")
    img = qrcode.make(uri)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    qr_data_url = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()
    # Save the secret as pending (not yet enabled)
    await db.users.update_one({"id": user["id"]}, {"$set": {"two_factor_secret": encrypt_field(secret)}})
    return {"secret": secret, "qr_code": qr_data_url, "otpauth_uri": uri}


@api.post("/auth/2fa/enable")
async def enable_2fa(req: TwoFactorEnableRequest, request: Request, user: dict = Depends(require_role("doctor", "admin"))):
    db_user = await db.users.find_one({"id": user["id"]})
    if not db_user.get("two_factor_secret"):
        raise HTTPException(status_code=400, detail="Run 2FA setup first")
    secret = decrypt_field(db_user["two_factor_secret"])
    if not pyotp.TOTP(secret).verify(req.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid code")
    await db.users.update_one({"id": user["id"]}, {"$set": {"two_factor_enabled": True}})
    await write_audit(user["id"], "2fa_enabled", "user", user["id"], request)
    return {"enabled": True}


@api.post("/auth/2fa/disable")
async def disable_2fa(req: TwoFactorEnableRequest, request: Request, user: dict = Depends(require_role("doctor", "admin"))):
    db_user = await db.users.find_one({"id": user["id"]})
    if not db_user.get("two_factor_enabled"):
        return {"enabled": False}
    secret = decrypt_field(db_user["two_factor_secret"])
    if not pyotp.TOTP(secret).verify(req.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid code")
    await db.users.update_one({"id": user["id"]}, {"$set": {"two_factor_enabled": False, "two_factor_secret": None}})
    await write_audit(user["id"], "2fa_disabled", "user", user["id"], request)
    return {"enabled": False}


@api.post("/auth/google")
@limiter.limit("10/minute")
async def google_auth(req: GoogleLoginRequest, request: Request, response: Response):
    # REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    if not GOOGLE_CLIENT_ID or GOOGLE_CLIENT_ID.startswith("YOUR_"):
        raise HTTPException(status_code=503, detail="Google OAuth is not configured on the server yet.")
    try:
        info = google_id_token.verify_oauth2_token(
            req.id_token, google_requests.Request(), GOOGLE_CLIENT_ID, clock_skew_in_seconds=10
        )
    except Exception as e:
        logger.exception("Google id_token verify failed")
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {str(e)}")

    google_id = info.get("sub")
    email = (info.get("email") or "").lower()
    name = info.get("name") or email.split("@")[0]
    picture = info.get("picture")

    user = await db.users.find_one({"$or": [{"google_id": google_id}, {"email": email}]})
    if not user:
        user_id = str(uuid.uuid4())
        user = {
            "id": user_id, "email": email,
            "password_hash": None, "google_id": google_id, "avatar_url": picture,
            "full_name": name, "phone": "",
            "role": req.role if req.role in ("patient", "doctor") else "patient",
            "is_active": True, "is_verified": True,
            "failed_login_attempts": 0, "locked_until": None,
            "two_factor_secret": None, "two_factor_enabled": False,
            "consent_given_at": datetime.now(timezone.utc).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(user)
    else:
        # Link google_id if missing
        if not user.get("google_id"):
            await db.users.update_one({"id": user["id"]}, {"$set": {"google_id": google_id, "avatar_url": picture or user.get("avatar_url")}})

    if user.get("two_factor_enabled"):
        temp = create_2fa_pending_token(user["id"])
        return {"requires_2fa": True, "temp_token": temp}

    access = create_access_token(user["id"], user["email"], user["role"])
    refresh = create_refresh_token(user["id"])
    set_session_cookies(response, access, refresh)
    await write_audit(user["id"], "google_login", "user", user["id"], request)
    return _public_user(user)


@api.post("/auth/logout")
async def logout(request: Request, response: Response, user: dict = Depends(get_current_user)):
    clear_session_cookies(response)
    await write_audit(user["id"], "logout", "user", user["id"], request)
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@api.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": payload["sub"]})
        if not user or not user.get("is_active", True):
            raise HTTPException(status_code=401, detail="User not found")
        access = create_access_token(user["id"], user["email"], user["role"])
        response.set_cookie("access_token", access, max_age=ACCESS_TOKEN_MIN * 60, **COOKIE_OPTS)
        return {"ok": True}
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@api.post("/auth/forgot-password")
@limiter.limit("3/minute")
async def forgot_password(req: ForgotPasswordRequest, request: Request):
    user = await db.users.find_one({"email": req.email.lower()})
    if user:
        token = secrets.token_urlsafe(32)
        await db.password_reset_tokens.insert_one({
            "token": token, "user_id": user["id"],
            "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
            "used": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        reset_url = f"{FRONTEND_URL}/reset-password/{token}"
        # Try Resend; if not configured, log to console
        sent = False
        if RESEND_API_KEY and not RESEND_API_KEY.startswith("re_REPLACE"):
            try:
                resend.Emails.send({
                    "from": RESEND_FROM,
                    "to": [user["email"]],
                    "subject": "Reset your Sukhya Med password",
                    "html": f"<p>Hi {user.get('full_name','there')},</p><p>Click below to reset your password (valid 1 hour):</p><p><a href='{reset_url}'>{reset_url}</a></p>",
                })
                sent = True
            except Exception as e:
                logger.warning("Resend send failed: %s", e)
        if not sent:
            logger.info(f"[PasswordReset] {user['email']} -> {reset_url}")
        await write_audit(user["id"], "password_reset_requested", "user", user["id"], request, {"sent": sent})
    # Always return the same response (don't leak account existence)
    return {"message": "If the email exists, a reset link has been sent."}


@api.post("/auth/reset-password")
@limiter.limit("5/minute")
async def reset_password(req: ResetPasswordRequest, request: Request):
    rec = await db.password_reset_tokens.find_one({"token": req.token, "used": False})
    if not rec:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    expires_at = datetime.fromisoformat(rec["expires_at"])
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token expired")
    await db.users.update_one({"id": rec["user_id"]}, {"$set": {"password_hash": hash_password(req.new_password), "failed_login_attempts": 0, "locked_until": None}})
    await db.password_reset_tokens.update_one({"token": req.token}, {"$set": {"used": True}})
    await write_audit(rec["user_id"], "password_reset", "user", rec["user_id"], request)
    return {"message": "Password updated successfully."}


# ---------------- HOSPITALS ----------------
@api.get("/hospitals")
async def list_hospitals(area: Optional[str] = None, city: Optional[str] = None,
                         specialty: Optional[str] = None, q: Optional[str] = None):
    query: Dict[str, Any] = {"is_active": True}
    if area:
        query["area"] = {"$regex": f"^{re.escape(area)}$", "$options": "i"}
    if city:
        query["city"] = {"$regex": f"^{re.escape(city)}$", "$options": "i"}
    if specialty:
        query["specialties_available"] = specialty
    if q:
        eq = re.escape(q)
        query["$or"] = [
            {"name": {"$regex": eq, "$options": "i"}},
            {"area": {"$regex": eq, "$options": "i"}},
            {"city": {"$regex": eq, "$options": "i"}},
            {"pin_code": {"$regex": eq, "$options": "i"}},
        ]
    rows = await db.hospitals.find(query, {"_id": 0}).to_list(200)
    # Attach doctor counts
    for h in rows:
        h["doctor_count"] = await db.doctors.count_documents({"hospital_id": h["id"], "is_approved": True})
    return rows


@api.get("/hospitals/{hospital_id}")
async def get_hospital(hospital_id: str):
    h = await db.hospitals.find_one({"id": hospital_id, "is_active": True}, {"_id": 0})
    if not h:
        raise HTTPException(status_code=404, detail="Hospital not found")
    h["doctor_count"] = await db.doctors.count_documents({"hospital_id": h["id"], "is_approved": True})
    return h


@api.get("/hospitals/{hospital_id}/doctors")
async def doctors_in_hospital(hospital_id: str):
    rows = await db.doctors.find({"hospital_id": hospital_id, "is_approved": True}, {"_id": 0, "google_calendar_token": 0, "license_number": 0}).to_list(200)
    return rows


@api.get("/areas")
async def list_areas():
    pipeline = [
        {"$match": {"is_active": True}},
        {"$group": {"_id": {"area": "$area", "city": "$city"}, "count": {"$sum": 1}}},
        {"$sort": {"_id.area": 1}},
    ]
    rows = await db.hospitals.aggregate(pipeline).to_list(200)
    return [{"area": r["_id"]["area"], "city": r["_id"]["city"], "hospital_count": r["count"]} for r in rows]


@api.get("/specialties")
async def list_specialties():
    pipeline = [{"$unwind": "$specialties_available"}, {"$group": {"_id": "$specialties_available"}}, {"$sort": {"_id": 1}}]
    rows = await db.hospitals.aggregate(pipeline).to_list(200)
    return [r["_id"] for r in rows if r["_id"]]


# ---------------- DOCTORS (public) ----------------
def _strip_doctor(d: dict) -> dict:
    d.pop("google_calendar_token", None)
    d.pop("license_number", None)
    return d


@api.get("/doctors")
async def list_doctors(specialty: Optional[str] = None, hospital_id: Optional[str] = None,
                       area: Optional[str] = None, q: Optional[str] = None):
    query: Dict[str, Any] = {"is_approved": True}
    if specialty:
        query["specialization"] = specialty
    if hospital_id:
        query["hospital_id"] = hospital_id
    if q:
        eq = re.escape(q)
        query["$or"] = [
            {"name": {"$regex": eq, "$options": "i"}},
            {"specialization": {"$regex": eq, "$options": "i"}},
        ]
    if area:
        hosps = await db.hospitals.find({"area": {"$regex": f"^{re.escape(area)}$", "$options": "i"}}, {"_id": 0, "id": 1}).to_list(500)
        query["hospital_id"] = {"$in": [h["id"] for h in hosps]}
    rows = await db.doctors.find(query, {"_id": 0}).to_list(500)
    # Attach hospital info
    hospital_ids = list({d["hospital_id"] for d in rows if d.get("hospital_id")})
    hosps = await db.hospitals.find({"id": {"$in": hospital_ids}}, {"_id": 0}).to_list(200) if hospital_ids else []
    hmap = {h["id"]: h for h in hosps}
    for d in rows:
        d["hospital"] = hmap.get(d.get("hospital_id"))
        _strip_doctor(d)
    return rows


@api.get("/doctors/{doctor_id}")
async def get_doctor(doctor_id: str):
    d = await db.doctors.find_one({"id": doctor_id, "is_approved": True}, {"_id": 0})
    if not d:
        raise HTTPException(status_code=404, detail="Doctor not found")
    d["hospital"] = await db.hospitals.find_one({"id": d.get("hospital_id")}, {"_id": 0})
    return _strip_doctor(d)


@api.get("/doctors/{doctor_id}/slots")
async def doctor_slots(doctor_id: str, date: str):
    """Compute available slots for the given date based on doctor's availability template, blocked dates and booked slots."""
    d = await db.doctors.find_one({"id": doctor_id, "is_approved": True}, {"_id": 0})
    if not d:
        raise HTTPException(status_code=404, detail="Doctor not found")
    if date in (d.get("blocked_dates") or []):
        return {"date": date, "slots": []}
    try:
        target = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date")
    dow = target.weekday()
    matching = [a for a in (d.get("availability") or []) if a["day_of_week"] == dow]
    booked = set()
    async for appt in db.appointments.find({"doctor_id": doctor_id, "date": date, "status": {"$in": ["booked", "completed"]}}, {"_id": 0, "time_slot": 1, "status": 1}):
        booked.add(appt["time_slot"])
    slots = []
    today_mode = d.get("today_mode", "both")
    for entry in matching:
        # Honor today_mode override if date is today
        eff_mode = entry["mode"]
        if date == datetime.now(timezone.utc).date().isoformat():
            if today_mode != "both":
                eff_mode = today_mode
        sh, sm = map(int, entry["start_time"].split(":"))
        eh, em = map(int, entry["end_time"].split(":"))
        cur = datetime(target.year, target.month, target.day, sh, sm)
        end = datetime(target.year, target.month, target.day, eh, em)
        while cur + timedelta(minutes=entry["slot_minutes"]) <= end:
            label = cur.strftime("%H:%M")
            if label not in booked:
                slots.append({"time": label, "mode": eff_mode})
            cur += timedelta(minutes=entry["slot_minutes"])
    return {"date": date, "slots": slots, "today_mode": today_mode}


# ---------------- DOCTOR SELF-MANAGEMENT ----------------
@api.get("/doctor/profile")
async def my_doctor_profile(user: dict = Depends(require_role("doctor"))):
    d = await db.doctors.find_one({"user_id": user["id"]}, {"_id": 0, "google_calendar_token": 0})
    if not d:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
    d["hospital"] = await db.hospitals.find_one({"id": d.get("hospital_id")}, {"_id": 0})
    return d


@api.put("/doctor/profile")
async def update_doctor_profile(req: DoctorProfileUpdate, request: Request, user: dict = Depends(require_role("doctor")), _csrf=Depends(verify_csrf)):
    update = {k: v for k, v in req.model_dump(exclude_none=True).items()}
    if "availability" in update:
        update["availability"] = [a if isinstance(a, dict) else a.model_dump() for a in update["availability"]]
    if update:
        update["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.doctors.update_one({"user_id": user["id"]}, {"$set": update})
    # Mirror name change to users (none here)
    await write_audit(user["id"], "update_doctor_profile", "doctor", user["id"], request, {"fields": list(update.keys())})
    d = await db.doctors.find_one({"user_id": user["id"]}, {"_id": 0, "google_calendar_token": 0})
    return d


# Google Calendar OAuth flow for doctor
@api.get("/doctor/google-calendar/auth-url")
async def google_calendar_auth_url(user: dict = Depends(require_role("doctor"))):
    if not GOOGLE_CLIENT_ID or GOOGLE_CLIENT_ID.startswith("YOUR_"):
        return {"configured": False, "url": None}
    # REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    redirect_uri = f"{FRONTEND_URL}/doctor/google-calendar/callback"
    flow = Flow.from_client_config(
        {"web": {
            "client_id": GOOGLE_CLIENT_ID, "client_secret": GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [redirect_uri],
        }},
        scopes=["https://www.googleapis.com/auth/calendar.events"],
    )
    flow.redirect_uri = redirect_uri
    auth_url, state = flow.authorization_url(access_type="offline", include_granted_scopes="true", prompt="consent",
                                             state=user["id"])
    return {"configured": True, "url": auth_url}


@api.post("/doctor/google-calendar/exchange")
async def google_calendar_exchange(request: Request, user: dict = Depends(require_role("doctor")), _csrf=Depends(verify_csrf)):
    body = await request.json()
    code = body.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="Missing code")
    redirect_uri = f"{FRONTEND_URL}/doctor/google-calendar/callback"
    flow = Flow.from_client_config(
        {"web": {
            "client_id": GOOGLE_CLIENT_ID, "client_secret": GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [redirect_uri],
        }},
        scopes=["https://www.googleapis.com/auth/calendar.events"],
    )
    flow.redirect_uri = redirect_uri
    flow.fetch_token(code=code)
    creds = flow.credentials
    payload = {
        "token": creds.token, "refresh_token": creds.refresh_token,
        "token_uri": creds.token_uri, "client_id": creds.client_id,
        "client_secret": creds.client_secret, "scopes": creds.scopes,
    }
    encrypted = encrypt_field(__import__("json").dumps(payload))
    await db.doctors.update_one({"user_id": user["id"]}, {"$set": {"google_calendar_token": encrypted, "google_calendar_connected": True}})
    await write_audit(user["id"], "google_calendar_connected", "doctor", user["id"], request)
    return {"connected": True}


@api.post("/doctor/google-calendar/disconnect")
async def google_calendar_disconnect(request: Request, user: dict = Depends(require_role("doctor")), _csrf=Depends(verify_csrf)):
    await db.doctors.update_one({"user_id": user["id"]}, {"$set": {"google_calendar_token": None, "google_calendar_connected": False}})
    await write_audit(user["id"], "google_calendar_disconnected", "doctor", user["id"], request)
    return {"connected": False}


async def _push_to_doctor_calendar(doctor: dict, appt: dict):
    enc = doctor.get("google_calendar_token")
    if not enc:
        return None
    try:
        import json as _json
        token_data = _json.loads(decrypt_field(enc))
        creds = GoogleCreds(**token_data)
        service = build("calendar", "v3", credentials=creds, cache_discovery=False)
        sh, sm = map(int, appt["time_slot"].split(":"))
        start_dt = datetime.strptime(appt["date"], "%Y-%m-%d").replace(hour=sh, minute=sm)
        end_dt = start_dt + timedelta(minutes=30)
        event = {
            "summary": f"Consultation: {appt['patient_name']}",
            "description": appt.get("reason") or "Sukhya Med appointment",
            "start": {"dateTime": start_dt.isoformat(), "timeZone": "Asia/Kolkata"},
            "end": {"dateTime": end_dt.isoformat(), "timeZone": "Asia/Kolkata"},
        }
        result = service.events().insert(calendarId="primary", body=event).execute()
        return result.get("id")
    except Exception as e:
        logger.warning("Google Calendar push failed: %s", e)
        return None


# ---------------- APPOINTMENTS ----------------
@api.post("/appointments")
@limiter.limit("10/minute")
async def book_appointment(req: AppointmentCreate, request: Request, user: dict = Depends(require_role("patient")), _csrf=Depends(verify_csrf)):
    doctor = await db.doctors.find_one({"id": req.doctor_id, "is_approved": True}, {"_id": 0})
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found or not approved")
    if req.consultation_type == "online" and not doctor.get("online_consultation_enabled"):
        raise HTTPException(status_code=400, detail="This doctor does not offer online consultations")

    # Check slot is in availability for that day
    avail = await doctor_slots(req.doctor_id, req.date)
    available_times = [s["time"] for s in avail["slots"]]
    if req.time_slot not in available_times:
        raise HTTPException(status_code=400, detail="Selected slot is not available")

    # Concurrency safety: ensure no existing booking for that exact slot
    existing = await db.appointments.find_one({"doctor_id": req.doctor_id, "date": req.date, "time_slot": req.time_slot, "status": "booked"})
    if existing:
        raise HTTPException(status_code=409, detail="Slot just got booked. Please pick another.")

    appt_id = str(uuid.uuid4())
    appt = {
        "id": appt_id,
        "patient_id": user["id"], "patient_name": user["full_name"], "patient_email": user["email"], "patient_phone": user.get("phone"),
        "doctor_id": req.doctor_id, "doctor_name": doctor["name"], "doctor_specialization": doctor["specialization"],
        "hospital_id": doctor.get("hospital_id"),
        "date": req.date, "time_slot": req.time_slot,
        "consultation_type": req.consultation_type, "status": "booked",
        "reason": req.reason, "notes": None,
        "cancellation_reason": None,
        "google_calendar_event_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.appointments.insert_one(appt)
    # Push to Google Calendar if connected
    if doctor.get("google_calendar_connected"):
        ev_id = await _push_to_doctor_calendar(doctor, appt)
        if ev_id:
            await db.appointments.update_one({"id": appt_id}, {"$set": {"google_calendar_event_id": ev_id}})
            appt["google_calendar_event_id"] = ev_id
    await write_audit(user["id"], "appointment_booked", "appointment", appt_id, request, {"doctor_id": req.doctor_id})
    appt.pop("_id", None)
    return appt


@api.get("/appointments")
async def list_appointments(user: dict = Depends(get_current_user)):
    if user["role"] == "patient":
        query = {"patient_id": user["id"]}
    elif user["role"] == "doctor":
        query = {"doctor_id": user["id"]}
    else:
        query = {}
    rows = await db.appointments.find(query, {"_id": 0}).sort([("date", 1), ("time_slot", 1)]).to_list(500)
    return rows


@api.patch("/appointments/{appt_id}")
async def update_appointment(appt_id: str, req: AppointmentUpdate, request: Request, user: dict = Depends(get_current_user), _csrf=Depends(verify_csrf)):
    appt = await db.appointments.find_one({"id": appt_id}, {"_id": 0})
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if user["role"] == "patient" and appt["patient_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    if user["role"] == "doctor" and appt["doctor_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    # SECURITY FIX: Restrict status transitions by role
    if req.status:
        if user["role"] == "patient" and req.status not in ("cancelled",):
            raise HTTPException(status_code=403, detail="Patients can only cancel appointments")
        if user["role"] == "doctor" and req.status not in ("completed", "cancelled", "no_show"):
            raise HTTPException(status_code=403, detail="Invalid status transition for doctor")

    update = {k: v for k, v in req.model_dump(exclude_none=True).items()}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.appointments.update_one({"id": appt_id}, {"$set": update})
    await write_audit(user["id"], "appointment_updated", "appointment", appt_id, request, {"changes": update})
    return {**appt, **update}


# ---------------- PRESCRIPTIONS ----------------
@api.post("/prescriptions")
async def create_prescription(req: PrescriptionCreate, request: Request, user: dict = Depends(require_role("doctor")), _csrf=Depends(verify_csrf)):
    # SECURITY FIX: Verify this doctor owns this appointment and patient_id matches
    appt = await db.appointments.find_one({"id": req.appointment_id, "doctor_id": user["id"]})
    if not appt:
        raise HTTPException(status_code=403, detail="You can only prescribe for your own appointments")
    if appt["patient_id"] != req.patient_id:
        raise HTTPException(status_code=400, detail="Patient ID does not match the appointment")

    pid = str(uuid.uuid4())
    doc = {
        "id": pid,
        "appointment_id": req.appointment_id,
        "patient_id": req.patient_id,
        "doctor_id": user["id"], "doctor_name": user["full_name"],
        "diagnosis": req.diagnosis,
        "medications": [m.model_dump() for m in req.medications],
        "additional_notes": req.additional_notes,
        "is_voided": False, "voided_at": None, "voided_by": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.prescriptions.insert_one(doc)
    await write_audit(user["id"], "prescription_created", "prescription", pid, request)
    doc.pop("_id", None)
    return doc


@api.get("/prescriptions")
async def list_prescriptions(user: dict = Depends(get_current_user)):
    if user["role"] == "patient":
        q = {"patient_id": user["id"]}
    elif user["role"] == "doctor":
        q = {"doctor_id": user["id"]}
    else:
        q = {}
    return await db.prescriptions.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.post("/prescriptions/{pid}/void")
async def void_prescription(pid: str, request: Request, user: dict = Depends(require_role("doctor")), _csrf=Depends(verify_csrf)):
    pres = await db.prescriptions.find_one({"id": pid}, {"_id": 0})
    if not pres or pres["doctor_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Prescription not found")
    await db.prescriptions.update_one({"id": pid}, {"$set": {"is_voided": True, "voided_at": datetime.now(timezone.utc).isoformat(), "voided_by": user["id"]}})
    await write_audit(user["id"], "prescription_voided", "prescription", pid, request)
    return {"voided": True}


# ---------------- ADMIN ----------------
@api.get("/admin/stats")
async def admin_stats(user: dict = Depends(require_role("admin"))):
    pipeline = [
        {"$match": {"status": {"$in": ["booked", "completed"]}}},
        {"$lookup": {"from": "doctors", "localField": "doctor_id", "foreignField": "id", "as": "d"}},
        {"$unwind": "$d"},
        {"$group": {"_id": None, "total": {"$sum": "$d.consultation_fee"}}},
    ]
    rev = await db.appointments.aggregate(pipeline).to_list(1)
    return {
        "patients": await db.users.count_documents({"role": "patient"}),
        "doctors": await db.users.count_documents({"role": "doctor"}),
        "approved_doctors": await db.doctors.count_documents({"is_approved": True}),
        "pending_doctors": await db.doctors.count_documents({"is_approved": False}),
        "hospitals": await db.hospitals.count_documents({"is_active": True}),
        "appointments": await db.appointments.count_documents({}),
        "booked": await db.appointments.count_documents({"status": "booked"}),
        "completed": await db.appointments.count_documents({"status": "completed"}),
        "cancelled": await db.appointments.count_documents({"status": "cancelled"}),
        "revenue": rev[0]["total"] if rev else 0,
    }


@api.get("/admin/users")
async def admin_users(user: dict = Depends(require_role("admin"))):
    return await db.users.find({}, {"_id": 0, "password_hash": 0, "two_factor_secret": 0}).to_list(1000)


@api.patch("/admin/users/{user_id}/active")
async def admin_toggle_active(user_id: str, request: Request, body: dict, user: dict = Depends(require_role("admin")), _csrf=Depends(verify_csrf)):
    active = bool(body.get("is_active", True))
    await db.users.update_one({"id": user_id}, {"$set": {"is_active": active}})
    await write_audit(user["id"], "user_active_toggle", "user", user_id, request, {"is_active": active})
    return {"is_active": active}


@api.get("/admin/doctors/pending")
async def admin_pending_doctors(user: dict = Depends(require_role("admin"))):
    rows = await db.doctors.find({"is_approved": False}, {"_id": 0, "google_calendar_token": 0}).to_list(200)
    for d in rows:
        d["hospital"] = await db.hospitals.find_one({"id": d.get("hospital_id")}, {"_id": 0})
    return rows


@api.get("/admin/doctors")
async def admin_doctors(user: dict = Depends(require_role("admin"))):
    rows = await db.doctors.find({}, {"_id": 0, "google_calendar_token": 0}).to_list(500)
    for d in rows:
        d["hospital"] = await db.hospitals.find_one({"id": d.get("hospital_id")}, {"_id": 0})
    return rows


@api.post("/admin/doctors/{doc_id}/approve")
async def admin_approve_doctor(doc_id: str, req: DoctorApprovalAction, request: Request, user: dict = Depends(require_role("admin")), _csrf=Depends(verify_csrf)):
    res = await db.doctors.update_one({"id": doc_id}, {"$set": {"is_approved": True, "approved_by": user["id"], "approved_at": datetime.now(timezone.utc).isoformat()}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Doctor not found")
    await write_audit(user["id"], "doctor_approved", "doctor", doc_id, request)
    return {"approved": True}


@api.post("/admin/doctors/{doc_id}/reject")
async def admin_reject_doctor(doc_id: str, req: DoctorApprovalAction, request: Request, user: dict = Depends(require_role("admin")), _csrf=Depends(verify_csrf)):
    res = await db.doctors.update_one({"id": doc_id}, {"$set": {"is_approved": False, "approved_by": user["id"], "approved_at": datetime.now(timezone.utc).isoformat(), "rejection_reason": req.reason}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Doctor not found")
    await write_audit(user["id"], "doctor_rejected", "doctor", doc_id, request, {"reason": req.reason})
    return {"approved": False}


@api.post("/admin/hospitals")
async def admin_create_hospital(req: HospitalCreate, request: Request, user: dict = Depends(require_role("admin")), _csrf=Depends(verify_csrf)):
    hid = str(uuid.uuid4())
    doc = {"id": hid, "is_active": True, "rating": 4.5, **req.model_dump(),
           "created_at": datetime.now(timezone.utc).isoformat(),
           "updated_at": datetime.now(timezone.utc).isoformat()}
    await db.hospitals.insert_one(doc)
    await write_audit(user["id"], "hospital_created", "hospital", hid, request)
    doc.pop("_id", None)
    return doc


@api.put("/admin/hospitals/{hid}")
async def admin_update_hospital(hid: str, req: HospitalUpdate, request: Request, user: dict = Depends(require_role("admin")), _csrf=Depends(verify_csrf)):
    update = {k: v for k, v in req.model_dump(exclude_none=True).items()}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.hospitals.update_one({"id": hid}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Hospital not found")
    await write_audit(user["id"], "hospital_updated", "hospital", hid, request, {"fields": list(update.keys())})
    return await db.hospitals.find_one({"id": hid}, {"_id": 0})


@api.delete("/admin/hospitals/{hid}")
async def admin_delete_hospital(hid: str, request: Request, user: dict = Depends(require_role("admin")), _csrf=Depends(verify_csrf)):
    await db.hospitals.update_one({"id": hid}, {"$set": {"is_active": False}})
    await write_audit(user["id"], "hospital_deleted", "hospital", hid, request)
    return {"ok": True}


@api.get("/admin/audit-logs")
async def admin_audit(user: dict = Depends(require_role("admin"))):
    return await db.audit_logs.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


# ---------------- AI ----------------
@api.post("/ai/chat")
@limiter.limit("20/minute")
async def ai_chat(req: ChatRequest, request: Request, user: dict = Depends(get_current_user), _csrf=Depends(verify_csrf)):
    session_id = req.session_id or f"{user['id']}-{uuid.uuid4()}"
    system_message = (
        "You are Sukhya Med's AI Health Assistant — warm, professional, concise. "
        "Answer general health questions, explain medical concepts, suggest which specialist to consult on Sukhya Med. "
        "Keep replies to 3-5 short paragraphs. ALWAYS remind users you are not a substitute for professional medical advice. "
        "Never prescribe medications. For severe symptoms, urge them to book a consultation or visit an ER."
    )
    try:
        history = await db.ai_messages.find({"session_id": session_id}, {"_id": 0}).sort("created_at", 1).to_list(20)
        messages = []
        for msg in history:
            messages.append({"role": "user", "content": msg["user_message"]})
            messages.append({"role": "assistant", "content": msg["assistant_reply"]})
        messages.append({"role": "user", "content": req.message})

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-sonnet-4-20250514",
                    "max_tokens": 1024,
                    "system": system_message,
                    "messages": messages,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            reply = data["content"][0]["text"]

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
async def ai_history(user: dict = Depends(get_current_user)):
    return await db.ai_messages.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", 1).to_list(200)

# ---------------- Misc ----------------
@api.get("/")
async def root():
    return {"message": "Sukhya Med API", "version": "2.0"}


@api.get("/health")
async def health():
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}


@api.get("/config/public")
async def public_config():
    return {
        "google_client_id": GOOGLE_CLIENT_ID if not GOOGLE_CLIENT_ID.startswith("YOUR_") else "",
        "google_oauth_enabled": bool(GOOGLE_CLIENT_ID) and not GOOGLE_CLIENT_ID.startswith("YOUR_"),
        "resend_configured": bool(RESEND_API_KEY) and not RESEND_API_KEY.startswith("re_REPLACE"),
    }


app.include_router(api)


# ---------------- Startup ----------------
SEED_HOSPITALS = [
    {"name": "Apollo Hospitals Navi Mumbai", "address": "Plot 13, Sector 23", "area": "Nerul", "city": "Navi Mumbai", "state": "Maharashtra", "pin_code": "400706", "phone": "+91-22-3350-3350", "email": "info@apollo.com", "description": "Multi-speciality tertiary care hospital with 24x7 emergency and ICU.", "specialties_available": ["Cardiology", "Neurology", "Orthopedics", "General Medicine"], "image_url": "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=800&q=80"},
    {"name": "Fortis Hiranandani", "address": "Mini Sea Shore Road", "area": "Vashi", "city": "Navi Mumbai", "state": "Maharashtra", "pin_code": "400703", "phone": "+91-22-3919-9222", "email": "info@fortis.com", "description": "Renowned for cardiac sciences, oncology and women & child care.", "specialties_available": ["Cardiology", "Dermatology", "Gynecology", "Pediatrics"], "image_url": "https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=800&q=80"},
    {"name": "MGM New Bombay Hospital", "address": "Sector 3", "area": "Koparkhairane", "city": "Navi Mumbai", "state": "Maharashtra", "pin_code": "400709", "phone": "+91-22-2778-9000", "email": "info@mgm.com", "description": "Community hospital with a strong primary care and pediatric department.", "specialties_available": ["Pediatrics", "General Medicine", "ENT", "Ophthalmology"], "image_url": "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800&q=80"},
    {"name": "Cloudnine Panvel", "address": "Plot 47, Sector 7", "area": "Panvel", "city": "Navi Mumbai", "state": "Maharashtra", "pin_code": "410206", "phone": "+91-22-7166-7166", "email": "info@cloudnine.com", "description": "Specialised in obstetrics, gynaecology and neonatal care.", "specialties_available": ["Gynecology", "Pediatrics"], "image_url": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80"},
    {"name": "Jupiter Hospital Thane", "address": "Eastern Express Highway", "area": "Thane West", "city": "Thane", "state": "Maharashtra", "pin_code": "400601", "phone": "+91-22-2172-1500", "email": "info@jupiter.com", "description": "Quaternary care hospital known for neurosciences and oncology.", "specialties_available": ["Neurology", "Psychiatry", "Orthopedics", "Dentistry"], "image_url": "https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=800&q=80"},
]

SEED_DOCTORS = [
    {"full_name": "Dr. Aanya Sharma", "email": "aanya.sharma@sukhyamed.com", "specialization": "Cardiology", "hospital_index": 0, "experience": 12, "fee": 2200, "license": "MH-CARD-12001", "bio": "Interventional cardiologist focused on preventive cardiology and complex angioplasty.", "photo": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=600&q=80", "online": True},
    {"full_name": "Dr. Rohan Mehta", "email": "rohan.mehta@sukhyamed.com", "specialization": "Dermatology", "hospital_index": 1, "experience": 9, "fee": 1800, "license": "MH-DERM-12002", "bio": "Cosmetic and clinical dermatologist. Expert in acne, pigmentation and laser.", "photo": "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=600&q=80", "online": True},
    {"full_name": "Dr. Priya Iyer", "email": "priya.iyer@sukhyamed.com", "specialization": "Pediatrics", "hospital_index": 2, "experience": 14, "fee": 1500, "license": "MH-PEDS-12003", "bio": "Pediatrician with expertise in newborn care, developmental issues and adolescent health.", "photo": "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=600&q=80", "online": True},
    {"full_name": "Dr. Arjun Kapoor", "email": "arjun.kapoor@sukhyamed.com", "specialization": "Neurology", "hospital_index": 4, "experience": 18, "fee": 2500, "license": "MH-NEUR-12004", "bio": "Senior neurologist treating epilepsy, stroke recovery and movement disorders.", "photo": "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=600&q=80", "online": False},
    {"full_name": "Dr. Sara Khan", "email": "sara.khan@sukhyamed.com", "specialization": "Gynecology", "hospital_index": 3, "experience": 11, "fee": 2000, "license": "MH-GYNE-12005", "bio": "Obstetrician & gynecologist specializing in high-risk pregnancies and women's wellness.", "photo": "https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=600&q=80", "online": True},
    {"full_name": "Dr. Kabir Singh", "email": "kabir.singh@sukhyamed.com", "specialization": "Orthopedics", "hospital_index": 0, "experience": 15, "fee": 2300, "license": "MH-ORTH-12006", "bio": "Orthopedic surgeon specialising in joint replacement and sports injuries.", "photo": "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=600&q=80", "online": False},
    {"full_name": "Dr. Meera Reddy", "email": "meera.reddy@sukhyamed.com", "specialization": "Psychiatry", "hospital_index": 4, "experience": 10, "fee": 1900, "license": "MH-PSYC-12007", "bio": "Psychiatrist focused on mood disorders, anxiety and cognitive behavioural therapy.", "photo": "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=600&q=80", "online": True},
    {"full_name": "Dr. Daniel Joseph", "email": "daniel.joseph@sukhyamed.com", "specialization": "General Medicine", "hospital_index": 2, "experience": 8, "fee": 1200, "license": "MH-GENM-12008", "bio": "Family physician offering primary care, preventive checks and chronic disease management.", "photo": "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=600&q=80", "online": True},
]


def _default_availability() -> List[dict]:
    # Mon-Fri 10:00–13:00 (offline), 15:00–18:00 (both)
    return [
        {"day_of_week": d, "start_time": "10:00", "end_time": "13:00", "mode": "offline", "slot_minutes": 30}
        for d in range(0, 5)
    ] + [
        {"day_of_week": d, "start_time": "15:00", "end_time": "18:00", "mode": "both", "slot_minutes": 30}
        for d in range(0, 5)
    ] + [
        {"day_of_week": 5, "start_time": "10:00", "end_time": "13:00", "mode": "both", "slot_minutes": 30}
    ]


@app.on_event("startup")
async def on_startup():
    # Indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.users.create_index("google_id", sparse=True)
    await db.doctors.create_index("id", unique=True)
    await db.doctors.create_index("user_id", unique=True)
    await db.doctors.create_index("hospital_id")
    await db.doctors.create_index("specialization")
    await db.hospitals.create_index("id", unique=True)
    await db.hospitals.create_index("area")
    await db.appointments.create_index("patient_id")
    await db.appointments.create_index("doctor_id")
    await db.appointments.create_index([("doctor_id", 1), ("date", 1), ("time_slot", 1)])
    await db.prescriptions.create_index("patient_id")
    await db.prescriptions.create_index("doctor_id")
    await db.audit_logs.create_index([("created_at", -1)])
    await db.password_reset_tokens.create_index("token", unique=True)

    # Seed admin
    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_password = os.environ["ADMIN_PASSWORD"]
    existing_admin = await db.users.find_one({"email": admin_email})
    if not existing_admin:
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "email": admin_email,
            "password_hash": hash_password(admin_password),
            "full_name": "Platform Admin", "phone": "+91-0000000000", "role": "admin",
            "google_id": None, "avatar_url": None,
            "is_active": True, "is_verified": True,
            "failed_login_attempts": 0, "locked_until": None,
            "two_factor_secret": None, "two_factor_enabled": False,
            "consent_given_at": datetime.now(timezone.utc).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info("Seeded admin")
    elif not verify_password(admin_password, existing_admin["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})

    # Seed test patient
    if not await db.users.find_one({"email": "patient@test.com"}):
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "email": "patient@test.com",
            "password_hash": hash_password("Patient@123"),
            "full_name": "Test Patient", "phone": "+91-9999900000", "role": "patient",
            "google_id": None, "avatar_url": None,
            "is_active": True, "is_verified": True,
            "failed_login_attempts": 0, "locked_until": None,
            "two_factor_secret": None, "two_factor_enabled": False,
            "consent_given_at": datetime.now(timezone.utc).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })

    # Seed hospitals
    hospital_ids: List[str] = []
    if await db.hospitals.count_documents({}) == 0:
        for h in SEED_HOSPITALS:
            hid = str(uuid.uuid4())
            await db.hospitals.insert_one({"id": hid, "is_active": True, "rating": 4.5, **h,
                                           "created_at": datetime.now(timezone.utc).isoformat(),
                                           "updated_at": datetime.now(timezone.utc).isoformat()})
            hospital_ids.append(hid)
        logger.info("Seeded %d hospitals", len(SEED_HOSPITALS))
    else:
        existing = await db.hospitals.find({}, {"_id": 0, "id": 1}).to_list(50)
        hospital_ids = [h["id"] for h in existing]

    # Seed doctors
    if await db.doctors.count_documents({}) == 0 and hospital_ids:
        for d in SEED_DOCTORS:
            uid = str(uuid.uuid4())
            await db.users.insert_one({
                "id": uid, "email": d["email"],
                "password_hash": hash_password("Doctor@123"),
                "full_name": d["full_name"], "phone": "+91-9000000000", "role": "doctor",
                "google_id": None, "avatar_url": d["photo"],
                "is_active": True, "is_verified": True,
                "failed_login_attempts": 0, "locked_until": None,
                "two_factor_secret": None, "two_factor_enabled": False,
                "consent_given_at": datetime.now(timezone.utc).isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            })
            await db.doctors.insert_one({
                "id": uid, "user_id": uid, "hospital_id": hospital_ids[d["hospital_index"]],
                "name": d["full_name"], "email": d["email"],
                "specialization": d["specialization"],
                "years_of_experience": d["experience"],
                "license_number": d["license"],
                "bio": d["bio"],
                "profile_photo_url": d["photo"],
                "consultation_fee": d["fee"],
                "is_approved": True, "approved_by": "seed", "approved_at": datetime.now(timezone.utc).isoformat(),
                "online_consultation_enabled": d["online"],
                "availability": _default_availability(),
                "blocked_dates": [],
                "today_mode": "both",
                "google_calendar_connected": False,
                "google_calendar_token": None,
                "rating": 4.8, "reviews_count": 120,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            })
        logger.info("Seeded %d doctors", len(SEED_DOCTORS))


@app.on_event("shutdown")
async def on_shutdown():
    mongo_client.close()
