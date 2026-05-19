import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api from "../lib/api";
import { Search, MapPin, Hospital as HospitalIcon, ArrowRight, Stethoscope } from "lucide-react";

export default function FindDoctors() {
    const [areas, setAreas] = useState([]);
    const [hospitals, setHospitals] = useState([]);
    const [selectedArea, setSelectedArea] = useState("");
    const [q, setQ] = useState("");
    const [specialty, setSpecialty] = useState("");
    const [specialties, setSpecialties] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        api.get("/areas").then((r) => setAreas(r.data)).catch(() => {});
        api.get("/specialties").then((r) => setSpecialties(r.data)).catch(() => {});
    }, []);

    useEffect(() => {
        setLoading(true);
        const params = {};
        if (selectedArea) params.area = selectedArea;
        if (q) params.q = q;
        if (specialty) params.specialty = specialty;
        const t = setTimeout(() => {
            api.get("/hospitals", { params }).then((r) => setHospitals(r.data)).finally(() => setLoading(false));
        }, 200);
        return () => clearTimeout(t);
    }, [selectedArea, q, specialty]);

    const popularAreas = useMemo(() => areas.slice(0, 8), [areas]);

    return (
        <div className="min-h-screen">
            <Navbar />
            <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-8 sm:pt-12 pb-20">
                <span className="overline">Find your doctor</span>
                <h1 className="editorial mt-3 text-3xl sm:text-5xl text-mint-800">
                    Start with your <em className="italic text-mint-600">area</em>.
                </h1>
                <p className="mt-3 text-mint-800/70 max-w-xl">Pick your neighbourhood — we'll show hospitals and the specialists they trust.</p>

                <div className="mt-8 glass rounded-2xl p-3 flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-4 top-3.5 text-mint-700" />
                        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by hospital, area or pin code…"
                            className="w-full bg-white/70 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-mint-500"
                            data-testid="find-search" />
                    </div>
                    <select value={specialty} onChange={(e) => setSpecialty(e.target.value)}
                        className="bg-white/70 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-mint-500 w-full sm:w-auto" data-testid="find-specialty">
                        <option value="">All specialties</option>
                        {specialties.map((s) => <option key={s}>{s}</option>)}
                    </select>
                </div>

                {/* Areas chips */}
                {!selectedArea && (
                    <div className="mt-8" data-testid="area-section">
                        <p className="text-sm text-mint-800/70 mb-3">Popular areas</p>
                        <div className="flex flex-wrap gap-2">
                            {popularAreas.map((a) => (
                                <button key={`${a.area}-${a.city}`} onClick={() => setSelectedArea(a.area)}
                                    className="glass rounded-full px-4 py-2 text-sm hover:-translate-y-0.5 transition flex items-center gap-2"
                                    data-testid={`area-chip-${a.area}`}>
                                    <MapPin size={14} className="text-mint-600" /> {a.area} · <span className="text-mint-800/60">{a.city}</span>
                                    <span className="text-xs text-mint-700 ml-1">({a.hospital_count})</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {selectedArea && (
                    <div className="mt-6 flex items-center gap-3" data-testid="area-selected">
                        <span className="rounded-full bg-mint-500 text-white text-xs px-3 py-1.5">Area: {selectedArea}</span>
                        <button onClick={() => setSelectedArea("")} className="text-xs text-mint-600 hover:underline" data-testid="clear-area">Change area</button>
                    </div>
                )}

                {/* Hospitals grid */}
                <div className="mt-8">
                    <h2 className="editorial text-2xl sm:text-3xl text-mint-800">
                        {selectedArea ? `Hospitals in ${selectedArea}` : "All hospitals"}
                    </h2>
                    {loading ? <p className="mt-6 text-mint-800/60">Loading…</p> : (
                        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="hospital-grid">
                            {hospitals.map((h) => (
                                <Link key={h.id} to={`/hospitals/${h.id}`}
                                    className="glass rounded-2xl overflow-hidden hover:-translate-y-1 transition-transform"
                                    data-testid={`hospital-card-${h.id}`}>
                                    <div className="h-32 sm:h-36 w-full relative">
                                        <img src={h.image_url} alt={h.name} className="absolute inset-0 w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-mint-800/40 to-transparent" />
                                    </div>
                                    <div className="p-5">
                                        <p className="editorial text-xl text-mint-800 leading-tight">{h.name}</p>
                                        <p className="text-xs text-mint-800/60 mt-0.5 flex items-center gap-1"><MapPin size={12} /> {h.area} · {h.city} · {h.pin_code}</p>
                                        <div className="mt-3 flex flex-wrap gap-1.5">
                                            {(h.specialties_available || []).slice(0, 3).map((s) => (
                                                <span key={s} className="rounded-full bg-mint-50 text-mint-700 text-xs px-2 py-0.5">{s}</span>
                                            ))}
                                        </div>
                                        <div className="mt-4 flex items-center justify-between text-sm">
                                            <span className="flex items-center gap-1 text-mint-800/70"><Stethoscope size={14} /> {h.doctor_count} doctors</span>
                                            <span className="text-mint-600 font-medium flex items-center gap-1">View doctors <ArrowRight size={14} /></span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                            {hospitals.length === 0 && (
                                <p className="col-span-full text-center text-mint-800/60 py-10" data-testid="hospital-empty">
                                    No hospitals match your filters. <button onClick={() => { setSelectedArea(""); setQ(""); setSpecialty(""); }} className="text-mint-600 underline">Reset filters</button>.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </section>
            <Footer />
        </div>
    );
}
