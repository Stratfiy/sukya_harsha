import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import api, { formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Calendar, Plus, Trash2, CheckCircle2, Pill, X } from "lucide-react";

export default function DoctorDashboard() {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [appts, setAppts] = useState([]);
    const [slots, setSlots] = useState([]);
    const [newSlotDate, setNewSlotDate] = useState("");
    const [newSlotTime, setNewSlotTime] = useState("");
    const [error, setError] = useState("");
    const [prescribingFor, setPrescribingFor] = useState(null); // appt
    const [presForm, setPresForm] = useState({ diagnosis: "", medications: "", instructions: "" });

    const load = async () => {
        try {
            const [p, a] = await Promise.all([api.get("/doctors/me/profile"), api.get("/appointments")]);
            setProfile(p.data);
            setSlots(p.data.available_slots || []);
            setAppts(a.data);
        } catch (e) {
            setError(formatApiError(e.response?.data?.detail));
        }
    };
    useEffect(() => { load(); }, []);

    const addSlot = async () => {
        if (!newSlotDate || !newSlotTime) return;
        const iso = new Date(`${newSlotDate}T${newSlotTime}:00`).toISOString();
        if (slots.includes(iso)) return;
        const next = [...slots, iso].sort();
        setSlots(next);
        await api.put("/doctors/me/availability", { available_slots: next });
        setNewSlotDate(""); setNewSlotTime("");
    };

    const removeSlot = async (iso) => {
        const next = slots.filter((s) => s !== iso);
        setSlots(next);
        await api.put("/doctors/me/availability", { available_slots: next });
    };

    const markComplete = async (id) => {
        await api.patch(`/appointments/${id}`, { status: "completed" });
        load();
    };

    const openPrescribe = (a) => {
        setPrescribingFor(a);
        setPresForm({ diagnosis: "", medications: "", instructions: "" });
    };

    const submitPrescription = async () => {
        if (!prescribingFor) return;
        await api.post("/prescriptions", {
            appointment_id: prescribingFor.id,
            patient_id: prescribingFor.patient_id,
            diagnosis: presForm.diagnosis,
            medications: presForm.medications.split(",").map((s) => s.trim()).filter(Boolean),
            instructions: presForm.instructions,
        });
        setPrescribingFor(null);
        await markComplete(prescribingFor.id);
    };

    const upcoming = appts.filter((a) => a.status === "confirmed");

    return (
        <div className="min-h-screen">
            <Navbar />
            <section className="mx-auto max-w-6xl px-6 pt-10 pb-20" data-testid="doctor-dashboard">
                <span className="overline">Doctor dashboard</span>
                <h1 className="editorial mt-2 text-5xl text-mint-800">Hello, <em className="italic text-mint-600">{user?.name}</em></h1>
                {profile && (
                    <p className="mt-2 text-mint-800/70">
                        {profile.specialty} · {profile.hospital} · {profile.approved ? "Approved" : "Pending approval"}
                    </p>
                )}
                {error && <p className="mt-3 text-red-600 text-sm" data-testid="doctor-error">{error}</p>}

                <div className="mt-10 grid lg:grid-cols-3 gap-6">
                    <div className="glass-mint rounded-2xl p-6">
                        <p className="overline">Total appointments</p>
                        <p className="editorial mt-2 text-4xl text-mint-800">{appts.length}</p>
                    </div>
                    <div className="glass-mint rounded-2xl p-6">
                        <p className="overline">Upcoming</p>
                        <p className="editorial mt-2 text-4xl text-mint-800">{upcoming.length}</p>
                    </div>
                    <div className="glass-mint rounded-2xl p-6">
                        <p className="overline">Available slots</p>
                        <p className="editorial mt-2 text-4xl text-mint-800">{slots.length}</p>
                    </div>
                </div>

                {/* Availability */}
                <div className="mt-10 glass rounded-2xl p-6" data-testid="availability-card">
                    <h2 className="editorial text-3xl text-mint-800">Availability</h2>
                    <p className="text-sm text-mint-800/70 mt-1">Add slots that patients can book.</p>

                    <div className="mt-4 flex flex-col sm:flex-row gap-2">
                        <input type="date" value={newSlotDate} onChange={(e) => setNewSlotDate(e.target.value)} className="rounded-xl border border-mint-100 bg-white/80 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-mint-500" data-testid="new-slot-date" />
                        <input type="time" value={newSlotTime} onChange={(e) => setNewSlotTime(e.target.value)} className="rounded-xl border border-mint-100 bg-white/80 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-mint-500" data-testid="new-slot-time" />
                        <button onClick={addSlot} className="btn-pill btn-primary text-sm" data-testid="add-slot-btn"><Plus size={14} /> Add slot</button>
                    </div>

                    {slots.length === 0 ? <p className="mt-4 text-sm text-mint-800/60">No slots yet.</p> : (
                        <div className="mt-5 flex flex-wrap gap-2" data-testid="slot-list">
                            {slots.map((s) => (
                                <span key={s} className="inline-flex items-center gap-2 rounded-full bg-white/70 border border-mint-100 px-3 py-1.5 text-sm">
                                    <Calendar size={12} className="text-mint-600" />
                                    {new Date(s).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                                    <button onClick={() => removeSlot(s)} aria-label="Remove" data-testid={`remove-slot-${s}`}><Trash2 size={12} /></button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Appointments */}
                <div className="mt-8 glass rounded-2xl p-6" data-testid="doctor-appointments">
                    <h2 className="editorial text-3xl text-mint-800">Patients & appointments</h2>
                    {appts.length === 0 ? <p className="mt-4 text-sm text-mint-800/60">No appointments yet.</p> : (
                        <ul className="mt-4 divide-y divide-mint-100">
                            {appts.map((a) => (
                                <li key={a.id} className="py-4 flex flex-wrap items-center justify-between gap-3" data-testid={`doctor-appt-${a.id}`}>
                                    <div>
                                        <p className="editorial text-xl text-mint-800">{a.patient_name}</p>
                                        <p className="text-xs text-mint-800/60">{a.patient_email}</p>
                                        <p className="text-sm text-mint-800/70 mt-0.5">{new Date(a.slot_time).toLocaleString()} · <span className="capitalize">{a.status}</span></p>
                                        {a.reason && <p className="text-xs text-mint-800/70 mt-1 italic">"{a.reason}"</p>}
                                    </div>
                                    {a.status === "confirmed" && (
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => openPrescribe(a)} className="btn-pill btn-ghost text-sm" data-testid={`prescribe-${a.id}`}><Pill size={14} /> Prescribe</button>
                                            <button onClick={() => markComplete(a.id)} className="btn-pill btn-primary text-sm" data-testid={`complete-${a.id}`}><CheckCircle2 size={14} /> Complete</button>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </section>

            {/* Prescribe modal */}
            {prescribingFor && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-mint-800/30 backdrop-blur-sm p-4" data-testid="prescribe-modal">
                    <div className="glass-mint rounded-3xl p-6 w-full max-w-lg">
                        <div className="flex items-center justify-between">
                            <h3 className="editorial text-2xl text-mint-800">Issue prescription</h3>
                            <button onClick={() => setPrescribingFor(null)} aria-label="close"><X size={18} /></button>
                        </div>
                        <p className="mt-1 text-sm text-mint-800/70">for {prescribingFor.patient_name}</p>
                        <div className="mt-4 space-y-3">
                            <input value={presForm.diagnosis} onChange={(e) => setPresForm({ ...presForm, diagnosis: e.target.value })} placeholder="Diagnosis" className="w-full rounded-xl border border-mint-100 bg-white/80 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-mint-500" data-testid="pres-diagnosis" />
                            <input value={presForm.medications} onChange={(e) => setPresForm({ ...presForm, medications: e.target.value })} placeholder="Medications (comma separated)" className="w-full rounded-xl border border-mint-100 bg-white/80 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-mint-500" data-testid="pres-medications" />
                            <textarea rows={3} value={presForm.instructions} onChange={(e) => setPresForm({ ...presForm, instructions: e.target.value })} placeholder="Instructions" className="w-full rounded-xl border border-mint-100 bg-white/80 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-mint-500" data-testid="pres-instructions" />
                            <button onClick={submitPrescription} disabled={!presForm.diagnosis || !presForm.medications} className="btn-pill btn-primary w-full disabled:opacity-50" data-testid="submit-prescription">Issue & mark complete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
