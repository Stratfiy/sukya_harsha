import { useEffect, useState, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import api, { formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import {
    Calendar, CheckCircle2, Pill, X, Video, AlertCircle,
    Settings, RefreshCw, User, Stethoscope, Award, Camera,
    FileText, ChevronRight, Sparkles, Building2, Edit3,
    Briefcase, MapPin, Upload, Check, Clock, TrendingUp,
    Users, LayoutDashboard, UserCircle
} from "lucide-react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SPECIALIZATIONS = [
    "Cardiology","Dermatology","Endocrinology","Gastroenterology",
    "General Medicine","General Surgery","Gynaecology","Neurology",
    "Oncology","Ophthalmology","Orthopaedics","Paediatrics",
    "Psychiatry","Pulmonology","Radiology","Urology",
];

// ─── Cloudinary upload ───────────────────────────────────────────────────────
async function uploadToCloudinary(file) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", "doctor_photos");
    const res = await fetch("https://api.cloudinary.com/v1_1/sukhyamed/image/upload", { method: "POST", body: fd });
    if (!res.ok) throw new Error("Upload failed");
    return (await res.json()).secure_url;
}

function PhotoUploader({ value, onChange }) {
    const [uploading, setUploading] = useState(false);
    const [err, setErr] = useState("");
    const handleFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { setErr("Max 5MB"); return; }
        setUploading(true); setErr("");
        try { onChange(await uploadToCloudinary(file)); }
        catch { setErr("Upload failed — paste a URL below instead."); }
        finally { setUploading(false); }
    };
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-mint-50 border-2 border-mint-100 flex-shrink-0 overflow-hidden">
                    {value
                        ? <img src={value} alt="Preview" className="w-full h-full object-cover" onError={e => e.target.style.display="none"} />
                        : <div className="w-full h-full flex items-center justify-center"><Camera size={24} className="text-mint-300" /></div>}
                </div>
                <div className="flex-1">
                    <label className={`flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-xl border text-sm font-medium transition
                        ${uploading ? "bg-mint-50 text-mint-400 border-mint-100 cursor-wait" : "bg-white border-mint-200 text-mint-700 hover:bg-mint-50 hover:border-mint-400"}`}>
                        {uploading ? <><RefreshCw size={14} className="animate-spin"/> Uploading…</> : <><Upload size={14}/> Upload photo</>}
                        <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading}/>
                    </label>
                    <p className="text-xs text-mint-800/40 mt-1">JPG, PNG up to 5MB</p>
                </div>
            </div>
            <input value={value} onChange={e => onChange(e.target.value)}
                placeholder="Or paste image URL: https://example.com/photo.jpg"
                className="w-full px-4 py-2.5 rounded-xl border border-mint-100 bg-white/80 text-mint-800 text-sm outline-none focus:ring-2 focus:ring-mint-500"/>
            {err && <p className="text-xs text-amber-600">{err}</p>}
        </div>
    );
}

