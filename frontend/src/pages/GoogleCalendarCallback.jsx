import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";

export default function GoogleCalendarCallback() {
    const nav = useNavigate();
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        if (!code) { nav("/doctor/dashboard"); return; }
        api.post("/doctor/google-calendar/exchange", { code }).finally(() => nav("/doctor/dashboard"));
    }, [nav]);
    return <div className="min-h-screen grid place-items-center"><p className="text-mint-800/60">Connecting Google Calendar…</p></div>;
}
