import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api from "../lib/api";
import { MapPin, Phone, Stethoscope, Star, Briefcase, ArrowRight, Video } from "lucide-react";

export default function HospitalDetail() {
    const { id } = useParams();
    const [hospital, setHospital] = useState(null);
    const [doctors, setDoctors] = useState([]);

    useEffect(() => {
        api.get(`/hospitals/${id}`).then((r) => setHospital(r.data)).catch(() => {});
        api.get(`/hospitals/${id}/doctors`).then((r) => setDoctors(r.data)).catch(() => {});
    }, [id]);

    if (!hospital) return (
        <div className="min-h-screen">
            <Navbar />
            <p className="mx-auto max-w-2xl px-6 py-20 text-center text-mint-800/60">Loading…</p>
            <Footer />
        </div>
    );

    return (
        <div className="min-h-screen">
            <Navbar />
            <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-6 sm:pt-10 pb-20">
                <Link to="/find-doctors" className="text-sm text-mint-600 hover:underline" data-testid="back-to-hospitals">← Back to hospitals</Link>

                <div className="mt-6 glass-mint rounded-3xl overflow-hidden">
                    <div className="h-56 relative">
                        <img src={hospital.image_url} alt={hospital.name} className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-mint-800/50 to-transparent" />
                        <div className="absolute bottom-4 sm:bottom-5 left-4 sm:left-6 right-4 sm:right-6 text-white">
                            <p className="text-xs uppercase tracking-widest opacity-90">{hospital.area} · {hospital.city}</p>
                            <h1 className="editorial text-2xl sm:text-4xl mt-1">{hospital.name}</h1>
                        </div>
                    </div>
                    <div className="p-4 sm:p-6 grid md:grid-cols-3 gap-4 sm:gap-6">
                        <div className="md:col-span-2 text-sm text-mint-800/80 leading-relaxed">
                            <p>{hospital.description}</p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {(hospital.specialties_available || []).map((s) => (
                                    <span key={s} className="rounded-full bg-mint-50 text-mint-700 text-xs px-3 py-1">{s}</span>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2 text-sm text-mint-800/80">
                            <p className="flex items-center gap-2"><MapPin size={14} /> {hospital.address}</p>
                            <p className="flex items-center gap-2"><MapPin size={14} /> {hospital.pin_code}</p>
                            {hospital.phone && <p className="flex items-center gap-2"><Phone size={14} /> {hospital.phone}</p>}
                            <p className="flex items-center gap-2"><Stethoscope size={14} /> {hospital.doctor_count} doctors available</p>
                        </div>
                    </div>
                </div>

                <h2 className="editorial mt-8 sm:mt-10 text-2xl sm:text-3xl text-mint-800">Doctors at this hospital</h2>
                {doctors.length === 0 ? <p className="mt-3 text-mint-800/60">No doctors listed yet.</p> : (
                    <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="hospital-doctors-grid">
                        {doctors.map((d) => (
                            <Link key={d.id} to={`/doctors/${d.id}`}
                                className="glass rounded-2xl p-4 sm:p-5 hover:-translate-y-1 transition-transform"
                                data-testid={`doctor-card-${d.id}`}>
                                <div className="flex items-center gap-4">
                                    <img src={d.profile_photo_url} alt={d.name} className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl object-cover flex-shrink-0" />
                                    <div className="flex-1">
                                        <p className="editorial text-xl text-mint-800 leading-tight">{d.name}</p>
                                        <p className="text-xs text-mint-700 font-medium mt-0.5">{d.specialization}</p>
                                        <p className="text-xs text-mint-800/60 flex items-center gap-1 mt-0.5"><Star size={12} fill="#34C472" stroke="#34C472" /> {d.rating} ({d.reviews_count})</p>
                                    </div>
                                </div>
                                <div className="mt-3 space-y-1 text-xs text-mint-800/70">
                                    <p className="flex items-center gap-1.5"><Briefcase size={12} /> {d.years_of_experience} yrs experience</p>
                                    {d.online_consultation_enabled && <p className="flex items-center gap-1.5 text-mint-600"><Video size={12} /> Online consultation available</p>}
                                </div>
                                <div className="mt-4 flex items-center justify-between">
                                    <span className="text-sm font-semibold text-mint-800">₹{d.consultation_fee}</span>
                                    <span className="text-xs text-mint-600 flex items-center gap-1">Book <ArrowRight size={12} /></span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </section>
            <Footer />
        </div>
    );
}
