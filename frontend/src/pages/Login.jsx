import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
    const { login } = useAuth();
    const nav = useNavigate();
    const loc = useLocation();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [show, setShow] = useState(false);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        setBusy(true);
        const res = await login(email, password);
        setBusy(false);
        if (!res.ok) {
            setError(res.error);
            return;
        }
        const role = res.user.role;
        const target =
            loc.state?.from ||
            (role === "doctor" ? "/dashboard/doctor" : role === "admin" ? "/dashboard/admin" : "/dashboard/patient");
        nav(target, { replace: true });
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2">
            {/* Left: form */}
            <div className="flex flex-col px-8 sm:px-16 py-10">
                <Link to="/" className="editorial text-2xl text-mint-800" data-testid="auth-logo">Sukhya Med</Link>
                <div className="flex-1 grid place-items-center">
                    <div className="w-full max-w-md glass-mint rounded-3xl p-8 sm:p-10 animate-fade-up">
                        <span className="overline">Welcome back</span>
                        <h1 className="editorial mt-2 text-4xl text-mint-800">Sign in to Sukhya Med</h1>
                        <p className="mt-2 text-sm text-mint-800/70">
                            Continue your premium healthcare experience.
                        </p>

                        <form onSubmit={submit} className="mt-7 space-y-4" data-testid="login-form">
                            <label className="block">
                                <span className="text-xs font-medium text-mint-800/80">Email</span>
                                <div className="relative mt-1.5">
                                    <Mail size={16} className="absolute left-3.5 top-3.5 text-mint-700" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        placeholder="you@hospital.com"
                                        className="w-full rounded-xl border border-mint-100 bg-white/80 pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-mint-500"
                                        data-testid="login-email-input"
                                    />
                                </div>
                            </label>

                            <label className="block">
                                <span className="text-xs font-medium text-mint-800/80">Password</span>
                                <div className="relative mt-1.5">
                                    <Lock size={16} className="absolute left-3.5 top-3.5 text-mint-700" />
                                    <input
                                        type={show ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        placeholder="••••••••"
                                        className="w-full rounded-xl border border-mint-100 bg-white/80 pl-10 pr-10 py-3 text-sm outline-none focus:ring-2 focus:ring-mint-500"
                                        data-testid="login-password-input"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShow((s) => !s)}
                                        className="absolute right-3 top-3 text-mint-700"
                                        data-testid="login-toggle-password"
                                        aria-label="Toggle password"
                                    >
                                        {show ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </label>

                            {error && (
                                <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-sm text-red-700" data-testid="login-error">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={busy}
                                className="w-full btn-pill btn-primary disabled:opacity-60"
                                data-testid="login-submit-btn"
                            >
                                {busy ? "Signing in…" : (<>Sign in <ArrowRight size={18} /></>)}
                            </button>
                        </form>

                        <p className="mt-6 text-sm text-mint-800/70">
                            New here?{" "}
                            <Link to="/register" className="text-mint-600 font-medium hover:underline" data-testid="login-to-register">
                                Create an account
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            {/* Right: image overlay */}
            <div className="hidden lg:block relative">
                <img
                    src="https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=1400&q=80"
                    alt="Doctor and patient consultation"
                    className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-mint-500/30 via-mint-100/20 to-white/60" />
                <div className="absolute bottom-12 left-12 right-12 glass rounded-2xl p-6">
                    <span className="overline">Trusted by hospitals</span>
                    <p className="editorial text-2xl text-mint-800 mt-2 leading-snug">
                        "Sukhya Med brought our outpatient flow into the future — patients adore it."
                    </p>
                    <p className="text-xs text-mint-800/60 mt-3">— Dr. Aanya Sharma · Apollo Hospitals</p>
                </div>
            </div>
        </div>
    );
}
