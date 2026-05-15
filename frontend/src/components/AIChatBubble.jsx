import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X, Sparkles } from "lucide-react";
import api, { formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function AIChatBubble() {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            role: "assistant",
            content:
                "Hi! I'm your MedSphere AI Health Assistant. Ask me about symptoms, lifestyle, or which specialist to consult. I'm not a substitute for professional advice.",
        },
    ]);
    const [input, setInput] = useState("");
    const [busy, setBusy] = useState(false);
    const [sessionId, setSessionId] = useState(null);
    const endRef = useRef(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, open]);

    if (!user || user.role !== "patient") return null;

    const send = async () => {
        const text = input.trim();
        if (!text || busy) return;
        setMessages((m) => [...m, { role: "user", content: text }]);
        setInput("");
        setBusy(true);
        try {
            const { data } = await api.post("/ai/chat", { message: text, session_id: sessionId });
            setSessionId(data.session_id);
            setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
        } catch (e) {
            setMessages((m) => [
                ...m,
                { role: "assistant", content: `Sorry — ${formatApiError(e.response?.data?.detail) || e.message}` },
            ]);
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            {!open && (
                <button
                    onClick={() => setOpen(true)}
                    className="fixed bottom-6 right-6 z-50 grid h-16 w-16 place-items-center rounded-full bg-mint-500 text-white animate-glow-pulse hover:scale-110 transition-transform"
                    data-testid="ai-chat-bubble-open"
                    aria-label="Open AI Health Assistant"
                >
                    <MessageCircle size={26} />
                </button>
            )}
            {open && (
                <div
                    className="fixed bottom-6 right-6 z-50 w-[92vw] sm:w-[400px] h-[560px] glass-mint rounded-3xl flex flex-col overflow-hidden animate-fade-up"
                    data-testid="ai-chat-window"
                >
                    <div className="flex items-center justify-between px-5 py-4 border-b border-mint-100/60 bg-white/40">
                        <div className="flex items-center gap-2.5">
                            <div className="grid h-9 w-9 place-items-center rounded-full bg-mint-500 text-white">
                                <Sparkles size={16} />
                            </div>
                            <div>
                                <p className="editorial text-lg leading-none text-mint-800">Health AI</p>
                                <p className="text-xs text-mint-800/60">Powered by Claude Sonnet 4.5</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setOpen(false)}
                            className="rounded-full p-1.5 hover:bg-mint-100/70"
                            data-testid="ai-chat-close"
                            aria-label="Close"
                        >
                            <X size={18} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" data-testid="ai-chat-messages">
                        {messages.map((m, i) => (
                            <div
                                key={i}
                                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                                    m.role === "user"
                                        ? "ml-auto bg-mint-500 text-white"
                                        : "bg-white/80 text-mint-800 border border-mint-100"
                                }`}
                            >
                                {m.content}
                            </div>
                        ))}
                        {busy && (
                            <div className="bg-white/80 text-mint-800 border border-mint-100 max-w-[60%] rounded-2xl px-4 py-2.5 text-sm flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-mint-500 animate-bounce [animation-delay:0ms]" />
                                <span className="h-2 w-2 rounded-full bg-mint-500 animate-bounce [animation-delay:120ms]" />
                                <span className="h-2 w-2 rounded-full bg-mint-500 animate-bounce [animation-delay:240ms]" />
                            </div>
                        )}
                        <div ref={endRef} />
                    </div>
                    <div className="p-3 border-t border-mint-100/60 bg-white/50">
                        <div className="flex items-center gap-2">
                            <input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && send()}
                                placeholder="Ask about a symptom or specialty…"
                                className="flex-1 bg-white/80 rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-mint-500"
                                data-testid="ai-chat-input"
                            />
                            <button
                                onClick={send}
                                disabled={busy || !input.trim()}
                                className="grid h-10 w-10 place-items-center rounded-full bg-mint-500 text-white disabled:opacity-50"
                                data-testid="ai-chat-send"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
