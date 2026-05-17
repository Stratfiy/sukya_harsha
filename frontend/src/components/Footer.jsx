import { Activity, MapPin, Mail, Phone } from "lucide-react";
import { Link } from "react-router-dom";

export default function Footer() {
    return (
        <footer className="border-t border-mint-100/70 bg-mint-50/50 mt-20" data-testid="footer">
            <div className="mx-auto max-w-7xl px-6 py-12 grid md:grid-cols-4 gap-10">
                <div className="md:col-span-2">
                    <div className="flex items-center gap-2.5">
                        <div className="grid h-9 w-9 place-items-center rounded-xl bg-mint-600 text-white">
                            <Activity size={18} strokeWidth={2.4} />
                        </div>
                        <span className="editorial text-2xl text-mint-800">Sukhya Med</span>
                    </div>
                    <p className="mt-4 max-w-md text-sm text-mint-800/70 leading-relaxed">
                        The future of digital healthcare — elegant, calming, intelligent. Built for hospitals,
                        doctors and patients who expect a premium experience.
                    </p>
                </div>
                <div>
                    <p className="overline mb-3">Platform</p>
                    <ul className="space-y-2 text-sm text-mint-800/70">
                        <li><Link to="/find-doctors" className="hover:text-mint-600 transition">Find Doctors</Link></li>
                        <li><Link to="/about" className="hover:text-mint-600 transition">About Us</Link></li>
                        <li><Link to="/register" className="hover:text-mint-600 transition">Create Account</Link></li>
                        <li><Link to="/login" className="hover:text-mint-600 transition">Sign In</Link></li>
                    </ul>
                </div>
                <div>
                    <p className="overline mb-3">Reach us</p>
                    <ul className="space-y-2 text-sm text-mint-800/70">
                        <li className="flex items-center gap-2"><MapPin size={14} /> Navi Mumbai, India</li>
                        <li className="flex items-center gap-2"><Mail size={14} /> hello@sukhya.com</li>
                        <li className="flex items-center gap-2"><Phone size={14} /> +91-22-0000-0000</li>
                    </ul>
                </div>
            </div>
            <div className="border-t border-mint-100/60 py-6 text-center text-xs text-mint-800/50">
                © {new Date().getFullYear()} Sukhya Med · All rights reserved.
            </div>
        </footer>
    );
}
