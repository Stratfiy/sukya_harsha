import { useState, useMemo } from "react";

const today = new Date().toISOString().slice(0, 10);

function nextDays(n) {
  const out = [];
  const d = new Date(); d.setHours(0,0,0,0);
  for (let i = 0; i < n; i++) {
    const c = new Date(d); c.setDate(c.getDate() + i);
    out.push({ iso: `${c.getFullYear()}-${String(c.getMonth()+1).padStart(2,"0")}-${String(c.getDate()).padStart(2,"0")}`, label: c.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) });
  }
  return out;
}

const HOSPITALS = [
  { id: "h1", name: "Apollo Hospitals Navi Mumbai", area: "Nerul", city: "Navi Mumbai", pin: "400706", specialties: ["Cardiology","Neurology","Orthopedics","General Medicine"], doctors: 2, img: "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=600&q=80" },
  { id: "h2", name: "Fortis Hiranandani", area: "Vashi", city: "Navi Mumbai", pin: "400703", specialties: ["Cardiology","Dermatology","Gynecology","Pediatrics"], doctors: 1, img: "https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=600&q=80" },
  { id: "h3", name: "MGM New Bombay Hospital", area: "Koparkhairane", city: "Navi Mumbai", pin: "400709", specialties: ["Pediatrics","General Medicine","ENT","Ophthalmology"], doctors: 2, img: "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=600&q=80" },
  { id: "h4", name: "Cloudnine Panvel", area: "Panvel", city: "Navi Mumbai", pin: "410206", specialties: ["Gynecology","Pediatrics"], doctors: 1, img: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&q=80" },
  { id: "h5", name: "Jupiter Hospital Thane", area: "Thane West", city: "Thane", pin: "400601", specialties: ["Neurology","Psychiatry","Orthopedics","Dentistry"], doctors: 2, img: "https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=600&q=80" },
];

const DOCTORS = [
  { id: "d1", name: "Dr. Aanya Sharma", spec: "Cardiology", hospital_id: "h1", exp: 12, fee: 2200, bio: "Interventional cardiologist focused on preventive cardiology and complex angioplasty.", photo: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&q=80", online: true, slots: { [today]: ["10:00","10:30","11:00","15:00","15:30","16:00"], "2026-05-17": ["10:00","10:30","11:00","11:30","15:00","15:30"] } },
  { id: "d2", name: "Dr. Kabir Singh", spec: "Orthopedics", hospital_id: "h1", exp: 15, fee: 2300, bio: "Orthopedic surgeon specialising in joint replacement and sports injuries.", photo: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=300&q=80", online: false, slots: { [today]: ["10:00","11:00","11:30"], "2026-05-17": ["10:00","10:30","15:00","15:30","16:00"] } },
  { id: "d3", name: "Dr. Rohan Mehta", spec: "Dermatology", hospital_id: "h2", exp: 9, fee: 1800, bio: "Cosmetic and clinical dermatologist. Expert in acne, pigmentation and laser.", photo: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=300&q=80", online: true, slots: { [today]: ["10:00","10:30","15:00"], "2026-05-17": ["10:00","10:30","11:00","15:00","15:30","16:00","16:30"] } },
  { id: "d4", name: "Dr. Priya Iyer", spec: "Pediatrics", hospital_id: "h3", exp: 14, fee: 1500, bio: "Pediatrician with expertise in newborn care, developmental issues and adolescent health.", photo: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=300&q=80", online: true, slots: { [today]: ["10:00","10:30","11:00","15:00","15:30"], "2026-05-17": ["10:00","15:00","15:30","16:00"] } },
  { id: "d5", name: "Dr. Daniel Joseph", spec: "General Medicine", hospital_id: "h3", exp: 8, fee: 1200, bio: "Family physician offering primary care, preventive checks and chronic disease management.", photo: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=300&q=80", online: true, slots: { [today]: ["10:00","10:30","11:00","11:30","15:00","15:30","16:00","16:30"], "2026-05-17": ["10:00","10:30","11:00"] } },
  { id: "d6", name: "Dr. Sara Khan", spec: "Gynecology", hospital_id: "h4", exp: 11, fee: 2000, bio: "Obstetrician & gynecologist specializing in high-risk pregnancies and women's wellness.", photo: "https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=300&q=80", online: true, slots: { [today]: ["10:00","10:30","15:00","15:30"], "2026-05-17": ["10:00","10:30","11:00","15:00","15:30","16:00"] } },
  { id: "d7", name: "Dr. Arjun Kapoor", spec: "Neurology", hospital_id: "h5", exp: 18, fee: 2500, bio: "Senior neurologist treating epilepsy, stroke recovery and movement disorders.", photo: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&q=80", online: false, slots: { [today]: ["10:00","10:30"], "2026-05-17": ["10:00","10:30","11:00","15:00"] } },
  { id: "d8", name: "Dr. Meera Reddy", spec: "Psychiatry", hospital_id: "h5", exp: 10, fee: 1900, bio: "Psychiatrist focused on mood disorders, anxiety and cognitive behavioural therapy.", photo: "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=300&q=80", online: true, slots: { [today]: ["10:00","15:00","15:30","16:00"], "2026-05-17": ["10:00","10:30","15:00","15:30","16:00","16:30","17:00"] } },
];

const AREAS = [...new Set(HOSPITALS.map(h => h.area))];

const MOCK_APPTS = [
  { id: "ma1", doctor_name: "Dr. Aanya Sharma", hospital: "Apollo Hospitals Navi Mumbai", spec: "Cardiology", date: today, time: "15:00", type: "online", status: "booked", photo: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100&q=80" },
  { id: "ma2", doctor_name: "Dr. Priya Iyer", hospital: "MGM New Bombay Hospital", spec: "Pediatrics", date: "2026-05-14", time: "10:30", type: "offline", status: "completed", photo: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=100&q=80" },
];

const MOCK_RX = [
  { id: "rx1", doctor: "Dr. Aanya Sharma", date: "2026-05-14", diagnosis: "Mild hypertension", meds: [{ name: "Amlodipine", dosage: "5mg", freq: "Once daily", dur: "30 days" }] },
];

const STATUS_COLORS = { booked: "bg-[#34C472]/10 text-[#34C472] border border-[#34C472]/20", completed: "bg-[#0A2518]/5 text-[#0A2518]/50", cancelled: "bg-red-50 text-red-500" };

function Icon({ name, size = 18 }) {
  const icons = {
    search: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    pin: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
    arrow: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
    back: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
    calendar: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
    clock: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    video: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>,
    star: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    pill: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m10.5 1.5 3 3L5 13l-3-3z"/><path d="m13.5 4.5 3 3"/><path d="M15.5 2.5a2.12 2.12 0 0 1 3 3L10 14l-3-3z"/></svg>,
    x: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    check: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>,
    building: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M8 10h.01M16 10h.01M12 14h.01M8 14h.01M16 14h.01"/></svg>,
    user: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    briefcase: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>,
  };
  return icons[name] || null;
}

function GlassCard({ children, className = "", ...props }) {
  return <div className={`bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl shadow-[0_8px_32px_rgba(52,196,114,0.08)] ${className}`} {...props}>{children}</div>;
}

export default function PatientDashboard() {
  const [view, setView] = useState("home");
  const [selectedArea, setSelectedArea] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [bookingDate, setBookingDate] = useState(today);
  const [bookingSlot, setBookingSlot] = useState(null);
  const [bookingType, setBookingType] = useState("offline");
  const [bookingReason, setBookingReason] = useState("");
  const [myAppts, setMyAppts] = useState(MOCK_APPTS);
  const [toast, setToast] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };
  const days = useMemo(() => nextDays(7), []);

  const filteredHospitals = HOSPITALS.filter(h => {
    if (selectedArea && h.area !== selectedArea) return false;
    if (searchQ) {
      const q = searchQ.toLowerCase();
      return h.name.toLowerCase().includes(q) || h.area.toLowerCase().includes(q) || h.pin.includes(q);
    }
    return true;
  });

  const hospitalDoctors = selectedHospital ? DOCTORS.filter(d => d.hospital_id === selectedHospital.id) : [];
  const doctorSlots = selectedDoctor?.slots?.[bookingDate] || [];

  const bookAppointment = () => {
    if (!bookingSlot || !selectedDoctor) return;
    const newAppt = {
      id: "ma" + Date.now(), doctor_name: selectedDoctor.name, hospital: HOSPITALS.find(h => h.id === selectedDoctor.hospital_id)?.name,
      spec: selectedDoctor.spec, date: bookingDate, time: bookingSlot, type: bookingType, status: "booked", photo: selectedDoctor.photo,
    };
    setMyAppts(prev => [newAppt, ...prev]);
    setShowConfirmation(newAppt);
    setBookingSlot(null);
    setBookingReason("");
  };

  const cancelAppt = (id) => {
    setMyAppts(prev => prev.map(a => a.id === id ? { ...a, status: "cancelled" } : a));
    showToast("Appointment cancelled");
  };

  const nav = [
    { id: "home", label: "Home" },
    { id: "find", label: "Find Doctors" },
    { id: "appointments", label: "My Appointments" },
    { id: "prescriptions", label: "Prescriptions" },
  ];

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", background: "#FFFFFF", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Outfit:wght@300;400;500;600&display=swap');
        .editorial { font-family: 'Instrument Serif', serif; font-weight: 400; }
        .overline { font-size: 0.7rem; letter-spacing: 0.2em; text-transform: uppercase; font-weight: 700; color: #34C472; }
        .glass { background: rgba(255,255,255,0.6); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.4); }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        .fade-up { animation: fadeUp 0.5s ease-out both; }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        .float { animation: float 5s ease-in-out infinite; }
        .scrollbar-hide::-webkit-scrollbar { display:none; }
        input, select, textarea { font-family: 'Outfit', sans-serif; }
      `}</style>

      {toast && (
        <div className="fixed top-6 right-6 z-50 fade-up">
          <div className="glass rounded-xl px-5 py-3 shadow-lg flex items-center gap-2 text-sm" style={{ color: "#0A2518" }}>
            <span className="w-2 h-2 rounded-full bg-[#34C472]" /> {toast}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-white/30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <h1 className="editorial text-2xl cursor-pointer" style={{ color: "#0A2518" }} onClick={() => { setView("home"); setSelectedDoctor(null); setSelectedHospital(null); }}>Sukhya Med</h1>
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {nav.map(n => (
              <button key={n.id} onClick={() => { setView(n.id); setSelectedDoctor(null); setSelectedHospital(null); }}
                className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-all ${view === n.id ? "bg-[#34C472] text-white" : "hover:bg-[#EEFBF3] text-[#4A6E59]"}`}>
                {n.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-[#34C472]/10 flex items-center justify-center text-[#34C472]"><Icon name="user" size={16} /></div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* ========== HOME ========== */}
        {view === "home" && !selectedDoctor && (
          <div className="space-y-6 fade-up">
            <GlassCard className="p-8 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #EEFBF3 0%, #D4F5E2 50%, #EEFBF3 100%)" }}>
              <div className="relative z-10">
                <span className="overline">Welcome back</span>
                <h2 className="editorial text-4xl sm:text-5xl mt-2" style={{ color: "#0A2518" }}>
                  Hello, <em className="italic text-[#34C472]">Patient</em>
                </h2>
                <p className="mt-2 text-sm max-w-md" style={{ color: "#4A6E59" }}>Your health journey starts here. Find the right doctor, book an appointment, and get care — all in one place.</p>
                <button onClick={() => setView("find")} className="mt-5 px-6 py-3 rounded-full bg-[#34C472] text-white text-sm font-medium flex items-center gap-2 hover:bg-[#2AA760] transition shadow-md">
                  Find a Doctor <Icon name="arrow" size={16} />
                </button>
              </div>
              <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-[#34C472]/10 float" />
              <div className="absolute bottom-4 right-20 w-20 h-20 rounded-full bg-[#34C472]/5 float" style={{ animationDelay: "1s" }} />
            </GlassCard>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <GlassCard className="p-5 cursor-pointer hover:-translate-y-1 transition" onClick={() => setView("appointments")}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#34C472]/10 flex items-center justify-center text-[#34C472]"><Icon name="calendar" /></div>
                  <div>
                    <p className="editorial text-2xl" style={{ color: "#0A2518" }}>{myAppts.filter(a => a.status === "booked").length}</p>
                    <p className="text-xs" style={{ color: "#4A6E59" }}>Upcoming</p>
                  </div>
                </div>
              </GlassCard>
              <GlassCard className="p-5 cursor-pointer hover:-translate-y-1 transition" onClick={() => setView("prescriptions")}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#34C472]/10 flex items-center justify-center text-[#34C472]"><Icon name="pill" /></div>
                  <div>
                    <p className="editorial text-2xl" style={{ color: "#0A2518" }}>{MOCK_RX.length}</p>
                    <p className="text-xs" style={{ color: "#4A6E59" }}>Prescriptions</p>
                  </div>
                </div>
              </GlassCard>
              <GlassCard className="p-5 cursor-pointer hover:-translate-y-1 transition" onClick={() => setView("find")}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#34C472]/10 flex items-center justify-center text-[#34C472]"><Icon name="search" /></div>
                  <div>
                    <p className="editorial text-2xl" style={{ color: "#0A2518" }}>{DOCTORS.length}</p>
                    <p className="text-xs" style={{ color: "#4A6E59" }}>Doctors Available</p>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Upcoming */}
            {myAppts.filter(a => a.status === "booked").length > 0 && (
              <GlassCard className="p-6">
                <h3 className="editorial text-2xl mb-4" style={{ color: "#0A2518" }}>Upcoming Appointments</h3>
                <div className="space-y-3">
                  {myAppts.filter(a => a.status === "booked").map(a => (
                    <div key={a.id} className="flex items-center gap-4 p-4 rounded-xl bg-[#EEFBF3]/50">
                      <img src={a.photo} alt="" className="w-12 h-12 rounded-xl object-cover" />
                      <div className="flex-1">
                        <p className="text-sm font-medium" style={{ color: "#0A2518" }}>{a.doctor_name}</p>
                        <p className="text-xs" style={{ color: "#4A6E59" }}>{a.spec} · {a.hospital}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium" style={{ color: "#0A2518" }}>{new Date(a.date + "T00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                        <p className="text-xs" style={{ color: "#34C472" }}>{a.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}
          </div>
        )}

        {/* ========== FIND DOCTORS ========== */}
        {view === "find" && !selectedHospital && !selectedDoctor && (
          <div className="space-y-6 fade-up">
            <div>
              <span className="overline">Find your doctor</span>
              <h2 className="editorial text-4xl mt-1" style={{ color: "#0A2518" }}>Start with your <em className="italic text-[#34C472]">area</em>.</h2>
              <p className="mt-1 text-sm" style={{ color: "#4A6E59" }}>Pick your neighbourhood — we'll show hospitals and the specialists they trust.</p>
            </div>

            {/* Search */}
            <GlassCard className="p-3 flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-4 top-3.5 text-[#4A6E59]"><Icon name="search" size={16} /></span>
                <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search by hospital, area or pin code…"
                  className="w-full bg-white/70 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#34C472]" />
              </div>
            </GlassCard>

            {/* Area chips */}
            <div>
              <p className="text-xs mb-2" style={{ color: "#4A6E59" }}>Popular areas</p>
              <div className="flex flex-wrap gap-2">
                {selectedArea && (
                  <button onClick={() => setSelectedArea("")} className="px-4 py-2 rounded-full bg-[#34C472] text-white text-sm flex items-center gap-2">
                    <Icon name="pin" size={14} /> {selectedArea} <Icon name="x" size={14} />
                  </button>
                )}
                {AREAS.filter(a => a !== selectedArea).map(a => (
                  <button key={a} onClick={() => setSelectedArea(a)}
                    className="glass px-4 py-2 rounded-full text-sm hover:-translate-y-0.5 transition flex items-center gap-2" style={{ color: "#4A6E59" }}>
                    <Icon name="pin" size={14} /> {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Hospital Grid */}
            <div>
              <h3 className="editorial text-2xl mb-4" style={{ color: "#0A2518" }}>{selectedArea ? `Hospitals in ${selectedArea}` : "All Hospitals"}</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredHospitals.map((h, i) => (
                  <GlassCard key={h.id} className="overflow-hidden cursor-pointer hover:-translate-y-1 transition-transform fade-up" style={{ animationDelay: `${i * 80}ms` }}
                    onClick={() => setSelectedHospital(h)}>
                    <div className="h-36 relative">
                      <img src={h.img} alt={h.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0A2518]/50 to-transparent" />
                      <span className="absolute bottom-3 left-3 text-white text-xs px-2.5 py-1 rounded-full bg-white/20 backdrop-blur">
                        {h.doctors} doctor{h.doctors > 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="p-5">
                      <h4 className="editorial text-xl" style={{ color: "#0A2518" }}>{h.name}</h4>
                      <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "#4A6E59" }}><Icon name="pin" size={12} /> {h.area} · {h.city} · {h.pin}</p>
                      <div className="flex flex-wrap gap-1 mt-3">
                        {h.specialties.slice(0, 3).map(s => (
                          <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-[#EEFBF3] text-[#34C472]">{s}</span>
                        ))}
                        {h.specialties.length > 3 && <span className="text-xs px-2 py-0.5 rounded-full bg-[#EEFBF3] text-[#4A6E59]">+{h.specialties.length - 3}</span>}
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
              {filteredHospitals.length === 0 && <p className="text-center py-12 text-sm" style={{ color: "#4A6E59" }}>No hospitals found in this area.</p>}
            </div>
          </div>
        )}

        {/* ========== HOSPITAL DETAIL (Doctors List) ========== */}
        {view === "find" && selectedHospital && !selectedDoctor && (
          <div className="space-y-6 fade-up">
            <button onClick={() => setSelectedHospital(null)} className="flex items-center gap-2 text-sm hover:underline" style={{ color: "#34C472" }}>
              <Icon name="back" size={16} /> Back to hospitals
            </button>
            <GlassCard className="overflow-hidden">
              <div className="h-48 relative">
                <img src={selectedHospital.img} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A2518]/60 to-transparent" />
                <div className="absolute bottom-4 left-5 text-white">
                  <h2 className="editorial text-3xl">{selectedHospital.name}</h2>
                  <p className="text-xs mt-1 flex items-center gap-1 opacity-80"><Icon name="pin" size={12} /> {selectedHospital.area} · {selectedHospital.city}</p>
                </div>
              </div>
              <div className="p-5 flex flex-wrap gap-2">
                {selectedHospital.specialties.map(s => <span key={s} className="text-xs px-3 py-1 rounded-full bg-[#EEFBF3] text-[#34C472]">{s}</span>)}
              </div>
            </GlassCard>

            <h3 className="editorial text-2xl" style={{ color: "#0A2518" }}>Doctors at {selectedHospital.name}</h3>
            <div className="space-y-4">
              {hospitalDoctors.map((doc, i) => (
                <GlassCard key={doc.id} className="p-5 flex items-start gap-5 cursor-pointer hover:-translate-y-0.5 transition fade-up" style={{ animationDelay: `${i * 80}ms` }}
                  onClick={() => setSelectedDoctor(doc)}>
                  <img src={doc.photo} alt="" className="w-20 h-20 rounded-2xl object-cover flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="editorial text-xl" style={{ color: "#0A2518" }}>{doc.name}</h4>
                        <p className="text-xs mt-0.5" style={{ color: "#4A6E59" }}>{doc.spec} · {doc.exp} years exp</p>
                      </div>
                      <span className="text-sm font-medium" style={{ color: "#34C472" }}>₹{doc.fee}</span>
                    </div>
                    <p className="text-xs mt-2 leading-relaxed" style={{ color: "#4A6E59" }}>{doc.bio}</p>
                    <div className="flex items-center gap-3 mt-3">
                      {doc.online && <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 flex items-center gap-1"><Icon name="video" size={12} /> Online available</span>}
                      <span className="text-xs px-2.5 py-1 rounded-full bg-[#EEFBF3] text-[#34C472]">
                        {(doc.slots[today] || []).length} slots today
                      </span>
                    </div>
                  </div>
                  <div className="self-center text-[#34C472]"><Icon name="arrow" size={20} /></div>
                </GlassCard>
              ))}
            </div>
          </div>
        )}

        {/* ========== DOCTOR PROFILE + BOOKING ========== */}
        {selectedDoctor && (
          <div className="space-y-6 fade-up">
            <button onClick={() => { setSelectedDoctor(null); if (!selectedHospital) setView("find"); }}
              className="flex items-center gap-2 text-sm hover:underline" style={{ color: "#34C472" }}>
              <Icon name="back" size={16} /> Back
            </button>

            {/* Doctor Profile Card */}
            <GlassCard className="p-6">
              <div className="flex flex-col sm:flex-row gap-6">
                <img src={selectedDoctor.photo} alt="" className="w-28 h-28 rounded-2xl object-cover flex-shrink-0" />
                <div className="flex-1">
                  <h2 className="editorial text-3xl" style={{ color: "#0A2518" }}>{selectedDoctor.name}</h2>
                  <p className="text-sm mt-1" style={{ color: "#4A6E59" }}>{selectedDoctor.spec}</p>
                  <div className="flex flex-wrap gap-3 mt-3">
                    <span className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-[#EEFBF3]" style={{ color: "#4A6E59" }}><Icon name="building" size={12} /> {HOSPITALS.find(h => h.id === selectedDoctor.hospital_id)?.name}</span>
                    <span className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-[#EEFBF3]" style={{ color: "#4A6E59" }}><Icon name="briefcase" size={12} /> {selectedDoctor.exp} years</span>
                    {selectedDoctor.online && <span className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600"><Icon name="video" size={12} /> Online Available</span>}
                  </div>
                  <p className="text-sm mt-4 leading-relaxed" style={{ color: "#4A6E59" }}>{selectedDoctor.bio}</p>
                  <p className="mt-3 text-lg font-medium" style={{ color: "#34C472" }}>₹{selectedDoctor.fee} <span className="text-xs font-normal" style={{ color: "#4A6E59" }}>per consultation</span></p>
                </div>
              </div>
            </GlassCard>

            {/* Slot Picker */}
            <GlassCard className="p-6">
              <h3 className="editorial text-2xl mb-4" style={{ color: "#0A2518" }}>Book an Appointment</h3>

              {/* Day selector */}
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-5">
                {days.map(d => (
                  <button key={d.iso} onClick={() => { setBookingDate(d.iso); setBookingSlot(null); }}
                    className={`flex flex-col items-center px-4 py-3 rounded-xl text-xs whitespace-nowrap transition ${
                      bookingDate === d.iso ? "bg-[#34C472] text-white shadow-md" : "glass hover:bg-white/80 text-[#4A6E59]"
                    }`}>
                    <span className="font-medium">{d.label.split(", ")[0] || d.label.split(" ")[0]}</span>
                    <span className="text-lg font-semibold mt-0.5">{d.label.match(/\d+/)?.[0]}</span>
                  </button>
                ))}
              </div>

              {/* Consultation type */}
              {selectedDoctor.online && (
                <div className="flex gap-2 mb-5">
                  {["offline", "online"].map(t => (
                    <button key={t} onClick={() => setBookingType(t)}
                      className={`px-4 py-2 rounded-full text-sm capitalize transition ${
                        bookingType === t ? "bg-[#0A2518] text-white" : "glass text-[#4A6E59]"
                      }`}>
                      {t === "online" && <span className="mr-1">🎥</span>}
                      {t} Consultation
                    </button>
                  ))}
                </div>
              )}

              {/* Slots Grid */}
              <p className="text-xs mb-3" style={{ color: "#4A6E59" }}>Available slots for {new Date(bookingDate + "T00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
              {doctorSlots.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm" style={{ color: "#4A6E59" }}>No available slots on this date.</p>
                  <p className="text-xs mt-1" style={{ color: "#4A6E59" }}>Try another day.</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {doctorSlots.map(slot => (
                    <button key={slot} onClick={() => setBookingSlot(slot)}
                      className={`py-3 rounded-xl text-sm font-medium transition ${
                        bookingSlot === slot ? "bg-[#34C472] text-white shadow-md scale-105" : "bg-[#EEFBF3] hover:bg-[#D4F5E2] text-[#0A2518]"
                      }`}>
                      {slot}
                    </button>
                  ))}
                </div>
              )}

              {/* Reason */}
              {bookingSlot && (
                <div className="mt-5 fade-up">
                  <textarea placeholder="Reason for visit (optional)..." value={bookingReason} onChange={e => setBookingReason(e.target.value)} rows={2}
                    className="w-full px-4 py-3 rounded-xl bg-[#EEFBF3]/50 border border-[#34C472]/20 text-sm focus:outline-none focus:ring-2 focus:ring-[#34C472] resize-none mb-4" />
                  <button onClick={bookAppointment}
                    className="w-full py-3.5 rounded-full bg-[#34C472] text-white font-medium text-sm hover:bg-[#2AA760] transition shadow-md flex items-center justify-center gap-2">
                    <Icon name="check" size={16} /> Confirm Booking — {bookingSlot} on {new Date(bookingDate + "T00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </button>
                </div>
              )}
            </GlassCard>
          </div>
        )}

        {/* ========== MY APPOINTMENTS ========== */}
        {view === "appointments" && !selectedDoctor && (
          <div className="space-y-6 fade-up">
            <div>
              <span className="overline">Your schedule</span>
              <h2 className="editorial text-4xl mt-1" style={{ color: "#0A2518" }}>My Appointments</h2>
            </div>

            {myAppts.filter(a => a.status === "booked").length > 0 && (
              <GlassCard className="p-6">
                <h3 className="editorial text-xl mb-4" style={{ color: "#0A2518" }}>Upcoming</h3>
                <div className="space-y-3">
                  {myAppts.filter(a => a.status === "booked").map((a, i) => (
                    <div key={a.id} className="flex items-center gap-4 p-4 rounded-xl bg-[#EEFBF3]/50 fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                      <img src={a.photo} alt="" className="w-14 h-14 rounded-xl object-cover" />
                      <div className="flex-1">
                        <p className="text-sm font-medium" style={{ color: "#0A2518" }}>{a.doctor_name}</p>
                        <p className="text-xs" style={{ color: "#4A6E59" }}>{a.spec} · {a.hospital}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs flex items-center gap-1" style={{ color: "#0A2518" }}><Icon name="calendar" size={12} /> {new Date(a.date + "T00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                          <span className="text-xs flex items-center gap-1" style={{ color: "#34C472" }}><Icon name="clock" size={12} /> {a.time}</span>
                          {a.type === "online" && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">Online</span>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {a.type === "online" && (
                          <button className="px-3 py-1.5 rounded-full bg-[#34C472] text-white text-xs flex items-center gap-1"><Icon name="video" size={12} /> Join</button>
                        )}
                        <button onClick={() => cancelAppt(a.id)} className="px-3 py-1.5 rounded-full bg-red-50 text-red-500 text-xs">Cancel</button>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}

            <GlassCard className="p-6">
              <h3 className="editorial text-xl mb-4" style={{ color: "#0A2518" }}>Past & Cancelled</h3>
              <div className="space-y-2">
                {myAppts.filter(a => a.status !== "booked").map(a => (
                  <div key={a.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-[#EEFBF3]/30 transition">
                    <img src={a.photo} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    <div className="flex-1">
                      <p className="text-sm" style={{ color: "#0A2518" }}>{a.doctor_name}</p>
                      <p className="text-xs" style={{ color: "#4A6E59" }}>{new Date(a.date + "T00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {a.time}</p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full ${STATUS_COLORS[a.status]}`}>{a.status}</span>
                  </div>
                ))}
                {myAppts.filter(a => a.status !== "booked").length === 0 && <p className="text-sm text-center py-6" style={{ color: "#4A6E59" }}>No past appointments yet.</p>}
              </div>
            </GlassCard>
          </div>
        )}

        {/* ========== PRESCRIPTIONS ========== */}
        {view === "prescriptions" && !selectedDoctor && (
          <div className="space-y-6 fade-up">
            <div>
              <span className="overline">Medical records</span>
              <h2 className="editorial text-4xl mt-1" style={{ color: "#0A2518" }}>My Prescriptions</h2>
            </div>
            {MOCK_RX.map(rx => (
              <GlassCard key={rx.id} className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium" style={{ color: "#0A2518" }}>{rx.doctor}</p>
                    <p className="text-xs" style={{ color: "#4A6E59" }}>{new Date(rx.date + "T00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full bg-[#EEFBF3] text-[#34C472]">Active</span>
                </div>
                <p className="text-xs mb-3" style={{ color: "#4A6E59" }}>Diagnosis: <span className="font-medium" style={{ color: "#0A2518" }}>{rx.diagnosis}</span></p>
                <div className="space-y-2">
                  {rx.meds.map((m, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#EEFBF3]/50">
                      <div className="w-8 h-8 rounded-lg bg-[#34C472]/10 flex items-center justify-center text-[#34C472]"><Icon name="pill" size={14} /></div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: "#0A2518" }}>{m.name} — {m.dosage}</p>
                        <p className="text-xs" style={{ color: "#4A6E59" }}>{m.freq} · {m.dur}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            ))}
            {MOCK_RX.length === 0 && (
              <GlassCard className="p-12 text-center">
                <p className="text-sm" style={{ color: "#4A6E59" }}>No prescriptions yet.</p>
              </GlassCard>
            )}
          </div>
        )}
      </div>

      {/* ========== BOOKING CONFIRMATION MODAL ========== */}
      {showConfirmation && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
          <GlassCard className="w-full max-w-md p-8 text-center fade-up" style={{ background: "rgba(255,255,255,0.95)" }}>
            <div className="w-16 h-16 rounded-full bg-[#34C472] flex items-center justify-center mx-auto mb-4">
              <Icon name="check" size={32} />
            </div>
            <h3 className="editorial text-2xl mb-1" style={{ color: "#0A2518" }}>Appointment Booked!</h3>
            <p className="text-sm mb-5" style={{ color: "#4A6E59" }}>Your appointment has been confirmed.</p>
            <div className="bg-[#EEFBF3] rounded-xl p-4 text-left space-y-2 mb-6">
              <div className="flex justify-between text-sm"><span style={{ color: "#4A6E59" }}>Doctor</span><span className="font-medium" style={{ color: "#0A2518" }}>{showConfirmation.doctor_name}</span></div>
              <div className="flex justify-between text-sm"><span style={{ color: "#4A6E59" }}>Hospital</span><span className="font-medium" style={{ color: "#0A2518" }}>{showConfirmation.hospital}</span></div>
              <div className="flex justify-between text-sm"><span style={{ color: "#4A6E59" }}>Date</span><span className="font-medium" style={{ color: "#0A2518" }}>{new Date(showConfirmation.date + "T00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span></div>
              <div className="flex justify-between text-sm"><span style={{ color: "#4A6E59" }}>Time</span><span className="font-medium" style={{ color: "#34C472" }}>{showConfirmation.time}</span></div>
              <div className="flex justify-between text-sm"><span style={{ color: "#4A6E59" }}>Type</span><span className="font-medium capitalize" style={{ color: "#0A2518" }}>{showConfirmation.type}</span></div>
            </div>
            <button onClick={() => { setShowConfirmation(null); setSelectedDoctor(null); setSelectedHospital(null); setView("appointments"); }}
              className="w-full py-3 rounded-full bg-[#34C472] text-white font-medium text-sm">View My Appointments</button>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
