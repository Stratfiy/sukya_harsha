import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import api, { formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import {
    Calendar, CheckCircle2, Pill, X, Video, AlertCircle,
    Settings, RefreshCw, User, Stethoscope, Award, Camera,
    FileText, ChevronRight, Sparkles, Building2, Edit3,
    Star, Briefcase, MapPin, Upload, Check, Phone
} from "lucide-react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const SPECIALIZATIONS = [
    "Cardiology", "Dermatology", "Endocrinology", "Gastroenterology",
    "General Medicine", "General Surgery", "Gynaecology", "Neurology",
    "Oncology", "Ophthalmology", "Orthopaedics", "Paediatrics",
    "Psychiatry", "Pulmonology", "Radiology", "Urology",
];

// ─── Cloudinary unsigned upload ──────────────────────────────────────────────
// Uses Sukhya's free Cloudinary unsigned preset — no API key needed in frontend
const CLOUDINARY_CLOUD = "sukhyamed";
const CLOUDINARY_PRESET = "doctor_photos";

async function uploadToCloudinary(file) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", CLOUDINARY_PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
        method: "POST", body: fd,
    });
    if (!res.ok) throw new Error("Upload failed");
    const data = await res.json();
    return data.secure_url;
}

// ─── Photo Upload Component ──────────────────────────────────────────────────
function PhotoUploader({ value, onChange }) {
    const [uploading, setUploading] = useState(false);
    const [uploadErr, setUploadErr] = useState("");

    const handleFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { setUploadErr("File too large (max 5MB)"); return; }
        setUploading(true); setUploadErr("");
        try {
            const url = await uploadToCloudinary(file);
            onChange(url);
        } catch {
            // Fallback: just use object URL for preview, remind user to use URL field
            setUploadErr("Direct upload not configured yet. Paste a photo URL below instead.");
        } finally { setUploading(false); }
    };

    return (
        <div className="space-y-3">
            {/* Current photo preview */}
            <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-mint-50 border-2 border-mint-100 flex-shrink-0 overflow-hidden">
                    {value
                        ? <img src={value} alt="Profile" className="w-full h-full object-cover" onError={e => { e.target.style.display="none"; }} />
                        : <div className="w-full h-full flex items-center justify-center"><Camera size={24} className="text-mint-300" /></div>
                    }
                </div>
                <div className="flex-1">
                    <label className={`flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-xl border transition text-sm font-medium
                        ${uploading ? "bg-mint-50 text-mint-400 border-mint-100 cursor-wait" : "bg-white border-mint-200 text-mint-700 hover:bg-mint-50 hover:border-mint-400"}`}>
                        {uploading ? <><RefreshCw size={14} className="animate-spin" /> Uploading…</> : <><Upload size={14} /> Upload photo</>}
                        <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
                    </label>
                    <p className="text-xs text-mint-800/40 mt-1">JPG, PNG up to 5MB</p>
                </div>
            </div>

            {/* URL fallback */}
            <div>
                <label className="text-xs text-mint-800/50 mb-1 block">Or paste an image URL directly</label>
                <input value={value} onChange={e => onChange(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                    className="w-full px-4 py-2.5 rounded-xl border border-mint-100 bg-white/80 text-mint-800 text-sm outline-none focus:ring-2 focus:ring-mint-500" />
            </div>
            {uploadErr && <p className="text-xs text-amber-600">{uploadErr}</p>}
        </div>
    );
}

// ─── Profile Setup — 3-step wizard ──────────────────────────────────────────
function ProfileSetup({ profile, onComplete }) {
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [form, setForm] = useState({
        name: profile?.name || "",
        specialization: profile?.specialization || "",
        years_of_experience: profile?.years_of_experience || 1,
        consultation_fee: profile?.consultation_fee || 500,
        license_number: profile?.license_number || "",
        profile_photo_url: profile?.profile_photo_url || "",
        bio: profile?.bio || "",
    });
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const save = async () => {
        setSaving(true); setError("");
        try {
            await api.put("/doctor/profile", {
                name: form.name,
                specialization: form.specialization,
                years_of_experience: Number(form.years_of_experience),
                consultation_fee: Number(form.consultation_fee),
                license_number: form.license_number,
                profile_photo_url: form.profile_photo_url,
                bio: form.bio,
                profile_setup_complete: true,
            });
            onComplete();
        } catch (e) { setError(formatApiError(e.response?.data?.detail)); }
        finally { setSaving(false); }
    };

    const steps = [{ n: 1, label: "Basics", icon: User }, { n: 2, label: "Practice", icon: Stethoscope }, { n: 3, label: "Profile", icon: Camera }];

    return (
        <div className="min-h-screen" style={{ background: "radial-gradient(ellipse at 0% 0%, rgba(31,138,77,0.1) 0%, transparent 60%), radial-gradient(ellipse at 100% 100%, rgba(212,245,226,0.5) 0%, transparent 60%), #ffffff" }}>
            <div className="flex items-center justify-between px-6 sm:px-10 py-5">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-mint-600 flex items-center justify-center"><Sparkles size={16} className="text-white" /></div>
                    <span className="font-semibold text-mint-800 text-sm tracking-tight">Sukhya Med</span>
                </div>
                <span className="text-xs text-mint-800/40 font-medium uppercase tracking-widest">Doctor onboarding</span>
            </div>

            <div className="mx-auto max-w-2xl px-5 sm:px-6 pb-20 pt-6 sm:pt-10">
                <div className="mb-8">
                    <p className="overline mb-2">Welcome</p>
                    <h1 className="editorial text-4xl sm:text-5xl text-mint-800 leading-tight">Complete your <em className="italic text-mint-600">profile.</em></h1>
                    <p className="mt-3 text-mint-800/60 text-sm max-w-md">Patients discover you through this information. A complete profile builds trust and gets more bookings.</p>
                </div>

                {/* Step indicator */}
                <div className="flex items-center gap-0 mb-8">
                    {steps.map((s, i) => {
                        const Icon = s.icon;
                        const done = step > s.n;
                        const active = step === s.n;
                        return (
                            <div key={s.n} className="flex items-center">
                                <button onClick={() => done && setStep(s.n)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all text-xs font-medium
                                        ${active ? "bg-mint-600 text-white shadow-lg shadow-mint-600/20" : done ? "bg-mint-100 text-mint-700 cursor-pointer hover:bg-mint-200" : "bg-white/60 text-mint-800/30 cursor-default border border-mint-100"}`}>
                                    {done ? <CheckCircle2 size={13} /> : <Icon size={13} />}{s.label}
                                </button>
                                {i < steps.length - 1 && <div className={`w-6 h-px mx-1 ${done ? "bg-mint-400" : "bg-mint-100"}`} />}
                            </div>
                        );
                    })}
                </div>

                <div className="glass rounded-3xl p-6 sm:p-8 shadow-xl shadow-mint-600/5">
                    {/* STEP 1 */}
                    {step === 1 && (
                        <div className="space-y-5">
                            <p className="text-xs uppercase tracking-widest text-mint-600 font-semibold mb-4">Your identity</p>
                            <div>
                                <label className="block mb-1.5 text-xs font-semibold text-mint-800/60 uppercase tracking-wider">Full name</label>
                                <div className="relative">
                                    <User size={15} className="absolute left-4 top-3.5 text-mint-400 pointer-events-none" />
                                    <input value={form.name} onChange={e => set("name", e.target.value)}
                                        placeholder="Dr. Your Name"
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-mint-100 bg-white/80 text-mint-800 text-sm outline-none focus:ring-2 focus:ring-mint-500" />
                                </div>
                            </div>
                            <div>
                                <label className="block mb-1.5 text-xs font-semibold text-mint-800/60 uppercase tracking-wider">Specialization</label>
                                <div className="relative">
                                    <Stethoscope size={15} className="absolute left-4 top-3.5 text-mint-400 pointer-events-none" />
                                    <select value={form.specialization} onChange={e => set("specialization", e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-mint-100 bg-white/80 text-mint-800 text-sm outline-none focus:ring-2 focus:ring-mint-500 appearance-none">
                                        <option value="">Select your specialization</option>
                                        {SPECIALIZATIONS.map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block mb-1.5 text-xs font-semibold text-mint-800/60 uppercase tracking-wider">Years of experience</label>
                                    <input type="number" min={0} max={60} value={form.years_of_experience} onChange={e => set("years_of_experience", e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-mint-100 bg-white/80 text-mint-800 text-sm outline-none focus:ring-2 focus:ring-mint-500" />
                                </div>
                                <div>
                                    <label className="block mb-1.5 text-xs font-semibold text-mint-800/60 uppercase tracking-wider">Consultation fee (₹)</label>
                                    <input type="number" min={0} value={form.consultation_fee} onChange={e => set("consultation_fee", e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-mint-100 bg-white/80 text-mint-800 text-sm outline-none focus:ring-2 focus:ring-mint-500" />
                                </div>
                            </div>
                            <button onClick={() => setStep(2)} disabled={!form.specialization || !form.name}
                                className="w-full btn-pill btn-primary disabled:opacity-40 justify-center mt-2">
                                Continue <ChevronRight size={16} />
                            </button>
                        </div>
                    )}

                    {/* STEP 2 */}
                    {step === 2 && (
                        <div className="space-y-5">
                            <p className="text-xs uppercase tracking-widest text-mint-600 font-semibold mb-4">Practice details</p>
                            <div>
                                <label className="block mb-1.5 text-xs font-semibold text-mint-800/60 uppercase tracking-wider">Medical license number</label>
                                <div className="relative">
                                    <Award size={15} className="absolute left-4 top-3.5 text-mint-400 pointer-events-none" />
                                    <input value={form.license_number} onChange={e => set("license_number", e.target.value)}
                                        placeholder="e.g. MH-CARD-12001"
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-mint-100 bg-white/80 text-mint-800 text-sm outline-none focus:ring-2 focus:ring-mint-500" />
                                </div>
                            </div>
                            {profile?.hospital && (
                                <div className="rounded-2xl bg-mint-50/60 border border-mint-100 p-4 flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-mint-600/10 flex items-center justify-center flex-shrink-0">
                                        <Building2 size={16} className="text-mint-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-mint-800">{profile.hospital.name}</p>
                                        <p className="text-xs text-mint-800/60">{profile.hospital.area} · {profile.hospital.city}</p>
                                    </div>
                                    <span className="ml-auto text-xs text-mint-600 bg-mint-100 px-2 py-1 rounded-full font-medium">Assigned</span>
                                </div>
                            )}
                            <div className="flex gap-3 mt-2">
                                <button onClick={() => setStep(1)} className="flex-1 btn-pill btn-ghost text-sm justify-center">Back</button>
                                <button onClick={() => setStep(3)} disabled={!form.license_number}
                                    className="flex-1 btn-pill btn-primary disabled:opacity-40 justify-center">
                                    Continue <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3 */}
                    {step === 3 && (
                        <div className="space-y-5">
                            <p className="text-xs uppercase tracking-widest text-mint-600 font-semibold mb-4">Public profile</p>
                            <div>
                                <label className="block mb-2 text-xs font-semibold text-mint-800/60 uppercase tracking-wider">Profile photo</label>
                                <PhotoUploader value={form.profile_photo_url} onChange={v => set("profile_photo_url", v)} />
                            </div>
                            <div>
                                <label className="block mb-1.5 text-xs font-semibold text-mint-800/60 uppercase tracking-wider">
                                    Professional bio <span className="ml-2 text-mint-400 normal-case font-normal tracking-normal">{form.bio.length}/300</span>
                                </label>
                                <textarea value={form.bio} onChange={e => set("bio", e.target.value.slice(0, 300))}
                                    rows={4} placeholder="e.g. Interventional cardiologist with 12 years of experience in preventive care..."
                                    className="w-full px-4 py-3 rounded-xl border border-mint-100 bg-white/80 text-mint-800 text-sm outline-none focus:ring-2 focus:ring-mint-500 resize-none" />
                            </div>
                            <div className="rounded-2xl bg-mint-50/60 border border-mint-100 p-4">
                                <p className="text-xs font-semibold text-mint-800/40 uppercase tracking-wider mb-3">Profile summary</p>
                                <div className="grid grid-cols-2 gap-y-2 text-xs">
                                    <span className="text-mint-800/50">Name</span><span className="text-mint-800 font-medium text-right">{form.name || "—"}</span>
                                    <span className="text-mint-800/50">Specialization</span><span className="text-mint-800 font-medium text-right">{form.specialization || "—"}</span>
                                    <span className="text-mint-800/50">Experience</span><span className="text-mint-800 font-medium text-right">{form.years_of_experience} years</span>
                                    <span className="text-mint-800/50">Consultation fee</span><span className="text-mint-800 font-medium text-right">₹{form.consultation_fee}</span>
                                </div>
                            </div>
                            {error && <p className="text-sm text-red-600">{error}</p>}
                            <div className="flex gap-3">
                                <button onClick={() => setStep(2)} className="flex-1 btn-pill btn-ghost text-sm justify-center">Back</button>
                                <button onClick={save} disabled={saving || !form.bio}
                                    className="flex-1 btn-pill btn-primary disabled:opacity-40 justify-center">
                                    {saving ? "Saving…" : <><Sparkles size={14} /> Go to dashboard</>}
                                </button>
                            </div>
                            <p className="text-center text-xs text-mint-800/40">You can edit all details anytime from My Profile in the menu.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── My Profile Card page ────────────────────────────────────────────────────
function MyProfilePage({ profile, onSaved }) {
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState("");
    const [form, setForm] = useState({
        name: profile?.name || "",
        specialization: profile?.specialization || "",
        years_of_experience: profile?.years_of_experience || 1,
        consultation_fee: profile?.consultation_fee || 500,
        bio: profile?.bio || "",
        profile_photo_url: profile?.profile_photo_url || "",
        license_number: profile?.license_number || "",
    });
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const save = async () => {
        setSaving(true); setError("");
        try {
            await api.put("/doctor/profile", { ...form, years_of_experience: Number(form.years_of_experience), consultation_fee: Number(form.consultation_fee) });
            setSaved(true); setEditing(false);
            setTimeout(() => setSaved(false), 3000);
            onSaved();
        } catch (e) { setError(formatApiError(e.response?.data?.detail)); }
        finally { setSaving(false); }
    };

    return (
        <div className="mx-auto max-w-2xl px-4 sm:px-6 pt-8 pb-20">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <p className="overline">My profile</p>
                    <h1 className="editorial text-3xl sm:text-4xl text-mint-800 mt-1">Profile settings</h1>
                </div>
                {!editing
                    ? <button onClick={() => setEditing(true)} className="btn-pill btn-ghost text-sm"><Edit3 size={14} /> Edit profile</button>
                    : <div className="flex gap-2">
                        <button onClick={() => setEditing(false)} className="btn-pill btn-ghost text-sm">Cancel</button>
                        <button onClick={save} disabled={saving} className="btn-pill btn-primary text-sm disabled:opacity-50">
                            {saving ? "Saving…" : saved ? <><Check size={14} /> Saved!</> : "Save changes"}
                        </button>
                    </div>
                }
            </div>

            {saved && !editing && (
                <div className="mb-4 glass-mint rounded-xl px-4 py-3 text-sm text-mint-700 flex items-center gap-2">
                    <Check size={14} className="text-mint-600" /> Profile updated successfully.
                </div>
            )}

            {/* Profile card — view mode */}
            {!editing && (
                <div className="glass rounded-3xl overflow-hidden shadow-lg shadow-mint-600/5">
                    {/* Banner */}
                    <div className="h-24 bg-gradient-to-r from-mint-600/20 to-mint-400/10 relative">
                        <div className="absolute -bottom-10 left-6">
                            <div className="w-20 h-20 rounded-2xl border-4 border-white bg-mint-50 overflow-hidden shadow-md">
                                {form.profile_photo_url
                                    ? <img src={form.profile_photo_url} alt={form.name} className="w-full h-full object-cover" />
                                    : <div className="w-full h-full flex items-center justify-center"><User size={28} className="text-mint-300" /></div>
                                }
                            </div>
                        </div>
                    </div>
                    <div className="pt-14 px-6 pb-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="editorial text-2xl text-mint-800">{form.name || "—"}</h2>
                                <p className="text-sm text-mint-600 font-medium">{form.specialization || "—"}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-mint-800/40 uppercase tracking-wider">Fee</p>
                                <p className="editorial text-2xl text-mint-800">₹{form.consultation_fee}</p>
                            </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                            <span className="flex items-center gap-1.5 text-xs text-mint-800/70 bg-mint-50 rounded-full px-3 py-1.5">
                                <Briefcase size={11} /> {form.years_of_experience} years experience
                            </span>
                            <span className="flex items-center gap-1.5 text-xs text-mint-800/70 bg-mint-50 rounded-full px-3 py-1.5">
                                <Award size={11} /> {form.license_number || "No license added"}
                            </span>
                            {profile?.hospital && (
                                <span className="flex items-center gap-1.5 text-xs text-mint-800/70 bg-mint-50 rounded-full px-3 py-1.5">
                                    <MapPin size={11} /> {profile.hospital.name}
                                </span>
                            )}
                        </div>

                        <p className="mt-4 text-sm text-mint-800/70 leading-relaxed">{form.bio || "No bio added yet."}</p>

                        <div className="mt-5 pt-4 border-t border-mint-100">
                            <p className="text-xs text-mint-800/40">
                                Hospital assignment and approval status are managed by the Sukhya admin.
                                To change your hospital or email, contact <a href="mailto:admin@sukhyamed.com" className="text-mint-600 underline">admin@sukhyamed.com</a>.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit mode */}
            {editing && (
                <div className="glass rounded-3xl p-6 space-y-5">
                    <div>
                        <label className="block mb-2 text-xs font-semibold text-mint-800/60 uppercase tracking-wider">Profile photo</label>
                        <PhotoUploader value={form.profile_photo_url} onChange={v => set("profile_photo_url", v)} />
                    </div>
                    <div>
                        <label className="block mb-1.5 text-xs font-semibold text-mint-800/60 uppercase tracking-wider">Full name</label>
                        <input value={form.name} onChange={e => set("name", e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-mint-100 bg-white/80 text-mint-800 text-sm outline-none focus:ring-2 focus:ring-mint-500" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block mb-1.5 text-xs font-semibold text-mint-800/60 uppercase tracking-wider">Specialization</label>
                            <select value={form.specialization} onChange={e => set("specialization", e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-mint-100 bg-white/80 text-mint-800 text-sm outline-none focus:ring-2 focus:ring-mint-500">
                                {SPECIALIZATIONS.map(s => <option key={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block mb-1.5 text-xs font-semibold text-mint-800/60 uppercase tracking-wider">License number</label>
                            <input value={form.license_number} onChange={e => set("license_number", e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-mint-100 bg-white/80 text-mint-800 text-sm outline-none focus:ring-2 focus:ring-mint-500" />
                        </div>
                        <div>
                            <label className="block mb-1.5 text-xs font-semibold text-mint-800/60 uppercase tracking-wider">Years experience</label>
                            <input type="number" min={0} value={form.years_of_experience} onChange={e => set("years_of_experience", e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-mint-100 bg-white/80 text-mint-800 text-sm outline-none focus:ring-2 focus:ring-mint-500" />
                        </div>
                        <div>
                            <label className="block mb-1.5 text-xs font-semibold text-mint-800/60 uppercase tracking-wider">Consultation fee (₹)</label>
                            <input type="number" min={0} value={form.consultation_fee} onChange={e => set("consultation_fee", e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-mint-100 bg-white/80 text-mint-800 text-sm outline-none focus:ring-2 focus:ring-mint-500" />
                        </div>
                    </div>
                    <div>
                        <label className="block mb-1.5 text-xs font-semibold text-mint-800/60 uppercase tracking-wider">
                            Bio <span className="text-mint-400 normal-case font-normal">{form.bio.length}/300</span>
                        </label>
                        <textarea value={form.bio} onChange={e => set("bio", e.target.value.slice(0, 300))}
                            rows={4} className="w-full px-4 py-3 rounded-xl border border-mint-100 bg-white/80 text-mint-800 text-sm outline-none focus:ring-2 focus:ring-mint-500 resize-none" />
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                </div>
            )}
        </div>
    );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function DoctorDashboard() {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [appts, setAppts] = useState([]);
    const [error, setError] = useState("");
    const [view, setView] = useState("dashboard"); // "dashboard" | "profile"
    const [setupDone, setSetupDone] = useState(false);
    const [prescribingFor, setPrescribingFor] = useState(null);
    const [presForm, setPresForm] = useState({ diagnosis: "", medications: [{ name: "", dosage: "", frequency: "", duration: "" }], additional_notes: "" });

    // Detect if navigated to /doctor/profile via navbar
    const location = useLocation();
    useEffect(() => {
        if (location.pathname === "/doctor/profile") setView("profile");
        else setView("dashboard");
    }, [location.pathname]);

    const load = async () => {
        try {
            const [p, a] = await Promise.all([api.get("/doctor/profile"), api.get("/appointments")]);
            setProfile(p.data);
            setAppts(a.data);
        } catch (e) { setError(formatApiError(e.response?.data?.detail)); }
    };
    useEffect(() => { load(); }, []);

    const updateProfile = async (changes) => {
        try {
            const { data } = await api.put("/doctor/profile", changes);
            setProfile(p => ({ ...p, ...data }));
        } catch (e) { setError(formatApiError(e.response?.data?.detail)); }
    };

    const today = new Date().toISOString().slice(0, 10);
    const todays = appts.filter(a => a.date === today);

    const markComplete = async (id) => { await api.patch(`/appointments/${id}`, { status: "completed" }); load(); };
    const markNoShow = async (id) => { await api.patch(`/appointments/${id}`, { status: "no_show" }); load(); };

    const submitPrescription = async () => {
        if (!prescribingFor) return;
        try {
            await api.post("/prescriptions", {
                appointment_id: prescribingFor.id, patient_id: prescribingFor.patient_id,
                diagnosis: presForm.diagnosis, medications: presForm.medications.filter(m => m.name),
                additional_notes: presForm.additional_notes,
            });
            await markComplete(prescribingFor.id);
            setPrescribingFor(null);
            setPresForm({ diagnosis: "", medications: [{ name: "", dosage: "", frequency: "", duration: "" }], additional_notes: "" });
        } catch (e) { setError(formatApiError(e.response?.data?.detail)); }
    };

    const connectGCal = async () => {
        const { data } = await api.get("/doctor/google-calendar/auth-url");
        if (!data.configured) { alert("Google Calendar not configured on server yet."); return; }
        window.location.href = data.url;
    };

    if (!profile) return (
        <div className="min-h-screen"><Navbar />
            <p className="mx-auto max-w-2xl px-6 py-20 text-center text-mint-800/60">Loading…</p>
        </div>
    );

    // Show setup only if doctor has never completed setup before
    const isProfileIncomplete = !profile.profile_setup_complete;
    if (isProfileIncomplete && !setupDone) {
        return <ProfileSetup profile={profile} onComplete={() => { setSetupDone(true); load(); }} />;
    }

    // Show profile card page
    if (view === "profile") {
        return (
            <div className="min-h-screen">
                <Navbar />
                <MyProfilePage profile={profile} onSaved={load} />
            </div>
        );
    }

    const upcoming = appts.filter(a => a.status === "booked");

    return (
        <div className="min-h-screen">
            <Navbar />
            <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-8 sm:pt-10 pb-20" data-testid="doctor-dashboard">
                <span className="overline">Doctor dashboard</span>
                <h1 className="editorial mt-2 text-4xl sm:text-5xl text-mint-800">
                    Hello, <em className="italic text-mint-600">{(profile.name || user?.full_name || "").split(" ")[0]}</em>
                </h1>
                <p className="mt-2 text-mint-800/70 text-sm">
                    {profile.specialization} · {profile.hospital?.name || "—"} ·{" "}
                    <span className={profile.is_approved ? "text-mint-600 font-medium" : "text-amber-600 font-medium"}>
                        {profile.is_approved ? "✓ Approved" : "Pending approval"}
                    </span>
                </p>

                {!profile.is_approved && (
                    <div className="mt-4 glass-mint rounded-2xl p-4 flex items-start gap-3">
                        <AlertCircle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-mint-800/80">
                            <strong>Pending admin approval.</strong> Once approved, your profile appears to patients and bookings can be made.{" "}
                            Contact <a href="mailto:admin@sukhyamed.com" className="text-mint-600 underline">admin@sukhyamed.com</a> to expedite.
                        </div>
                    </div>
                )}
                {error && <p className="mt-3 text-red-600 text-sm">{error}</p>}

                {/* TODAY */}
                <div className="mt-8 glass-mint rounded-3xl p-5 sm:p-6" data-testid="today-panel">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="overline">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
                            <h2 className="editorial text-2xl sm:text-3xl text-mint-800 mt-1">
                                {todays.length === 0 ? "No appointments today" : `${todays.length} appointment${todays.length === 1 ? "" : "s"} today`}
                            </h2>
                        </div>
                        <div className="flex items-center gap-2">
                            {["online", "offline", "both"].map(m => (
                                <button key={m} onClick={() => updateProfile({ today_mode: m })}
                                    className={`rounded-full px-3 py-1.5 text-xs transition border capitalize ${profile.today_mode === m ? "bg-mint-600 text-white border-mint-600" : "bg-white/70 border-mint-100 text-mint-800"}`}
                                    data-testid={`mode-${m}`}>{m === "both" ? "Both" : m}</button>
                            ))}
                        </div>
                    </div>
                    {todays.length === 0 ? (
                        <p className="mt-4 text-sm text-mint-800/50 flex items-center gap-2"><Calendar size={14} /> Free day — your schedule is clear.</p>
                    ) : (
                        <ul className="mt-5 divide-y divide-mint-100">
                            {todays.map(a => (
                                <li key={a.id} className="py-4 flex flex-wrap items-center justify-between gap-3" data-testid={`today-appt-${a.id}`}>
                                    <div>
                                        <p className="font-semibold text-mint-800">{a.time_slot} · {a.patient_name}</p>
                                        <p className="text-xs text-mint-800/60 mt-0.5">{a.consultation_type} · {a.status}</p>
                                        {a.reason && <p className="text-xs text-mint-800/40 italic">"{a.reason}"</p>}
                                    </div>
                                    {a.status === "booked" && (
                                        <div className="flex flex-wrap items-center gap-2">
                                            {a.consultation_type === "online" && (
                                                <button onClick={() => alert("Video consultation.")} className="btn-pill btn-ghost text-xs py-1.5 px-3"><Video size={12} /> Join</button>
                                            )}
                                            <button onClick={() => setPrescribingFor(a)} className="btn-pill btn-ghost text-xs py-1.5 px-3" data-testid={`prescribe-${a.id}`}><Pill size={12} /> Prescribe</button>
                                            <button onClick={() => markComplete(a.id)} className="btn-pill btn-primary text-xs py-1.5 px-3" data-testid={`complete-${a.id}`}><CheckCircle2 size={12} /> Complete</button>
                                            <button onClick={() => markNoShow(a.id)} className="text-xs px-3 py-1.5 rounded-full border border-red-100 text-red-500 hover:bg-red-50 transition"><X size={12} className="inline mr-1" />No-show</button>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* ALL APPOINTMENTS */}
                <div className="mt-6 glass rounded-2xl p-5 sm:p-6" data-testid="all-appts">
                    <h2 className="editorial text-2xl sm:text-3xl text-mint-800 mb-1">All appointments</h2>
                    <p className="text-xs text-mint-800/50 mb-4">{upcoming.length} upcoming · {appts.filter(a => a.status === "completed").length} completed</p>
                    {appts.length === 0 ? (
                        <p className="text-sm text-mint-800/60 py-4">No appointments yet.</p>
                    ) : (
                        <ul className="divide-y divide-mint-50">
                            {appts.map(a => (
                                <li key={a.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <p className="text-mint-800 font-medium text-sm">{a.patient_name}<span className="text-xs text-mint-800/50 font-normal"> · {a.consultation_type}</span></p>
                                        <p className="text-xs text-mint-800/50">{a.date} · {a.time_slot}</p>
                                    </div>
                                    <span className={`text-xs rounded-full px-2.5 py-1 font-medium capitalize
                                        ${a.status === "booked" ? "bg-mint-100 text-mint-700" : a.status === "completed" ? "bg-emerald-50 text-emerald-700" : a.status === "no_show" ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500"}`}>
                                        {a.status.replace("_", " ")}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* AVAILABILITY */}
                <div className="mt-6 glass rounded-2xl p-5 sm:p-6" data-testid="availability">
                    <h2 className="editorial text-2xl sm:text-3xl text-mint-800">Weekly availability</h2>
                    <p className="text-sm text-mint-800/60 mt-1">Set the hours you accept appointments for each weekday.</p>
                    <AvailabilityEditor availability={profile.availability || []} onChange={avail => updateProfile({ availability: avail })} />
                </div>

                {/* SETTINGS */}
                <div className="mt-6 grid sm:grid-cols-2 gap-4">
                    <div className="glass rounded-2xl p-5" data-testid="online-card">
                        <div className="flex items-center gap-2 mb-1"><Video size={16} className="text-mint-600" /><h3 className="editorial text-xl text-mint-800">Online consultation</h3></div>
                        <p className="text-xs text-mint-800/60 mb-4">Let patients book online video consultations.</p>
                        <button onClick={() => updateProfile({ online_consultation_enabled: !profile.online_consultation_enabled })}
                            className={`btn-pill text-sm py-2 ${profile.online_consultation_enabled ? "btn-primary" : "btn-ghost"}`} data-testid="toggle-online">
                            {profile.online_consultation_enabled ? "✓ Enabled" : "Enable online"}
                        </button>
                    </div>
                    <div className="glass rounded-2xl p-5" data-testid="gcal-card">
                        <div className="flex items-center gap-2 mb-1"><Calendar size={16} className="text-mint-600" /><h3 className="editorial text-xl text-mint-800">Google Calendar</h3></div>
                        <p className="text-xs text-mint-800/60 mb-4">Sync booked appointments automatically.</p>
                        <button onClick={connectGCal} className="btn-pill btn-ghost text-sm py-2" data-testid="connect-gcal">
                            <RefreshCw size={13} /> {profile.google_calendar_connected ? "Reconnect" : "Connect Calendar"}
                        </button>
                        {profile.google_calendar_connected && <p className="mt-2 text-xs text-mint-600">✓ Connected</p>}
                    </div>
                </div>
            </section>

            {/* PRESCRIPTION MODAL */}
            {prescribingFor && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-mint-800/30 backdrop-blur-sm p-4" data-testid="prescribe-modal">
                    <div className="glass-mint rounded-3xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="editorial text-2xl text-mint-800">Prescription</h3>
                            <button onClick={() => setPrescribingFor(null)} className="p-1.5 rounded-xl hover:bg-mint-100"><X size={16} /></button>
                        </div>
                        <p className="text-sm text-mint-800/60 mb-5">For {prescribingFor.patient_name} · {prescribingFor.date}</p>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-semibold text-mint-800/50 uppercase tracking-wider mb-1 block">Diagnosis</label>
                                <input value={presForm.diagnosis} onChange={e => setPresForm({ ...presForm, diagnosis: e.target.value })} placeholder="Primary diagnosis"
                                    className="w-full rounded-xl border border-mint-100 bg-white/80 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-mint-500" data-testid="pres-diagnosis" />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-mint-800/50 uppercase tracking-wider mb-2 block">Medications</label>
                                {presForm.medications.map((m, i) => (
                                    <div key={i} className="grid grid-cols-2 gap-2 mb-2">
                                        <input placeholder="Medication name" value={m.name} onChange={e => { const arr = [...presForm.medications]; arr[i].name = e.target.value; setPresForm({ ...presForm, medications: arr }); }} className="col-span-2 rounded-xl border border-mint-100 bg-white/80 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-mint-500" />
                                        <input placeholder="Dosage" value={m.dosage} onChange={e => { const arr = [...presForm.medications]; arr[i].dosage = e.target.value; setPresForm({ ...presForm, medications: arr }); }} className="rounded-xl border border-mint-100 bg-white/80 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-mint-500" />
                                        <input placeholder="Frequency" value={m.frequency} onChange={e => { const arr = [...presForm.medications]; arr[i].frequency = e.target.value; setPresForm({ ...presForm, medications: arr }); }} className="rounded-xl border border-mint-100 bg-white/80 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-mint-500" />
                                        <input placeholder="Duration (e.g. 7 days)" value={m.duration} onChange={e => { const arr = [...presForm.medications]; arr[i].duration = e.target.value; setPresForm({ ...presForm, medications: arr }); }} className="col-span-2 rounded-xl border border-mint-100 bg-white/80 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-mint-500" />
                                    </div>
                                ))}
                                <button onClick={() => setPresForm({ ...presForm, medications: [...presForm.medications, { name: "", dosage: "", frequency: "", duration: "" }] })} className="text-xs text-mint-600 hover:underline">+ Add another medication</button>
                            </div>
                            <textarea rows={2} placeholder="Additional notes…" value={presForm.additional_notes} onChange={e => setPresForm({ ...presForm, additional_notes: e.target.value })} className="w-full rounded-xl border border-mint-100 bg-white/80 px-4 py-3 text-sm resize-none outline-none focus:ring-2 focus:ring-mint-500" />
                            <button onClick={submitPrescription} disabled={!presForm.diagnosis || !presForm.medications[0]?.name}
                                className="btn-pill btn-primary w-full justify-center disabled:opacity-40 mt-2" data-testid="submit-prescription">
                                <FileText size={14} /> Issue prescription & complete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function AvailabilityEditor({ availability, onChange }) {
    const [local, setLocal] = useState(availability);
    useEffect(() => setLocal(availability), [availability]);
    const addRow = (day) => setLocal([...local, { day_of_week: day, start_time: "09:00", end_time: "17:00", mode: "both", slot_minutes: 30 }]);
    const removeRow = (i) => setLocal(local.filter((_, idx) => idx !== i));
    const setField = (i, k, v) => { const arr = [...local]; arr[i] = { ...arr[i], [k]: v }; setLocal(arr); };
    return (
        <div className="mt-4 space-y-3">
            {DAYS.map((dn, dIdx) => {
                const rows = local.map((r, i) => ({ ...r, _i: i })).filter(r => r.day_of_week === dIdx);
                return (
                    <div key={dn} className="rounded-xl bg-white/50 border border-mint-100 p-3">
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-mint-800 w-10">{dn}</p>
                            {rows.length === 0 ? <span className="flex-1 text-xs text-mint-800/30">— off —</span>
                                : <div className="flex-1 space-y-2">
                                    {rows.map(r => (
                                        <div key={r._i} className="flex flex-wrap items-center gap-2">
                                            <input type="time" value={r.start_time} onChange={e => setField(r._i, "start_time", e.target.value)} className="rounded-lg border border-mint-100 bg-white/80 px-2 py-1.5 text-xs" />
                                            <span className="text-xs text-mint-800/40">to</span>
                                            <input type="time" value={r.end_time} onChange={e => setField(r._i, "end_time", e.target.value)} className="rounded-lg border border-mint-100 bg-white/80 px-2 py-1.5 text-xs" />
                                            <select value={r.mode} onChange={e => setField(r._i, "mode", e.target.value)} className="rounded-lg border border-mint-100 bg-white/80 px-2 py-1.5 text-xs">
                                                <option value="both">Both</option><option value="offline">In-person</option><option value="online">Online</option>
                                            </select>
                                            <button onClick={() => removeRow(r._i)} className="text-red-400 hover:text-red-600"><X size={13} /></button>
                                        </div>
                                    ))}
                                </div>
                            }
                            <button onClick={() => addRow(dIdx)} className="text-xs text-mint-600 hover:underline ml-auto flex-shrink-0" data-testid={`add-${dn}`}>+ Add</button>
                        </div>
                    </div>
                );
            })}
            <button onClick={() => onChange(local)} className="btn-pill btn-primary text-sm mt-2" data-testid="save-availability">
                <Settings size={14} /> Save availability
            </button>
        </div>
    );
}
