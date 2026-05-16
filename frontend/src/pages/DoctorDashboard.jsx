import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import api, { formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Calendar, CheckCircle2, Pill, X, Video, AlertCircle, Settings, RefreshCw } from "lucide-react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function DoctorDashboard() {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [appts, setAppts] = useState([]);
    const [error, setError] = useState("");
    const [prescribingFor, setPrescribingFor] = useState(null);
    const [presForm, setPresForm] = useState({ diagnosis: "", medications: [{ name: "", dosage: "", frequency: "", duration: "", notes: "" }], additional_notes: "" });

    const load = async () => {
        try {
            const [p, a] = await Promise.all([api.get("/doctor/profile"), api.get("/appointments")]);
            setProfile(p.data);
            setAppts(a.data);
        } catch (e) {
            setError(formatApiError(e.response?.data?.detail));
        }
    };
    useEffect(() => { load(); }, []);

    const updateProfile = async (changes) => {
        try {
            const { data } = await api.put("/doctor/profile", changes);
            setProfile((p) => ({ ...p, ...data }));
        } catch (e) {
            setError(formatApiError(e.response?.data?.detail));
        }
    };

    const setAvailability = (avail) => updateProfile({ availability: avail });

    const today = new Date().toISOString().slice(0, 10);
    const todays = appts.filter((a) => a.date === today);
    const upcoming = appts.filter((a) => a.status === "booked");

    const setTodayMode = (mode) => updateProfile({ today_mode: mode });
    const toggleOnline = (v) => updateProfile({ online_consultation_enabled: v });

    const markComplete = async (id) => {
        await api.patch(`/appointments/${id}`, { status: "completed" });
        load();
    };
    const markNoShow = async (id) => {
        await api.patch(`/appointments/${id}`, { status: "no_show" });
        load();
    };

    const submitPrescription = async () => {
        if (!prescribingFor) return;
        try {
            await api.post("/prescriptions", {
                appointment_id: prescribingFor.id,
                patient_id: prescribingFor.patient_id,
                diagnosis: presForm.diagnosis,
                medications: presForm.medications.filter((m) => m.name),
                additional_notes: presForm.additional_notes,
            });
            await markComplete(prescribingFor.id);
            setPrescribingFor(null);
            setPresForm({ diagnosis: "", medications: [{ name: "", dosage: "", frequency: "", duration: "", notes: "" }], additional_notes: "" });
        } catch (e) {
            setError(formatApiError(e.response?.data?.detail));
        }
    };

    const connectGCal = async () => {
        const { data } = await api.get("/doctor/google-calendar/auth-url");
        if (!data.configured) {
            alert("Google Calendar is not configured on the server yet. Once your Google Cloud credentials are added, this button will start the OAuth flow.");
            return;
        }
        window.location.href = data.url;
    };

    if (!profile) return (
        <div className="min-h-screen">
            <Navbar />
            <p className="mx-auto max-w-2xl px-6 py-20 text-center text-mint-800/60">Loading…</p>
        </div>
    );

    return (
        <div className="min-h-screen">
            <Navbar />
            <section className="mx-auto max-w-6xl px-6 pt-10 pb-20" data-testid="doctor-dashboard">
                <span className="overline">Doctor dashboard</span>
                <h1 className="editorial mt-2 text-5xl text-mint-800">Hello, <em className="italic text-mint-600">{user?.full_name}</em></h1>
                <p className="mt-2 text-mint-800/70">{profile.specialization} · {profile.hospital?.name || "—"} · {profile.is_approved ? "Approved" : "Pending approval"}</p>

                {!profile.is_approved && (
                    <div className="mt-4 glass-mint rounded-2xl p-4 flex items-start gap-3" data-testid="pending-banner">
                        <AlertCircle size={18} className="text-mint-600 mt-0.5" />
                        <div className="text-sm text-mint-800/80">
                            Your account is pending admin approval. Once approved, your profile will be visible to patients and bookings can be made.
                        </div>
                    </div>
                )}
                {error && <p className="mt-3 text-red-600 text-sm" data-testid="doctor-error">{error}</p>}

                {/* TODAY */}
                <div className="mt-10 glass-mint rounded-3xl p-6" data-testid="today-panel">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="overline">Today · {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
                            <h2 className="editorial text-3xl text-mint-800 mt-1">{todays.length} appointment{todays.length === 1 ? "" : "s"}</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-mint-800/70 mr-1">Mode today:</span>
                            {["online", "offline", "both"].map((m) => (
                                <button key={m} onClick={() => setTodayMode(m)}
                                    className={`rounded-full px-3 py-1.5 text-xs transition border ${profile.today_mode === m ? "bg-mint-500 text-white border-mint-500" : "bg-white/70 border-mint-100"}`}
                                    data-testid={`mode-${m}`}>
                                    {m === "both" ? "Both" : m[0].toUpperCase() + m.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                    {todays.length === 0 ? <p className="mt-4 text-sm text-mint-800/60">No appointments today.</p> : (
                        <ul className="mt-5 divide-y divide-mint-100">
                            {todays.map((a) => (
                                <li key={a.id} className="py-3 flex flex-wrap items-center justify-between gap-3" data-testid={`today-appt-${a.id}`}>
                                    <div>
                                        <p className="font-medium text-mint-800">{a.time_slot} · {a.patient_name}</p>
                                        <p className="text-xs text-mint-800/60">{a.consultation_type} · {a.patient_phone} · {a.status}</p>
                                    </div>
                                    {a.status === "booked" && (
                                        <div className="flex items-center gap-2">
                                            {a.consultation_type === "online" && (
                                                <button onClick={() => alert("Video consultation (mocked).")} className="btn-pill btn-ghost text-xs"><Video size={12} /> Join</button>
                                            )}
                                            <button onClick={() => setPrescribingFor(a)} className="btn-pill btn-ghost text-xs" data-testid={`prescribe-${a.id}`}><Pill size={12} /> Prescribe</button>
                                            <button onClick={() => markComplete(a.id)} className="btn-pill btn-primary text-xs" data-testid={`complete-${a.id}`}><CheckCircle2 size={12} /> Complete</button>
                                            <button onClick={() => markNoShow(a.id)} className="btn-pill btn-ghost text-xs text-red-600"><X size={12} /> No-show</button>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* WEEKLY AVAILABILITY */}
                <div className="mt-8 glass rounded-2xl p-6" data-testid="availability">
                    <h2 className="editorial text-3xl text-mint-800">Weekly availability</h2>
                    <p className="text-sm text-mint-800/70 mt-1">Add the hours you accept appointments for each weekday.</p>
                    <AvailabilityEditor availability={profile.availability || []} onChange={setAvailability} />
                </div>

                {/* SETTINGS */}
                <div className="mt-8 grid lg:grid-cols-2 gap-6">
                    <div className="glass rounded-2xl p-6" data-testid="online-card">
                        <div className="flex items-center gap-2"><Video size={18} className="text-mint-600" /><h3 className="editorial text-2xl text-mint-800">Online consultation</h3></div>
                        <p className="text-sm text-mint-800/70 mt-1">Toggle to let patients book online video consultations with you.</p>
                        <button onClick={() => toggleOnline(!profile.online_consultation_enabled)}
                            className={`mt-4 btn-pill text-sm ${profile.online_consultation_enabled ? "btn-primary" : "btn-ghost"}`}
                            data-testid="toggle-online">
                            {profile.online_consultation_enabled ? "Enabled" : "Disabled — enable"}
                        </button>
                    </div>
                    <div className="glass rounded-2xl p-6" data-testid="gcal-card">
                        <div className="flex items-center gap-2"><Calendar size={18} className="text-mint-600" /><h3 className="editorial text-2xl text-mint-800">Google Calendar</h3></div>
                        <p className="text-sm text-mint-800/70 mt-1">Sync booked appointments to your Google Calendar automatically.</p>
                        <button onClick={connectGCal} className="mt-4 btn-pill btn-ghost text-sm" data-testid="connect-gcal">
                            <RefreshCw size={14} /> {profile.google_calendar_connected ? "Reconnect Google Calendar" : "Connect Google Calendar"}
                        </button>
                        {profile.google_calendar_connected && <p className="mt-2 text-xs text-mint-600">✓ Connected — appointments sync automatically.</p>}
                    </div>
                </div>

                {/* ALL APPOINTMENTS */}
                <div className="mt-8 glass rounded-2xl p-6" data-testid="all-appts">
                    <h2 className="editorial text-3xl text-mint-800">All appointments</h2>
                    {appts.length === 0 ? <p className="mt-3 text-sm text-mint-800/60">No appointments yet.</p> : (
                        <ul className="mt-4 divide-y divide-mint-100">
                            {appts.map((a) => (
                                <li key={a.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <p className="text-mint-800 font-medium">{a.patient_name} <span className="text-xs text-mint-800/60">· {a.consultation_type}</span></p>
                                        <p className="text-xs text-mint-800/60">{a.date} · {a.time_slot} · {a.status}</p>
                                    </div>
                                    <span className="text-xs rounded-full bg-mint-50 text-mint-700 px-2 py-0.5 capitalize">{a.status}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </section>

            {prescribingFor && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-mint-800/30 backdrop-blur-sm p-4" data-testid="prescribe-modal">
                    <div className="glass-mint rounded-3xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <h3 className="editorial text-2xl text-mint-800">Prescription</h3>
                            <button onClick={() => setPrescribingFor(null)}><X size={18} /></button>
                        </div>
                        <p className="text-sm text-mint-800/70">For {prescribingFor.patient_name}</p>
                        <div className="mt-4 space-y-3">
                            <input value={presForm.diagnosis} onChange={(e) => setPresForm({ ...presForm, diagnosis: e.target.value })} placeholder="Diagnosis"
                                className="w-full rounded-xl border border-mint-100 bg-white/80 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-mint-500" data-testid="pres-diagnosis" />
                            {presForm.medications.map((m, i) => (
                                <div key={i} className="grid grid-cols-2 gap-2">
                                    <input placeholder="Medication" value={m.name} onChange={(e) => { const arr = [...presForm.medications]; arr[i].name = e.target.value; setPresForm({ ...presForm, medications: arr }); }} className="rounded-xl border border-mint-100 bg-white/80 px-3 py-2 text-sm" />
                                    <input placeholder="Dosage" value={m.dosage} onChange={(e) => { const arr = [...presForm.medications]; arr[i].dosage = e.target.value; setPresForm({ ...presForm, medications: arr }); }} className="rounded-xl border border-mint-100 bg-white/80 px-3 py-2 text-sm" />
                                    <input placeholder="Frequency" value={m.frequency} onChange={(e) => { const arr = [...presForm.medications]; arr[i].frequency = e.target.value; setPresForm({ ...presForm, medications: arr }); }} className="rounded-xl border border-mint-100 bg-white/80 px-3 py-2 text-sm" />
                                    <input placeholder="Duration" value={m.duration} onChange={(e) => { const arr = [...presForm.medications]; arr[i].duration = e.target.value; setPresForm({ ...presForm, medications: arr }); }} className="rounded-xl border border-mint-100 bg-white/80 px-3 py-2 text-sm" />
                                </div>
                            ))}
                            <button onClick={() => setPresForm({ ...presForm, medications: [...presForm.medications, { name: "", dosage: "", frequency: "", duration: "" }] })} className="text-xs text-mint-600 hover:underline">+ Add medication</button>
                            <textarea rows={2} placeholder="Additional notes" value={presForm.additional_notes} onChange={(e) => setPresForm({ ...presForm, additional_notes: e.target.value })} className="w-full rounded-xl border border-mint-100 bg-white/80 px-4 py-3 text-sm" />
                            <button onClick={submitPrescription} disabled={!presForm.diagnosis || !presForm.medications[0].name} className="btn-pill btn-primary w-full disabled:opacity-50" data-testid="submit-prescription">
                                Issue & mark complete
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

    const addRow = (day) => setLocal([...local, { day_of_week: day, start_time: "09:00", end_time: "12:00", mode: "both", slot_minutes: 30 }]);
    const removeRow = (i) => setLocal(local.filter((_, idx) => idx !== i));
    const setField = (i, k, v) => { const arr = [...local]; arr[i] = { ...arr[i], [k]: v }; setLocal(arr); };
    const save = () => onChange(local);

    return (
        <div className="mt-4 space-y-4">
            {DAYS.map((dn, dIdx) => {
                const rows = local.map((r, i) => ({ ...r, _i: i })).filter((r) => r.day_of_week === dIdx);
                return (
                    <div key={dn} className="rounded-xl bg-white/50 border border-mint-100 p-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-mint-800">{dn}</p>
                            <button onClick={() => addRow(dIdx)} className="text-xs text-mint-600 hover:underline" data-testid={`add-${dn}`}>+ Add slot</button>
                        </div>
                        {rows.length === 0 ? <p className="text-xs text-mint-800/50 mt-1">— off —</p> : (
                            <div className="mt-2 space-y-2">
                                {rows.map((r) => (
                                    <div key={r._i} className="grid grid-cols-12 items-center gap-2">
                                        <input type="time" value={r.start_time} onChange={(e) => setField(r._i, "start_time", e.target.value)} className="col-span-3 rounded-lg border border-mint-100 bg-white/80 px-2 py-1.5 text-xs" />
                                        <span className="text-xs text-mint-800/60 text-center">to</span>
                                        <input type="time" value={r.end_time} onChange={(e) => setField(r._i, "end_time", e.target.value)} className="col-span-3 rounded-lg border border-mint-100 bg-white/80 px-2 py-1.5 text-xs" />
                                        <select value={r.mode} onChange={(e) => setField(r._i, "mode", e.target.value)} className="col-span-3 rounded-lg border border-mint-100 bg-white/80 px-2 py-1.5 text-xs">
                                            <option value="both">Both</option><option value="offline">In-person</option><option value="online">Online</option>
                                        </select>
                                        <button onClick={() => removeRow(r._i)} className="col-span-1 text-red-600 hover:text-red-700"><X size={14} /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
            <button onClick={save} className="btn-pill btn-primary text-sm" data-testid="save-availability"><Settings size={14} /> Save availability</button>
        </div>
    );
}
