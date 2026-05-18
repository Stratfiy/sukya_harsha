import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Activity, LogOut, User, ChevronDown, Menu, X } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    const dashboardPath = user?.role === "doctor" ? "/doctor/dashboard"
        : user?.role === "admin" ? "/admin/dashboard"
        : "/patient/dashboard";

    const handleLogout = async () => {
        await logout();
        navigate("/");
        setMobileOpen(false);
    };

    const navLink = ({ isActive }) =>
        isActive ? "text-mint-600 font-medium" : "text-mint-800/70 hover:text-mint-800";

    // Nav items depend on logged-in state
    const publicItems = [
        { to: "/", label: "Home", end: true },
        { to: "/about", label: "About" },
        { to: "/find-doctors", label: "Find Doctors" },
    ];

    const patientItems = [
        { to: "/", label: "Home", end: true },
        { to: "/about", label: "About" },
        { to: "/find-doctors", label: "Find Doctors" },
        { to: "/patient/dashboard", label: "Dashboard" },
    ];

    const navItems = user?.role === "patient" ? patientItems
        : user?.role === "doctor" ? []
        : user?.role === "admin" ? []
        : publicItems;

    return (
        <header className="sticky top-0 z-50 w-full border-b border-mint-100/60 bg-white/70 backdrop-blur-xl" data-testid="navbar">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

                {/* Logo */}
                <Link to={user ? dashboardPath : "/"} className="flex items-center gap-2.5" data-testid="navbar-logo">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-mint-600 text-white shadow-[0_4px_18px_rgba(31,138,77,0.4)]">
                        <Activity size={18} strokeWidth={2.4} />
                    </div>
                    <span className="editorial text-2xl text-mint-800">Sukhya Med</span>
                </Link>

                {/* Desktop nav */}
                <nav className="hidden md:flex items-center gap-6 text-sm">
                    {navItems.map(item => (
                        <NavLink key={item.to} to={item.to} end={item.end} className={navLink} data-testid={`nav-${item.label.toLowerCase().replace(" ","-")}`}>
                            {item.label}
                        </NavLink>
                    ))}
                    {/* Doctor & admin get no nav links - handled inside their dashboards */}
                    {(user?.role === "doctor") && (
                        <NavLink to="/doctor/dashboard" className={navLink}>Dashboard</NavLink>
                    )}
                    {(user?.role === "admin") && (
                        <NavLink to="/admin/dashboard" className={navLink}>Admin</NavLink>
                    )}
                </nav>

                {/* Right side */}
                <div className="hidden md:flex items-center gap-3">
                    {user ? (
                        <div className="relative">
                            <button onClick={() => setMenuOpen(m => !m)}
                                className="btn-pill btn-ghost text-sm flex items-center gap-2"
                                data-testid="navbar-user-menu">
                                {user.avatar_url
                                    ? <img src={user.avatar_url} alt="" className="h-6 w-6 rounded-full" />
                                    : <div className="w-6 h-6 rounded-full bg-mint-600 text-white flex items-center justify-center text-xs font-semibold">{user.full_name?.[0]}</div>
                                }
                                <span className="hidden sm:inline">{(user.full_name || "User").split(" ")[0]}</span>
                                <ChevronDown size={14} />
                            </button>
                            {menuOpen && (
                                <div className="absolute right-0 mt-2 w-52 glass-mint rounded-2xl p-2 z-50 shadow-lg"
                                    onMouseLeave={() => setMenuOpen(false)}
                                    data-testid="navbar-dropdown">
                                    
                                    {user.role === "doctor" && (
                                        <Link to="/doctor/profile" className="block rounded-xl px-3 py-2 text-sm hover:bg-white/60"
                                            onClick={() => setMenuOpen(false)}>My Profile</Link>
                                    )}
                                    {(user.role === "doctor" || user.role === "admin") && (
                                        <Link to="/settings/2fa" className="block rounded-xl px-3 py-2 text-sm hover:bg-white/60"
                                            onClick={() => setMenuOpen(false)} data-testid="navbar-2fa">Two-Factor Auth</Link>
                                    )}
                                    <button onClick={handleLogout}
                                        className="w-full text-left rounded-xl px-3 py-2 text-sm hover:bg-white/60 text-red-600 flex items-center gap-2"
                                        data-testid="navbar-logout">
                                        <LogOut size={14} /> Sign out
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Link to="/login" className="btn-pill btn-ghost text-sm" data-testid="navbar-login">
                            Sign in
                        </Link>
                    )}
                </div>

                {/* Mobile hamburger */}
                <button onClick={() => setMobileOpen(m => !m)}
                    className="md:hidden p-2 rounded-xl hover:bg-mint-50 text-mint-800"
                    data-testid="mobile-menu-toggle">
                    {mobileOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
            </div>

            {/* Mobile menu */}
            {mobileOpen && (
                <div className="md:hidden border-t border-mint-100/60 bg-white/95 backdrop-blur-xl px-6 py-4 space-y-1"
                    data-testid="mobile-menu">
                    {navItems.map(item => (
                        <NavLink key={item.to} to={item.to} end={item.end}
                            onClick={() => setMobileOpen(false)}
                            className={({ isActive }) =>
                                `block px-4 py-3 rounded-xl text-sm transition ${isActive ? "bg-mint-600 text-white" : "text-mint-800/70 hover:bg-mint-50 hover:text-mint-800"}`
                            }>
                            {item.label}
                        </NavLink>
                    ))}
                    {user?.role === "doctor" && (
                        <NavLink to="/doctor/dashboard" onClick={() => setMobileOpen(false)}
                            className={({ isActive }) => `block px-4 py-3 rounded-xl text-sm transition ${isActive ? "bg-mint-600 text-white" : "text-mint-800/70 hover:bg-mint-50"}`}>
                            Dashboard
                        </NavLink>
                    )}
                    {user?.role === "admin" && (
                        <NavLink to="/admin/dashboard" onClick={() => setMobileOpen(false)}
                            className={({ isActive }) => `block px-4 py-3 rounded-xl text-sm transition ${isActive ? "bg-mint-600 text-white" : "text-mint-800/70 hover:bg-mint-50"}`}>
                            Admin
                        </NavLink>
                    )}
                    <div className="pt-2 border-t border-mint-100/60">
                        {user ? (
                            <button onClick={handleLogout}
                                className="w-full text-left px-4 py-3 rounded-xl text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                                <LogOut size={14} /> Sign out
                            </button>
                        ) : (
                            <Link to="/login" onClick={() => setMobileOpen(false)}
                                className="block w-full text-center px-4 py-3 rounded-full bg-mint-600 text-white text-sm font-medium">
                                Sign in
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}
