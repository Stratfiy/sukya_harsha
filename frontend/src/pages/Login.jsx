import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, Activity } from "lucide-react";
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
                    Don't have an account?{" "}
                    <Link to="/register" className="text-mint-600 font-medium hover:underline" data-testid="link-register">
                        Sign up
                    </Link>
                </p>
            </div>

            {/* Main content */}
            <div className="flex flex-col items-center justify-center px-6 py-12">
                <div className="w-full max-w-md">

                    {!twofaToken ? (
                        <>
                            {/* Heading */}
                            <div className="mb-8">
                                <span className="overline">Welcome back</span>
                                <h1 className="editorial mt-2 text-5xl text-mint-800 leading-tight">
                                    Sign in to your<br />
                                    <em className="text-mint-500 italic">dashboard.</em>
                                </h1>
                                <p className="mt-3 text-mint-800/60 text-sm">Premium care, one click away.</p>
                            </div>

                            {/* Google */}
                            <div className="mb-5">
                                <GoogleButton role="patient" onSuccess={() => nav("/")} onError={setError} />
                            </div>

                            <div className="flex items-center gap-3 mb-5 text-xs text-mint-800/40">
                                <span className="flex-1 h-px bg-mint-100" />or sign in with email<span className="flex-1 h-px bg-mint-100" />
                            </div>

                            {/* Form */}
                            <form onSubmit={submit} className="space-y-4" data-testid="login-form">
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-widest text-mint-800/50 mb-1.5">Email</label>
                                    <input
                                        type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@email.com" required
                                        className="w-full rounded-xl border border-mint-100 bg-white/80 px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-mint-500 transition"
                                        data-testid="login-email"
                                    />
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-widest text-mint-800/50">Password</label>
                                        <Link to="/forgot-password" className="text-xs text-mint-600 hover:underline" data-testid="forgot-link">
                                            Forgot password?
                                        </Link>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type={show ? "text" : "password"} value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Your password" required
                                            className="w-full rounded-xl border border-mint-100 bg-white/80 px-4 pr-11 py-3.5 text-sm outline-none focus:ring-2 focus:ring-mint-500 transition"
                                            data-testid="login-password"
                                        />
                                        <button type="button" onClick={() => setShow((s) => !s)}
                                            className="absolute right-3.5 top-3.5 text-mint-700/60 hover:text-mint-700">
                                            {show ? <EyeOff size={17} /> : <Eye size={17} />}
                                        </button>
                                    </div>
                                </div>

                                {error && <p className="text-sm text-red-500" data-testid="login-error">{error}</p>}

                                <button type="submit" disabled={busy}
                                    className="w-full rounded-full bg-mint-500 hover:bg-mint-600 text-white font-semibold py-4 text-sm transition disabled:opacity-60 shadow-[0_4px_18px_rgba(52,196,114,0.35)]"
                                    data-testid="login-submit">
                                    {busy ? "Signing in…" : "Sign in →"}
                                </button>
                            </form>
                        </>
                    ) : (
                        <>
                            <div className="mb-8">
                                <span className="overline">Two-factor authentication</span>
                                <h1 className="editorial mt-2 text-4xl text-mint-800">Enter your code.</h1>
                                <p className="mt-2 text-sm text-mint-800/60">Open your authenticator app and enter the 6-digit code.</p>
                            </div>
                            <form onSubmit={submit2fa} className="space-y-4" data-testid="2fa-form">
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-widest text-mint-800/50 mb-1.5">6-digit code</label>
                                    <input
                                        type="text" value={code} onChange={(e) => setCode(e.target.value)}
                                        maxLength={6} placeholder="000000" required
                                        className="w-full rounded-xl border border-mint-100 bg-white/80 px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-mint-500 text-center tracking-[0.5em] text-lg"
                                        data-testid="2fa-code"
                                    />
                                </div>
                                {error && <p className="text-sm text-red-500">{error}</p>}
                                <button type="submit" disabled={busy}
                                    className="w-full rounded-full bg-mint-500 hover:bg-mint-600 text-white font-semibold py-4 text-sm transition disabled:opacity-60 shadow-[0_4px_18px_rgba(52,196,114,0.35)]">
                                    {busy ? "Verifying…" : "Verify →"}
                                </button>
                                <button type="button" onClick={() => setTwofaToken(null)}
                                    className="w-full text-sm text-mint-800/50 hover:underline">
                                    ← Back to login
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
