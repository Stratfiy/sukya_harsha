import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { ArrowRight, ShieldCheck, Stethoscope, HeartPulse, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

const values = [
    {
        icon: HeartPulse,
        title: "Patient First",
        body: "Every decision we make starts with one question: does this make it easier for a patient to get the right care?"
    },
    {
        icon: Stethoscope,
        title: "Doctor Trust",
        body: "Every doctor on Sukhya Med is admin-verified and license-checked. We vouch for every specialist on our platform."
    },
    {
        icon: ShieldCheck,
        title: "Privacy by Design",
        body: "Your medical data is encrypted at rest, access-logged, and never shared without your explicit consent."
    },
    {
        icon: MapPin,
        title: "Built for India",
        body: "We started in Navi Mumbai because that's home. Area-first discovery is how India actually works."
    },
];

export default function About() {
    return (
        <div className="min-h-screen">
            <Navbar />

            {/* Hero */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 -z-10">
                    <div className="absolute -top-32 -left-32 h-[480px] w-[480px] rounded-full bg-mint-200/40 blur-3xl" />
                    <div className="absolute top-40 -right-40 h-[400px] w-[400px] rounded-full bg-mint-100/60 blur-3xl" />
                </div>
                <div className="mx-auto max-w-7xl px-6 pt-20 pb-16">
                    <span className="overline">Our Story</span>
                    <h1 className="mt-4 text-5xl sm:text-6xl lg:text-7xl text-mint-800 leading-tight max-w-4xl">
                        A new chapter in <em className="italic text-mint-600">digital healthcare</em>.
                    </h1>
                </div>
            </section>

            {/* Story */}
            <section className="mx-auto max-w-4xl px-6 pb-20">
                <div className="glass rounded-3xl p-10 space-y-6 text-mint-800/80 text-base leading-relaxed">
                    <p>
                        Sukhya Med was born from a simple observation: finding the right doctor should feel as
                        natural as choosing a restaurant in your neighbourhood.
                    </p>
                    <p>
                        We organise care around the way real life works — first by <strong className="text-mint-800">area</strong>, then by <strong className="text-mint-800">hospital</strong>, then by{" "}
                        <strong className="text-mint-800">doctor</strong>. Hospitals are the anchor: they vouch for their specialists, train them, and stand
                        behind their work. Every doctor on Sukhya Med is admin-verified and license-checked
                        before they ever see a patient.
                    </p>
                    <p>
                        Built with the security disciplines of fintech and the aesthetic of a luxury product,
                        Sukhya Med is what we think the future of digital healthcare should feel like.
                    </p>
                </div>
            </section>

            {/* Founder */}
            <section className="mx-auto max-w-7xl px-6 pb-24">
                <span className="overline">The Team</span>
                <h2 className="mt-4 text-4xl sm:text-5xl text-mint-800 mb-14">
                    The people <em className="italic text-mint-600">behind it</em>.
                </h2>

                <div className="space-y-12">
                    {/* Founder card */}
                    <div className="grid md:grid-cols-12 gap-8 items-center glass rounded-3xl p-8">
                        <div className="md:col-span-3">
                            <div className="aspect-square rounded-2xl bg-mint-800 flex items-center justify-center">
                                <span className="text-white text-7xl font-bold" style={{ fontFamily: "Outfit, sans-serif" }}>N</span>
                            </div>
                            <div className="mt-3 inline-block px-3 py-1 rounded-full bg-mint-600/10 border border-mint-600/20 text-xs font-semibold text-mint-600 uppercase tracking-wider">
                                Founder
                            </div>
                        </div>
                        <div className="md:col-span-9">
                            <p className="overline mb-2">Nithish · Founder & CEO</p>
                            <h3 className="editorial text-3xl sm:text-4xl text-mint-800 leading-tight">
                                Navi Mumbai. Built Sukhya Med to make finding a doctor as easy as finding a restaurant.
                            </h3>
                            <p className="mt-4 text-mint-800/70 text-sm leading-relaxed">
                                Started in Vashi, Navi Mumbai — because that's where the problem lives. Watched family members
                                struggle to find the right specialist in the right hospital at the right time. Built Sukhya Med
                                to fix that, one appointment at a time.
                            </p>
                            <a href="mailto:hello@sukhya.com"
                                className="mt-5 btn-pill btn-primary inline-flex text-sm">
                                Talk to Nithish <ArrowRight size={15} />
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* Values */}
            <section className="mx-auto max-w-7xl px-6 pb-24">
                <span className="overline">What we stand for</span>
                <h2 className="mt-4 text-4xl sm:text-5xl text-mint-800 mb-14">
                    Our <em className="italic text-mint-600">values</em>.
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                    {values.map((v) => (
                        <div key={v.title} className="glass-mint rounded-2xl p-7">
                            <div className="grid h-11 w-11 place-items-center rounded-xl bg-mint-600 text-white mb-5">
                                <v.icon size={20} strokeWidth={1.8} />
                            </div>
                            <h3 className="editorial text-2xl text-mint-800">{v.title}</h3>
                            <p className="mt-2 text-sm text-mint-800/70 leading-relaxed">{v.body}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA */}
            <section className="mx-auto max-w-7xl px-6 pb-24">
                <div className="glass-mint rounded-3xl p-12 text-center">
                    <h2 className="editorial text-4xl sm:text-5xl text-mint-800">
                        Join us in building <em className="italic text-mint-600">better care</em>.
                    </h2>
                    <p className="mt-4 text-mint-800/70 max-w-xl mx-auto">
                        Whether you're a patient looking for a doctor, or a doctor looking for patients — Sukhya Med is built for you.
                    </p>
                    <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                        <Link to="/register" className="btn-pill btn-primary">
                            Create account <ArrowRight size={16} />
                        </Link>
                        <Link to="/find-doctors" className="btn-pill btn-ghost">
                            Find a doctor
                        </Link>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}
