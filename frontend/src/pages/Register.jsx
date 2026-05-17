import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Activity, HeartPulse, Stethoscope } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import GoogleButton from "../components/GoogleButton";

const SPECIALTIES = [
    "Cardiology", "Dermatology", "Neurology", "Orthopedics", "Pediatrics",
    "Psychiatry", "General Medicine", "ENT", "Ophthalmology", "Gynecology", "Dentistry",
];

const passwordChecks = (pw) => ({
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    digit: /\d/.test(pw),
    special: /[!@#$%^&*()\-_=+\[\]{};:,.<>/?\\|`~'"]/.test(pw),
});

export default function Register() {
    const { register } = useAuth();
    const nav = useNavigate();
    const [hospitals, setHospitals] = useState([]);
    const [form, setForm] = useState({
        role: "patient",
        full_name: "", email: "", phone: "",
        password: "", confirm: "",
        consent: true,
        hospital_id: "", specialization: SPECIALTIES[0], years_of_experience: 1,
        license_number: "", bio: "", profile_photo_url: "", consultation_fee: 1000,
    });
    const [show, setShow] = useState(false);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        api.get("/hospitals").then((r) => {
            setHospitals(r.data);
            if (r.data[0]) setForm((f) => ({ ...f, hospital_id: r.data[0].id }));
        }).catch(() => {});
    }, []);

    const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    const checks = passwordChecks(form.password);
    const passwordOk = Object.values(checks).every(Boolean);

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        if (form.password !== form.confirm) return setError("Passwords do not match.");
        if (!passwordOk) return setError("Password does not meet complexity requirements.");
        if (!form.consent) return setError("You must accept the consent terms.");
        setBusy(true);
        const payload = {
            email: form.email, password: form.password,
            full_name: form.full_name, phone: form.phone, role: form.role, consent: true,
        };
        if (form.role === "doctor") {
            payload.hospital_id = form.hospital_id;
            payload.specialization = form.specialization;
            payload.years_of_experience = Number(form.years_of_experience) || 1;
            payload.license_number = form.license_number;
            payload.bio = form.bio;
            payload.profile_photo_url = form.profile_photo_url || null;
            payload.consultation_fee = Number(form.consultation_fee) || 1000;
        }
        const res = await register(payload);
        setBusy(false);
        if (!res.ok) return setError(res.error);
        nav(form.role === "doctor" ? "/doctor/dashboard" : "/patient/dashboard", { replace: true });
    };

    return (
        <div className="min-h-screen bg-white" style={{
            backgroundImage: "radial-gradient(circle at 0% 0%, rgba(52,196,114,0.10), transparent 50%), radial-gradient(circle at 100% 0%, rgba(212,245,226,0.5), transparent 50%)"
        }}>
            {/* Navbar */}
            <div className="flex items-center justify-between px-8 py-5">
                <Link to="/" className="flex items-center gap-2.5" data-testid="auth-logo">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-mint-500 text-white shadow-[0_4px_18px_rgba(52,196,114,0.4)]">
                        <Activity size={18} strokeWidth={2.4} />
                    </div>
                    <span className="editorial text-2xl text-mint-800">Sukhya Med</span>
                </Link>
                <p className="text-sm text-mint-800/60">
                    Already have an account?{" "}
                    <Link to="/login" className="text-mint-600 font-medium hover:underline" data-testid="link-login">
                        Sign in
                    </Link>
                </p>
            </div>

            {/* Main content */}
            <div className="flex flex-col items-center px-6 py-10">
                <div className="w-full max-w-lg">

                    {/* Heading */}
                    <div className="mb-8">
                        <span className="overline">Join Sukhya Med</span>
                        <h1 className="editorial mt-2 text-5xl text-mint-800 leading-tight">
                            Deploy your first<br />
                            <em className="text-mint-500 italic">appointment today.</em>
                        </h1>
                        <p className="mt-3 text-mint-800/60 text-sm">No credit card required. Book in under 2 minutes.</p>
                    </div>

                    {/* Role toggle */}
                    <div className="grid grid-cols-2 gap-2 p-1.5 rounded-full bg-mint-50 border border-mint-100 mb-6" data-testid="role-toggle">
                        <button type="button" onClick={() => update("role", "patient")}
                            className={`flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-medium transition ${form.role === "patient" ? "bg-mint-500 text-white shadow" : "text-mint-800/60 hover:text-mint-800"}`}
                            data-testid="role-patient">
                            <HeartPulse size={15} /> I am a Patient
                        </button>
                        <button type="button" onClick={() => update("role", "doctor")}
                            className={`flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-medium transition ${form.role === "doctor" ? "bg-mint-500 text-white shadow" : "text-mint-800/60 hover:text-mint-800"}`}
                            data-testid="role-doctor">
                            <Stethoscope size={15} /> I am a Doctor
                        </button>
                    </div>

                    {/* Google */}
                    <div className="mb-5">
                        <GoogleButton role={form.role} onSuccess={() => nav("/")} onError={setError} />
                    </div>

                    <div className="flex items-center gap-3 mb-6 text-xs text-mint-800/40">
                        <span className="flex-1 h-px bg-mint-100" />or sign up with email<span className="flex-1 h-px bg-mint-100" />
                    </div>

                    {/* Form */}
                    <form onSubmit={submit} className="space-y-4" data-testid="register-form">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <LabelField label="Full Name" type="text" placeholder="Dr. Aanya Sharma" value={form.full_name}
                                onChange={(v) => update("full_name", v)} required testid="reg-name" />
                            <LabelField label="Phone" type="tel" placeholder="+91 9000000000" value={form.phone}
                                onChange={(v) => update("phone", v)} required testid="reg-phone" />
                        </div>
                        <LabelField label="Work Email" type="email" placeholder="you@company.com" value={form.email}
                            onChange={(v) => update("email", v)} required testid="reg-email" />

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-widest text-mint-800/50 mb-1.5">Password</label>
                            <div className="relative">
                                <input type={show ? "text" : "password"} value={form.password}
                                    onChange={(e) => update("password", e.target.value)} required
                                    placeholder="Min 8 characters"
                                    className="w-full rounded-xl border border-mint-100 bg-white/80 px-4 pr-11 py-3.5 text-sm outline-none focus:ring-2 focus:ring-mint-500"
                                    data-testid="reg-password" />
                                <button type="button" onClick={() => setShow((s) => !s)}
                                    className="absolute right-3.5 top-3.5 text-mint-700/60">
                                    {show ? <EyeOff size={17} /> : <Eye size={17} />}
                                </button>
                            </div>
                            {form.password && (
                                <ul className="mt-2 text-xs grid grid-cols-3 gap-y-1 text-mint-800/60" data-testid="password-checks">
                                    <Rule ok={checks.length}>8+ chars</Rule>
                                    <Rule ok={checks.upper}>Uppercase</Rule>
                                    <Rule ok={checks.lower}>Lowercase</Rule>
                                    <Rule ok={checks.digit}>Digit</Rule>
                                    <Rule ok={checks.special}>Special</Rule>
                                </ul>
                            )}
                        </div>

                        <LabelField label="Confirm Password" type={show ? "text" : "password"} placeholder="Repeat password"
                            value={form.confirm} onChange={(v) => update("confirm", v)} required testid="reg-confirm" />

                        {/* Doctor extras */}
                        {form.role === "doctor" && (
                            <div className="space-y-4 rounded-2xl bg-mint-50/60 p-4 border border-mint-100" data-testid="doctor-extras">
                                <p className="text-xs font-semibold uppercase tracking-widest text-mint-600">Doctor details</p>
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-widest text-mint-800/50 mb-1.5">Hospital</label>
                                    <select value={form.hospital_id} onChange={(e) => update("hospital_id", e.target.value)}
                                        className="w-full rounded-xl border border-mint-100 bg-white/80 px-3 py-3.5 text-sm outline-none focus:ring-2 focus:ring-mint-500"
                                        data-testid="reg-hospital">
                                        <option value="">— Select hospital —</option>
                                        {hospitals.map((h) => <option key={h.id} value={h.id}>{h.name} · {h.area}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-widest text-mint-800/50 mb-1.5">Specialization</label>
                                    <select value={form.specialization} onChange={(e) => update("specialization", e.target.value)}
                                        className="w-full rounded-xl border border-mint-100 bg-white/80 px-3 py-3.5 text-sm outline-none focus:ring-2 focus:ring-mint-500"
                                        data-testid="reg-specialty">
                                        {SPECIALTIES.map((s) => <option key={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <LabelField label="Years Experience" type="number" placeholder="5" value={form.years_of_experience}
                                        onChange={(v) => update("years_of_experience", v)} testid="reg-exp" />
                                    <LabelField label="Consultation Fee (₹)" type="number" placeholder="1000" value={form.consultation_fee}
                                        onChange={(v) => update("consultation_fee", v)} testid="reg-fee" />
                                </div>
                                <LabelField label="Medical License Number" type="text" placeholder="MH-CARD-12001"
                                    value={form.license_number} onChange={(v) => update("license_number", v)} required testid="reg-license" />
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-widest text-mint-800/50 mb-1.5">Bio</label>
                                    <textarea rows={3} placeholder="Short bio / qualifications" value={form.bio}
                                        onChange={(e) => update("bio", e.target.value)}
                                        className="w-full rounded-xl border border-mint-100 bg-white/80 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-mint-500"
                                        data-testid="reg-bio" />
                                </div>
                                <p className="text-xs text-mint-800/50">Doctor accounts require admin approval before appearing to patients.</p>
                            </div>
                        )}

                        <label className="flex items-start gap-2.5 text-xs text-mint-800/60 cursor-pointer">
                            <input type="checkbox" checked={form.consent} onChange={(e) => update("consent", e.target.checked)}
                                data-testid="reg-consent" className="mt-0.5 accent-mint-500 w-4 h-4" />
                            <span>I consent to Sukhya Med storing my data securely and sharing relevant medical information with my chosen doctors.</span>
                        </label>

                        {error && <p className="text-sm text-red-500" data-testid="register-error">{error}</p>}

                        <button type="submit" disabled={busy}
                            className="w-full rounded-full bg-mint-500 hover:bg-mint-600 text-white font-semibold py-4 text-sm transition disabled:opacity-60 shadow-[0_4px_18px_rgba(52,196,114,0.35)]"
                            data-testid="register-submit">
                            {busy ? "Creating account…" : "Create account →"}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-sm text-mint-800/50">
                        Already with us?{" "}
                        <Link to="/login" className="text-mint-600 font-medium hover:underline" data-testid="link-login-bottom">Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

function LabelField({ label, type, value, onChange, placeholder, testid, required }) {
    return (
        <div>
            {label && <label className="block text-xs font-semibold uppercase tracking-widest text-mint-800/50 mb-1.5">{label}</label>}
            <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder} required={required}
                className="w-full rounded-xl border border-mint-100 bg-white/80 px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-mint-500"
                data-testid={testid} />
        </div>
    );
}

function Rule({ ok, children }) {
    return <li className={ok ? "text-mint-600" : "text-red-400"}>{ok ? "✓" : "•"} {children}</li>;
}