// ─── Profile Setup Wizard (shows ONLY once, never again) ────────────────────
function ProfileSetup({ profile, onComplete }) {
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [form, setForm] = useState({
        name: profile?.name || "",
        specialization: profile?.specialization || "",
        years_of_experience: profile?.years_of_experience || 1,
        consultation_fee: profile?.consultation_fee || 1000,
        license_number: profile?.license_number || "",
        profile_photo_url: profile?.profile_photo_url || "",
        bio: profile?.bio || "",
    });
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const save = async () => {
        setSaving(true); setError("");
        try {
            await api.put("/doctor/profile", { ...form,
                years_of_experience: Number(form.years_of_experience),
                consultation_fee: Number(form.consultation_fee),
                profile_setup_complete: true,
            });
            onComplete();
        } catch (e) { setError(formatApiError(e.response?.data?.detail)); }
        finally { setSaving(false); }
    };

    const steps = [
        { n:1, label:"Basics", icon:User },
        { n:2, label:"Practice", icon:Stethoscope },
        { n:3, label:"Profile", icon:Camera },
    ];

    return (
        <div className="min-h-screen" style={{background:"radial-gradient(ellipse at 0% 0%,rgba(31,138,77,0.1) 0%,transparent 60%),radial-gradient(ellipse at 100% 100%,rgba(212,245,226,0.5) 0%,transparent 60%),#ffffff"}}>
            <div className="flex items-center justify-between px-6 sm:px-10 py-5">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-mint-600 flex items-center justify-center"><Sparkles size={16} className="text-white"/></div>
                    <span className="font-semibold text-mint-800 text-sm">Sukhya Med</span>
                </div>
                <span className="text-xs text-mint-800/40 uppercase tracking-widest">Doctor onboarding</span>
            </div>
            <div className="mx-auto max-w-2xl px-5 sm:px-6 pb-20 pt-6 sm:pt-10">
                <p className="overline mb-2">Welcome</p>
                <h1 className="editorial text-4xl sm:text-5xl text-mint-800 leading-tight mb-2">Complete your <em className="italic text-mint-600">profile.</em></h1>
                <p className="text-mint-800/60 text-sm mb-8 max-w-md">This is shown to patients when they search for doctors. Fill it once — you won't see this screen again.</p>

                {/* Steps */}
                <div className="flex items-center gap-0 mb-8">
                    {steps.map((s, i) => {
                        const Icon = s.icon;
                        const done = step > s.n; const active = step === s.n;
                        return (
                            <div key={s.n} className="flex items-center">
                                <button onClick={() => done && setStep(s.n)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all
                                    ${active?"bg-mint-600 text-white shadow-lg shadow-mint-600/20":done?"bg-mint-100 text-mint-700 cursor-pointer hover:bg-mint-200":"bg-white/60 text-mint-800/30 border border-mint-100 cursor-default"}`}>
                                    {done?<CheckCircle2 size={13}/>:<Icon size={13}/>}{s.label}
                                </button>
                                {i<steps.length-1 && <div className={`w-6 h-px mx-1 ${done?"bg-mint-400":"bg-mint-100"}`}/>}
                            </div>
                        );
                    })}
                </div>

                <div className="glass rounded-3xl p-6 sm:p-8 shadow-xl shadow-mint-600/5">
                    {step === 1 && (
                        <div className="space-y-5">
                            <p className="text-xs uppercase tracking-widest text-mint-600 font-semibold">Your identity</p>
                            <Field label="Full name">
                                <div className="relative"><User size={15} className="absolute left-4 top-3.5 text-mint-400 pointer-events-none"/>
                                <input value={form.name} onChange={e=>set("name",e.target.value)} placeholder="Dr. Full Name"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-mint-100 bg-white/80 text-mint-800 text-sm outline-none focus:ring-2 focus:ring-mint-500"/></div>
                            </Field>
                            <Field label="Specialization">
                                <div className="relative"><Stethoscope size={15} className="absolute left-4 top-3.5 text-mint-400 pointer-events-none"/>
                                <select value={form.specialization} onChange={e=>set("specialization",e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-mint-100 bg-white/80 text-mint-800 text-sm outline-none focus:ring-2 focus:ring-mint-500 appearance-none">
                                    <option value="">Select specialization</option>
                                    {SPECIALIZATIONS.map(s=><option key={s}>{s}</option>)}
                                </select></div>
                            </Field>
                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Years of experience">
                                    <input type="number" min={0} max={60} value={form.years_of_experience} onChange={e=>set("years_of_experience",e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-mint-100 bg-white/80 text-mint-800 text-sm outline-none focus:ring-2 focus:ring-mint-500"/>
                                </Field>
                                <Field label="Consultation fee (₹)">
                                    <input type="number" min={0} value={form.consultation_fee} onChange={e=>set("consultation_fee",e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-mint-100 bg-white/80 text-mint-800 text-sm outline-none focus:ring-2 focus:ring-mint-500"/>
                                </Field>
                            </div>
                            <button onClick={()=>setStep(2)} disabled={!form.specialization||!form.name}
                                className="w-full btn-pill btn-primary disabled:opacity-40 justify-center mt-2">
                                Continue <ChevronRight size={16}/>
                            </button>
                        </div>
                    )}
                    {step === 2 && (
                        <div className="space-y-5">
                            <p className="text-xs uppercase tracking-widest text-mint-600 font-semibold">Practice details</p>
                            <Field label="Medical license number">
                                <div className="relative"><Award size={15} className="absolute left-4 top-3.5 text-mint-400 pointer-events-none"/>
                                <input value={form.license_number} onChange={e=>set("license_number",e.target.value)} placeholder="e.g. MH-CARD-12001"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-mint-100 bg-white/80 text-mint-800 text-sm outline-none focus:ring-2 focus:ring-mint-500"/></div>
                            </Field>
                            {profile?.hospital && (
                                <div className="rounded-2xl bg-mint-50/60 border border-mint-100 p-4 flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-mint-600/10 flex items-center justify-center flex-shrink-0"><Building2 size={16} className="text-mint-600"/></div>
                                    <div><p className="text-sm font-semibold text-mint-800">{profile.hospital.name}</p>
                                    <p className="text-xs text-mint-800/60">{profile.hospital.area}</p></div>
                                    <span className="ml-auto text-xs text-mint-600 bg-mint-100 px-2 py-1 rounded-full font-medium">Assigned</span>
                                </div>
                            )}
                            <div className="flex gap-3">
                                <button onClick={()=>setStep(1)} className="flex-1 btn-pill btn-ghost text-sm justify-center">Back</button>
                                <button onClick={()=>setStep(3)} disabled={!form.license_number}
                                    className="flex-1 btn-pill btn-primary disabled:opacity-40 justify-center">Continue <ChevronRight size={16}/></button>
                            </div>
                        </div>
                    )}
                    {step === 3 && (
                        <div className="space-y-5">
                            <p className="text-xs uppercase tracking-widest text-mint-600 font-semibold">Public profile</p>
                            <Field label="Profile photo">
                                <PhotoUploader value={form.profile_photo_url} onChange={v=>set("profile_photo_url",v)}/>
                            </Field>
                            <Field label={<>Professional bio <span className="text-mint-400 normal-case font-normal">{form.bio.length}/300</span></>}>
                                <textarea value={form.bio} onChange={e=>set("bio",e.target.value.slice(0,300))} rows={4}
                                    placeholder="e.g. Cardiologist with 12 years of experience in preventive care and complex procedures..."
                                    className="w-full px-4 py-3 rounded-xl border border-mint-100 bg-white/80 text-mint-800 text-sm outline-none focus:ring-2 focus:ring-mint-500 resize-none"/>
                            </Field>
                            <div className="rounded-2xl bg-mint-50/60 border border-mint-100 p-4 grid grid-cols-2 gap-y-2 text-xs">
                                <span className="text-mint-800/50">Name</span><span className="text-mint-800 font-medium text-right">{form.name||"—"}</span>
                                <span className="text-mint-800/50">Specialization</span><span className="text-mint-800 font-medium text-right">{form.specialization||"—"}</span>
                                <span className="text-mint-800/50">Experience</span><span className="text-mint-800 font-medium text-right">{form.years_of_experience} yrs</span>
                                <span className="text-mint-800/50">Fee</span><span className="text-mint-800 font-medium text-right">₹{form.consultation_fee}</span>
                            </div>
                            {error && <p className="text-sm text-red-600">{error}</p>}
                            <div className="flex gap-3">
                                <button onClick={()=>setStep(2)} className="flex-1 btn-pill btn-ghost text-sm justify-center">Back</button>
                                <button onClick={save} disabled={saving}
                                    className="flex-1 btn-pill btn-primary disabled:opacity-40 justify-center">
                                    {saving?"Saving…":<><Sparkles size={14}/> Go to dashboard</>}
                                </button>
                            </div>
                            <p className="text-center text-xs text-mint-800/40">You can update everything anytime from My Profile.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function Field({ label, children }) {
    return (
        <div>
            <label className="block mb-1.5 text-xs font-semibold text-mint-800/60 uppercase tracking-wider">{label}</label>
            {children}
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
        name: profile?.name||"", specialization: profile?.specialization||"",
        years_of_experience: profile?.years_of_experience||1,
        consultation_fee: profile?.consultation_fee||500,
        bio: profile?.bio||"", profile_photo_url: profile?.profile_photo_url||"",
        license_number: profile?.license_number||"",
    });
    const set = (k,v) => setForm(f=>({...f,[k]:v}));

    const save = async () => {
        setSaving(true); setError("");
        try {
            await api.put("/doctor/profile",{...form, years_of_experience:Number(form.years_of_experience), consultation_fee:Number(form.consultation_fee)});
            setSaved(true); setEditing(false); setTimeout(()=>setSaved(false),3000); onSaved();
        } catch(e){setError(formatApiError(e.response?.data?.detail));}
        finally{setSaving(false);}
    };

    return (
        <div className="mx-auto max-w-2xl px-4 sm:px-6 pt-8 pb-20">
            <div className="flex items-center justify-between mb-6">
                <div><p className="overline">My profile</p><h1 className="editorial text-3xl sm:text-4xl text-mint-800 mt-1">Profile settings</h1></div>
                {!editing
                    ? <button onClick={()=>setEditing(true)} className="btn-pill btn-ghost text-sm"><Edit3 size={14}/> Edit</button>
                    : <div className="flex gap-2">
                        <button onClick={()=>setEditing(false)} className="btn-pill btn-ghost text-sm">Cancel</button>
                        <button onClick={save} disabled={saving} className="btn-pill btn-primary text-sm disabled:opacity-50">
                            {saving?"Saving…":saved?<><Check size={14}/> Saved!</>:"Save changes"}
                        </button>
                    </div>}
            </div>
            {saved && !editing && (
                <div className="mb-4 glass-mint rounded-xl px-4 py-3 text-sm text-mint-700 flex items-center gap-2">
                    <Check size={14} className="text-mint-600"/> Profile updated.
                </div>
            )}
            {!editing && (
                <div className="glass rounded-3xl overflow-hidden shadow-lg shadow-mint-600/5">
                    <div className="h-24 bg-gradient-to-r from-mint-600/20 to-mint-400/10 relative">
                        <div className="absolute -bottom-10 left-6">
                            <div className="w-20 h-20 rounded-2xl border-4 border-white bg-mint-50 overflow-hidden shadow-md">
                                {form.profile_photo_url
                                    ? <img src={form.profile_photo_url} alt={form.name} className="w-full h-full object-cover"/>
                                    : <div className="w-full h-full flex items-center justify-center"><User size={28} className="text-mint-300"/></div>}
                            </div>
                        </div>
                    </div>
                    <div className="pt-14 px-6 pb-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="editorial text-2xl text-mint-800">{form.name||"—"}</h2>
                                <p className="text-sm text-mint-600 font-medium">{form.specialization||"—"}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-mint-800/40 uppercase tracking-wider">Fee</p>
                                <p className="editorial text-2xl text-mint-800">₹{form.consultation_fee}</p>
                            </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <span className="flex items-center gap-1.5 text-xs text-mint-800/70 bg-mint-50 rounded-full px-3 py-1.5"><Briefcase size={11}/> {form.years_of_experience} yrs exp</span>
                            <span className="flex items-center gap-1.5 text-xs text-mint-800/70 bg-mint-50 rounded-full px-3 py-1.5"><Award size={11}/> {form.license_number||"No license"}</span>
                            {profile?.hospital && <span className="flex items-center gap-1.5 text-xs text-mint-800/70 bg-mint-50 rounded-full px-3 py-1.5"><MapPin size={11}/> {profile.hospital.name}</span>}
                        </div>
                        <p className="mt-4 text-sm text-mint-800/70 leading-relaxed">{form.bio||"No bio added yet."}</p>
                        <p className="mt-5 pt-4 border-t border-mint-100 text-xs text-mint-800/40">
                            Hospital assignment is managed by Sukhya admin. Contact <a href="mailto:admin@sukhyamed.com" className="text-mint-600 underline">admin@sukhyamed.com</a> for changes.
                        </p>
                    </div>
                </div>
            )}
            {editing && (
                <div className="glass rounded-3xl p-6 space-y-5">
                    <Field label="Profile photo"><PhotoUploader value={form.profile_photo_url} onChange={v=>set("profile_photo_url",v)}/></Field>
                    <Field label="Full name"><input value={form.name} onChange={e=>set("name",e.target.value)} className="w-full px-4 py-3 rounded-xl border border-mint-100 bg-white/80 text-mint-800 text-sm outline-none focus:ring-2 focus:ring-mint-500"/></Field>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Specialization">
                            <select value={form.specialization} onChange={e=>set("specialization",e.target.value)} className="w-full px-4 py-3 rounded-xl border border-mint-100 bg-white/80 text-mint-800 text-sm outline-none focus:ring-2 focus:ring-mint-500">
                                {SPECIALIZATIONS.map(s=><option key={s}>{s}</option>)}
                            </select>
                        </Field>
                        <Field label="License"><input value={form.license_number} onChange={e=>set("license_number",e.target.value)} className="w-full px-4 py-3 rounded-xl border border-mint-100 bg-white/80 text-mint-800 text-sm outline-none focus:ring-2 focus:ring-mint-500"/></Field>
                        <Field label="Years exp"><input type="number" min={0} value={form.years_of_experience} onChange={e=>set("years_of_experience",e.target.value)} className="w-full px-4 py-3 rounded-xl border border-mint-100 bg-white/80 text-mint-800 text-sm outline-none focus:ring-2 focus:ring-mint-500"/></Field>
                        <Field label="Fee (₹)"><input type="number" min={0} value={form.consultation_fee} onChange={e=>set("consultation_fee",e.target.value)} className="w-full px-4 py-3 rounded-xl border border-mint-100 bg-white/80 text-mint-800 text-sm outline-none focus:ring-2 focus:ring-mint-500"/></Field>
                    </div>
                    <Field label={<>Bio <span className="text-mint-400 normal-case font-normal">{form.bio.length}/300</span></>}>
                        <textarea value={form.bio} onChange={e=>set("bio",e.target.value.slice(0,300))} rows={4} className="w-full px-4 py-3 rounded-xl border border-mint-100 bg-white/80 text-mint-800 text-sm outline-none focus:ring-2 focus:ring-mint-500 resize-none"/>
                    </Field>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                </div>
            )}
        </div>
    );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function DoctorDashboard() {
    const { user } = useAuth();
    const location = useLocation();
    const [profile, setProfile] = useState(null);
    const [appts, setAppts] = useState([]);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState("today");
    const [prescribingFor, setPrescribingFor] = useState(null);
    const [presForm, setPresForm] = useState({ diagnosis:"", medications:[{name:"",dosage:"",frequency:"",duration:""}], additional_notes:"" });
    const [availSaved, setAvailSaved] = useState(false);

    const [toggling, setToggling] = useState(false);
    const [toggleResult, setToggleResult] = useState(null);

    const load = useCallback(async () => {
        try {
            const [p, a] = await Promise.all([api.get("/doctor/profile"), api.get("/appointments")]);
            setProfile(p.data);
            setAppts(a.data);
        } catch(e) { setError(formatApiError(e.response?.data?.detail)); }
    }, []);

    const toggleAvailability = async () => {
        setToggling(true);
        setToggleResult(null);
        try {
            const { data } = await api.post("/doctor/toggle-availability", {});
            setProfile(p => ({ ...p, is_available_today: data.is_available_today }));
            setToggleResult(data);
            if (data.is_available_today) {
                await load(); // refresh appointments after going available
            }
        } catch(e) { setError(formatApiError(e.response?.data?.detail)); }
        finally { setToggling(false); }
    };

    useEffect(() => { load(); }, [load]);

    // Auto-refresh every 60 seconds so new bookings appear without manual reload
    useEffect(() => {
        const t = setInterval(() => load(), 60000);
        return () => clearInterval(t);
    }, [load]);

    const updateProfile = async (changes) => {
        try {
            const { data } = await api.put("/doctor/profile", changes);
            setProfile(p => ({ ...p, ...data }));
        } catch(e) { setError(formatApiError(e.response?.data?.detail)); }
    };

    const saveAvailability = async (avail) => {
        await updateProfile({ availability: avail });
        setAvailSaved(true);
        setTimeout(() => setAvailSaved(false), 2500);
    };

    const markStatus = async (id, status) => {
        await api.patch(`/appointments/${id}`, { status });
        // Optimistic update
        setAppts(a => a.map(x => x.id === id ? { ...x, status } : x));
    };

    const submitPrescription = async () => {
        if (!prescribingFor) return;
        try {
            await api.post("/prescriptions", {
                appointment_id: prescribingFor.id, patient_id: prescribingFor.patient_id,
                diagnosis: presForm.diagnosis,
                medications: presForm.medications.filter(m => m.name),
                additional_notes: presForm.additional_notes,
            });
            await markStatus(prescribingFor.id, "completed");
            setPrescribingFor(null);
            setPresForm({ diagnosis:"", medications:[{name:"",dosage:"",frequency:"",duration:""}], additional_notes:"" });
        } catch(e) { setError(formatApiError(e.response?.data?.detail)); }
    };

    if (!profile) return (
        <div className="min-h-screen"><Navbar/>
            <div className="flex items-center justify-center h-64">
                <RefreshCw size={20} className="animate-spin text-mint-500"/>
            </div>
        </div>
    );

    // ── Setup gate: show ONLY if never completed ──
    if (!profile.profile_setup_complete) {
        return <ProfileSetup profile={profile} onComplete={load}/>;
    }

    // ── My Profile page ──
    if (location.pathname === "/doctor/profile") {
        return <div className="min-h-screen"><Navbar/><MyProfilePage profile={profile} onSaved={load}/></div>;
    }

    const today = new Date().toISOString().slice(0, 10);
    const todayAppts = appts.filter(a => a.date === today).sort((a,b) => a.time_slot.localeCompare(b.time_slot));
    const upcoming = appts.filter(a => a.status === "booked" && a.date >= today).sort((a,b) => a.date.localeCompare(b.date)||a.time_slot.localeCompare(b.time_slot));
    const completed = appts.filter(a => a.status === "completed");
    const firstName = (profile.name || user?.full_name || "").split(" ")[0];

    const tabs = [
        { id:"today", label:"Today", icon:Calendar, badge: todayAppts.filter(a=>a.status==="booked").length },
        { id:"upcoming", label:"Upcoming", icon:Clock, badge: upcoming.length },
        { id:"history", label:"History", icon:TrendingUp },
        { id:"availability", label:"Availability", icon:Settings },
    ];

    return (
        <div className="min-h-screen">
            <Navbar/>
            <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-8 pb-20">

                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                    <div>
                        <span className="overline">Doctor dashboard</span>
                        <h1 className="editorial mt-1 text-3xl sm:text-4xl text-mint-800">
                            Hello, <em className="italic text-mint-600">{firstName}</em>
                        </h1>
                        <p className="mt-1 text-sm text-mint-800/60">
                            {profile.specialization} · {profile.hospital?.name||"—"} ·{" "}
                            <span className={profile.is_approved?"text-mint-600 font-semibold":"text-amber-600 font-semibold"}>
                                {profile.is_approved?"✓ Approved":"⏳ Pending approval"}
                            </span>
                        </p>
                    </div>
                    {/* Quick stats */}
                    <div className="flex gap-3">
                        {[
                            { label:"Today", val: todayAppts.filter(a=>a.status==="booked").length, color:"mint" },
                            { label:"Upcoming", val: upcoming.length, color:"mint" },
                            { label:"Completed", val: completed.length, color:"emerald" },
                        ].map(s => (
                            <div key={s.label} className="glass-mint rounded-2xl px-4 py-3 text-center min-w-[72px]">
                                <p className={`editorial text-2xl ${s.color==="emerald"?"text-emerald-700":"text-mint-800"}`}>{s.val}</p>
                                <p className="text-xs text-mint-800/50 mt-0.5">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {!profile.is_approved && (
                    <div className="mb-6 glass-mint rounded-2xl p-4 flex items-start gap-3">
                        <AlertCircle size={18} className="text-amber-500 mt-0.5 flex-shrink-0"/>
                        <p className="text-sm text-mint-800/80">
                            <strong>Pending admin approval.</strong> Your profile is not visible to patients yet.{" "}
                            <a href="mailto:admin@sukhyamed.com" className="text-mint-600 underline">Contact admin</a> to expedite.
                        </p>
                    </div>
                )}
                {error && <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">{error}</p>}

                {/* Tabs */}
                <div className="flex gap-2 mb-6 flex-wrap">
                    {tabs.map(t => {
                        const Icon = t.icon;
                        return (
                            <button key={t.id} onClick={()=>setActiveTab(t.id)}
                                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
                                    ${activeTab===t.id?"bg-mint-600 text-white shadow-md shadow-mint-600/20":"bg-white/70 border border-mint-100 text-mint-800 hover:border-mint-400 hover:bg-mint-50"}`}>
                                <Icon size={14}/>
                                {t.label}
                                {t.badge > 0 && (
                                    <span className={`text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center
                                        ${activeTab===t.id?"bg-white text-mint-600":"bg-mint-600 text-white"}`}>
                                        {t.badge}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* ── TODAY TAB ── */}
                {activeTab === "today" && (
                    <div className="space-y-4">
                        <div className="glass-mint rounded-3xl p-5 sm:p-6">
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                <div>
                                    <p className="overline">{new Date().toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"})}</p>
                                    <h2 className="editorial text-2xl sm:text-3xl text-mint-800 mt-1">
                                        {todayAppts.filter(a=>a.status==="booked").length === 0
                                            ? "No appointments today"
                                            : `${todayAppts.filter(a=>a.status==="booked").length} appointment${todayAppts.filter(a=>a.status==="booked").length===1?"":"s"} remaining`}
                                    </h2>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-mint-800/50 mr-1">Mode:</span>
                                    {["offline","both","online"].map(m => (
                                        <button key={m} onClick={()=>updateProfile({today_mode:m})}
                                            className={`rounded-full px-3 py-1.5 text-xs capitalize border transition font-medium
                                                ${profile.today_mode===m?"bg-mint-600 text-white border-mint-600 shadow-sm":"bg-white/70 border-mint-100 text-mint-800 hover:border-mint-400"}`}>
                                            {m==="both"?"Both":m}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {todayAppts.length === 0 ? (
                                <div className="py-8 text-center">
                                    <Calendar size={32} className="text-mint-200 mx-auto mb-3"/>
                                    <p className="text-sm text-mint-800/50">No appointments scheduled today.</p>
                                    <p className="text-xs text-mint-800/40 mt-1">Set your availability below to start receiving bookings.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {todayAppts.map(a => (
                                        <div key={a.id} className={`rounded-2xl p-4 border transition
                                            ${a.status==="booked"?"bg-white border-mint-100":a.status==="completed"?"bg-emerald-50/50 border-emerald-100":"bg-gray-50 border-gray-100"}`}>
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-mint-800">{a.time_slot}</span>
                                                        <span className="text-sm text-mint-800/80">· {a.patient_name}</span>
                                                        <span className={`text-[10px] rounded-full px-2 py-0.5 font-semibold capitalize
                                                            ${a.status==="booked"?"bg-mint-100 text-mint-700":a.status==="completed"?"bg-emerald-100 text-emerald-700":"bg-gray-100 text-gray-600"}`}>
                                                            {a.status.replace("_"," ")}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-mint-800/50 mt-0.5 capitalize">{a.consultation_type} consultation{a.reason ? ` · "${a.reason}"` : ""}</p>
                                                </div>
                                                {a.status === "booked" && (
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        {a.consultation_type==="online" && (
                                                            <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 hover:bg-blue-100 transition">
                                                                <Video size={12}/> Join call
                                                            </button>
                                                        )}
                                                        <button onClick={()=>setPrescribingFor(a)}
                                                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-white border border-mint-200 text-mint-700 hover:bg-mint-50 transition">
                                                            <Pill size={12}/> Prescribe & complete
                                                        </button>
                                                        <button onClick={()=>markStatus(a.id,"completed")}
                                                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-mint-600 text-white hover:bg-mint-700 transition">
                                                            <CheckCircle2 size={12}/> Complete
                                                        </button>
                                                        <button onClick={()=>markStatus(a.id,"no_show")}
                                                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-red-100 text-red-500 hover:bg-red-50 transition">
                                                            <X size={12}/> No-show
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Availability Toggle + Calendar */}
                        <div className="grid sm:grid-cols-2 gap-4">
                            {/* Doctor availability toggle */}
                            <div className={`rounded-2xl p-5 border-2 transition-all ${profile.is_available_today === false ? "bg-red-50 border-red-200" : "glass border-mint-200"}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className={`w-2.5 h-2.5 rounded-full ${profile.is_available_today === false ? "bg-red-400" : "bg-mint-500 animate-pulse"}`}/>
                                            <h3 className="editorial text-lg text-mint-800">Availability</h3>
                                        </div>
                                        <p className={`text-xs mb-3 ${profile.is_available_today === false ? "text-red-600/70" : "text-mint-800/50"}`}>
                                            {profile.is_available_today === false
                                                ? "You are marked unavailable today. Patients have been notified."
                                                : "You are available. Patients can book your slots."}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={toggleAvailability} disabled={toggling}
                                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition border disabled:opacity-50
                                        ${profile.is_available_today === false
                                            ? "bg-white border-mint-200 text-mint-700 hover:bg-mint-50"
                                            : "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"}`}>
                                    {toggling
                                        ? <><RefreshCw size={13} className="animate-spin"/> Updating…</>
                                        : profile.is_available_today === false
                                            ? "Mark as available"
                                            : "Mark as unavailable today"
                                    }
                                </button>
                                {toggleResult && toggleResult.affected_count > 0 && (
                                    <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                                        ✉ {toggleResult.affected_count} patient{toggleResult.affected_count!==1?"s":""} notified and{" "}
                                        {toggleResult.affected_patients?.filter(p=>p.rescheduled).length > 0
                                            ? "rescheduled to next available slot"
                                            : "asked to rebook"}
                                    </p>
                                )}
                            </div>
                            <div className="glass rounded-2xl p-5">
                                <div className="flex items-center gap-2 mb-1"><Calendar size={15} className="text-mint-600"/><h3 className="editorial text-lg text-mint-800">Google Calendar</h3></div>
                                <p className="text-xs text-mint-800/50 mb-3">Auto-sync appointments to your calendar.</p>
                                <button onClick={async()=>{try{const{data}=await api.get("/doctor/google-calendar/auth-url");if(data.url)window.location.href=data.url;else alert("Calendar not configured on server yet.");}catch{}}}
                                    className="btn-pill btn-ghost text-xs py-2">
                                    <RefreshCw size={12}/> {profile.google_calendar_connected?"Reconnect":"Connect Calendar"}
                                </button>
                                {profile.google_calendar_connected && <p className="mt-2 text-xs text-mint-600">✓ Connected</p>}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── UPCOMING TAB ── */}
                {activeTab === "upcoming" && (
                    <div className="glass rounded-2xl p-5 sm:p-6">
                        <h2 className="editorial text-2xl sm:text-3xl text-mint-800 mb-1">Upcoming appointments</h2>
                        <p className="text-xs text-mint-800/50 mb-5">{upcoming.length} booked appointment{upcoming.length!==1?"s":""}</p>
                        {upcoming.length === 0 ? (
                            <div className="py-10 text-center">
                                <Users size={32} className="text-mint-200 mx-auto mb-3"/>
                                <p className="text-sm text-mint-800/50">No upcoming appointments.</p>
                                <p className="text-xs text-mint-800/40 mt-1">Make sure your availability is set so patients can book slots.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {upcoming.map(a => (
                                    <div key={a.id} className="rounded-2xl bg-white/60 border border-mint-100 p-4 flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-mint-800">{a.patient_name}
                                                <span className="ml-2 text-xs text-mint-600 font-normal capitalize">{a.consultation_type}</span>
                                            </p>
                                            <p className="text-xs text-mint-800/50 mt-0.5">
                                                {new Date(a.date+"T00:00").toLocaleDateString(undefined,{weekday:"short",day:"numeric",month:"short"})} · {a.time_slot}
                                            </p>
                                            {a.reason && <p className="text-xs text-mint-800/40 italic mt-0.5">"{a.reason}"</p>}
                                        </div>
                                        <span className="text-xs bg-mint-100 text-mint-700 rounded-full px-3 py-1 font-medium">Booked</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── HISTORY TAB ── */}
                {activeTab === "history" && (
                    <div className="glass rounded-2xl p-5 sm:p-6">
                        <h2 className="editorial text-2xl sm:text-3xl text-mint-800 mb-1">Appointment history</h2>
                        <p className="text-xs text-mint-800/50 mb-5">{appts.length} total · {completed.length} completed</p>
                        {appts.length === 0 ? (
                            <p className="py-8 text-center text-sm text-mint-800/50">No appointment history yet.</p>
                        ) : (
                            <div className="divide-y divide-mint-50">
                                {[...appts].sort((a,b)=>b.date.localeCompare(a.date)||b.time_slot.localeCompare(a.time_slot)).map(a => (
                                    <div key={a.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <p className="text-mint-800 font-medium text-sm">{a.patient_name}
                                                <span className="text-xs text-mint-800/40 font-normal"> · {a.consultation_type}</span>
                                            </p>
                                            <p className="text-xs text-mint-800/50">{a.date} · {a.time_slot}</p>
                                        </div>
                                        <span className={`text-xs rounded-full px-2.5 py-1 font-medium capitalize
                                            ${a.status==="booked"?"bg-mint-100 text-mint-700":a.status==="completed"?"bg-emerald-50 text-emerald-700":a.status==="no_show"?"bg-red-50 text-red-600":"bg-gray-100 text-gray-500"}`}>
                                            {a.status.replace("_"," ")}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── AVAILABILITY TAB ── */}
                {activeTab === "availability" && (
                    <div className="glass rounded-2xl p-5 sm:p-6">
                        <div className="flex items-center justify-between mb-1">
                            <h2 className="editorial text-2xl sm:text-3xl text-mint-800">Weekly availability</h2>
                            {availSaved && (
                                <span className="flex items-center gap-1.5 text-xs text-mint-600 bg-mint-50 border border-mint-200 rounded-full px-3 py-1.5">
                                    <Check size={12}/> Saved!
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-mint-800/60 mt-1 mb-5">
                            Set your working hours. Patients can only book slots during these hours.
                        </p>
                        <AvailabilityEditor availability={profile.availability||[]} onChange={saveAvailability}/>
                    </div>
                )}
            </div>

            {/* ── PRESCRIPTION MODAL ── */}
            {prescribingFor && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/20 backdrop-blur-sm p-0 sm:p-4">
                    <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-xl max-h-[92vh] overflow-y-auto shadow-2xl border border-mint-100">
                        {/* Header */}
                        <div className="sticky top-0 bg-white border-b border-mint-100 px-6 py-4 flex items-center justify-between rounded-t-3xl">
                            <div>
                                <h3 className="editorial text-xl text-mint-800">Prescription</h3>
                                <p className="text-xs text-mint-800/50 mt-0.5">
                                    {prescribingFor.patient_name} · {new Date(prescribingFor.date+"T00:00").toLocaleDateString(undefined,{day:"numeric",month:"short"})} at {prescribingFor.time_slot}
                                </p>
                            </div>
                            <button onClick={()=>setPrescribingFor(null)} className="w-8 h-8 rounded-full bg-mint-50 hover:bg-mint-100 flex items-center justify-center transition"><X size={15}/></button>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Diagnosis */}
                            <div>
                                <label className="block mb-1.5 text-xs font-semibold text-mint-800/50 uppercase tracking-wider">Diagnosis *</label>
                                <input value={presForm.diagnosis} onChange={e=>setPresForm({...presForm,diagnosis:e.target.value})}
                                    placeholder="e.g. Hypertension, Type 2 Diabetes"
                                    className="w-full rounded-xl border border-mint-200 bg-mint-50/30 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-mint-500 focus:border-mint-400"/>
                            </div>

                            {/* Medications */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-semibold text-mint-800/50 uppercase tracking-wider">Medications *</label>
                                    <button onClick={()=>setPresForm({...presForm,medications:[...presForm.medications,{name:"",dosage:"",frequency:"",duration:""}]})}
                                        className="flex items-center gap-1 text-xs text-mint-600 hover:text-mint-800 font-medium transition">
                                        <span className="text-base leading-none">+</span> Add medicine
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {presForm.medications.map((m,i) => (
                                        <div key={i} className="rounded-2xl border border-mint-100 bg-mint-50/20 overflow-hidden">
                                            <div className="flex items-center justify-between px-4 py-2 bg-mint-50/50 border-b border-mint-100">
                                                <span className="text-xs font-semibold text-mint-600">Medicine {i+1}</span>
                                                {presForm.medications.length > 1 && (
                                                    <button onClick={()=>setPresForm({...presForm,medications:presForm.medications.filter((_,idx)=>idx!==i)})}
                                                        className="text-red-400 hover:text-red-600 transition"><X size={13}/></button>
                                                )}
                                            </div>
                                            <div className="p-3 grid grid-cols-2 gap-2">
                                                <input placeholder="Medicine name" value={m.name}
                                                    onChange={e=>{const a=[...presForm.medications];a[i].name=e.target.value;setPresForm({...presForm,medications:a});}}
                                                    className="col-span-2 rounded-xl border border-mint-100 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-mint-400"/>
                                                <input placeholder="Dosage (e.g. 500mg)" value={m.dosage}
                                                    onChange={e=>{const a=[...presForm.medications];a[i].dosage=e.target.value;setPresForm({...presForm,medications:a});}}
                                                    className="rounded-xl border border-mint-100 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-mint-400"/>
                                                <input placeholder="Frequency (e.g. Twice daily)" value={m.frequency}
                                                    onChange={e=>{const a=[...presForm.medications];a[i].frequency=e.target.value;setPresForm({...presForm,medications:a});}}
                                                    className="rounded-xl border border-mint-100 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-mint-400"/>
                                                <input placeholder="Duration (e.g. 5 days)" value={m.duration}
                                                    onChange={e=>{const a=[...presForm.medications];a[i].duration=e.target.value;setPresForm({...presForm,medications:a});}}
                                                    className="col-span-2 rounded-xl border border-mint-100 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-mint-400"/>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block mb-1.5 text-xs font-semibold text-mint-800/50 uppercase tracking-wider">Notes for patient</label>
                                <textarea rows={3} value={presForm.additional_notes}
                                    onChange={e=>setPresForm({...presForm,additional_notes:e.target.value})}
                                    placeholder="Follow-up in 2 weeks. Avoid spicy food. Take medicines after meals..."
                                    className="w-full rounded-xl border border-mint-200 bg-mint-50/30 px-4 py-3 text-sm resize-none outline-none focus:ring-2 focus:ring-mint-500"/>
                            </div>
                        </div>

                        {/* Sticky footer */}
                        <div className="sticky bottom-0 bg-white border-t border-mint-100 px-6 py-4">
                            <button onClick={submitPrescription}
                                disabled={!presForm.diagnosis || !presForm.medications[0]?.name}
                                className="w-full flex items-center justify-center gap-2 bg-mint-600 hover:bg-mint-700 disabled:opacity-40 text-white font-semibold py-3.5 rounded-2xl text-sm transition">
                                <FileText size={15}/> Issue prescription & complete appointment
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Availability Editor ─────────────────────────────────────────────────────
const QUICK_PRESETS = [
    { label: "Morning", start: "09:00", end: "13:00" },
    { label: "Afternoon", start: "13:00", end: "17:00" },
    { label: "Full day", start: "09:00", end: "17:00" },
    { label: "Evening", start: "17:00", end: "21:00" },
];

function AvailabilityEditor({ availability, onChange }) {
    const [local, setLocal] = useState(availability);
    const [hasChanges, setHasChanges] = useState(false);
    const [saving, setSaving] = useState(false);
    useEffect(() => { setLocal(availability); setHasChanges(false); }, [availability]);

    const addRow = (day, preset) => {
        const row = preset
            ? { day_of_week: day, start_time: preset.start, end_time: preset.end, mode: "offline", slot_minutes: 30 }
            : { day_of_week: day, start_time: "09:00", end_time: "17:00", mode: "offline", slot_minutes: 30 };
        setLocal(l => [...l, row]);
        setHasChanges(true);
    };
    const removeRow = (i) => { setLocal(l => l.filter((_, idx) => idx !== i)); setHasChanges(true); };
    const setField = (i, k, v) => { setLocal(l => { const a = [...l]; a[i] = { ...a[i], [k]: v }; return a; }); setHasChanges(true); };

    const handleSave = async () => {
        setSaving(true);
        await onChange(local);
        setHasChanges(false);
        setSaving(false);
    };

    // Quick-toggle: check/uncheck an entire day using Full day preset
    const toggleDay = (dIdx) => {
        const hasRows = local.some(r => r.day_of_week === dIdx);
        if (hasRows) {
            setLocal(l => l.filter(r => r.day_of_week !== dIdx));
        } else {
            setLocal(l => [...l, { day_of_week: dIdx, start_time: "09:00", end_time: "17:00", mode: "offline", slot_minutes: 30 }]);
        }
        setHasChanges(true);
    };

    return (
        <div>
            {/* Quick day toggles */}
            <div className="flex flex-wrap gap-2 mb-4">
                {DAYS.map((dn, dIdx) => {
                    const active = local.some(r => r.day_of_week === dIdx);
                    return (
                        <button key={dn} onClick={() => toggleDay(dIdx)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition
                                ${active ? "bg-mint-600 text-white border-mint-600" : "bg-white/70 border-mint-200 text-mint-800/50 hover:border-mint-400"}`}>
                            {dn}
                        </button>
                    );
                })}
                <span className="text-xs text-mint-800/30 self-center ml-1">Click day to toggle on/off</span>
            </div>

            {/* Per-day rows */}
            <div className="space-y-2">
                {DAYS.map((dn, dIdx) => {
                    const rows = local.map((r, i) => ({ ...r, _i: i })).filter(r => r.day_of_week === dIdx);
                    if (rows.length === 0) return null;
                    return (
                        <div key={dn} className="rounded-2xl bg-mint-50/40 border border-mint-100 overflow-hidden">
                            <div className="flex items-center gap-3 px-4 py-2 bg-mint-50 border-b border-mint-100">
                                <p className="text-sm font-bold text-mint-700 w-8">{dn}</p>
                                {/* Quick preset buttons */}
                                <div className="flex gap-1.5 flex-wrap">
                                    {QUICK_PRESETS.map(p => (
                                        <button key={p.label} onClick={() => {
                                            // Remove all rows for this day and add the preset
                                            const idxs = local.map((r,i)=>({...r,_i:i})).filter(r=>r.day_of_week===dIdx).map(r=>r._i);
                                            setLocal(l => {
                                                const filtered = l.filter((_,i)=>!idxs.includes(i));
                                                return [...filtered, {day_of_week:dIdx,start_time:p.start,end_time:p.end,mode:"offline",slot_minutes:30}];
                                            });
                                            setHasChanges(true);
                                        }}
                                            className={`text-[10px] px-2 py-0.5 rounded-full border transition
                                                ${rows[0]?.start_time===p.start&&rows[0]?.end_time===p.end&&rows.length===1
                                                    ?"bg-mint-600 text-white border-mint-600"
                                                    :"bg-white border-mint-200 text-mint-600 hover:border-mint-400"}`}>
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                                <button onClick={() => toggleDay(dIdx)} className="ml-auto text-red-400 hover:text-red-600 transition text-xs">Remove</button>
                            </div>
                            <div className="px-4 py-3 space-y-2">
                                {rows.map(r => (
                                    <div key={r._i} className="flex flex-wrap items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            <input type="time" value={r.start_time} onChange={e => setField(r._i, "start_time", e.target.value)}
                                                className="rounded-xl border border-mint-200 bg-white px-3 py-2 text-sm text-mint-800 outline-none focus:ring-2 focus:ring-mint-400"/>
                                            <span className="text-xs text-mint-400 font-medium">to</span>
                                            <input type="time" value={r.end_time} onChange={e => setField(r._i, "end_time", e.target.value)}
                                                className="rounded-xl border border-mint-200 bg-white px-3 py-2 text-sm text-mint-800 outline-none focus:ring-2 focus:ring-mint-400"/>
                                        </div>
                                        {rows.length > 1 && (
                                            <button onClick={() => removeRow(r._i)} className="text-red-400 hover:text-red-600 transition text-xs ml-auto">
                                                <X size={14}/>
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button onClick={() => addRow(dIdx)} className="text-xs text-mint-600 hover:underline">+ Add another time block</button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {local.length === 0 && (
                <div className="py-8 text-center rounded-2xl border border-dashed border-mint-200 mt-2">
                    <p className="text-sm text-mint-800/40">No availability set.</p>
                    <p className="text-xs text-mint-800/30 mt-1">Click the day buttons above to add working days.</p>
                </div>
            )}

            <div className="mt-4 flex items-center gap-3">
                <button onClick={handleSave} disabled={!hasChanges || saving}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-mint-600 hover:bg-mint-700 disabled:opacity-40 text-white text-sm font-semibold transition">
                    {saving ? <><RefreshCw size={13} className="animate-spin"/> Saving…</> : <><Check size={14}/> Save availability</>}
                </button>
                {!hasChanges && local.length > 0 && <p className="text-xs text-mint-800/40">All changes saved.</p>}
                {hasChanges && <p className="text-xs text-amber-600">Unsaved changes</p>}
            </div>
        </div>
    );
}
