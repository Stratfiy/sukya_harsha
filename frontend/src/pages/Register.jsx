import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, User as UserIcon, ArrowRight, Stethoscope, HeartPulse } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const SPECIALTIES = [
    "General Physician", "Cardiology", "Dermatology", "Pediatrics", "Neurology",
    "Gynecology", "Orthopedics", "Psychiatry", "ENT", "Ophthalmology",
];

export default function Register() {
    const { register } = useAuth();
    const nav = useNavigate();
    const [form, setForm] = useState({
        role: "patient",
        name: "",
        email: "",
        password: "",
        phone: "",
        specialty: "General Physician",
        hospital: "",
        experience_years: 1,
    });
    const [show, setShow] = useState(false);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        setBusy(true);
        const payload = {
            email: form.email, password: form.password, name: form.name,
            role: form.role, phone: form.phone || null,
        };
        if (form.role === "doctor") {
            payload.specialty = form.specialty;
            payload.hospital = form.hospital;
            payload.experience_years = Number(form.experience_years) || 1;
        }
        const res = await register(payload);
        setBusy(false);
        if (!res.ok) return setError(res.error);
        nav(form.role === "doctor" ? "/dashboard/doctor" : "/dashboard/patient", { replace: true });
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2">
            <div className="flex flex-col px-8 sm:px-16 py-10">
                <Link to="/" className="editorial text-2xl text-mint-800">MedSphere</Link>
                <div className="flex-1 grid place-items-center py-10">
                    <div className="w-full max-w-md glass-mint rounded-3xl p-8 sm:p-10 animate-fade-up">
                        <span className="overline">Join MedSphere</span>
                        <h1 className="editorial mt-2 text-4xl text-mint-800">Create your account</h1>

                        <div className="mt-6 grid grid-cols-2 gap-2 p-1 rounded-full bg-white/60 border border-mint-100" data-testid="register-role-toggle">
                            <button
                                type="button"
                                onClick={() => update("role", "patient")}
                                className={`flex items-center justify-center gap-2 rounded-full py-2 text-sm transition ${form.role === "patient" ? "bg-mint-500 text-white shadow" : "text-mint-800/70"}`}
                                data-testid="register-role-patient"
                            >
                                <HeartPulse size={16} /> Patient
                            </button>
                            <button
                                type="button"
                                onClick={() => update("role", "doctor")}
                                className={`flex items-center justify-center gap-2 rounded-full py-2 text-sm transition ${form.role === "doctor" ? "bg-mint-500 text-white shadow" : "text-mint-800/70"}`}
                                data-testid="register-role-doctor"
                            >
                                <Stethoscope size={16} /> Doctor
                            </button>
                        </div>

                        <form onSubmit={submit} className="mt-6 space-y-3.5" data-testid="register-form">
                            <Field icon={UserIcon} label="Full name" type="text" value={form.name} onChange={(v) => update("name", v)} required placeholder="Jane Doe" testid="register-name-input" />
                            <Field icon={Mail} label="Email" type="email" value={form.email} onChange={(v) => update("email", v)} required placeholder="you@email.com" testid="register-email-input" />
                            <Field icon={UserIcon} label="Phone (optional)" type="tel" value={form.phone} onChange={(v) => update("phone", v)} placeholder="+91 ..." testid="register-phone-input" />

                            <label className="block">
                                <span className="text-xs font-medium text-mint-800/80">Password</span>
                                <div className="relative mt-1.5">
                                    <Lock size={16} className="absolute left-3.5 top-3.5 text-mint-700" />
                                    <input
                                        type={show ? "text" : "password"}
                                        value={form.password}
                                        onChange={(e) => update("password", e.target.value)}
                                        required
                                        minLength={6}
                                        placeholder="At least 6 characters"
                                        className="w-full rounded-xl border border-mint-100 bg-white/80 pl-10 pr-10 py-3 text-sm outline-none focus:ring-2 focus:ring-mint-500"
                                        data-testid="register-password-input"
                                    />
                                    <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-3 text-mint-700">
                                        {show ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </label>

                            {form.role === "doctor" && (
                                <div className="grid grid-cols-2 gap-3">
                                    <label className="block col-span-2">
                                        <span className="text-xs font-medium text-mint-800/80">Specialty</span>
                                        <select
                                            value={form.specialty}
                                            onChange={(e) => update("specialty", e.target.value)}
                                            className="mt-1.5 w-full rounded-xl border border-mint-100 bg-white/80 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-mint-500"
                                            data-testid="register-specialty-input"
                                        >
                                            {SPECIALTIES.map((s) => <option key={s}>{s}</option>)}
                                        </select>
                                    </label>
                                    <Field label="Hospital" type="text" value={form.hospital} onChange={(v) => update("hospital", v)} placeholder="Apollo, Fortis…" testid="register-hospital-input" />
                                    <Field label="Years exp." type="number" value={form.experience_years} onChange={(v) => update("experience_years", v)} placeholder="5" testid="register-experience-input" />
                                </div>
                            )}

                            {error && (
                                <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-sm text-red-700" data-testid="register-error">
                                    {error}
                                </div>
                            )}

                            <button type="submit" disabled={busy} className="w-full btn-pill btn-primary disabled:opacity-60" data-testid="register-submit-btn">
                                {busy ? "Creating account…" : (<>Create account <ArrowRight size={18} /></>)}
                            </button>
                        </form>

                        <p className="mt-5 text-sm text-mint-800/70">
                            Already with us?{" "}
                            <Link to="/login" className="text-mint-600 font-medium hover:underline" data-testid="register-to-login">Sign in</Link>
                        </p>
                    </div>
                </div>
            </div>

            <div className="hidden lg:block relative">
                <img
                    src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1400&q=80"
                    alt="Premium healthcare"
                    className="absolute inset-0 w-full h-full object-cover"
                />
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

function Field({ icon: Icon, label, type, value, onChange, required, placeholder, testid }) {
    return (
        <label className="block">
            <span className="text-xs font-medium text-mint-800/80">{label}</span>
            <div className="relative mt-1.5">
                {Icon && <Icon size={16} className="absolute left-3.5 top-3.5 text-mint-700" />}
                <input
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    required={required}
                    placeholder={placeholder}
                    className={`w-full rounded-xl border border-mint-100 bg-white/80 ${Icon ? "pl-10" : "pl-4"} pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-mint-500`}
                    data-testid={testid}
                />
            </div>
        </label>
    );
}
