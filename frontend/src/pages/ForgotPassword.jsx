import { useState } from "react";
import { Link } from "react-router-dom";
import api, { formatApiError } from "../lib/api";
import { Mail, ArrowRight } from "lucide-react";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [sent, setSent] = useState(false);
    const [devLink, setDevLink] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true); setError("");
        try {
            await api.post("/auth/forgot-password", { email });
            setSent(true);
            // Try dev helper (only works if Resend isn't configured)
            try {
                const r = await api.get(`/auth/dev/latest-reset-link/${encodeURIComponent(email)}`);
                if (r.data.link) setDevLink(r.data.link);
            } catch { /* ignore */ }
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
                <span className="overline mt-6 block">Forgot password</span>
                <h1 className="editorial mt-2 text-3xl text-mint-800">Reset your password</h1>

                {sent ? (
                    <div className="mt-6 space-y-4">
                        <p className="text-sm text-mint-800/80">If an account exists for <strong>{email}</strong>, a reset link has been sent.</p>
                        {devLink && (
                            <div className="rounded-xl bg-mint-50 border border-mint-100 p-3" data-testid="dev-reset-link">
                                <p className="text-xs text-mint-800/70 mb-1">Dev mode (Resend not configured) — use this link:</p>
                                <a href={devLink} className="text-mint-600 text-xs break-all underline">{devLink}</a>
                            </div>
                        )}
                        <Link to="/login" className="inline-block btn-pill btn-primary text-sm">Back to sign in</Link>
                    </div>
                ) : (
                    <form onSubmit={submit} className="mt-5 space-y-4" data-testid="forgot-form">
                        <p className="text-sm text-mint-800/70">Enter the email you signed up with. We'll send you a link to set a new password.</p>
                        <div className="relative">
                            <Mail size={16} className="absolute left-3.5 top-3.5 text-mint-700" />
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@email.com"
                                className="w-full rounded-xl border border-mint-100 bg-white/80 pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-mint-500"
                                data-testid="forgot-email" />
                        </div>
                        {error && <p className="text-sm text-red-600">{error}</p>}
                        <button type="submit" disabled={busy} className="w-full btn-pill btn-primary disabled:opacity-60" data-testid="forgot-submit">
                            {busy ? "Sending…" : <>Send reset link <ArrowRight size={18} /></>}
                        </button>
                        <p className="text-xs text-mint-800/60 text-center">
                            Remembered it? <Link to="/login" className="text-mint-600 hover:underline">Sign in</Link>
                        </p>
                    </form>
                )}
            </div>
        </div>
    );
}
