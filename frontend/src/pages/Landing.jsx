import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { CalendarCheck, ShieldCheck, Sparkles, Stethoscope, Hospital, ArrowRight, Activity, Search } from "lucide-react";

const features = [
    { icon: Search, title: "Find by Area", body: "Pick your neighbourhood — see hospitals & doctors near you instantly." },
    { icon: Hospital, title: "Hospital Network", body: "Apollo, Fortis, MGM, Cloudnine, Jupiter — vetted partners across the city." },
    { icon: Stethoscope, title: "Vetted Specialists", body: "Every doctor is admin-approved with license verification before they ever see a patient." },
    { icon: CalendarCheck, title: "Smart Booking", body: "Calendly-style slot picker that respects each doctor's schedule." },
    { icon: Sparkles, title: "AI Health Assistant", body: "Claude Sonnet helps you understand symptoms and pick the right specialist." },
    { icon: ShieldCheck, title: "Secure & Private", body: "Your medical data is encrypted, audit-logged, and never shared without consent." },
];

export default function Landing() {
    return (
        <div className="min-h-screen">
            <Navbar />
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 -z-10">
                    <div className="absolute -top-32 -left-32 h-[480px] w-[480px] rounded-full bg-mint-200/40 blur-3xl" />
                    <div className="absolute top-40 -right-40 h-[520px] w-[520px] rounded-full bg-mint-100/60 blur-3xl" />
                </div>
                <div className="mx-auto max-w-7xl px-6 pt-16 pb-20 grid lg:grid-cols-12 gap-12 items-center">
                    <div className="lg:col-span-7 animate-fade-up">
                        <span className="overline" data-testid="hero-overline">Premium Healthcare · 2026</span>
                        <h1 className="mt-5 text-5xl sm:text-6xl lg:text-7xl leading-[1.02] text-mint-800 text-balance">
                            Care, by <em className="italic text-mint-600">area</em>.<br />
                            Hospital, by <em className="italic text-mint-600">trust</em>.<br />
                            Doctor, by <em className="italic text-mint-600">name</em>.
                        </h1>
                        <p className="mt-6 max-w-xl text-lg text-mint-800/70 leading-relaxed">
                            Sukhya Med organises your care the way real life does — pick your area, choose a hospital,
                            meet the right doctor, book in two clicks.
                        </p>
                        <div className="mt-9 flex flex-wrap items-center gap-4">
                            <Link to="/register" className="btn-pill btn-primary text-base" data-testid="hero-get-started">
                                Start free <ArrowRight size={18} />
                            </Link>
                            <Link to="/find-doctors" className="btn-pill btn-ghost text-base" data-testid="hero-find-doctors">
                                Find a doctor
                            </Link>
                        </div>
                    </div>
                    <div className="lg:col-span-5 relative h-[520px]">
                        <img
                            src="https://static.prod-images.emergentagent.com/jobs/f53fdde2-2dbb-436c-a3ad-006535e274bd/images/87baad59d473222c4a6a49f16d28680121a974b42d719186d20b450bd17d2f19.png"
                            alt="3D medical cross"
                            className="absolute inset-0 m-auto h-[440px] w-[440px] object-contain animate-float-slow drop-shadow-[0_20px_60px_rgba(52,196,114,0.25)]"
                        />
                        <div className="absolute top-6 left-2 glass rounded-2xl p-4 w-56 animate-float">
                            <p className="overline">In your area</p>
                            <p className="editorial text-xl mt-1.5 text-mint-800">Vashi · Nerul</p>
                            <p className="text-xs text-mint-800/60 mt-0.5">5 hospitals · 24 doctors</p>
                            <div className="mt-3 flex items-center gap-2 text-sm text-mint-700"><Hospital size={16} /> Apollo · Fortis · MGM</div>
                        </div>
                        <div className="absolute bottom-6 right-0 glass-mint rounded-2xl p-4 w-60 animate-float [animation-delay:1.5s]">
                            <p className="overline">Today · 10:30</p>
                            <p className="text-sm text-mint-800 mt-1.5 leading-snug">Dr. Aanya Sharma · Cardiology · Apollo Hospitals</p>
                            <div className="mt-2 flex items-center gap-2 text-xs text-mint-700"><CalendarCheck size={14} /> Appointment confirmed</div>
                        </div>
                    </div>
                </div>
            </section>

            <section id="features" className="mx-auto max-w-7xl px-6 py-24">
                <div className="max-w-2xl">
                    <span className="overline">Why Sukhya Med</span>
                    <h2 className="mt-3 text-4xl sm:text-5xl text-mint-800">
                        Designed like a <em className="italic text-mint-600">luxury product</em>, engineered like a hospital.
                    </h2>
                </div>
                <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((f, i) => (
                        <div key={f.title} className="glass rounded-2xl p-6 hover:-translate-y-1 transition-transform duration-300" data-testid={`feature-${i}`}>
                            <div className="grid h-11 w-11 place-items-center rounded-xl bg-mint-600 text-white">
                                <f.icon size={20} strokeWidth={1.8} />
                            </div>
                            <h3 className="editorial mt-5 text-2xl text-mint-800">{f.title}</h3>
                            <p className="mt-2 text-sm text-mint-800/70 leading-relaxed">{f.body}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-6 pb-24">
                <div className="glass-mint rounded-3xl p-12 text-center grain">
                    <h2 className="editorial text-4xl sm:text-5xl text-mint-800">
                        Care, <em className="italic text-mint-600">re-imagined</em>.
                    </h2>
                    <p className="mt-4 text-mint-800/70 max-w-xl mx-auto">
                        Create your free account and meet your first doctor in under two minutes.
                    </p>
                    <Link to="/register" className="mt-8 btn-pill btn-primary inline-flex" data-testid="cta-register">
                        Get started — free <ArrowRight size={18} />
                    </Link>
                </div>
            </section>
            <Footer />
        </div>
    );
}
