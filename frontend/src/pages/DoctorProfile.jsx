import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api, { formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Star, MapPin, Briefcase, Languages, CalendarCheck, ArrowRight } from "lucide-react";

function groupSlotsByDay(slots) {
    const map = new Map();
    slots.forEach((iso) => {
        const d = new Date(iso);
        const key = d.toDateString();
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(iso);
    });
    return Array.from(map.entries()).map(([day, items]) => ({ day, items }));
}

export default function DoctorProfile() {
    const { id } = useParams();
    const { user } = useAuth();
    const nav = useNavigate();
    const [doctor, setDoctor] = useState(null);
    const [error, setError] = useState("");
    const [selectedSlot, setSelectedSlot] = useState("");
    const [reason, setReason] = useState("");
    const [booking, setBooking] = useState(false);
    const [success, setSuccess] = useState(null);

    useEffect(() => {
        api.get(`/doctors/${id}`).then((r) => setDoctor(r.data)).catch((e) => setError(formatApiError(e.response?.data?.detail)));
    }, [id]);

    const days = useMemo(() => doctor ? groupSlotsByDay(doctor.available_slots || []) : [], [doctor]);

    const book = async () => {
        setError("");
        if (!user) return nav("/login", { state: { from: `/doctors/${id}` } });
        if (user.role !== "patient") return setError("Only patients can book appointments.");
        if (!selectedSlot) return setError("Please pick a time slot.");
        setBooking(true);
        try {
            const { data } = await api.post("/appointments", { doctor_id: id, slot_time: selectedSlot, reason });
            setSuccess(data);
            setSelectedSlot("");
            const r = await api.get(`/doctors/${id}`);
            setDoctor(r.data);
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
                <Link to="/doctors" className="text-sm text-mint-600 hover:underline" data-testid="doctor-back">← Back to doctors</Link>

                <div className="mt-6 grid lg:grid-cols-3 gap-8">
                    {/* Profile */}
                    <div className="lg:col-span-1 glass-mint rounded-3xl p-6">
                        <img src={doctor.image_url} alt={doctor.name} className="w-full h-64 object-cover rounded-2xl" />
                        <h1 className="editorial mt-5 text-3xl text-mint-800">{doctor.name}</h1>
                        <p className="text-sm text-mint-600 font-medium">{doctor.specialty}</p>
                        <div className="mt-4 space-y-2 text-sm text-mint-800/80">
                            <p className="flex items-center gap-2"><Star size={14} fill="#34C472" stroke="#34C472" /> {doctor.rating} · {doctor.reviews_count} reviews</p>
                            <p className="flex items-center gap-2"><MapPin size={14} /> {doctor.hospital}</p>
                            <p className="flex items-center gap-2"><Briefcase size={14} /> {doctor.experience_years} years experience</p>
                            <p className="flex items-center gap-2"><Languages size={14} /> {(doctor.languages || []).join(", ")}</p>
                        </div>
                        <div className="mt-5 pt-4 border-t border-mint-100 flex items-center justify-between">
                            <span className="overline">Consultation</span>
                            <span className="editorial text-2xl text-mint-800">₹{doctor.consultation_fee}</span>
                        </div>
                    </div>

                    {/* Booking */}
                    <div className="lg:col-span-2 glass rounded-3xl p-6">
                        <span className="overline">About</span>
                        <p className="mt-2 text-mint-800/80 leading-relaxed">{doctor.bio}</p>

                        <div className="mt-8">
                            <div className="flex items-center gap-2"><CalendarCheck size={18} className="text-mint-600" /><h2 className="editorial text-2xl text-mint-800">Pick a slot</h2></div>

                            {days.length === 0 ? (
                                <p className="mt-4 text-sm text-mint-800/60" data-testid="no-slots">No available slots right now. Please check back soon.</p>
                            ) : (
                                <div className="mt-5 space-y-5" data-testid="slot-grid">
                                    {days.map((d) => (
                                        <div key={d.day}>
                                            <p className="text-xs font-semibold text-mint-800/70 uppercase tracking-wider">
                                                {new Date(d.day).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
                                            </p>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {d.items.map((iso) => {
                                                    const t = new Date(iso);
                                                    const label = t.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
                                                    const active = selectedSlot === iso;
                                                    return (
                                                        <button
                                                            key={iso}
                                                            onClick={() => setSelectedSlot(iso)}
                                                            className={`rounded-full px-4 py-2 text-sm transition border ${active ? "bg-mint-500 text-white border-mint-500 shadow" : "bg-white/70 text-mint-800 border-mint-100 hover:border-mint-500"}`}
                                                            data-testid={`slot-${iso}`}
                                                        >
                                                            {label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mt-6">
                            <label className="block">
                                <span className="text-xs font-medium text-mint-800/80">Reason for visit (optional)</span>
                                <textarea
                                    rows={2}
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="A short note for the doctor…"
                                    className="mt-1.5 w-full rounded-xl border border-mint-100 bg-white/80 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-mint-500"
                                    data-testid="booking-reason-input"
                                />
                            </label>
                        </div>

                        {error && <p className="mt-3 text-sm text-red-600" data-testid="booking-error">{error}</p>}
                        {success && (
                            <div className="mt-4 rounded-xl bg-mint-50 border border-mint-100 px-4 py-3 text-sm text-mint-800" data-testid="booking-success">
                                ✓ Appointment confirmed with {success.doctor_name} on{" "}
                                {new Date(success.slot_time).toLocaleString()}.{" "}
                                <Link to="/dashboard/patient" className="text-mint-600 font-medium underline">View in dashboard</Link>
                            </div>
                        )}

                        <button
                            onClick={book}
                            disabled={booking || !selectedSlot}
                            className="mt-6 btn-pill btn-primary disabled:opacity-50"
                            data-testid="book-consultation-btn"
                        >
                            {booking ? "Booking…" : (<>Book consultation <ArrowRight size={18} /></>)}
                        </button>
                    </div>
                </div>
            </section>
            <Footer />
        </div>
    );
}
