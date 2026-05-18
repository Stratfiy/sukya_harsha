import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import {
    Calendar, FileText, Sparkles, X, Search, Heart,
    Clock, Download, Star, MapPin, Stethoscope,
    ArrowRight, ChevronDown, ChevronUp, Pill, User
} from "lucide-react";

// ─── PDF Generator ────────────────────────────────────────────────────────────
function generatePrescriptionPDF(prescription) {
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<title>Prescription - ${prescription.diagnosis}</title>
<style>
  body{font-family:Georgia,serif;color:#0a2518;margin:0;padding:40px;background:#fff}
  .header{border-bottom:3px solid #1F8A4D;padding-bottom:20px;margin-bottom:30px;display:flex;justify-content:space-between}
  .logo{font-size:28px;color:#0a2518}.logo span{color:#1F8A4D;font-style:italic}
  .meta{text-align:right;font-size:12px;color:#4A6E59}
  .label{font-size:11px;text-transform:uppercase;letter-spacing:.2em;color:#1F8A4D;font-weight:700;margin-bottom:8px;font-family:Arial}
  .diagnosis{font-size:22px;color:#0a2518;margin-bottom:6px}
  .doctor{font-size:13px;color:#4A6E59;margin-bottom:30px}
  .rx{font-size:32px;color:#1F8A4D;font-style:italic;margin-bottom:15px}
  table{width:100%;border-collapse:collapse;margin-bottom:30px}
  th{background:#EEFBF3;padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#4A6E59;font-family:Arial;font-weight:600}
  td{padding:12px;border-bottom:1px solid #EEFBF3;font-size:13px}
  .med{font-weight:600;color:#0a2518}
  .notes{background:#EEFBF3;border-radius:8px;padding:16px;margin-bottom:30px;font-size:13px;color:#4A6E59}
  .sig{border-top:1px solid #0a2518;width:180px;padding-top:6px;font-size:12px;margin-top:40px}
  .warn{font-size:10px;color:#999;margin-top:20px;border-top:1px dashed #ddd;padding-top:12px}
  .foot{border-top:1px solid #D4F5E2;padding-top:20px;font-size:11px;color:#4A6E59;display:flex;justify-content:space-between;margin-top:20px}
</style></head><body>
<div class="header">
  <div><div class="logo">Sukhya <span>Med</span></div><div style="font-size:12px;color:#4A6E59;margin-top:4px">sukhya.com</div></div>
  <div class="meta"><div><strong>Date:</strong> ${new Date(prescription.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})}</div><div><strong>ID:</strong> ${prescription.id.slice(0,8).toUpperCase()}</div></div>
</div>
<div class="label">Diagnosis</div>
<div class="diagnosis">${prescription.diagnosis}</div>
<div class="doctor">Prescribed by <strong>${prescription.doctor_name}</strong></div>
<div class="rx">℞</div>
<table><tr><th>Medication</th><th>Dosage</th><th>Frequency</th><th>Duration</th></tr>
${(prescription.medications||[]).map(m=>`<tr><td class="med">${m.name}</td><td>${m.dosage}</td><td>${m.frequency}</td><td>${m.duration}</td></tr>`).join("")}
</table>
${prescription.additional_notes?`<div class="label">Notes</div><div class="notes">${prescription.additional_notes}</div>`:""}
<div class="sig">${prescription.doctor_name}<br/>Sukhya Med Verified Doctor</div>
<div class="warn">This prescription is valid for the patient on record only. Always consult your doctor before altering any medication.</div>
<div class="foot"><span>© ${new Date().getFullYear()} Sukhya Med</span><span>${new Date(prescription.created_at).toLocaleString("en-IN")}</span></div>
</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prescription-${prescription.id.slice(0,6)}.html`;
    a.click();
    URL.revokeObjectURL(url);
}

function countdown(dateStr, timeStr) {
    const diff = new Date(`${dateStr}T${timeStr}:00`) - new Date();
    if (diff <= 0) return null;
    const d = Math.floor(diff/86400000), h = Math.floor((diff%86400000)/3600000), m = Math.floor((diff%3600000)/60000);
    if (d > 0) return `in ${d}d ${h}h`;
    if (h > 0) return `in ${h}h ${m}m`;
    return `in ${m}m`;
}

function StarRating({ value, onChange }) {
    return (
        <div className="flex gap-1">
            {[1,2,3,4,5].map(n => (
                <button key={n} type="button" onClick={() => onChange(n)}>
                    <Star size={20} fill={n <= value ? "#1F8A4D" : "none"} stroke="#1F8A4D" />
                </button>
            ))}
        </div>
    );
}

// ─── Prescription Card ────────────────────────────────────────────────────────
function PresCard({ p }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="rounded-2xl bg-white/70 border border-mint-100">
            <button onClick={() => setOpen(s => !s)}
                className="w-full flex items-start justify-between gap-3 p-5 text-left">
                <div className="flex-1">
                    <p className="font-medium text-mint-800">{p.diagnosis}
                        {p.is_voided && <span className="ml-2 text-xs text-red-500 border border-red-200 rounded-full px-2 py-0.5">Voided</span>}
                    </p>
                    <p className="text-xs text-mint-800/60 mt-0.5">by {p.doctor_name} · {new Date(p.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</p>
                    <p className="text-xs text-mint-800/50 mt-1 flex items-center gap-1">
                        <Pill size={11} className="text-mint-600" />
                        {(p.medications||[]).map(m => m.name).join(" · ")}
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                    {!p.is_voided && (
                        <button onClick={e => { e.stopPropagation(); generatePrescriptionPDF(p); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-mint-600 text-white text-xs hover:bg-mint-700 transition">
                            <Download size={12} /> Download
                        </button>
                    )}
                    {open ? <ChevronUp size={16} className="text-mint-800/40" /> : <ChevronDown size={16} className="text-mint-800/40" />}
                </div>
            </button>

            {open && (
                <div className="px-5 pb-5 border-t border-mint-100 pt-4">
                    <div className="grid grid-cols-4 gap-2 text-xs font-semibold text-mint-800/40 uppercase tracking-wider mb-2">
                        <span>Medicine</span><span>Dosage</span><span>Frequency</span><span>Duration</span>
                    </div>
                    {(p.medications||[]).map((m,i) => (
                        <div key={i} className="grid grid-cols-4 gap-2 text-xs py-1.5 border-b border-mint-50 last:border-0">
                            <span className="font-medium text-mint-800">{m.name}</span>
                            <span className="text-mint-800/60">{m.dosage}</span>
                            <span className="text-mint-800/60">{m.frequency}</span>
                            <span className="text-mint-800/60">{m.duration}</span>
                        </div>
                    ))}
                    {p.additional_notes && <p className="text-xs text-mint-800/60 italic mt-3 pt-3 border-t border-mint-100">{p.additional_notes}</p>}
                </div>
            )}
        </div>
    );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function PatientDashboard() {
    const { user } = useAuth();
    const [appts, setAppts] = useState([]);
    const [pres, setPres] = useState([]);
    const [favourites, setFavourites] = useState(() => {
        try { return JSON.parse(localStorage.getItem("sm_favourites") || "[]"); } catch { return []; }
    });
    const [ratings, setRatings] = useState(() => {
        try { return JSON.parse(localStorage.getItem("sm_ratings") || "{}"); } catch { return {}; }
    });
    const [ratingForm, setRatingForm] = useState(null);
    const [ratingValue, setRatingValue] = useState(5);
    const [ratingNote, setRatingNote] = useState("");

    const load = () => {
        api.get("/appointments").then(r => setAppts(r.data)).catch(() => {});
        api.get("/prescriptions").then(r => setPres(r.data)).catch(() => {});
    };
    useEffect(() => { load(); }, []);

    const toggleFav = (a) => {
        const exists = favourites.find(f => f.id === a.doctor_id);
        const next = exists ? favourites.filter(f => f.id !== a.doctor_id)
            : [...favourites, { id: a.doctor_id, name: a.doctor_name, spec: a.doctor_specialization }];
        setFavourites(next);
        localStorage.setItem("sm_favourites", JSON.stringify(next));
    };

    const cancel = async (id) => {
        try {
            await api.patch(`/appointments/${id}`, { status: "cancelled", cancellation_reason: "Cancelled by patient" });
            load();
        } catch (e) {
            alert(e.response?.data?.detail || "Could not cancel appointment.");
        }
    };

    const submitRating = (apptId) => {
        const next = { ...ratings, [apptId]: { stars: ratingValue, note: ratingNote, date: new Date().toISOString() } };
        setRatings(next);
        localStorage.setItem("sm_ratings", JSON.stringify(next));
        setRatingForm(null); setRatingNote(""); setRatingValue(5);
    };

    const now = new Date();
    const upcoming = appts
        .filter(a => a.status === "booked" && new Date(`${a.date}T${a.time_slot}:00`) >= now)
        .sort((a,b) => new Date(`${a.date}T${a.time_slot}`) - new Date(`${b.date}T${b.time_slot}`));
    const past = appts.filter(a => a.status !== "booked" || new Date(`${a.date}T${a.time_slot}:00`) < now);

    return (
        <div className="min-h-screen">
            <Navbar />
            <section className="mx-auto max-w-5xl px-6 pt-10 pb-24 space-y-10" data-testid="patient-dashboard">

                {/* ── HEADER ── */}
                <div>
                    <span className="overline">Patient dashboard</span>
                    <h1 className="editorial mt-2 text-5xl text-mint-800">
                        Welcome back, <em className="italic text-mint-600">{user?.full_name?.split(" ")[0]}</em>
                    </h1>
                    <p className="mt-2 text-mint-800/70">Your care, all in one place.</p>
                </div>

                {/* ── REMINDER BANNER ── */}
                {upcoming[0] && countdown(upcoming[0].date, upcoming[0].time_slot) && (
                    <div className="glass-mint rounded-2xl px-5 py-4 flex items-center gap-3">
                        <Clock size={18} className="text-mint-600 flex-shrink-0" />
                        <p className="text-sm text-mint-800">
                            <strong>Next:</strong> {upcoming[0].doctor_name} · {upcoming[0].date} at {upcoming[0].time_slot} —{" "}
                            <span className="text-mint-600 font-semibold">{countdown(upcoming[0].date, upcoming[0].time_slot)}</span>
                        </p>
                    </div>
                )}

                {/* ── QUICK STATS ── */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="glass-mint rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-2"><Calendar size={15} className="text-mint-600" /><p className="overline text-xs">Upcoming</p></div>
                        <p className="editorial text-4xl text-mint-800">{upcoming.length}</p>
                    </div>
                    <div className="glass-mint rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-2"><FileText size={15} className="text-mint-600" /><p className="overline text-xs">Prescriptions</p></div>
                        <p className="editorial text-4xl text-mint-800">{pres.length}</p>
                    </div>
                    <div className="glass-mint rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-2"><Heart size={15} className="text-mint-600" /><p className="overline text-xs">Saved Doctors</p></div>
                        <p className="editorial text-4xl text-mint-800">{favourites.length}</p>
                    </div>
                </div>

                {/* ── SAVED DOCTORS ── */}
                {favourites.length > 0 && (
                    <div className="glass rounded-2xl p-6">
                        <h2 className="editorial text-2xl text-mint-800 mb-4 flex items-center gap-2">
                            <Heart size={16} className="text-mint-600" /> Saved Doctors
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            {favourites.map(f => (
                                <Link key={f.id} to={`/doctors/${f.id}`}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-full glass border border-mint-100 hover:border-mint-500 transition text-sm">
                                    <User size={13} className="text-mint-600" />
                                    <span className="font-medium text-mint-800">{f.name}</span>
                                    <span className="text-mint-800/40 text-xs">{f.spec}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── UPCOMING APPOINTMENTS ── */}
                <div className="glass rounded-2xl p-6" id="appointments" data-testid="upcoming">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="editorial text-3xl text-mint-800">Appointments</h2>
                        <Link to="/find-doctors" className="btn-pill btn-primary text-sm py-2.5 px-5">
                            Book appointment
                        </Link>
                    </div>

                    {/* Upcoming */}
                    {upcoming.length === 0 ? (
                        <div className="py-6 text-center">
                            <Calendar size={28} className="text-mint-200 mx-auto mb-2" />
                            <p className="text-sm text-mint-800/60">No upcoming appointments.</p>
                            <Link to="/find-doctors" className="text-mint-600 text-sm underline mt-1 inline-block">Find a doctor</Link>
                        </div>
                    ) : (
                        <div className="space-y-3 mb-6">
                            {upcoming.map(a => {
                                const isFav = favourites.find(f => f.id === a.doctor_id);
                                const cd = countdown(a.date, a.time_slot);
                                return (
                                    <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-mint-50/60 border border-mint-100"
                                        data-testid={`appt-${a.id}`}>
                                        <div>
                                            <p className="editorial text-xl text-mint-800">{a.doctor_name}</p>
                                            <p className="text-xs text-mint-700 font-medium">{a.doctor_specialization}</p>
                                            <p className="text-sm text-mint-800/70 mt-0.5">{a.date} · {a.time_slot}</p>
                                            {cd && <span className="text-xs text-mint-600 font-semibold">{cd}</span>}
                                            {a.reason && <p className="text-xs text-mint-800/50 italic mt-0.5">"{a.reason}"</p>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => toggleFav(a)}
                                                className={`p-2 rounded-xl transition ${isFav ? "text-mint-600 bg-mint-100" : "text-mint-800/30 hover:text-mint-600 hover:bg-mint-50"}`}
                                                title={isFav ? "Remove from saved" : "Save doctor"}>
                                                <Heart size={15} fill={isFav ? "#1F8A4D" : "none"} />
                                            </button>
                                            <button onClick={() => cancel(a.id)}
                                                className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-red-200 text-red-500 text-xs hover:bg-red-50 transition"
                                                data-testid={`cancel-${a.id}`}>
                                                <X size={12} /> Cancel
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Past / History */}
                    {past.length > 0 && (
                        <>
                            <div className="border-t border-mint-100 pt-5 mt-2">
                                <p className="overline mb-3">History</p>
                                <div className="space-y-2">
                                    {past.slice(0, 8).map(a => (
                                        <div key={a.id} className="py-2.5 border-b border-mint-50 last:border-0">
                                            <div className="flex items-center justify-between flex-wrap gap-2">
                                                <div>
                                                    <p className="text-sm text-mint-800">{a.doctor_name}
                                                        <span className="text-mint-800/50 font-normal"> · {a.doctor_specialization}</span>
                                                    </p>
                                                    <p className="text-xs text-mint-800/50">{a.date} · {a.time_slot} · <span className="capitalize">{a.status}</span></p>
                                                </div>
                                                {a.status === "completed" && !ratings[a.id] && (
                                                    <button onClick={() => { setRatingForm(a.id); setRatingValue(5); setRatingNote(""); }}
                                                        className="text-xs px-3 py-1 rounded-full bg-mint-50 text-mint-600 border border-mint-100 hover:bg-mint-100 transition">
                                                        Rate doctor
                                                    </button>
                                                )}
                                                {ratings[a.id] && (
                                                    <div className="flex items-center gap-0.5">
                                                        {[...Array(ratings[a.id].stars)].map((_,i) => <Star key={i} size={11} fill="#1F8A4D" stroke="#1F8A4D" />)}
                                                    </div>
                                                )}
                                            </div>
                                            {ratingForm === a.id && (
                                                <div className="mt-3 p-4 rounded-xl bg-mint-50 border border-mint-100 space-y-3">
                                                    <p className="text-xs font-semibold text-mint-800">Rate your experience with {a.doctor_name}</p>
                                                    <StarRating value={ratingValue} onChange={setRatingValue} />
                                                    <textarea rows={2} value={ratingNote} onChange={e => setRatingNote(e.target.value)}
                                                        placeholder="Short review (optional)"
                                                        className="w-full rounded-xl border border-mint-100 bg-white/80 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-mint-500 resize-none" />
                                                    <div className="flex gap-2">
                                                        <button onClick={() => submitRating(a.id)} className="btn-pill btn-primary text-xs py-2 px-4">Submit</button>
                                                        <button onClick={() => setRatingForm(null)} className="btn-pill btn-ghost text-xs py-2 px-4">Cancel</button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* ── PRESCRIPTIONS ── */}
                <div className="glass rounded-2xl p-6" id="prescriptions" data-testid="prescriptions">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="editorial text-3xl text-mint-800">Prescriptions</h2>
                        <span className="text-xs text-mint-800/50">{pres.length} total</span>
                    </div>
                    <p className="text-sm text-mint-800/60 mb-5">Click any prescription to expand. Download as a file to share with a pharmacy.</p>
                    {pres.length === 0 ? (
                        <div className="py-8 text-center">
                            <FileText size={28} className="text-mint-200 mx-auto mb-2" />
                            <p className="text-sm text-mint-800/60">Your doctor will issue prescriptions after a consultation.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {pres.map(p => <PresCard key={p.id} p={p} />)}
                        </div>
                    )}
                </div>

                <p className="text-xs text-mint-800/50 flex items-center gap-1.5">
                    <Sparkles size={12} /> Use the AI Health Assistant bubble at the bottom-right for instant guidance.
                </p>

            </section>
        </div>
    );
}
