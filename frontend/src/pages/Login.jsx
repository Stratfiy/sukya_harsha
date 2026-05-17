import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, ArrowRight, ShieldCheck, Activity } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import GoogleButton from "../components/GoogleButton";

export default function Login() {
    const { login, verify2fa } = useAuth();
    const nav = useNavigate();
    const loc = useLocation();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [show, setShow] = useState(false);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [twofaToken, setTwofaToken] = useState(null);
    const [code, setCode] = useState("");

    const redirectAfter = (role) => {
        const target = loc.state?.from ||
            (role === "doctor" ? "/doctor/dashboard" : role === "admin" ? "/admin/dashboard" : "/patient/dashboard");
        nav(target, { replace: true });
    };

    const submit = async (e) => {
        e.preventDefault();
        setError(""); setBusy(true);
        const res = await login(email, password);
        setBusy(false);
        if (!res.ok) return setError(res.error);
        if (res.requires_2fa) return setTwofaToken(res.temp_token);
        redirectAfter(res.user.role);
    };

    const submit2fa = async (e) => {
        e.preventDefault();
        setError(""); setBusy(true);
        const res = await verify2fa(code, twofaToken);
        setBusy(false);
        if (!res.ok) return setError(res.error);
        redirectAfter(res.user.role);
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2">
            <div className="flex flex-col px-8 sm:px-16 py-10">
                <Link to="/" className="flex items-center gap-2.5" data-testid="auth-logo">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-mint-600 text-white shadow-[0_4px_18px_rgba(52,196,114,0.4)]">
                        <Activity size={18} strokeWidth={2.4} />
                    </div>
                    <span className="editorial text-2xl text-mint-800">Sukhya Med</span>
                </Link>
                <div className="flex-1 grid place-items-center">
                    <div className="w-full max-w-md glass-mint rounded-3xl p-8 sm:p-10 animate-fade-up">
                        {!twofaToken ? (
                            <>
                                <span className="overline">Welcome back</span>
                                <h1 className="editorial mt-2 text-4xl text-mint-800">Sign in</h1>
                                <p className="mt-2 text-sm text-mint-800/70">Premium care, one click away.</p>

                                <div className="mt-6"><GoogleButton onSuccess={(r) => redirectAfter(r.user?.role || "patient")} onError={(e) => setError(e)} /></div>
                                <div className="my-5 flex items-center gap-3 text-xs text-mint-800/50">
                                    <span className="flex-1 h-px bg-mint-100" />or sign in with email<span className="flex-1 h-px bg-mint-100" />
                                </div>

                                <form onSubmit={submit} className="space-y-4" data-testid="login-form">
                                    <Input icon={Mail} type="email" value={email} onChange={setEmail} placeholder="you@email.com" testid="login-email" required />
                                    <div className="relative">
                                        <Input icon={Lock} type={show ? "text" : "password"} value={password} onChange={setPassword} placeholder="Your password" testid="login-password" required />
                                        <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-3 text-mint-700" data-testid="toggle-password">
                                            {show ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span />
                                        <Link to="/forgot-password" className="text-mint-600 hover:underline" data-testid="link-forgot">Forgot password?</Link>
                                    </div>
                                    {error && <p className="text-sm text-red-600" data-testid="login-error">{error}</p>}
                                    <button type="submit" disabled={busy} className="w-full btn-pill btn-primary disabled:opacity-60" data-testid="login-submit">
                                        {busy ? "Signing in…" : <>Sign in <ArrowRight size={18} /></>}
                                    </button>
                                </form>

                                <p className="mt-6 text-sm text-mint-800/70">
                                    New here?{" "}
                                    <Link to="/register" className="text-mint-600 font-medium hover:underline" data-testid="link-register">Create an account</Link>
                                </p>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center gap-2"><ShieldCheck size={18} className="text-mint-600" /><span className="overline">Two-factor auth</span></div>
                                <h1 className="editorial mt-2 text-3xl text-mint-800">Enter your 6-digit code</h1>
                                <p className="mt-2 text-sm text-mint-800/70">Open your authenticator app and paste the current code.</p>
                                <form onSubmit={submit2fa} className="mt-6 space-y-4" data-testid="2fa-form">
                                    <input
                                        value={code}
                                        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                        placeholder="123456"
                                        inputMode="numeric"
                                        className="w-full text-center tracking-[0.5em] text-2xl font-mono rounded-xl border border-mint-100 bg-white/80 px-4 py-4 outline-none focus:ring-2 focus:ring-mint-500"
                                        data-testid="2fa-code"
                                    />
                                    {error && <p className="text-sm text-red-600">{error}</p>}
                                    <button type="submit" disabled={busy || code.length !== 6} className="w-full btn-pill btn-primary disabled:opacity-60" data-testid="2fa-submit">
                                        {busy ? "Verifying…" : "Verify & continue"}
                                    </button>
                                    <button type="button" onClick={() => setTwofaToken(null)} className="w-full text-sm text-mint-600 hover:underline" data-testid="2fa-cancel">Back to sign-in</button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            </div>
            <div className="hidden lg:block relative">
                <img src="https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=1400&q=80" alt="" className="absolute inset-0 w-full h-full object-cover" />
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

function Input({ icon: Icon, type, value, onChange, placeholder, testid, required }) {
    return (
        <div className="relative">
            <Icon size={16} className="absolute left-3.5 top-3.5 text-mint-700" />
            <input
                type={type} value={value} onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder} required={required}
                className="w-full rounded-xl border border-mint-100 bg-white/80 pl-10 pr-10 py-3 text-sm outline-none focus:ring-2 focus:ring-mint-500"
                data-testid={testid}
            />
        </div>
    );
}
