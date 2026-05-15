import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Activity, LogOut, User } from "lucide-react";

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const dashboardPath = () => {
        if (!user) return "/login";
        if (user.role === "patient") return "/dashboard/patient";
        if (user.role === "doctor") return "/dashboard/doctor";
        if (user.role === "admin") return "/dashboard/admin";
        return "/";
    };

    const handleLogout = async () => {
        await logout();
        navigate("/");
    };

    return (
        <header
            className="sticky top-0 z-50 w-full border-b border-mint-100/60 bg-white/70 backdrop-blur-xl"
            data-testid="navbar"
        >
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                <Link to="/" className="flex items-center gap-2.5" data-testid="navbar-logo">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-mint-500 text-white shadow-[0_4px_18px_rgba(52,196,114,0.4)]">
                        <Activity size={18} strokeWidth={2.4} />
                    </div>
                    <span className="editorial text-2xl text-mint-800">MedSphere</span>
                </Link>

                <nav className="hidden md:flex items-center gap-8 text-sm">
                    <NavLink to="/" className={({ isActive }) => isActive ? "text-mint-600 font-medium" : "text-mint-800/70 hover:text-mint-800"} data-testid="nav-home">Home</NavLink>
                    <NavLink to="/doctors" className={({ isActive }) => isActive ? "text-mint-600 font-medium" : "text-mint-800/70 hover:text-mint-800"} data-testid="nav-doctors">Find Doctors</NavLink>
                    <a href="#features" className="text-mint-800/70 hover:text-mint-800" data-testid="nav-features">Features</a>
                    <a href="#ai" className="text-mint-800/70 hover:text-mint-800" data-testid="nav-ai">AI Assistant</a>
                </nav>

                <div className="flex items-center gap-3">
                    {user ? (
                        <>
                            <Link
                                to={dashboardPath()}
                                className="hidden sm:inline-flex btn-pill btn-ghost text-sm"
                                data-testid="navbar-dashboard-btn"
                            >
                                <User size={16} /> {user.name?.split(" ")[0]}
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="btn-pill btn-primary text-sm"
                                data-testid="navbar-logout-btn"
                            >
                                <LogOut size={16} /> Sign out
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="btn-pill btn-ghost text-sm" data-testid="navbar-login-btn">Sign in</Link>
                            <Link to="/register" className="btn-pill btn-primary text-sm" data-testid="navbar-register-btn">Get started</Link>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
