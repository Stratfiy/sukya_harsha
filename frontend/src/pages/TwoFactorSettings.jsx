import { useState } from "react";
import Navbar from "../components/Navbar";
import api, { formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { ShieldCheck, ShieldOff } from "lucide-react";

export default function TwoFactorSettings() {
    const { user, refreshMe } = useAuth();
    const [qr, setQr] = useState(null);
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [success, setSuccess] = useState("");

    const start = async () => {
        setError(""); setBusy(true);
        try {
            const { data } = await api.post("/auth/2fa/setup");
            setQr(data);
        } catch (e) {
            setError(formatApiError(e.response?.data?.detail));
        } finally { setBusy(false); }
    };
    const enable = async () => {
        setError(""); setBusy(true); setSuccess("");
        try {
            await api.post("/auth/2fa/enable", { code });
            setSuccess("Two-factor authentication is now enabled."); setQr(null); setCode("");
            await refreshMe();
        } catch (e) {
            setError(formatApiError(e.response?.data?.detail));
        } finally { setBusy(false); }
    };
    const disable = async () => {
        setError(""); setBusy(true); setSuccess("");
        try {
            await api.post("/auth/2fa/disable", { code });
            setSuccess("Two-factor authentication disabled."); setCode("");
            await refreshMe();
        } catch (e) {
            setError(formatApiError(e.response?.data?.detail));
        } finally { setBusy(false); }
    };

    return (
        <div className="min-h-screen">
            <Navbar />
            <section className="mx-auto max-w-2xl px-6 pt-12 pb-20" data-testid="2fa-settings">
                <span className="overline">Security</span>
                <h1 className="editorial mt-3 text-4xl text-mint-800">Two-factor authentication</h1>

                <div className="mt-8 glass-mint rounded-3xl p-6">
                    {user?.two_factor_enabled ? (
                        <>
                            <div className="flex items-center gap-2"><ShieldCheck size={18} className="text-mint-600" /><p className="text-sm font-medium text-mint-800">2FA is enabled.</p></div>
                            <p className="mt-2 text-sm text-mint-800/70">To disable, enter a current 6-digit code from your authenticator app.</p>
                            <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                placeholder="123456" className="mt-4 w-40 text-center tracking-[0.4em] text-xl font-mono rounded-xl border border-mint-100 bg-white/80 px-3 py-3 outline-none focus:ring-2 focus:ring-mint-500" data-testid="2fa-disable-code" />
                            <div className="mt-3">
                                <button onClick={disable} disabled={busy || code.length !== 6} className="btn-pill btn-ghost text-sm text-red-600 disabled:opacity-50" data-testid="2fa-disable-btn">
                                    <ShieldOff size={14} /> Disable 2FA
                                </button>
                            </div>
                        </>
                    ) : !qr ? (
                        <>
                            <p className="text-sm text-mint-800/80">Boost your account security by adding a second authentication factor. We'll show you a QR code to scan in Google Authenticator, Authy or any TOTP app.</p>
                            <button onClick={start} disabled={busy} className="mt-5 btn-pill btn-primary text-sm" data-testid="2fa-start">
                                <ShieldCheck size={14} /> {busy ? "Preparing…" : "Set up 2FA"}
                            </button>
                        </>
                    ) : (
                        <>
                            <p className="text-sm text-mint-800/80">1. Scan this QR with your authenticator app:</p>
                            <img src={qr.qr_code} alt="2FA QR" className="mt-3 w-48 h-48 bg-white p-2 rounded-xl" data-testid="2fa-qr" />
                            <p className="text-xs text-mint-800/60 mt-2">Or enter this code manually: <code className="font-mono">{qr.secret}</code></p>
                            <p className="text-sm text-mint-800/80 mt-4">2. Enter the 6-digit code your app shows:</p>
                            <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                placeholder="123456" className="mt-3 w-40 text-center tracking-[0.4em] text-xl font-mono rounded-xl border border-mint-100 bg-white/80 px-3 py-3 outline-none focus:ring-2 focus:ring-mint-500" data-testid="2fa-verify-code" />
                            <div className="mt-3 flex items-center gap-2">
                                <button onClick={enable} disabled={busy || code.length !== 6} className="btn-pill btn-primary text-sm disabled:opacity-50" data-testid="2fa-enable-btn">
                                    Enable
                                </button>
                                <button onClick={() => { setQr(null); setCode(""); }} className="btn-pill btn-ghost text-sm">Cancel</button>
                            </div>
                        </>
                    )}
                    {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
                    {success && <p className="mt-3 text-sm text-mint-600" data-testid="2fa-success">{success}</p>}
                </div>
            </section>
        </div>
    );
}
