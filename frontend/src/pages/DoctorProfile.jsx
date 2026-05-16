import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api, { formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Star, Briefcase, ArrowRight, Video, Building, CalendarCheck } from "lucide-react";

function nextDays(n) {
    const out = [];
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    for (let i = 0; i < n; i++) {
        const d = new Date(base);
        d.setDate(d.getDate() + i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        out.push({ iso: `${yyyy}-${mm}-${dd}`, label: d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) });
    }
    return out;
}

export default function DoctorProfile() {
    const { id } = useParams();
    const { user } = useAuth();
    const nav = useNavigate();
    const [doctor, setDoctor] = useState(null);
    const [date, setDate] = useState(nextDays(1)[0].iso);
    const [slotData, setSlotData] = useState({ slots: [] });
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [consultationType, setConsultationType] = useState("offline");
    const [reason, setReason] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(null);
    const [booking, setBooking] = useState(false);

    const days = useMemo(() => nextDays(7), []);

    useEffect(() => {
        api.get(`/doctors/${id}`).then((r) => setDoctor(r.data)).catch((e) => setError(formatApiError(e.response?.data?.detail)));
    }, [id]);

    useEffect(() => {
        if (!id || !date) return;
        api.get(`/doctors/${id}/slots`, { params: { date } }).then((r) => {
            setSlotData(r.data);
            setSelectedSlot(null);
        });
    }, [id, date]);

    const book = async () => {
        setError("");
        if (!user) return nav("/login", { state: { from: `/doctors/${id}` } });
        if (user.role !== "patient") return setError("Only patients can book appointments.");
        if (!selectedSlot) return setError("Please pick a time slot.");
        setBooking(true);
        try {
            const { data } = await api.post("/appointments", {
                doctor_id: id, date, time_slot: selectedSlot.time, consultation_type: consultationType, reason,
            });
            setSuccess(data);
            setSelectedSlot(null);
            const r = await api.get(`/doctors/${id}/slots`, { params: { date } });
            setSlotData(r.data);
        } catch (e) {
            setError(formatApiError(e.response?.data?.detail));
        } finally {
            setBooking(false);
        }
    };

    if (!doctor) {
        return (
            <div className="min-h-screen">
                <Navbar />
                <div className="mx-auto max-w-3xl px-6 py-20 text-center">
                    {error ? <p className="text-red-600">{error}</p> : <p className="text-mint-800/60">Loading…</p>}
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <Navbar />
            <section className="mx-auto max-w-6xl px-6 pt-10 pb-20">
                <Link to="/find-doctors" className="text-sm text-mint-600 hover:underline" data-testid="doctor-back">← Back</Link>

                <div className="mt-6 grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 glass-mint rounded-3xl p-6">
                        <img src={doctor.profile_photo_url} alt={doctor.name} className="w-full h-64 object-cover rounded-2xl" />
                        <h1 className="editorial mt-5 text-3xl text-mint-800">{doctor.name}</h1>
                        <p className="text-sm text-mint-600 font-medium">{doctor.specialization}</p>
                        <div className="mt-4 space-y-2 text-sm text-mint-800/80">
                            <p className="flex items-center gap-2"><Star size={14} fill="#34C472" stroke="#34C472" /> {doctor.rating} · {doctor.reviews_count} reviews</p>
                            <p className="flex items-center gap-2"><Briefcase size={14} /> {doctor.years_of_experience} years experience</p>
                            {doctor.hospital && <p className="flex items-center gap-2"><Building size={14} /> {doctor.hospital.name}, {doctor.hospital.area}</p>}
                            {doctor.online_consultation_enabled && <p className="flex items-center gap-2 text-mint-600"><Video size={14} /> Online consultation available</p>}
                        </div>
                        <div className="mt-5 pt-4 border-t border-mint-100 flex items-center justify-between">
                            <span className="overline">Consultation</span>
                            <span className="editorial text-2xl text-mint-800">₹{doctor.consultation_fee}</span>
                        </div>
                    </div>

                    <div className="lg:col-span-2 glass rounded-3xl p-6">
                        <span className="overline">About</span>
                        <p className="mt-2 text-mint-800/80 leading-relaxed">{doctor.bio}</p>

                        <div className="mt-8 flex items-center gap-2"><CalendarCheck size={18} className="text-mint-600" /><h2 className="editorial text-2xl text-mint-800">Pick a date & slot</h2></div>

                        <div className="mt-4 flex gap-2 overflow-x-auto pb-2" data-testid="date-strip">
                            {days.map((d) => (
                                <button key={d.iso} onClick={() => setDate(d.iso)}
                                    className={`min-w-[110px] rounded-2xl px-4 py-3 text-sm transition border ${date === d.iso ? "bg-mint-500 text-white border-mint-500" : "bg-white/70 text-mint-800 border-mint-100 hover:border-mint-500"}`}
                                    data-testid={`date-${d.iso}`}>
                                    {d.label}
                                </button>
                            ))}
                        </div>

                        {slotData.slots.length === 0 ? (
                            <p className="mt-4 text-sm text-mint-800/60" data-testid="no-slots">No slots available on this day.</p>
                        ) : (
                            <div className="mt-4 flex flex-wrap gap-2" data-testid="slot-grid">
                                {slotData.slots.map((s) => {
                                    const active = selectedSlot?.time === s.time;
                                    return (
                                        <button key={s.time} onClick={() => setSelectedSlot(s)}
                                            className={`rounded-full px-4 py-2 text-sm transition border ${active ? "bg-mint-500 text-white border-mint-500 shadow" : "bg-white/70 text-mint-800 border-mint-100 hover:border-mint-500"}`}
                                            data-testid={`slot-${s.time}`}>
                                            {s.time}<span className="ml-1 text-[10px] uppercase opacity-70">{s.mode}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {doctor.online_consultation_enabled && (
                            <div className="mt-6">
                                <p className="overline mb-2">Consultation type</p>
                                <div className="flex gap-2" data-testid="consult-toggle">
                                    {["offline", "online"].map((t) => (
                                        <button key={t} onClick={() => setConsultationType(t)}
                                            className={`rounded-full px-4 py-2 text-sm transition border ${consultationType === t ? "bg-mint-500 text-white border-mint-500" : "bg-white/70 border-mint-100"}`}
                                            data-testid={`consult-${t}`}>
                                            {t === "online" ? "Online" : "In-person"}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for visit (optional)"
                            className="mt-5 w-full rounded-xl border border-mint-100 bg-white/80 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-mint-500"
                            data-testid="booking-reason" />

                        {error && <p className="mt-3 text-sm text-red-600" data-testid="booking-error">{error}</p>}
                        {success && (
                            <div className="mt-4 rounded-xl bg-mint-50 border border-mint-100 px-4 py-3 text-sm text-mint-800" data-testid="booking-success">
                                ✓ Booked with {success.doctor_name} on {success.date} at {success.time_slot}.{" "}
                                <Link to="/patient/dashboard" className="text-mint-600 font-medium underline">View in dashboard</Link>
                            </div>
                        )}

                        <button onClick={book} disabled={booking || !selectedSlot} className="mt-6 btn-pill btn-primary disabled:opacity-50" data-testid="book-btn">
                            {booking ? "Booking…" : <>Book consultation <ArrowRight size={18} /></>}
                        </button>
                    </div>
                </div>
            </section>
            <Footer />
        </div>
    );
}
