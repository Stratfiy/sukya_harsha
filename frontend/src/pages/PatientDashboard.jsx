import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import {
    Calendar, FileText, Sparkles, X, Search, Heart,
    Clock, User, Download, Star, Activity, MapPin,
    ChevronDown, ChevronUp, AlertCircle, Pill, Stethoscope,
    ArrowRight, LogOut, Menu, Home
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// ─── PDF Generator ────────────────────────────────────────────────────────────
function generatePrescriptionPDF(prescription) {
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<title>Prescription - ${prescription.diagnosis}</title>
<style>
  body{font-family:Georgia,serif;color:#0a2518;margin:0;padding:40px;background:#fff}
  .header{border-bottom:3px solid #1F8A4D;padding-bottom:20px;margin-bottom:30px;display:flex;justify-content:space-between;align-items:flex-start}
  .logo{font-size:28px;font-weight:400;color:#0a2518}.logo span{color:#1F8A4D;font-style:italic}
  .meta{text-align:right;font-size:12px;color:#4A6E59}
  .section-title{font-size:11px;text-transform:uppercase;letter-spacing:.2em;color:#1F8A4D;font-weight:700;margin-bottom:8px;font-family:Arial,sans-serif}
  .diagnosis{font-size:22px;font-weight:400;color:#0a2518;margin-bottom:6px}
  .doctor-info{font-size:13px;color:#4A6E59;margin-bottom:30px}
  .rx{font-size:32px;color:#1F8A4D;font-style:italic;margin-bottom:15px}
  .med-table{width:100%;border-collapse:collapse;margin-bottom:30px}
  .med-table th{background:#EEFBF3;padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#4A6E59;font-family:Arial,sans-serif;font-weight:600}
  .med-table td{padding:12px;border-bottom:1px solid #EEFBF3;font-size:13px}
  .med-name{font-weight:600;color:#0a2518}
  .notes-box{background:#EEFBF3;border-radius:8px;padding:16px;margin-bottom:30px;font-size:13px;color:#4A6E59}
  .sig-line{border-top:1px solid #0a2518;width:180px;padding-top:6px;font-size:12px;color:#0a2518;margin-top:40px}
  .warning{font-size:10px;color:#999;margin-top:20px;border-top:1px dashed #ddd;padding-top:12px}
  .footer{border-top:1px solid #D4F5E2;padding-top:20px;font-size:11px;color:#4A6E59;display:flex;justify-content:space-between}
</style></head><body>
<div class="header">
  <div><div class="logo">Sukhya <span>Med</span></div><div style="font-size:12px;color:#4A6E59;margin-top:4px">sukhya.com · hello@sukhya.com</div></div>
  <div class="meta"><div><strong>Date:</strong> ${new Date(prescription.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})}</div><div><strong>ID:</strong> ${prescription.id.slice(0,8).toUpperCase()}</div></div>
</div>
<div class="section-title">Diagnosis</div>
<div class="diagnosis">${prescription.diagnosis}</div>
<div class="doctor-info">Prescribed by <strong>${prescription.doctor_name}</strong></div>
<div class="rx">℞</div>
<table class="med-table">
  <tr><th>Medication</th><th>Dosage</th><th>Frequency</th><th>Duration</th></tr>
  ${(prescription.medications||[]).map(m=>`<tr><td class="med-name">${m.name}</td><td>${m.dosage}</td><td>${m.frequency}</td><td>${m.duration}</td></tr>`).join("")}
</table>
${prescription.additional_notes?`<div class="section-title">Notes</div><div class="notes-box">${prescription.additional_notes}</div>`:""}
<div class="sig-line">${prescription.doctor_name}<br/>Sukhya Med Verified Doctor</div>
<div class="warning">This prescription is valid for the patient on record only. Always consult your doctor before altering any medication.</div>
<div class="footer"><span>© ${new Date().getFullYear()} Sukhya Med</span><span>${new Date(prescription.created_at).toLocaleString("en-IN")}</span></div>
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
    const target = new Date(`${dateStr}T${timeStr}:00`);
    const diff = target - new Date();
    if (diff <= 0) return null;
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (days > 0) return `in ${days}d ${hours}h`;
    if (hours > 0) return `in ${hours}h ${mins}m`;
    return `in ${mins}m`;
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

// ─── Patient Nav ──────────────────────────────────────────────────────────────
function PatientNav({ tab, setTab, user }) {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);

    const navItems = [
        { id: "home", label: "Dashboard", icon: Home },
        { id: "find", label: "Find Doctors", icon: Search },
        { id: "appointments", label: "Appointments", icon: Calendar },
        { id: "prescriptions", label: "Prescriptions", icon: FileText },
    ];

    const handleLogout = async () => { await logout(); navigate("/"); };

    return (
        <header className="sticky top-0 z-50 w-full border-b border-mint-100/60 bg-white/70 backdrop-blur-xl">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
                <button onClick={() => setTab("home")} className="flex items-center gap-2.5">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-mint-600 text-white shadow-[0_4px_18px_rgba(31,138,77,0.4)]">
                        <Activity size={18} strokeWidth={2.4} />
                    </div>
                    <span className="editorial text-2xl text-mint-800">Sukhya Med</span>
                </button>

                {/* Desktop nav */}
                <nav className="hidden md:flex items-center gap-1">
                    {navItems.map(item => (
                        <button key={item.id} onClick={() => setTab(item.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition ${tab === item.id ? "bg-mint-600 text-white" : "text-mint-800/70 hover:text-mint-800 hover:bg-mint-50"}`}>
                            <item.icon size={15} /> {item.label}
                        </button>
                    ))}
                </nav>

                {/* User + logout */}
                <div className="hidden md:flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl glass text-sm text-mint-800">
                        <div className="w-7 h-7 rounded-full bg-mint-600 text-white flex items-center justify-center text-xs font-semibold">
                            {user?.full_name?.[0] || "P"}
                        </div>
                        <span>{user?.full_name?.split(" ")[0]}</span>
                    </div>
                    <button onClick={handleLogout} className="p-2 rounded-xl text-mint-800/50 hover:bg-red-50 hover:text-red-500 transition">
                        <LogOut size={18} />
                    </button>
                </div>

                {/* Mobile hamburger */}
                <button onClick={() => setMobileOpen(m => !m)} className="md:hidden p-2 rounded-xl hover:bg-mint-50 text-mint-800">
                    <Menu size={22} />
                </button>
            </div>

            {/* Mobile dropdown */}
            {mobileOpen && (
                <div className="md:hidden border-t border-mint-100/60 bg-white/95 backdrop-blur-xl px-6 py-4 space-y-1">
                    {navItems.map(item => (
                        <button key={item.id} onClick={() => { setTab(item.id); setMobileOpen(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition ${tab === item.id ? "bg-mint-600 text-white" : "text-mint-800/70 hover:bg-mint-50"}`}>
                            <item.icon size={16} /> {item.label}
                        </button>
                    ))}
                    <button onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-600 hover:bg-red-50 transition">
                        <LogOut size={16} /> Sign out
                    </button>
                </div>
            )}
        </header>
    );
}

// ─── Prescription Card ────────────────────────────────────────────────────────
function PresCard({ p }) {
    const [expanded, setExpanded] = useState(false);
    return (
        <div className="rounded-2xl bg-white/70 border border-mint-100 p-5">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="font-medium text-mint-800">{p.diagnosis}
                        {p.is_voided && <span className="ml-2 text-xs text-red-500 border border-red-200 rounded-full px-2 py-0.5">Voided</span>}
                    </p>
                    <p className="text-xs text-mint-800/60 mt-0.5">by {p.doctor_name} · {new Date(p.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</p>
                    <p className="text-xs text-mint-800/60 mt-1">
                        <Pill size={11} className="inline mr-1 text-mint-600" />
                        {(p.medications||[]).map(m=>`${m.name} ${m.dosage}`).join(" · ")}
                    </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                    {!p.is_voided && (
                        <button onClick={() => generatePrescriptionPDF(p)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-mint-600 text-white text-xs hover:bg-mint-700 transition shadow-sm">
                            <Download size={12} /> Download
                        </button>
                    )}
                    <button onClick={() => setExpanded(s => !s)} className="p-1.5 rounded-lg text-mint-800/50 hover:bg-mint-50">
                        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>
            </div>
            {expanded && (
                <div className="mt-4 space-y-2 border-t border-mint-100 pt-4">
                    <div className="grid grid-cols-4 gap-2 text-xs font-semibold text-mint-800/50 uppercase tracking-wider">
                        <span>Medicine</span><span>Dosage</span><span>Frequency</span><span>Duration</span>
                    </div>
                    {(p.medications||[]).map((m,i) => (
                        <div key={i} className="grid grid-cols-4 gap-2 text-xs">
                            <span className="font-medium text-mint-800">{m.name}</span>
                            <span className="text-mint-800/60">{m.dosage}</span>
                            <span className="text-mint-800/60">{m.frequency}</span>
                            <span className="text-mint-800/60">{m.duration}</span>
                        </div>
                    ))}
                    {p.additional_notes && <p className="text-xs text-mint-800/60 italic mt-2 pt-2 border-t border-mint-100">{p.additional_notes}</p>}
                </div>
            )}
        </div>
    );
}

// ─── Find Doctors Panel ───────────────────────────────────────────────────────
function FindDoctorsPanel() {
    const [areas, setAreas] = useState([]);
    const [hospitals, setHospitals] = useState([]);
    const [selectedArea, setSelectedArea] = useState("");
    const [q, setQ] = useState("");
    const [specialty, setSpecialty] = useState("");
    const [specialties, setSpecialties] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        api.get("/areas").then(r => setAreas(r.data)).catch(() => {});
        api.get("/specialties").then(r => setSpecialties(r.data)).catch(() => {});
    }, []);

    useEffect(() => {
        setLoading(true);
        const params = {};
        if (selectedArea) params.area = selectedArea;
        if (q) params.q = q;
        if (specialty) params.specialty = specialty;
        const t = setTimeout(() => {
            api.get("/hospitals", { params }).then(r => setHospitals(r.data)).finally(() => setLoading(false));
        }, 200);
        return () => clearTimeout(t);
    }, [selectedArea, q, specialty]);

    const popularAreas = useMemo(() => areas.slice(0, 8), [areas]);

    return (
        <div>
            <span className="overline">Find your doctor</span>
            <h2 className="editorial mt-2 text-4xl text-mint-800">Start with your <em className="italic text-mint-600">area</em>.</h2>
            <p className="mt-2 text-mint-800/70 text-sm max-w-xl">Pick your neighbourhood — we'll show hospitals and the specialists they trust.</p>

            <div className="mt-6 glass rounded-2xl p-3 flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-4 top-3.5 text-mint-700" />
                    <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by hospital, area or pin code…"
                        className="w-full bg-white/70 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-mint-500" />
                </div>
                <select value={specialty} onChange={e => setSpecialty(e.target.value)}
                    className="bg-white/70 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-mint-500">
                    <option value="">All specialties</option>
                    {specialties.map(s => <option key={s}>{s}</option>)}
                </select>
            </div>

            {!selectedArea ? (
                <div className="mt-6">
                    <p className="text-sm text-mint-800/70 mb-3">Popular areas</p>
                    <div className="flex flex-wrap gap-2">
                        {popularAreas.map(a => (
                            <button key={`${a.area}-${a.city}`} onClick={() => setSelectedArea(a.area)}
                                className="glass rounded-full px-4 py-2 text-sm hover:-translate-y-0.5 transition flex items-center gap-2">
                                <MapPin size={14} className="text-mint-600" /> {a.area} · <span className="text-mint-800/60">{a.city}</span>
                                <span className="text-xs text-mint-700 ml-1">({a.hospital_count})</span>
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="mt-5 flex items-center gap-3">
                    <span className="rounded-full bg-mint-600 text-white text-xs px-3 py-1.5">Area: {selectedArea}</span>
                    <button onClick={() => setSelectedArea("")} className="text-xs text-mint-600 hover:underline">Change area</button>
                </div>
            )}

            <div className="mt-8">
                <h3 className="editorial text-2xl text-mint-800">{selectedArea ? `Hospitals in ${selectedArea}` : "All hospitals"}</h3>
                {loading ? <p className="mt-6 text-mint-800/60">Loading…</p> : (
                    <div className="mt-5 grid sm:grid-cols-2 gap-5">
                        {hospitals.map(h => (
                            <Link key={h.id} to={`/hospitals/${h.id}`}
                                className="glass rounded-2xl overflow-hidden hover:-translate-y-1 transition-transform">
                                <div className="h-32 w-full relative">
                                    <img src={h.image_url} alt={h.name} className="absolute inset-0 w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-mint-800/40 to-transparent" />
                                </div>
                                <div className="p-4">
                                    <p className="editorial text-lg text-mint-800 leading-tight">{h.name}</p>
                                    <p className="text-xs text-mint-800/60 mt-0.5 flex items-center gap-1"><MapPin size={11} /> {h.area} · {h.city} · {h.pin_code}</p>
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {(h.specialties_available||[]).slice(0,3).map(s => (
                                            <span key={s} className="rounded-full bg-mint-50 text-mint-700 text-xs px-2 py-0.5">{s}</span>
                                        ))}
                                    </div>
                                    <div className="mt-3 flex items-center justify-between text-sm">
                                        <span className="flex items-center gap-1 text-mint-800/70"><Stethoscope size={13} /> {h.doctor_count} doctors</span>
                                        <span className="text-mint-600 font-medium flex items-center gap-1">View <ArrowRight size={13} /></span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                        {hospitals.length === 0 && (
                            <p className="col-span-full text-center text-mint-800/60 py-10">
                                No hospitals found. <button onClick={() => { setSelectedArea(""); setQ(""); setSpecialty(""); }} className="text-mint-600 underline">Reset filters</button>
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PatientDashboard() {
    const { user } = useAuth();
    const [appts, setAppts] = useState([]);
    const [pres, setPres] = useState([]);
    const [tab, setTab] = useState("home");
    const [ratings, setRatings] = useState(() => {
        try { return JSON.parse(localStorage.getItem("sm_ratings") || "{}"); } catch { return {}; }
    });
    const [ratingForm, setRatingForm] = useState(null);
    const [ratingValue, setRatingValue] = useState(5);
    const [ratingNote, setRatingNote] = useState("");
    const [favourites, setFavourites] = useState(() => {
        try { return JSON.parse(localStorage.getItem("sm_favourites") || "[]"); } catch { return []; }
    });

    const submitRating = (apptId) => {
        const next = { ...ratings, [apptId]: { stars: ratingValue, note: ratingNote, date: new Date().toISOString() } };
        setRatings(next);
        localStorage.setItem("sm_ratings", JSON.stringify(next));
        setRatingForm(null); setRatingNote(""); setRatingValue(5);
    };

    const toggleFav = (a) => {
        const exists = favourites.find(f => f.id === a.doctor_id);
        const next = exists ? favourites.filter(f => f.id !== a.doctor_id)
            : [...favourites, { id: a.doctor_id, name: a.doctor_name, spec: a.doctor_specialization }];
        setFavourites(next);
        localStorage.setItem("sm_favourites", JSON.stringify(next));
    };

    const load = () => {
        api.get("/appointments").then(r => setAppts(r.data)).catch(() => {});
        api.get("/prescriptions").then(r => setPres(r.data)).catch(() => {});
    };
    useEffect(() => { load(); }, []);

    const cancel = async (id) => {
        await api.patch(`/appointments/${id}`, { status: "cancelled", cancellation_reason: "Cancelled by patient" });
        load();
    };

    const now = new Date();
    const upcoming = appts
        .filter(a => a.status === "booked" && new Date(`${a.date}T${a.time_slot}:00`) >= now)
        .sort((a, b) => new Date(`${a.date}T${a.time_slot}`) - new Date(`${b.date}T${b.time_slot}`));
    const past = appts.filter(a => a.status !== "booked" || new Date(`${a.date}T${a.time_slot}:00`) < now);

    return (
        <div className="min-h-screen">
            <PatientNav tab={tab} setTab={setTab} user={user} />

            <section className="mx-auto max-w-6xl px-6 pt-8 pb-24" data-testid="patient-dashboard">

                {/* ── HOME ── */}
                {tab === "home" && (
                    <div className="space-y-6">
                        <div>
                            <span className="overline">Patient dashboard</span>
                            <h1 className="editorial mt-2 text-5xl text-mint-800">
                                Welcome back, <em className="italic text-mint-600">{user?.full_name?.split(" ")[0]}</em>
                            </h1>
                            <p className="mt-2 text-mint-800/70">Your care, all in one place.</p>
                        </div>

                        {/* Reminder */}
                        {upcoming[0] && (() => {
                            const cd = countdown(upcoming[0].date, upcoming[0].time_slot);
                            return cd ? (
                                <div className="glass-mint rounded-2xl px-5 py-3.5 flex items-center gap-3">
                                    <Clock size={18} className="text-mint-600 flex-shrink-0" />
                                    <p className="text-sm text-mint-800">
                                        <strong>Next appointment:</strong> {upcoming[0].doctor_name} · {upcoming[0].date} at {upcoming[0].time_slot} —{" "}
                                        <span className="text-mint-600 font-semibold">{cd}</span>
                                    </p>
                                </div>
                            ) : null;
                        })()}

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-4">
                            <button onClick={() => setTab("find")} className="glass-mint rounded-2xl p-5 text-left hover:-translate-y-1 transition">
                                <div className="flex items-center gap-2 mb-2"><Search size={16} className="text-mint-600" /><p className="overline text-xs">Find Doctor</p></div>
                                <p className="editorial text-2xl text-mint-800">Explore</p>
                            </button>
                            <button onClick={() => setTab("appointments")} className="glass-mint rounded-2xl p-5 text-left hover:-translate-y-1 transition">
                                <div className="flex items-center gap-2 mb-2"><Calendar size={16} className="text-mint-600" /><p className="overline text-xs">Upcoming</p></div>
                                <p className="editorial text-3xl text-mint-800">{upcoming.length}</p>
                            </button>
                            <button onClick={() => setTab("prescriptions")} className="glass-mint rounded-2xl p-5 text-left hover:-translate-y-1 transition">
                                <div className="flex items-center gap-2 mb-2"><FileText size={16} className="text-mint-600" /><p className="overline text-xs">Prescriptions</p></div>
                                <p className="editorial text-3xl text-mint-800">{pres.length}</p>
                            </button>
                        </div>

                        {/* Favourites */}
                        {favourites.length > 0 && (
                            <div className="glass rounded-2xl p-6">
                                <h2 className="editorial text-2xl text-mint-800 mb-4 flex items-center gap-2"><Heart size={16} className="text-mint-600" /> Saved Doctors</h2>
                                <div className="flex flex-wrap gap-2">
                                    {favourites.map(f => (
                                        <Link key={f.id} to={`/doctors/${f.id}`}
                                            className="flex items-center gap-2 px-4 py-2.5 rounded-full glass border border-mint-100 hover:border-mint-500 transition text-sm">
                                            <User size={13} className="text-mint-600" />
                                            <span className="font-medium text-mint-800">{f.name}</span>
                                            <span className="text-mint-800/50 text-xs">{f.spec}</span>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Upcoming appointments */}
                        <div className="glass rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="editorial text-2xl text-mint-800">Upcoming appointments</h2>
                                <button onClick={() => setTab("find")} className="btn-pill btn-primary text-sm py-2">Book appointment</button>
                            </div>
                            {upcoming.length === 0
                                ? <p className="text-sm text-mint-800/60">No upcoming appointments. <button onClick={() => setTab("find")} className="text-mint-600 underline">Find a doctor</button>.</p>
                                : upcoming.map(a => (
                                    <div key={a.id} className="py-4 border-b border-mint-100/60 last:border-0 flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <p className="editorial text-xl text-mint-800">{a.doctor_name}</p>
                                            <p className="text-xs text-mint-700">{a.doctor_specialization}</p>
                                            <p className="text-sm text-mint-800/70 mt-0.5">{a.date} · {a.time_slot}</p>
                                            {countdown(a.date, a.time_slot) && <span className="text-xs text-mint-600 font-medium">{countdown(a.date, a.time_slot)}</span>}
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => toggleFav(a)} className={`p-2 rounded-xl transition ${favourites.find(f=>f.id===a.doctor_id) ? "text-mint-600 bg-mint-50" : "text-mint-800/30 hover:text-mint-600 hover:bg-mint-50"}`}>
                                                <Heart size={15} fill={favourites.find(f=>f.id===a.doctor_id) ? "#1F8A4D" : "none"} />
                                            </button>
                                            <button onClick={() => cancel(a.id)} className="btn-pill btn-ghost text-sm text-red-600 py-1.5 px-3">
                                                <X size={13} /> Cancel
                                            </button>
                                        </div>
                                    </div>
                                ))
                            }
                        </div>

                        {/* Prescriptions on Home */}
                        {pres.length > 0 && (
                            <div className="glass rounded-2xl p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="editorial text-2xl text-mint-800">Recent prescriptions</h2>
                                    <button onClick={() => setTab("prescriptions")} className="text-xs text-mint-600 hover:underline">View all</button>
                                </div>
                                <div className="space-y-3">{pres.slice(0,2).map(p => <PresCard key={p.id} p={p} />)}</div>
                            </div>
                        )}

                        <p className="text-xs text-mint-800/50 flex items-center gap-1.5">
                            <Sparkles size={12} /> Use the AI Health Assistant bubble at the bottom-right for instant guidance.
                        </p>
                    </div>
                )}

                {/* ── FIND DOCTORS ── */}
                {tab === "find" && <FindDoctorsPanel />}

                {/* ── APPOINTMENTS ── */}
                {tab === "appointments" && (
                    <div className="space-y-6">
                        <div>
                            <span className="overline">Schedule</span>
                            <h2 className="editorial mt-2 text-4xl text-mint-800">My Appointments</h2>
                        </div>

                        <div className="glass rounded-2xl p-6">
                            <h3 className="editorial text-2xl text-mint-800 mb-4">Upcoming</h3>
                            {upcoming.length === 0
                                ? <p className="text-sm text-mint-800/60">No upcoming appointments. <button onClick={() => setTab("find")} className="text-mint-600 underline">Find a doctor</button>.</p>
                                : upcoming.map(a => (
                                    <div key={a.id} className="py-4 border-b border-mint-100/60 last:border-0 flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <p className="editorial text-xl text-mint-800">{a.doctor_name}</p>
                                            <p className="text-xs text-mint-700 font-medium">{a.doctor_specialization}</p>
                                            <p className="text-sm text-mint-800/70 mt-0.5">{a.date} · {a.time_slot}</p>
                                            {countdown(a.date, a.time_slot) && <span className="text-xs text-mint-600 font-medium">{countdown(a.date, a.time_slot)}</span>}
                                            {a.reason && <p className="text-xs text-mint-800/50 italic mt-0.5">"{a.reason}"</p>}
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => toggleFav(a)} className={`p-2 rounded-xl transition ${favourites.find(f=>f.id===a.doctor_id) ? "text-mint-600 bg-mint-50" : "text-mint-800/30 hover:text-mint-600"}`}>
                                                <Heart size={15} fill={favourites.find(f=>f.id===a.doctor_id) ? "#1F8A4D" : "none"} />
                                            </button>
                                            <button onClick={() => cancel(a.id)} className="btn-pill btn-ghost text-sm text-red-600 py-1.5 px-3"><X size={13} /> Cancel</button>
                                        </div>
                                    </div>
                                ))
                            }
                        </div>

                        <div className="glass rounded-2xl p-6">
                            <h3 className="editorial text-2xl text-mint-800 mb-4">History</h3>
                            {past.length === 0
                                ? <p className="text-sm text-mint-800/60">No past appointments yet.</p>
                                : past.map(a => (
                                    <div key={a.id} className="py-3 border-b border-mint-100/60 last:border-0">
                                        <div className="flex items-center justify-between flex-wrap gap-2">
                                            <div>
                                                <p className="text-sm font-medium text-mint-800">{a.doctor_name} <span className="text-mint-800/50 font-normal">· {a.doctor_specialization}</span></p>
                                                <p className="text-xs text-mint-800/60">{a.date} · {a.time_slot} · <span className="capitalize">{a.status}</span></p>
                                            </div>
                                            <div className="flex gap-2 items-center">
                                                {a.status === "completed" && !ratings[a.id] && (
                                                    <button onClick={() => { setRatingForm(a.id); setRatingValue(5); setRatingNote(""); }}
                                                        className="text-xs px-3 py-1.5 rounded-full bg-mint-50 text-mint-600 border border-mint-100 hover:bg-mint-100">
                                                        Rate
                                                    </button>
                                                )}
                                                {ratings[a.id] && (
                                                    <div className="flex items-center gap-0.5">
                                                        {[...Array(ratings[a.id].stars)].map((_,i) => <Star key={i} size={11} fill="#1F8A4D" stroke="#1F8A4D" />)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {ratingForm === a.id && (
                                            <div className="mt-3 p-4 rounded-xl bg-mint-50 space-y-3">
                                                <p className="text-xs font-semibold text-mint-800">Rate {a.doctor_name}</p>
                                                <StarRating value={ratingValue} onChange={setRatingValue} />
                                                <textarea rows={2} value={ratingNote} onChange={e => setRatingNote(e.target.value)}
                                                    placeholder="Short review (optional)"
                                                    className="w-full rounded-xl border border-mint-100 bg-white/80 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-mint-500 resize-none" />
                                                <div className="flex gap-2">
                                                    <button onClick={() => submitRating(a.id)} className="btn-pill btn-primary text-xs py-2">Submit</button>
                                                    <button onClick={() => setRatingForm(null)} className="btn-pill btn-ghost text-xs py-2">Cancel</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                )}

                {/* ── PRESCRIPTIONS ── */}
                {tab === "prescriptions" && (
                    <div className="space-y-5">
                        <div>
                            <span className="overline">Medical records</span>
                            <h2 className="editorial mt-2 text-4xl text-mint-800">My Prescriptions</h2>
                            <p className="text-sm text-mint-800/60 mt-1">Download any prescription as a file to share with a pharmacy.</p>
                        </div>
                        <div className="space-y-4">
                            {pres.length === 0
                                ? (
                                    <div className="glass rounded-2xl p-10 text-center">
                                        <FileText size={32} className="text-mint-200 mx-auto mb-3" />
                                        <p className="text-sm text-mint-800/60">No prescriptions yet. Your doctor will issue them after a consultation.</p>
                                    </div>
                                )
                                : pres.map(p => <PresCard key={p.id} p={p} />)
                            }
                        </div>
                    </div>
                )}

            </section>
        </div>
    );
}
