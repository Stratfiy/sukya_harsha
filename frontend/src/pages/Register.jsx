import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, User as UserIcon, Phone, ArrowRight, Stethoscope, HeartPulse } from "lucide-react";
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
        <div className="min-h-screen grid lg:grid-cols-2">
            <div className="flex flex-col px-6 sm:px-12 py-8">
                <Link to="/" className="editorial text-2xl text-mint-800">Sukhya Med</Link>
                <div className="flex-1 grid place-items-center py-6">
                    <div className="w-full max-w-md glass-mint rounded-3xl p-8 animate-fade-up">
                        <span className="overline">Join Sukhya Med</span>
                        <h1 className="editorial mt-2 text-4xl text-mint-800">Create your account</h1>

                        <div className="mt-6 grid grid-cols-2 gap-2 p-1 rounded-full bg-white/60 border border-mint-100" data-testid="role-toggle">
                            <button type="button" onClick={() => update("role", "patient")}
                                className={`flex items-center justify-center gap-2 rounded-full py-2 text-sm transition ${form.role === "patient" ? "bg-mint-500 text-white shadow" : "text-mint-800/70"}`}
                                data-testid="role-patient">
                                <HeartPulse size={16} /> I am a Patient
                            </button>
                            <button type="button" onClick={() => update("role", "doctor")}
                                className={`flex items-center justify-center gap-2 rounded-full py-2 text-sm transition ${form.role === "doctor" ? "bg-mint-500 text-white shadow" : "text-mint-800/70"}`}
                                data-testid="role-doctor">
                                <Stethoscope size={16} /> I am a Doctor
                            </button>
                        </div>

                        <div className="mt-5"><GoogleButton role={form.role} onSuccess={() => nav("/")} onError={setError} /></div>
                        <div className="my-4 flex items-center gap-3 text-xs text-mint-800/50">
                            <span className="flex-1 h-px bg-mint-100" />or sign up with email<span className="flex-1 h-px bg-mint-100" />
                        </div>

                        <form onSubmit={submit} className="space-y-3" data-testid="register-form">
                            <Field icon={UserIcon} type="text" placeholder="Full name" value={form.full_name} onChange={(v) => update("full_name", v)} required testid="reg-name" />
                            <Field icon={Mail} type="email" placeholder="Email" value={form.email} onChange={(v) => update("email", v)} required testid="reg-email" />
                            <Field icon={Phone} type="tel" placeholder="Phone (+91...)" value={form.phone} onChange={(v) => update("phone", v)} required testid="reg-phone" />

                            <div className="relative">
                                <Lock size={16} className="absolute left-3.5 top-3.5 text-mint-700" />
                                <input type={show ? "text" : "password"} value={form.password} onChange={(e) => update("password", e.target.value)} required
                                    placeholder="Password" className="w-full rounded-xl border border-mint-100 bg-white/80 pl-10 pr-10 py-3 text-sm outline-none focus:ring-2 focus:ring-mint-500" data-testid="reg-password" />
                                <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-3 text-mint-700">{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                            </div>
                            <Field icon={Lock} type={show ? "text" : "password"} placeholder="Confirm password" value={form.confirm} onChange={(v) => update("confirm", v)} required testid="reg-confirm" />

                            {form.password && (
                                <ul className="text-xs grid grid-cols-2 gap-y-1 text-mint-800/70" data-testid="password-checks">
                                    <Rule ok={checks.length}>8+ chars</Rule>
                                    <Rule ok={checks.upper}>uppercase</Rule>
                                    <Rule ok={checks.lower}>lowercase</Rule>
                                    <Rule ok={checks.digit}>digit</Rule>
                                    <Rule ok={checks.special}>special</Rule>
                                </ul>
                            )}

                            {form.role === "doctor" && (
                                <div className="mt-2 space-y-3 rounded-2xl bg-white/40 p-3 border border-mint-100/60" data-testid="doctor-extras">
                                    <select value={form.hospital_id} onChange={(e) => update("hospital_id", e.target.value)} className="w-full rounded-xl border border-mint-100 bg-white/80 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-mint-500" data-testid="reg-hospital">
                                        <option value="">— Select hospital —</option>
                                        {hospitals.map((h) => <option key={h.id} value={h.id}>{h.name} · {h.area}</option>)}
                                    </select>
                                    <select value={form.specialization} onChange={(e) => update("specialization", e.target.value)} className="w-full rounded-xl border border-mint-100 bg-white/80 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-mint-500" data-testid="reg-specialty">
                                        {SPECIALTIES.map((s) => <option key={s}>{s}</option>)}
                                    </select>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Field type="number" placeholder="Years exp." value={form.years_of_experience} onChange={(v) => update("years_of_experience", v)} testid="reg-exp" />
                                        <Field type="number" placeholder="Consultation fee" value={form.consultation_fee} onChange={(v) => update("consultation_fee", v)} testid="reg-fee" />
                                    </div>
                                    <Field type="text" placeholder="Medical license number" value={form.license_number} onChange={(v) => update("license_number", v)} required testid="reg-license" />
                                    <textarea rows={3} placeholder="Short bio / qualifications" value={form.bio} onChange={(e) => update("bio", e.target.value)}
                                        className="w-full rounded-xl border border-mint-100 bg-white/80 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-mint-500" data-testid="reg-bio" />
                                    <Field type="url" placeholder="Profile photo URL (optional)" value={form.profile_photo_url} onChange={(v) => update("profile_photo_url", v)} testid="reg-photo" />
                                    <p className="text-xs text-mint-800/60">Doctor accounts require admin approval before they are visible to patients.</p>
                                </div>
                            )}

                            <label className="flex items-start gap-2 text-xs text-mint-800/70">
                                <input type="checkbox" checked={form.consent} onChange={(e) => update("consent", e.target.checked)} data-testid="reg-consent" className="mt-0.5 accent-mint-500" />
                                <span>I consent to Sukhya Med storing my data securely and sharing relevant medical information with my chosen doctors.</span>
                            </label>

                            {error && <p className="text-sm text-red-600" data-testid="register-error">{error}</p>}
                            <button type="submit" disabled={busy} className="w-full btn-pill btn-primary disabled:opacity-60" data-testid="register-submit">
                                {busy ? "Creating account…" : <>Create account <ArrowRight size={18} /></>}
                            </button>
                        </form>

                        <p className="mt-5 text-sm text-mint-800/70">
                            Already with us?{" "}
                            <Link to="/login" className="text-mint-600 font-medium hover:underline" data-testid="link-login">Sign in</Link>
                        </p>
                    </div>
                </div>
            </div>
            <div className="hidden lg:block relative">
                <img src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1400&q=80" alt="" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-br from-mint-500/30 via-mint-100/20 to-white/60" />
                <div className="absolute bottom-12 left-12 right-12 glass rounded-2xl p-6">
                    <span className="overline">For doctors & patients</span>
                    <p className="editorial text-2xl text-mint-800 mt-2 leading-snug">
                        Premium, AI-enhanced healthcare — for both sides of the consultation.
                    </p>
                </div>
            </div>
        </div>
    );
}

function Field({ icon: Icon, type, value, onChange, placeholder, testid, required }) {
    return (
        <div className="relative">
            {Icon && <Icon size={16} className="absolute left-3.5 top-3.5 text-mint-700" />}
            <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required}
                className={`w-full rounded-xl border border-mint-100 bg-white/80 ${Icon ? "pl-10" : "pl-4"} pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-mint-500`}
                data-testid={testid} />
        </div>
    );
}
function Rule({ ok, children }) {
    return <li className={ok ? "text-mint-600" : "text-red-500"}>{ok ? "✓" : "•"} {children}</li>;
}
