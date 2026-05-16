import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Hospital, Stethoscope, Calendar, Sparkles, FileText, Video } from "lucide-react";

const services = [
    { icon: Hospital, title: "Hospital network", body: "Discover hospitals near you, see their specialties, and meet their doctors." },
    { icon: Stethoscope, title: "Specialist directory", body: "Cardiology, dermatology, neurology, pediatrics, gynecology and more." },
    { icon: Calendar, title: "Real-time booking", body: "Each doctor sets their own availability — you pick a slot that fits you." },
    { icon: Video, title: "Online consultation", body: "Doctors can offer secure online consultations. Join from anywhere." },
    { icon: FileText, title: "Digital prescriptions", body: "Receive prescriptions directly in your dashboard — tamper-proof and immutable." },
    { icon: Sparkles, title: "AI Health Assistant", body: "Claude Sonnet 4.5 answers your questions and helps you pick a specialist." },
];

export default function Services() {
    return (
        <div className="min-h-screen">
            <Navbar />
            <section className="mx-auto max-w-7xl px-6 pt-16 pb-20">
                <span className="overline">What we provide</span>
                <h1 className="editorial mt-3 text-5xl text-mint-800">Everything you need <em className="italic text-mint-600">for care</em>.</h1>
                <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {services.map((s) => (
                        <div key={s.title} className="glass rounded-2xl p-6">
                            <div className="grid h-11 w-11 place-items-center rounded-xl bg-mint-500 text-white">
                                <s.icon size={20} strokeWidth={1.8} />
                            </div>
                            <h3 className="editorial mt-5 text-2xl text-mint-800">{s.title}</h3>
                            <p className="mt-2 text-sm text-mint-800/70 leading-relaxed">{s.body}</p>
                        </div>
                    ))}
                </div>
            </section>
            <Footer />
        </div>
    );
}
