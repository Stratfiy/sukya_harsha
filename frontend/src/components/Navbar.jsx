import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Activity, LogOut, User, ChevronDown } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);

    const dashboardPath = user?.role === "doctor" ? "/doctor/dashboard"
        : user?.role === "admin" ? "/admin/dashboard"
        : "/patient/dashboard";

    const handleLogout = async () => {
        await logout();
        navigate("/");
    };

    const navLink = ({ isActive }) =>
        isActive ? "text-mint-600 font-medium" : "text-mint-800/70 hover:text-mint-800";

    return (
        <header className="sticky top-0 z-50 w-full border-b border-mint-100/60 bg-white/70 backdrop-blur-xl" data-testid="navbar">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                <Link to="/" className="flex items-center gap-2.5" data-testid="navbar-logo">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-mint-500 text-white shadow-[0_4px_18px_rgba(52,196,114,0.4)]">
                        <Activity size={18} strokeWidth={2.4} />
                    </div>
                    <span className="editorial text-2xl text-mint-800">Sukhya Med</span>
                </Link>

                <nav className="hidden md:flex items-center gap-7 text-sm">
                    <NavLink to="/" end className={navLink} data-testid="nav-home">Home</NavLink>
                    <NavLink to="/about" className={navLink} data-testid="nav-about">About</NavLink>
                    <NavLink to="/services" className={navLink} data-testid="nav-services">What We Provide</NavLink>
                    {(!user || user.role === "patient") && (
                        <NavLink to="/find-doctors" className={navLink} data-testid="nav-find-doctors">Find Doctors</NavLink>
                    )}
                </nav>

                <div className="flex items-center gap-3">
                    {user ? (
                        <div className="relative">
                            <button onClick={() => setMenuOpen((m) => !m)} className="btn-pill btn-ghost text-sm flex items-center gap-2" data-testid="navbar-user-menu">
                                {user.avatar_url ? <img src={user.avatar_url} alt="" className="h-6 w-6 rounded-full" /> : <User size={16} />}
                                <span className="hidden sm:inline">{(user.full_name || "User").split(" ")[0]}</span>
                                <ChevronDown size={14} />
                            </button>
                            {menuOpen && (
                                <div className="absolute right-0 mt-2 w-56 glass-mint rounded-2xl p-2 z-50" onMouseLeave={() => setMenuOpen(false)} data-testid="navbar-dropdown">
                                    <Link to={dashboardPath} className="block rounded-xl px-3 py-2 text-sm hover:bg-white/60" onClick={() => setMenuOpen(false)} data-testid="navbar-dashboard">Dashboard</Link>
                                    {user.role === "doctor" && <Link to="/doctor/profile" className="block rounded-xl px-3 py-2 text-sm hover:bg-white/60" onClick={() => setMenuOpen(false)}>My Profile</Link>}
                                    {(user.role === "doctor" || user.role === "admin") && <Link to="/settings/2fa" className="block rounded-xl px-3 py-2 text-sm hover:bg-white/60" onClick={() => setMenuOpen(false)} data-testid="navbar-2fa">Two-Factor Auth</Link>}
                                    <button onClick={handleLogout} className="w-full text-left rounded-xl px-3 py-2 text-sm hover:bg-white/60 text-red-600 flex items-center gap-2" data-testid="navbar-logout">
                                        <LogOut size={14} /> Sign out
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            <Link to="/login" className="btn-pill btn-ghost text-sm" data-testid="navbar-login">Sign in</Link>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
