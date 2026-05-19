import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api, { formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Star, Briefcase, ArrowRight, Building, CalendarCheck, Calendar, Clock } from "lucide-react";

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
    const [reason, setReason] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(null);
    const [booking, setBooking] = useState(false);
    const [existingAppts, setExistingAppts] = useState([]);

    const days = useMemo(() => nextDays(7), []);

    useEffect(() => {
        api.get(`/doctors/${id}`).then((r) => setDoctor(r.data)).catch((e) => setError(formatApiError(e.response?.data?.detail)));
        if (user) {
            api.get("/appointments").then((r) => setExistingAppts(r.data)).catch(() => {});
        }
    }, [id, user]);

    useEffect(() => {
        if (!id || !date) return;
        api.get(`/doctors/${id}/slots`, { params: { date } }).then((r) => {
            setSlotData(r.data);
            setSelectedSlot(null);
        });
    }, [id, date]);

    // Only block the exact selected date — other dates are freely bookable
    const hasBookingOnDate = existingAppts.some(
        (a) => a.status === "booked" && a.date && a.date.slice(0, 10) === date
    );

    const book = async () => {
        setError("");
        if (!user) return nav("/login", { state: { from: `/doctors/${id}` } });
        if (user.role !== "patient") return setError("Only patients can book appointments.");
        if (!selectedSlot) return setError("Please pick a time slot.");

        // Hard guard: re-check live appointments before submitting
        const freshAppts = await api.get("/appointments").then(r => r.data).catch(() => existingAppts);
        setExistingAppts(freshAppts);
        const alreadyBooked = freshAppts.some(a => a.status === "booked" && a.date && a.date.slice(0, 10) === date);
        if (alreadyBooked) return; // banner will show automatically

        setBooking(true);
        try {
            const { data } = await api.post("/appointments", {
                doctor_id: id, date, time_slot: selectedSlot.time,
                consultation_type: "offline",
                reason,
            });
            setSuccess(data);
            setSelectedSlot(null);
            // Refresh both slots AND appointments so the banner triggers immediately
            const [slotsRes, apptsRes] = await Promise.all([
                api.get(`/doctors/${id}/slots`, { params: { date } }),
                api.get("/appointments"),
            ]);
            setSlotData(slotsRes.data);
            setExistingAppts(apptsRes.data);
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
                    {/* Doctor Info Card */}
                    <div className="lg:col-span-1 glass-mint rounded-3xl p-6">
                        <img src={doctor.profile_photo_url} alt={doctor.name} className="w-full h-64 object-cover rounded-2xl" />
                        <h1 className="editorial mt-5 text-3xl text-mint-800">{doctor.name}</h1>
                        <p className="text-sm text-mint-600 font-medium">{doctor.specialization}</p>
                        <div className="mt-4 space-y-2 text-sm text-mint-800/80">
                            <p className="flex items-center gap-2"><Star size={14} fill="#1F8A4D" stroke="#1F8A4D" /> {doctor.rating} · {doctor.reviews_count} reviews</p>
                            <p className="flex items-center gap-2"><Briefcase size={14} /> {doctor.years_of_experience} years experience</p>
                            {doctor.hospital && <p className="flex items-center gap-2"><Building size={14} /> {doctor.hospital.name}, {doctor.hospital.area}</p>}
                            <p className="flex items-center gap-2 text-mint-700">🏥 In-person consultation only</p>
                        </div>
                        <div className="mt-5 pt-4 border-t border-mint-100 flex items-center justify-between">
                            <span className="overline">Consultation fee</span>
                            <span className="editorial text-2xl text-mint-800">₹{doctor.consultation_fee}</span>
                        </div>
                    </div>

                    {/* Booking Card */}
                    <div className="lg:col-span-2 glass rounded-3xl p-6">
                        <span className="overline">About</span>
                        <p className="mt-2 text-mint-800/80 leading-relaxed">{doctor.bio}</p>

                        <div className="mt-8 flex items-center gap-2">
                            <CalendarCheck size={18} className="text-mint-600" />
                            <h2 className="editorial text-2xl text-mint-800">Pick a date & slot</h2>
                        </div>

                        {/* Date strip */}
                        <div className="mt-4 flex gap-2 overflow-x-auto pb-2" data-testid="date-strip">
                            {days.map((d) => (
                                <button key={d.iso} onClick={() => setDate(d.iso)}
                                    className={`min-w-[110px] rounded-2xl px-4 py-3 text-sm transition border ${date === d.iso ? "bg-mint-600 text-white border-mint-600" : "bg-white/70 text-mint-800 border-mint-100 hover:border-mint-600"}`}
                                    data-testid={`date-${d.iso}`}>
                                    {d.label}
                                </button>
                            ))}
                        </div>

                        {/* Slots */}
                        {slotData.slots.length === 0 ? (
                            <p className="mt-4 text-sm text-mint-800/60" data-testid="no-slots">No slots available on this day. Try another date.</p>
                        ) : (
                            <div className="mt-4 flex flex-wrap gap-2" data-testid="slot-grid">
                                {slotData.slots.filter((s) => {
                                    // Hide slots that have already passed today (IST = UTC+5:30)
                                    const IST_MS = 5.5 * 60 * 60 * 1000;
                                    const nowIST = new Date(Date.now() + IST_MS);
                                    const todayIST = nowIST.toISOString().slice(0, 10);
                                    if (date !== todayIST) return true;
                                    const [h, m] = s.time.split(":").map(Number);
                                    const slotMins = h * 60 + m;
                                    const nowMins = nowIST.getUTCHours() * 60 + nowIST.getUTCMinutes();
                                    return slotMins > nowMins;
                                }).map((s) => {
                                    const active = selectedSlot?.time === s.time;
                                    return (
                                        <button key={s.time} onClick={() => setSelectedSlot(s)}
                                            className={`rounded-full px-4 py-2 text-sm transition border ${active ? "bg-mint-600 text-white border-mint-600 shadow" : "bg-white/70 text-mint-800 border-mint-100 hover:border-mint-600"}`}
                                            data-testid={`slot-${s.time}`}>
                                            {s.time}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Reason */}
                        <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)}
                            placeholder="Reason for visit (optional)"
                            className="mt-5 w-full rounded-xl border border-mint-100 bg-white/80 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-mint-600"
                            data-testid="booking-reason" />

                        {error && <p className="mt-3 text-sm text-red-600" data-testid="booking-error">{error}</p>}
                        {success && (
                            <div className="mt-4 rounded-xl bg-mint-50 border border-mint-100 px-4 py-3 text-sm text-mint-800" data-testid="booking-success">
                                ✓ Appointment booked with {success.doctor_name} on {success.date} at {success.time_slot}.{" "}
                                <Link to="/patient/dashboard" className="text-mint-600 font-medium underline">View in dashboard</Link>
                            </div>
                        )}

                        {hasBookingOnDate ? (
                            <div className="mt-6 glass-mint rounded-2xl px-5 py-4 flex items-center gap-4 border border-mint-200" data-testid="booking-limit-banner">
                                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-mint-600/10 flex items-center justify-center">
                                    <Calendar size={18} className="text-mint-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-mint-800">Slot already booked for this day</p>
                                    <p className="text-xs text-mint-800/60 mt-0.5">
                                        You can only book one appointment per day. Choose another date above, or{" "}
                                        <Link to="/patient/dashboard" className="text-mint-600 font-medium underline">view your booking</Link>.
                                    </p>
                                </div>
                                <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-mint-600/10 text-mint-600 text-xs font-medium">
                                    <Clock size={11} /> 1 per day
                                </div>
                            </div>
                        ) : (
                            <button onClick={book} disabled={booking || !selectedSlot}
                                className="mt-6 btn-pill btn-primary disabled:opacity-50"
                                data-testid="book-btn">
                                {booking ? "Booking…" : <>Book in-person consultation <ArrowRight size={18} /></>}
                            </button>
                        )}
                    </div>
                </div>
            </section>
            <Footer />
        </div>
    );
}
