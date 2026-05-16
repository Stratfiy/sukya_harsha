import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api, { formatApiError } from "../lib/api";
import { Lock, ArrowRight, Eye, EyeOff } from "lucide-react";

const passwordChecks = (pw) => ({
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    digit: /\d/.test(pw),
    special: /[!@#$%^&*()\-_=+\[\]{};:,.<>/?\\|`~'"]/.test(pw),
});

export default function ResetPassword() {
    const { token } = useParams();
    const nav = useNavigate();
    const [pw, setPw] = useState("");
    const [confirm, setConfirm] = useState("");
    const [show, setShow] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const checks = passwordChecks(pw);
    const ok = Object.values(checks).every(Boolean);

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        if (!ok) return setError("Password does not meet complexity requirements.");
        if (pw !== confirm) return setError("Passwords do not match.");
        setBusy(true);
        try {
            await api.post("/auth/reset-password", { token, new_password: pw });
            setDone(true);
            setTimeout(() => nav("/login"), 2000);
        } catch (e) {
            setError(formatApiError(e.response?.data?.detail));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="min-h-screen grid place-items-center px-6 py-10">
            <div className="w-full max-w-md glass-mint rounded-3xl p-8 animate-fade-up">
                <Link to="/" className="editorial text-2xl text-mint-800">Sukhya Med</Link>
                <span className="overline mt-6 block">Reset password</span>
                <h1 className="editorial mt-2 text-3xl text-mint-800">Choose a new password</h1>
                {done ? (
                    <p className="mt-5 text-sm text-mint-800/80" data-testid="reset-success">Password updated. Redirecting to sign-in…</p>
                ) : (
                    <form onSubmit={submit} className="mt-5 space-y-4" data-testid="reset-form">
                        <div className="relative">
                            <Lock size={16} className="absolute left-3.5 top-3.5 text-mint-700" />
                            <input type={show ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} required placeholder="New password"
                                className="w-full rounded-xl border border-mint-100 bg-white/80 pl-10 pr-10 py-3 text-sm outline-none focus:ring-2 focus:ring-mint-500"
                                data-testid="reset-password" />
                            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-3 text-mint-700">{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                        </div>
                        <div className="relative">
                            <Lock size={16} className="absolute left-3.5 top-3.5 text-mint-700" />
                            <input type={show ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} required placeholder="Confirm new password"
                                className="w-full rounded-xl border border-mint-100 bg-white/80 pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-mint-500"
                                data-testid="reset-confirm" />
                        </div>
                        <ul className="text-xs grid grid-cols-2 gap-y-1 text-mint-800/70">
                            <li className={checks.length ? "text-mint-600" : "text-red-500"}>{checks.length ? "✓" : "•"} 8+ chars</li>
                            <li className={checks.upper ? "text-mint-600" : "text-red-500"}>{checks.upper ? "✓" : "•"} uppercase</li>
                            <li className={checks.lower ? "text-mint-600" : "text-red-500"}>{checks.lower ? "✓" : "•"} lowercase</li>
                            <li className={checks.digit ? "text-mint-600" : "text-red-500"}>{checks.digit ? "✓" : "•"} digit</li>
                            <li className={checks.special ? "text-mint-600" : "text-red-500"}>{checks.special ? "✓" : "•"} special</li>
                        </ul>
                        {error && <p className="text-sm text-red-600" data-testid="reset-error">{error}</p>}
                        <button type="submit" disabled={busy || !ok} className="w-full btn-pill btn-primary disabled:opacity-60" data-testid="reset-submit">
                            {busy ? "Updating…" : <>Update password <ArrowRight size={18} /></>}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
