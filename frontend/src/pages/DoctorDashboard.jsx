import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api, { formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import {
    Calendar, CheckCircle2, Pill, X, AlertCircle,
    Settings, Clock, User, ChevronDown, ChevronUp,
    Plus, Trash2, BellOff, Activity, Stethoscope,
    Camera, FileText, Sun, Sunset, Moon
} from "lucide-react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SPECIALTIES = [
    "Cardiology", "Dermatology", "Neurology", "Orthopedics", "Pediatrics",
    "Psychiatry", "General Medicine", "ENT", "Ophthalmology", "Gynecology", "Dentistry",
];

function fmtDate(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.slice(0, 10).split("-");
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${parseInt(d)} ${months[parseInt(m)-1]} ${y}`;
}

// ─── Frequency picker: morning / afternoon / evening ─────────────────────────
function FrequencyPicker({ value, onChange }) {
    const options = [
        { id: "morning", label: "Morning", icon: Sun, desc: "Before 12 PM" },
        { id: "afternoon", label: "Afternoon", icon: Sunset, desc: "12–5 PM" },
        { id: "evening", label: "Evening", icon: Moon, desc: "After 5 PM" },
    ];
    const selected = value ? value.split("+") : [];
    const toggle = (id) => {
        const next = selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id];
        onChange(next.join("+") || "");
    };
    return (
        <div className="flex gap-2 flex-wrap">
            {options.map(o => (
                <button key={o.id} type="button" onClick={() => toggle(o.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition border ${selected.includes(o.id) ? "bg-mint-600 text-white border-mint-600" : "bg-white/70 text-mint-800/70 border-mint-100 hover:border-mint-400"}`}>
                    <o.icon size={11} /> {o.label}
                </button>
            ))}
        </div>
    );
}

