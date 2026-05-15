import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api from "../lib/api";
import { Search, Star, MapPin, Briefcase, ArrowRight } from "lucide-react";

export default function Doctors() {
    const [doctors, setDoctors] = useState([]);
    const [specialties, setSpecialties] = useState([]);
    const [specialty, setSpecialty] = useState("all");
    const [q, setQ] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get("/doctors/specialties").then((r) => setSpecialties(r.data)).catch(() => {});
    }, []);

    useEffect(() => {
        setLoading(true);
        const params = {};
        if (specialty !== "all") params.specialty = specialty;
        if (q) params.q = q;
        const t = setTimeout(() => {
            api.get("/doctors", { params }).then((r) => setDoctors(r.data)).finally(() => setLoading(false));
        }, 250);
        return () => clearTimeout(t);
    }, [specialty, q]);

    return (
        <div className="min-h-screen">
            <Navbar />
            <section className="mx-auto max-w-7xl px-6 pt-12 pb-20">
                <span className="overline">Find a doctor</span>
                <h1 className="editorial mt-3 text-5xl text-mint-800">
                    Specialists, <em className="italic text-mint-600">curated</em>.
                </h1>
                <p className="mt-3 text-mint-800/70 max-w-xl">Search by name, specialty or hospital. Book in two clicks.</p>

                <div className="mt-8 glass rounded-2xl p-3 flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-4 top-3.5 text-mint-700" />
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Search by name, hospital, or condition…"
                            className="w-full bg-white/70 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-mint-500"
                            data-testid="doctors-search-input"
                        />
                    </div>
                    <select
                        value={specialty}
                        onChange={(e) => setSpecialty(e.target.value)}
                        className="bg-white/70 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-mint-500"
                        data-testid="doctors-specialty-filter"
                    >
                        <option value="all">All specialties</option>
                        {specialties.map((s) => <option key={s}>{s}</option>)}
                    </select>
                </div>

                {loading ? (
                    <div className="mt-12 grid place-items-center text-mint-800/60" data-testid="doctors-loading">Loading…</div>
                ) : (
                    <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="doctors-grid">
                        {doctors.map((d) => (
                            <Link
                                key={d.id}
                                to={`/doctors/${d.id}`}
                                className="glass rounded-2xl p-5 hover:-translate-y-1 transition-transform"
                                data-testid={`doctor-card-${d.id}`}
                            >
                                <div className="flex items-center gap-4">
                                    <img src={d.image_url} alt={d.name} className="h-16 w-16 rounded-xl object-cover" />
                                    <div className="flex-1">
                                        <p className="editorial text-xl text-mint-800 leading-tight">{d.name}</p>
                                        <p className="text-xs text-mint-700 font-medium mt-0.5">{d.specialty}</p>
                                        <div className="flex items-center gap-1 mt-1 text-xs text-mint-800/70">
                                            <Star size={12} fill="#34C472" stroke="#34C472" /> {d.rating} ({d.reviews_count})
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 space-y-1.5 text-xs text-mint-800/70">
                                    <p className="flex items-center gap-1.5"><MapPin size={12} /> {d.hospital}</p>
                                    <p className="flex items-center gap-1.5"><Briefcase size={12} /> {d.experience_years} years experience</p>
                                </div>
                                <div className="mt-4 flex items-center justify-between">
                                    <span className="text-sm font-semibold text-mint-800">₹{d.consultation_fee}</span>
                                    <span className="text-xs text-mint-600 flex items-center gap-1">View profile <ArrowRight size={12} /></span>
                                </div>
                            </Link>
                        ))}
                        {doctors.length === 0 && (
                            <p className="col-span-full text-center text-mint-800/60 py-12" data-testid="doctors-empty">No doctors found matching your search.</p>
                        )}
                    </div>
                )}
            </section>
            <Footer />
        </div>
    );
}
