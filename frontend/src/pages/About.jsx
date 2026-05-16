import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function About() {
    return (
        <div className="min-h-screen">
            <Navbar />
            <section className="mx-auto max-w-4xl px-6 pt-16 pb-20">
                <span className="overline">Our story</span>
                <h1 className="editorial mt-3 text-5xl text-mint-800">A new chapter in <em className="italic text-mint-600">digital healthcare</em>.</h1>
                <div className="mt-8 glass rounded-2xl p-8 space-y-4 text-mint-800/80 leading-relaxed">
                    <p>Sukhya Med was born from a simple observation: finding the right doctor should feel as natural as choosing a restaurant in your neighbourhood.</p>
                    <p>We organise care around the way real life works — first by <strong>area</strong>, then by <strong>hospital</strong>, then by <strong>doctor</strong>. Hospitals are the anchor: they vouch for their specialists, train them, and stand behind their work. Every doctor on Sukhya Med is admin-verified and license-checked before they ever see a patient.</p>
                    <p>Built with the security disciplines of fintech (bcrypt, JWT, 2FA, CSRF, audit logging) and the aesthetic of a luxury product, Sukhya Med is what we think the future of digital healthcare should feel like.</p>
                </div>
            </section>
            <Footer />
        </div>
    );
}
