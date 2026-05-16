import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Calendar, FileText, Sparkles, Video, X, Search } from "lucide-react";

export default function PatientDashboard() {
    const { user } = useAuth();
    const [appts, setAppts] = useState([]);
    const [pres, setPres] = useState([]);

    const load = () => {
        api.get("/appointments").then((r) => setAppts(r.data)).catch(() => {});
        api.get("/prescriptions").then((r) => setPres(r.data)).catch(() => {});
    };
    useEffect(() => { load(); }, []);

    const cancel = async (id) => {
        await api.patch(`/appointments/${id}`, { status: "cancelled", cancellation_reason: "Cancelled by patient" });
        load();
    };

    const now = new Date();
    const upcoming = appts.filter((a) => a.status === "booked" && new Date(`${a.date}T${a.time_slot}:00`) >= now);
    const past = appts.filter((a) => a.status !== "booked" || new Date(`${a.date}T${a.time_slot}:00`) < now);

    return (
        <div className="min-h-screen">
            <Navbar />
            <section className="mx-auto max-w-6xl px-6 pt-10 pb-20" data-testid="patient-dashboard">
                <span className="overline">Patient dashboard</span>
                <h1 className="editorial mt-2 text-5xl text-mint-800">Welcome, <em className="italic text-mint-600">{user?.full_name?.split(" ")[0]}</em></h1>
                <p className="mt-2 text-mint-800/70">Your care, all in one place.</p>

                <div className="mt-10 grid lg:grid-cols-3 gap-6">
                    <Link to="/find-doctors" className="glass-mint rounded-2xl p-6 hover:-translate-y-1 transition" data-testid="quick-find">
                        <div className="flex items-center gap-2"><Search size={18} className="text-mint-600" /><p className="overline">Find a doctor</p></div>
                        <p className="editorial mt-2 text-2xl text-mint-800">Start a new visit</p>
                        <p className="text-sm text-mint-800/70 mt-1">Search by area → hospital → doctor.</p>
                    </Link>
                    <div className="glass-mint rounded-2xl p-6">
                        <div className="flex items-center gap-2"><Calendar size={18} className="text-mint-600" /><p className="overline">Upcoming</p></div>
                        <p className="editorial mt-2 text-4xl text-mint-800">{upcoming.length}</p>
                    </div>
                    <div className="glass-mint rounded-2xl p-6">
                        <div className="flex items-center gap-2"><FileText size={18} className="text-mint-600" /><p className="overline">Prescriptions</p></div>
                        <p className="editorial mt-2 text-4xl text-mint-800">{pres.length}</p>
                    </div>
                </div>

                <div className="mt-10 glass rounded-2xl p-6" data-testid="upcoming">
                    <div className="flex items-center justify-between">
                        <h2 className="editorial text-3xl text-mint-800">Upcoming appointments</h2>
                        <Link to="/find-doctors" className="btn-pill btn-primary text-sm">Book another</Link>
                    </div>
                    {upcoming.length === 0 ? <p className="mt-4 text-sm text-mint-800/60">No upcoming appointments. <Link to="/find-doctors" className="text-mint-600 underline">Find a doctor</Link>.</p> : (
                        <ul className="mt-5 divide-y divide-mint-100">
                            {upcoming.map((a) => (
                                <li key={a.id} className="py-4 flex flex-wrap items-center justify-between gap-3" data-testid={`appt-${a.id}`}>
                                    <div>
                                        <p className="editorial text-xl text-mint-800">{a.doctor_name}</p>
                                        <p className="text-xs text-mint-700 font-medium">{a.doctor_specialization} · <span className="capitalize">{a.consultation_type}</span></p>
                                        <p className="text-sm text-mint-800/70 mt-0.5">{a.date} · {a.time_slot}</p>
                                        {a.reason && <p className="text-xs text-mint-800/60 italic mt-0.5">"{a.reason}"</p>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {a.consultation_type === "online" && (
                                            <button onClick={() => alert("Video consultation will open here (mocked).")} className="btn-pill btn-ghost text-sm" data-testid={`join-${a.id}`}>
                                                <Video size={14} /> Join
                                            </button>
                                        )}
                                        <button onClick={() => cancel(a.id)} className="btn-pill btn-ghost text-sm text-red-600" data-testid={`cancel-${a.id}`}>
                                            <X size={14} /> Cancel
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="mt-8 grid lg:grid-cols-2 gap-6">
                    <div className="glass rounded-2xl p-6" data-testid="history">
                        <h2 className="editorial text-2xl text-mint-800">History</h2>
                        {past.length === 0 ? <p className="mt-3 text-sm text-mint-800/60">No past appointments.</p> : (
                            <ul className="mt-4 divide-y divide-mint-100">
                                {past.slice(0, 6).map((a) => (
                                    <li key={a.id} className="py-3">
                                        <p className="text-sm text-mint-800">{a.doctor_name} <span className="text-mint-800/60">· {a.doctor_specialization}</span></p>
                                        <p className="text-xs text-mint-800/60">{a.date} · {a.time_slot} · <span className="capitalize">{a.status}</span></p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div className="glass rounded-2xl p-6" data-testid="prescriptions">
                        <h2 className="editorial text-2xl text-mint-800">Prescriptions</h2>
                        {pres.length === 0 ? <p className="mt-3 text-sm text-mint-800/60">Prescriptions issued by your doctors will appear here.</p> : (
                            <ul className="mt-4 space-y-3">
                                {pres.map((p) => (
                                    <li key={p.id} className="rounded-xl bg-white/70 border border-mint-100 p-3">
                                        <p className="text-sm font-medium text-mint-800">{p.diagnosis}{p.is_voided && <span className="ml-2 text-xs text-red-600">VOIDED</span>}</p>
                                        <p className="text-xs text-mint-800/60">by {p.doctor_name} · {new Date(p.created_at).toLocaleDateString()}</p>
                                        <p className="text-xs text-mint-800/80 mt-1">{(p.medications || []).map((m) => `${m.name} (${m.dosage} • ${m.frequency})`).join(", ")}</p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                <p className="mt-10 text-xs text-mint-800/50 flex items-center gap-1.5">
                    <Sparkles size={12} /> Open the AI Health Assistant bubble at the bottom-right for instant guidance.
                </p>
            </section>
        </div>
    );
}
