import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute({ children, roles }) {
    const { user, loading } = useAuth();
    const loc = useLocation();
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" data-testid="auth-loading">
                <div className="glass rounded-2xl px-8 py-6">
                    <p className="text-mint-800 font-medium">Verifying session…</p>
                </div>
            </div>
        );
    }
    if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
    if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
    return children;
}
