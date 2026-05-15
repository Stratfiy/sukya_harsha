import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import {
    CalendarCheck, ShieldCheck, Sparkles, Stethoscope, Hospital, ArrowRight,
    Activity, Lock, Star,
} from "lucide-react";

const features = [
    { icon: CalendarCheck, title: "Smart Booking", body: "Live availability calendar that feels like Calendly — built for clinical pace." },
    { icon: Stethoscope,   title: "Vetted Doctors",  body: "Specialists across cardiology, neurology, pediatrics, dermatology and more." },
    { icon: Sparkles,      title: "AI Health Assistant", body: "Claude Sonnet 4.5 answers questions and recommends the right specialist." },
    { icon: Hospital,      title: "Hospital Network", body: "Apollo, Fortis, AIIMS, Manipal, Cloudnine — collaboration built into the platform." },
    { icon: ShieldCheck,   title: "Secure by design", body: "JWT auth, bcrypt hashing, brute-force protection. Your data, your control." },
    { icon: Activity,      title: "Online Consultations", body: "Continue care from anywhere with future-ready video consultations." },
];

export default function Landing() {
    return (
        <div className="min-h-screen">
            <Navbar />

            {/* HERO */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 -z-10">
                    <div className="absolute -top-32 -left-32 h-[480px] w-[480px] rounded-full bg-mint-200/40 blur-3xl" />
                    <div className="absolute top-40 -right-40 h-[520px] w-[520px] rounded-full bg-mint-100/60 blur-3xl" />
                </div>

                <div className="mx-auto max-w-7xl px-6 pt-16 pb-20 grid lg:grid-cols-12 gap-12 items-center">
                    <div className="lg:col-span-7 animate-fade-up">
                        <span className="overline" data-testid="hero-overline">AI-Enhanced Healthcare · 2026</span>
                        <h1 className="mt-5 text-5xl sm:text-6xl lg:text-7xl leading-[1.02] text-mint-800 text-balance">
                            A <em className="italic text-mint-600">premium</em> bridge between
                            <br /> doctors and patients.
                        </h1>
                        <p className="mt-6 max-w-xl text-lg text-mint-800/70 leading-relaxed">
                            Sukhya Med is the editorial, AI-driven platform where hospitals, specialists and patients meet.
                            Book consultations, talk to an AI Health Assistant and manage care — beautifully.
                        </p>
                        <div className="mt-9 flex flex-wrap items-center gap-4">
                            <Link to="/register" className="btn-pill btn-primary text-base" data-testid="hero-get-started">
                                Start your journey <ArrowRight size={18} />
                            </Link>
                            <Link to="/doctors" className="btn-pill btn-ghost text-base" data-testid="hero-browse-doctors">
                                Browse doctors
                            </Link>
                        </div>

                        <div className="mt-10 flex items-center gap-6 text-sm text-mint-800/70">
                            <div className="flex items-center gap-2"><Lock size={16} className="text-mint-600" /> JWT + bcrypt secure</div>
                            <div className="flex items-center gap-2"><Star size={16} className="text-mint-600" /> 4.9 average rating</div>
                        </div>
                    </div>

                    {/* Floating glass mock cards */}
                    <div className="lg:col-span-5 relative h-[520px]">
                        <img
                            src="https://static.prod-images.emergentagent.com/jobs/f53fdde2-2dbb-436c-a3ad-006535e274bd/images/87baad59d473222c4a6a49f16d28680121a974b42d719186d20b450bd17d2f19.png"
                            alt="3D medical cross"
                            className="absolute inset-0 m-auto h-[440px] w-[440px] object-contain animate-float-slow drop-shadow-[0_20px_60px_rgba(52,196,114,0.25)]"
                        />
                        <div className="absolute top-6 left-2 glass rounded-2xl p-4 w-56 animate-float" data-testid="hero-card-appt">
                            <p className="overline">Next appointment</p>
                            <p className="editorial text-xl mt-1.5 text-mint-800">Dr. Aanya Sharma</p>
                            <p className="text-xs text-mint-800/60 mt-0.5">Cardiology · Apollo Hospitals</p>
                            <div className="mt-3 flex items-center gap-2 text-sm text-mint-700">
                                <CalendarCheck size={16} /> Tomorrow · 10:00 AM
                            </div>
                        </div>
                        <div className="absolute bottom-6 right-0 glass-mint rounded-2xl p-4 w-60 animate-float [animation-delay:1.5s]" data-testid="hero-card-ai">
                            <p className="overline">AI Assistant</p>
                            <p className="text-sm text-mint-800 mt-1.5 leading-snug">
                                "Your reading is normal. Continue meds and we'll review at the next visit."
                            </p>
                            <div className="mt-2 flex items-center gap-2 text-xs text-mint-700">
                                <Sparkles size={14} /> Claude Sonnet 4.5
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FEATURES */}
            <section id="features" className="mx-auto max-w-7xl px-6 py-24">
                <div className="max-w-2xl">
                    <span className="overline">Why Sukhya Med</span>
                    <h2 className="mt-3 text-4xl sm:text-5xl text-mint-800">
                        Designed like a <em className="italic text-mint-600">luxury product</em>,
                        engineered like a hospital.
                    </h2>
                </div>
                <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((f, i) => (
                        <div
                            key={f.title}
                            className="glass rounded-2xl p-6 hover:-translate-y-1 transition-transform duration-300"
                            style={{ animationDelay: `${i * 80}ms` }}
                            data-testid={`feature-card-${i}`}
                        >
                            <div className="grid h-11 w-11 place-items-center rounded-xl bg-mint-500 text-white">
                                <f.icon size={20} strokeWidth={1.8} />
                            </div>
                            <h3 className="editorial mt-5 text-2xl text-mint-800">{f.title}</h3>
                            <p className="mt-2 text-sm text-mint-800/70 leading-relaxed">{f.body}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* AI Section */}
            <section id="ai" className="relative">
                <div className="mx-auto max-w-7xl px-6 py-20 grid lg:grid-cols-12 gap-12 items-center">
                    <div className="lg:col-span-5 relative h-[360px]">
                        <img
                            src="https://static.prod-images.emergentagent.com/jobs/f53fdde2-2dbb-436c-a3ad-006535e274bd/images/31762df3176c9c5f734a15c6eb70143f19f72d389f1015143eca5431cea872ef.png"
                            alt="AI health sphere"
                            className="absolute inset-0 m-auto h-[340px] w-[340px] object-contain animate-float-slow"
                        />
                    </div>
                    <div className="lg:col-span-7">
                        <span className="overline">AI · Always on</span>
                        <h2 className="mt-3 text-4xl sm:text-5xl text-mint-800">
                            Your personal <em className="italic text-mint-600">health concierge</em>.
                        </h2>
                        <p className="mt-5 max-w-xl text-mint-800/70 leading-relaxed">
                            The AI Health Assistant — built with Claude Sonnet 4.5 — guides you through symptoms,
                            explains your reports, and helps you choose the right specialist on Sukhya Med.
                        </p>
                        <Link to="/register" className="mt-7 btn-pill btn-primary inline-flex" data-testid="ai-cta">
                            Try the AI assistant <ArrowRight size={18} />
                        </Link>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="mx-auto max-w-7xl px-6 pb-24">
                <div className="glass-mint rounded-3xl p-12 text-center grain">
                    <h2 className="editorial text-4xl sm:text-5xl text-mint-800">
                        Care, <em className="italic text-mint-600">re-imagined</em>.
                    </h2>
                    <p className="mt-4 text-mint-800/70 max-w-xl mx-auto">
                        Create your free account and meet your first doctor in under two minutes.
                    </p>
                    <Link to="/register" className="mt-8 btn-pill btn-primary inline-flex" data-testid="cta-register">
                        Get started — it's free <ArrowRight size={18} />
                    </Link>
                </div>
            </section>

            <Footer />
        </div>
    );
}
