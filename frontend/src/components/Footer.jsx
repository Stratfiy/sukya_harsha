import { Activity } from "lucide-react";

export default function Footer() {
    return (
        <footer className="border-t border-mint-100/70 bg-mint-50/50 mt-20" data-testid="footer">
            <div className="mx-auto max-w-7xl px-6 py-12 grid md:grid-cols-4 gap-10">
                <div className="md:col-span-2">
                    <div className="flex items-center gap-2.5">
                        <div className="grid h-9 w-9 place-items-center rounded-xl bg-mint-500 text-white">
                            <Activity size={18} strokeWidth={2.4} />
                        </div>
                        <span className="editorial text-2xl text-mint-800">MedSphere</span>
                    </div>
                    <p className="mt-4 max-w-md text-sm text-mint-800/70 leading-relaxed">
                        The future of digital healthcare — elegant, calming, intelligent. Built for hospitals,
                        doctors and patients who expect a premium experience.
                    </p>
                </div>

                <div>
                    <p className="overline mb-3">Platform</p>
                    <ul className="space-y-2 text-sm text-mint-800/70">
                        <li>Find Doctors</li>
                        <li>AI Health Assistant</li>
                        <li>Hospital Network</li>
                        <li>Online Consultation</li>
                    </ul>
                </div>

                <div>
                    <p className="overline mb-3">Trust & Security</p>
                    <ul className="space-y-2 text-sm text-mint-800/70">
                        <li>HIPAA-aligned</li>
                        <li>End-to-end encrypted</li>
                        <li>JWT auth + bcrypt</li>
                        <li>Privacy Policy</li>
                    </ul>
                </div>
            </div>
            <div className="border-t border-mint-100/60 py-6 text-center text-xs text-mint-800/50">
                © {new Date().getFullYear()} MedSphere · Designed for the future of care.
            </div>
        </footer>
    );
}
