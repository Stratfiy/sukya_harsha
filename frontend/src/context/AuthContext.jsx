import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api, { formatApiError } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null); // null=checking, false=anon, object=user
    const [loading, setLoading] = useState(true);

    const refreshMe = useCallback(async () => {
        try {
            const { data } = await api.get("/auth/me");
            setUser(data);
        } catch {
            setUser(false);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshMe();
    }, [refreshMe]);

    const login = async (email, password) => {
        try {
            const { data } = await api.post("/auth/login", { email, password });
            setUser(data);
            return { ok: true, user: data };
        } catch (e) {
            return { ok: false, error: formatApiError(e.response?.data?.detail) };
        }
    };

    const register = async (payload) => {
        try {
            const { data } = await api.post("/auth/register", payload);
            setUser(data);
            return { ok: true, user: data };
        } catch (e) {
            return { ok: false, error: formatApiError(e.response?.data?.detail) };
        }
    };

    const logout = async () => {
        try {
            await api.post("/auth/logout");
        } catch {
            /* ignore */
        }
        setUser(false);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, refreshMe }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