// ─── Prescription Modal ───────────────────────────────────────────────────────
function PrescriptionModal({ appt, onClose, onDone }) {
    const [form, setForm] = useState({
        diagnosis: "",
        medications: [{ name: "", dosage: "", frequency: "", duration: "", notes: "" }],
        additional_notes: "",
    });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const setMed = (i, k, v) => {
        const arr = [...form.medications];
        arr[i] = { ...arr[i], [k]: v };
        setForm(f => ({ ...f, medications: arr }));
    };
    const addMed = () => setForm(f => ({ ...f, medications: [...f.medications, { name: "", dosage: "", frequency: "", duration: "", notes: "" }] }));
    const removeMed = (i) => setForm(f => ({ ...f, medications: f.medications.filter((_, idx) => idx !== i) }));

    const submit = async () => {
        if (!form.diagnosis || !form.medications[0].name) return;
        setBusy(true); setError("");
        try {
            await api.post("/prescriptions", {
                appointment_id: appt.id,
                patient_id: appt.patient_id,
                diagnosis: form.diagnosis,
                medications: form.medications.filter(m => m.name),
                additional_notes: form.additional_notes,
            });
            await api.patch(`/appointments/${appt.id}`, { status: "completed" });
            onDone();
        } catch (e) {
            setError(formatApiError(e.response?.data?.detail));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 grid place-items-center bg-mint-800/30 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="glass-mint rounded-3xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="editorial text-2xl text-mint-800">Prescription</h3>
                        <p className="text-xs text-mint-800/60 mt-0.5">for {appt.patient_name} · {appt.time_slot}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-mint-100"><X size={18} /></button>
                </div>

                {/* Diagnosis */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-mint-800/50 mb-1.5">Diagnosis</label>
                        <input value={form.diagnosis} onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))}
                            placeholder="e.g. Hypertension, Type 2 Diabetes"
                            className="w-full rounded-xl border border-mint-100 bg-white/80 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-mint-500" />
                    </div>

                    {/* Medications */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-mint-800/50 mb-2">Medications</label>
                        <div className="space-y-4">
                            {form.medications.map((m, i) => (
                                <div key={i} className="p-4 rounded-2xl bg-white/60 border border-mint-100 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-mint-800">Medicine {i + 1}</span>
                                        {i > 0 && (
                                            <button onClick={() => removeMed(i)} className="text-red-400 hover:text-red-600">
                                                <Trash2 size={13} />
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input placeholder="Medicine name" value={m.name}
                                            onChange={e => setMed(i, "name", e.target.value)}
                                            className="rounded-xl border border-mint-100 bg-white/80 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-mint-500" />
                                        <input placeholder="Dosage (e.g. 500mg)" value={m.dosage}
                                            onChange={e => setMed(i, "dosage", e.target.value)}
                                            className="rounded-xl border border-mint-100 bg-white/80 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-mint-500" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-mint-800/50 mb-1.5">When to take</p>
                                        <FrequencyPicker
                                            value={m.frequency}
                                            onChange={v => setMed(i, "frequency", v)} />
                                    </div>
                                    <input placeholder="Duration (e.g. 7 days, 1 month)" value={m.duration}
                                        onChange={e => setMed(i, "duration", e.target.value)}
                                        className="w-full rounded-xl border border-mint-100 bg-white/80 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-mint-500" />
                                    <input placeholder="Notes (optional, e.g. Take after meals)" value={m.notes}
                                        onChange={e => setMed(i, "notes", e.target.value)}
                                        className="w-full rounded-xl border border-mint-100 bg-white/80 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-mint-500" />
                                </div>
                            ))}
                        </div>
                        <button onClick={addMed} className="mt-2 text-xs text-mint-600 hover:underline flex items-center gap-1">
                            <Plus size={12} /> Add another medicine
                        </button>
                    </div>

                    {/* Additional notes */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-mint-800/50 mb-1.5">Additional notes</label>
                        <textarea rows={2} value={form.additional_notes}
                            onChange={e => setForm(f => ({ ...f, additional_notes: e.target.value }))}
                            placeholder="e.g. Avoid spicy food, follow up in 2 weeks"
                            className="w-full rounded-xl border border-mint-100 bg-white/80 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-mint-500 resize-none" />
                    </div>

                    {error && <p className="text-sm text-red-600">{error}</p>}

                    <button onClick={submit} disabled={busy || !form.diagnosis || !form.medications[0].name}
                        className="w-full btn-pill btn-primary disabled:opacity-50">
                        {busy ? "Saving…" : "Issue prescription & mark complete"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Profile Setup (first login) ──────────────────────────────────────────────
function ProfileSetup({ profile, hospitals, onSaved }) {
    const [form, setForm] = useState({
        name: profile.name || "",
        specialization: profile.specialization || SPECIALTIES[0],
        years_of_experience: profile.years_of_experience || 1,
        license_number: profile.license_number || "",
        bio: profile.bio || "",
        profile_photo_url: profile.profile_photo_url || "",
        consultation_fee: profile.consultation_fee || 500,
    });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const submit = async () => {
        setBusy(true); setError("");
        try {
            await api.put("/doctor/profile/complete", form);
            onSaved();
        } catch (e) {
            setError(formatApiError(e.response?.data?.detail));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-white">
            <div className="w-full max-w-lg">
                <div className="flex items-center gap-2.5 mb-8">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-mint-600 text-white">
                        <Activity size={18} strokeWidth={2.4} />
                    </div>
                    <span className="editorial text-2xl text-mint-800">Sukhya Med</span>
                </div>
                <span className="overline">Welcome</span>
                <h1 className="editorial mt-2 text-4xl text-mint-800">Complete your <em className="italic text-mint-600">profile</em>.</h1>
                <p className="mt-2 text-sm text-mint-800/60 mb-8">Patients will see this information when they find you.</p>

                <div className="space-y-4">
                    <Field label="Full name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Dr. Aanya Sharma" />
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-mint-800/50 mb-1.5">Specialization</label>
                        <select value={form.specialization} onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))}
                            className="w-full rounded-xl border border-mint-100 bg-white/80 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-mint-500">
                            {SPECIALTIES.map(s => <option key={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Years of experience" type="number" value={form.years_of_experience} onChange={v => setForm(f => ({ ...f, years_of_experience: Number(v) }))} placeholder="5" />
                        <Field label="Consultation fee (₹)" type="number" value={form.consultation_fee} onChange={v => setForm(f => ({ ...f, consultation_fee: Number(v) }))} placeholder="500" />
                    </div>
                    <Field label="Medical license number" value={form.license_number} onChange={v => setForm(f => ({ ...f, license_number: v }))} placeholder="MH-CARD-12001" />
                    <Field label="Profile photo URL" value={form.profile_photo_url} onChange={v => setForm(f => ({ ...f, profile_photo_url: v }))} placeholder="https://..." />
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-mint-800/50 mb-1.5">Bio</label>
                        <textarea rows={3} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                            placeholder="Short bio — qualifications, experience, focus areas"
                            className="w-full rounded-xl border border-mint-100 bg-white/80 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-mint-500 resize-none" />
                    </div>

                    {error && <p className="text-sm text-red-600">{error}</p>}

                    <button onClick={submit} disabled={busy || !form.name || !form.license_number}
                        className="w-full btn-pill btn-primary disabled:opacity-50 py-4">
                        {busy ? "Saving…" : "Save profile & go to dashboard →"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function Field({ label, type = "text", value, onChange, placeholder }) {
    return (
        <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-mint-800/50 mb-1.5">{label}</label>
            <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                className="w-full rounded-xl border border-mint-100 bg-white/80 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-mint-500" />
        </div>
    );
}

// ─── Availability Editor ──────────────────────────────────────────────────────
function AvailabilityEditor({ availability, onChange }) {
    const [local, setLocal] = useState(availability);
    useEffect(() => setLocal(availability), [availability]);

    const addRow = (day) => setLocal(l => [...l, { day_of_week: day, start_time: "09:00", end_time: "13:00", mode: "offline", slot_minutes: 30 }]);
    const removeRow = (i) => setLocal(l => l.filter((_, idx) => idx !== i));
    const setField = (i, k, v) => setLocal(l => { const arr = [...l]; arr[i] = { ...arr[i], [k]: v }; return arr; });
    const save = () => onChange(local);

    return (
        <div className="mt-4 space-y-3">
            {DAYS.map((dn, dIdx) => {
                const rows = local.map((r, i) => ({ ...r, _i: i })).filter(r => r.day_of_week === dIdx);
                return (
                    <div key={dn} className="rounded-xl bg-white/50 border border-mint-100 p-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-mint-800 w-8">{dn}</p>
                            {rows.length === 0
                                ? <p className="text-xs text-mint-800/40 flex-1 ml-2">Off</p>
                                : <div className="flex-1 ml-2 space-y-2">
                                    {rows.map(r => (
                                        <div key={r._i} className="flex flex-wrap items-center gap-1.5">
                                            <input type="time" value={r.start_time}
                                                onChange={e => setField(r._i, "start_time", e.target.value)}
                                                className="rounded-lg border border-mint-100 bg-white px-2 py-1 text-xs w-24" />
                                            <span className="text-xs text-mint-800/50">to</span>
                                            <input type="time" value={r.end_time}
                                                onChange={e => setField(r._i, "end_time", e.target.value)}
                                                className="rounded-lg border border-mint-100 bg-white px-2 py-1 text-xs w-24" />
                                            <select value={r.slot_minutes}
                                                onChange={e => setField(r._i, "slot_minutes", Number(e.target.value))}
                                                className="rounded-lg border border-mint-100 bg-white px-2 py-1 text-xs">
                                                <option value={15}>15 min</option>
                                                <option value={20}>20 min</option>
                                                <option value={30}>30 min</option>
                                                <option value={45}>45 min</option>
                                                <option value={60}>60 min</option>
                                            </select>
                                            <button onClick={() => removeRow(r._i)} className="text-red-400 hover:text-red-600 p-0.5">
                                                <X size={13} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            }
                            <button onClick={() => addRow(dIdx)} className="text-xs text-mint-600 hover:underline ml-2 flex-shrink-0">
                                + Add
                            </button>
                        </div>
                    </div>
                );
            })}
            <button onClick={save} className="btn-pill btn-primary text-sm">
                <Settings size={14} /> Save availability
            </button>
        </div>
    );
}

// ─── Mark Unavailable Panel ───────────────────────────────────────────────────
function UnavailablePanel({ doctor, onRefresh }) {
    const [date, setDate] = useState("");
    const [reason, setReason] = useState("Surgery");
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState(null);

    const mark = async () => {
        if (!date) return;
        setBusy(true); setResult(null);
        try {
            const { data } = await api.post("/doctor/mark-unavailable", { date, reason });
            setResult(data);
            onRefresh();
        } catch (e) {
            setResult({ error: formatApiError(e.response?.data?.detail) });
        } finally {
            setBusy(false);
        }
    };

    const remove = async (d) => {
        await api.delete(`/doctor/mark-unavailable/${d}`);
        onRefresh();
    };

    const unavailableDates = doctor.unavailable_dates || [];

    return (
        <div className="space-y-4">
            <p className="text-sm text-mint-800/70">Mark a day off (surgery, leave, emergency). Patients booked on that day will be auto-rescheduled to the next available slot and notified by email.</p>

            <div className="flex flex-wrap gap-2">
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                    className="rounded-xl border border-mint-100 bg-white/80 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-mint-500" />
                <select value={reason} onChange={e => setReason(e.target.value)}
                    className="rounded-xl border border-mint-100 bg-white/80 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-mint-500">
                    <option>Surgery</option>
                    <option>Leave</option>
                    <option>Emergency</option>
                    <option>Conference</option>
                    <option>Other</option>
                </select>
                <button onClick={mark} disabled={busy || !date} className="btn-pill btn-primary text-sm disabled:opacity-50">
                    {busy ? "Processing…" : <><BellOff size={14} /> Mark unavailable</>}
                </button>
            </div>

            {result && !result.error && (
                <div className="p-3 rounded-xl bg-mint-50 border border-mint-100 text-sm text-mint-800">
                    ✅ {result.rebooked?.length || 0} appointment(s) rescheduled · {result.cancelled?.length || 0} cancelled
                </div>
            )}
            {result?.error && <p className="text-sm text-red-600">{result.error}</p>}

            {unavailableDates.length > 0 && (
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-mint-800/50 mb-2">Currently marked off</p>
                    <div className="flex flex-wrap gap-2">
                        {unavailableDates.sort().map(d => (
                            <div key={d} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 border border-red-100 text-xs text-red-700">
                                {fmtDate(d)}
                                <button onClick={() => remove(d)} className="hover:text-red-900"><X size={11} /></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function DoctorDashboard() {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [hospitals, setHospitals] = useState([]);
    const [appts, setAppts] = useState([]);
    const [tab, setTab] = useState("today");
    const [prescribingFor, setPrescribingFor] = useState(null);
    const [error, setError] = useState("");
    const [profileSetupDone, setProfileSetupDone] = useState(false);

    const load = async () => {
        try {
            const [p, a, h] = await Promise.all([
                api.get("/doctor/profile"),
                api.get("/appointments"),
                api.get("/hospitals"),
            ]);
            setProfile(p.data);
            setAppts(a.data);
            setHospitals(h.data);
        } catch (e) {
            setError(formatApiError(e.response?.data?.detail));
        }
    };
    useEffect(() => { load(); }, []);

    const updateProfile = async (changes) => {
        try {
            await api.put("/doctor/profile", changes);
            await load();
        } catch (e) {
            setError(formatApiError(e.response?.data?.detail));
        }
    };

    if (!profile) return (
        <div className="min-h-screen"><Navbar />
            <p className="mx-auto max-w-2xl px-6 py-20 text-center text-mint-800/60">Loading…</p>
        </div>
    );

    // Show profile setup if not complete
    if (!profile.profile_complete && !profileSetupDone) {
        return <ProfileSetup profile={profile} hospitals={hospitals} onSaved={() => { setProfileSetupDone(true); load(); }} />;
    }

    const today = new Date().toISOString().slice(0, 10);
    const todaysAppts = appts.filter(a => a.date === today && a.status === "booked").sort((a, b) => a.time_slot.localeCompare(b.time_slot));
    const upcomingAppts = appts.filter(a => a.status === "booked" && a.date >= today).sort((a, b) => a.date.localeCompare(b.date) || a.time_slot.localeCompare(b.time_slot));
    const pastAppts = appts.filter(a => a.status !== "booked").sort((a, b) => b.date.localeCompare(a.date));

    const tabs = [
        { id: "today", label: "Today", count: todaysAppts.length },
        { id: "upcoming", label: "Upcoming", count: upcomingAppts.length },
        { id: "history", label: "History" },
        { id: "availability", label: "Availability" },
        { id: "profile", label: "Profile" },
    ];

    const markComplete = async (id) => {
        await api.patch(`/appointments/${id}`, { status: "completed" });
        load();
    };
    const markNoShow = async (id) => {
        await api.patch(`/appointments/${id}`, { status: "no_show" });
        load();
    };

    return (
        <div className="min-h-screen">
            <Navbar />
            <section className="mx-auto max-w-5xl px-4 sm:px-6 pt-8 pb-24" data-testid="doctor-dashboard">

                {/* Header */}
                <div className="mb-6">
                    <span className="overline">Doctor dashboard</span>
                    <h1 className="editorial mt-2 text-3xl sm:text-5xl text-mint-800">
                        Hello, <em className="italic text-mint-600">{profile.name || user?.full_name}</em>
                    </h1>
                    <p className="mt-1 text-sm text-mint-800/60">
                        {profile.specialization} · {profile.hospital?.name || "—"} ·{" "}
                        <span className={profile.is_approved ? "text-mint-600" : "text-amber-600"}>
                            {profile.is_approved ? "Approved ✓" : "Pending approval"}
                        </span>
                    </p>
                </div>

                {!profile.is_approved && (
                    <div className="mb-6 glass-mint rounded-2xl p-4 flex items-start gap-3">
                        <AlertCircle size={18} className="text-mint-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-mint-800/80">
                            Your account is pending admin approval. Once approved, you'll appear in Find Doctors and patients can book with you.
                        </p>
                    </div>
                )}

                {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

                {/* Tab nav */}
                <div className="flex gap-1 overflow-x-auto pb-1 mb-6 scrollbar-hide">
                    {tabs.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm whitespace-nowrap transition flex-shrink-0 ${tab === t.id ? "bg-mint-600 text-white shadow" : "glass text-mint-800/70 hover:text-mint-800"}`}>
                            {t.label}
                            {t.count > 0 && (
                                <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.id ? "bg-white/20 text-white" : "bg-mint-100 text-mint-700"}`}>
                                    {t.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ── TODAY ── */}
                {tab === "today" && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="overline">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
                                <h2 className="editorial text-3xl text-mint-800 mt-1">
                                    {todaysAppts.length === 0 ? "No appointments today" : `${todaysAppts.length} appointment${todaysAppts.length > 1 ? "s" : ""} today`}
                                </h2>
                            </div>
                        </div>

                        {todaysAppts.length === 0 ? (
                            <div className="glass rounded-2xl p-10 text-center">
                                <Calendar size={32} className="text-mint-200 mx-auto mb-3" />
                                <p className="text-mint-800/60">Free day! Check your upcoming schedule.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {todaysAppts.map(a => (
                                    <div key={a.id} className="glass rounded-2xl p-4 sm:p-5" data-testid={`appt-${a.id}`}>
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <Clock size={14} className="text-mint-600" />
                                                    <span className="text-sm font-semibold text-mint-800">{a.time_slot}</span>
                                                </div>
                                                <p className="editorial text-xl text-mint-800 mt-1">{a.patient_name}</p>
                                                <p className="text-xs text-mint-800/60">
                                                    {a.patient_phone || "No phone"} · In-person
                                                </p>
                                                {a.reason && <p className="text-xs text-mint-800/50 italic mt-1">"{a.reason}"</p>}
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <button onClick={() => setPrescribingFor(a)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-mint-50 text-mint-700 border border-mint-100 hover:bg-mint-100 text-xs transition"
                                                    data-testid={`prescribe-${a.id}`}>
                                                    <Pill size={12} /> Prescribe
                                                </button>
                                                <button onClick={() => markComplete(a.id)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-mint-600 text-white text-xs hover:bg-mint-700 transition"
                                                    data-testid={`complete-${a.id}`}>
                                                    <CheckCircle2 size={12} /> Complete
                                                </button>
                                                <button onClick={() => markNoShow(a.id)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-red-200 text-red-600 text-xs hover:bg-red-50 transition"
                                                    data-testid={`noshow-${a.id}`}>
                                                    <X size={12} /> No-show
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── UPCOMING ── */}
                {tab === "upcoming" && (
                    <div className="space-y-3">
                        <h2 className="editorial text-3xl text-mint-800 mb-4">Upcoming appointments</h2>
                        {upcomingAppts.length === 0 ? (
                            <div className="glass rounded-2xl p-10 text-center">
                                <Calendar size={32} className="text-mint-200 mx-auto mb-3" />
                                <p className="text-mint-800/60">No upcoming appointments.</p>
                            </div>
                        ) : (
                            upcomingAppts.map(a => (
                                <div key={a.id} className="glass rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-mint-50 text-mint-600 border border-mint-100">
                                                {fmtDate(a.date)} · {a.time_slot}
                                            </span>
                                        </div>
                                        <p className="text-sm font-medium text-mint-800">{a.patient_name}</p>
                                        <p className="text-xs text-mint-800/50">{a.patient_phone || "No phone"}</p>
                                        {a.reason && <p className="text-xs text-mint-800/40 italic">"{a.reason}"</p>}
                                    </div>
                                    <button onClick={() => setPrescribingFor(a)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-mint-50 text-mint-700 border border-mint-100 hover:bg-mint-100 text-xs">
                                        <Pill size={12} /> Prescribe
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* ── HISTORY ── */}
                {tab === "history" && (
                    <div>
                        <h2 className="editorial text-3xl text-mint-800 mb-4">Appointment history</h2>
                        {pastAppts.length === 0 ? (
                            <p className="text-sm text-mint-800/60">No past appointments yet.</p>
                        ) : (
                            <div className="space-y-2">
                                {pastAppts.map(a => (
                                    <div key={a.id} className="flex items-center justify-between py-3 border-b border-mint-100/60 last:border-0 flex-wrap gap-2">
                                        <div>
                                            <p className="text-sm text-mint-800">{a.patient_name}</p>
                                            <p className="text-xs text-mint-800/50">{fmtDate(a.date)} · {a.time_slot}</p>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded-full capitalize font-medium ${
                                            a.status === "completed" ? "bg-mint-50 text-mint-600" :
                                            a.status === "no_show" ? "bg-amber-50 text-amber-600" :
                                            "bg-red-50 text-red-500"
                                        }`}>
                                            {a.status.replace("_", " ")}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── AVAILABILITY ── */}
                {tab === "availability" && (
                    <div className="space-y-6">
                        <div className="glass rounded-2xl p-5 sm:p-6">
                            <h2 className="editorial text-3xl text-mint-800">Weekly schedule</h2>
                            <p className="text-sm text-mint-800/60 mt-1">Set the hours you're available each day. This controls which slots patients can book.</p>
                            <AvailabilityEditor
                                availability={profile.availability || []}
                                onChange={avail => updateProfile({ availability: avail })} />
                        </div>
                        <div className="glass rounded-2xl p-5 sm:p-6">
                            <h2 className="editorial text-2xl text-mint-800 mb-1 flex items-center gap-2">
                                <BellOff size={18} className="text-mint-600" /> Mark day off
                            </h2>
                            <UnavailablePanel doctor={profile} onRefresh={load} />
                        </div>
                    </div>
                )}

                {/* ── PROFILE ── */}
                {tab === "profile" && (
                    <ProfileEditor profile={profile} onSave={updateProfile} />
                )}

            </section>

            {/* Prescription modal */}
            {prescribingFor && (
                <PrescriptionModal
                    appt={prescribingFor}
                    onClose={() => setPrescribingFor(null)}
                    onDone={() => { setPrescribingFor(null); load(); }} />
            )}
        </div>
    );
}

// ─── Profile Editor ───────────────────────────────────────────────────────────
function ProfileEditor({ profile, onSave }) {
    const [form, setForm] = useState({
        name: profile.name || "",
        specialization: profile.specialization || SPECIALTIES[0],
        years_of_experience: profile.years_of_experience || 1,
        license_number: profile.license_number || "",
        bio: profile.bio || "",
        profile_photo_url: profile.profile_photo_url || "",
        consultation_fee: profile.consultation_fee || 500,
    });
    const [busy, setBusy] = useState(false);
    const [saved, setSaved] = useState(false);

    const save = async () => {
        setBusy(true); setSaved(false);
        await onSave(form);
        setBusy(false); setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <div className="glass rounded-2xl p-5 sm:p-6 space-y-4">
            <h2 className="editorial text-3xl text-mint-800">My profile</h2>
            <p className="text-sm text-mint-800/60">This information is visible to patients when they find you.</p>

            <Field label="Full name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Dr. Aanya Sharma" />
            <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-mint-800/50 mb-1.5">Specialization</label>
                <select value={form.specialization} onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))}
                    className="w-full rounded-xl border border-mint-100 bg-white/80 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-mint-500">
                    {SPECIALTIES.map(s => <option key={s}>{s}</option>)}
                </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <Field label="Years of experience" type="number" value={form.years_of_experience} onChange={v => setForm(f => ({ ...f, years_of_experience: Number(v) }))} placeholder="5" />
                <Field label="Consultation fee (₹)" type="number" value={form.consultation_fee} onChange={v => setForm(f => ({ ...f, consultation_fee: Number(v) }))} placeholder="500" />
            </div>
            <Field label="License number" value={form.license_number} onChange={v => setForm(f => ({ ...f, license_number: v }))} placeholder="MH-CARD-12001" />
            <Field label="Profile photo URL" value={form.profile_photo_url} onChange={v => setForm(f => ({ ...f, profile_photo_url: v }))} placeholder="https://..." />
            <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-mint-800/50 mb-1.5">Bio</label>
                <textarea rows={4} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                    placeholder="Short bio — qualifications, experience, focus areas"
                    className="w-full rounded-xl border border-mint-100 bg-white/80 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-mint-500 resize-none" />
            </div>

            <button onClick={save} disabled={busy}
                className="btn-pill btn-primary disabled:opacity-50">
                {busy ? "Saving…" : saved ? "✓ Saved!" : "Save profile"}
            </button>
        </div>
    );
}
