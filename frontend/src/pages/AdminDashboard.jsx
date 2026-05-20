import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import api, { formatApiError } from "../lib/api";
import {
    Users, Stethoscope, Calendar, IndianRupee, CheckCircle2, XCircle,
    Building, Plus, Trash2, AlertCircle, Clock, Activity,
    TrendingUp, UserCheck, UserX, RefreshCw, Mail, Send, ChevronDown, Eye, EyeOff, Upload
} from "lucide-react";

const SPECIALTIES = [
    "Cardiology", "Dermatology", "Neurology", "Orthopedics", "Paediatrics",
    "Psychiatry", "General Medicine", "ENT", "Ophthalmology", "Gynaecology",
    "Dentistry", "Oncology", "Gastroenterology", "Pulmonology", "Urology",
];

export default function AdminDashboard() {
    const [tab, setTab] = useState("overview");
    const [stats, setStats] = useState(null);
    const [pending, setPending] = useState([]);
    const [allDoctors, setAllDoctors] = useState([]);
    const [users, setUsers] = useState([]);
    const [hospitals, setHospitals] = useState([]);
    const [audit, setAudit] = useState([]);
    const [error, setError] = useState("");
    const [actionLoading, setActionLoading] = useState({});
    const [actionMsg, setActionMsg] = useState("");

    const load = async () => {
        try {
            const [s, p, d, u, h, a] = await Promise.all([
                api.get("/admin/stats"), api.get("/admin/doctors/pending"),
                api.get("/admin/doctors"), api.get("/admin/users"),
                api.get("/hospitals"), api.get("/admin/audit-logs"),
            ]);
            setStats(s.data); setPending(p.data); setAllDoctors(d.data);
            setUsers(u.data); setHospitals(h.data); setAudit(a.data);
        } catch (e) {
            setError(formatApiError(e.response?.data?.detail));
        }
    };
    useEffect(() => { load(); }, []);

    // Fixed: proper await + error handling + loading state
    const approveDoctor = async (id, approve) => {
        setActionLoading(l => ({ ...l, [id]: approve ? "approving" : "rejecting" }));
        setError("");
        try {
            await api.post(`/admin/doctors/${id}/${approve ? "approve" : "reject"}`,
                { reason: approve ? "" : "Rejected by admin" }
            );
            setActionMsg(approve ? "Doctor approved successfully." : "Doctor rejected.");
            setTimeout(() => setActionMsg(""), 3000);
            await load();
        } catch (e) {
            setError(formatApiError(e.response?.data?.detail));
        } finally {
            setActionLoading(l => ({ ...l, [id]: null }));
        }
    };

    const toggleActive = async (uid, active) => {
        setActionLoading(l => ({ ...l, [uid]: "toggling" }));
        try {
            await api.patch(`/admin/users/${uid}/active`, { is_active: active });
            await load();
        } catch (e) {
            setError(formatApiError(e.response?.data?.detail));
        } finally {
            setActionLoading(l => ({ ...l, [uid]: null }));
        }
    };

    const tabs = [
        ["overview", "Overview"],
        ["doctors", `Doctors${pending.length > 0 ? ` (${pending.length} pending)` : ""}`],
        ["users", "Users"],
        ["hospitals", "Hospitals"],
        ["audit", "Audit logs"],
    ];

    return (
        <div className="min-h-screen">
            <Navbar />
            <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-8 pb-20" data-testid="admin-dashboard">
                <span className="overline">Admin panel</span>
                <h1 className="editorial mt-2 text-4xl sm:text-5xl text-mint-800">
                    Operations <em className="italic text-mint-600">overview</em>
                </h1>

                {error && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                        <AlertCircle size={15} /> {error}
                    </div>
                )}
                {actionMsg && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-mint-700 bg-mint-50 border border-mint-100 rounded-xl px-4 py-3">
                        <CheckCircle2 size={15} /> {actionMsg}
                    </div>
                )}

                {/* Pending banner */}
                {pending.length > 0 && tab !== "doctors" && (
                    <button onClick={() => setTab("doctors")}
                        className="mt-4 w-full sm:w-auto flex items-center gap-3 glass-mint rounded-2xl px-5 py-3 border border-mint-200 hover:border-mint-400 transition text-left">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                            <Clock size={15} className="text-amber-600" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-mint-800">{pending.length} doctor{pending.length > 1 ? "s" : ""} awaiting approval</p>
                            <p className="text-xs text-mint-800/50">Click to review and approve → </p>
                        </div>
                    </button>
                )}

                {/* Tabs */}
                <div className="mt-6 flex flex-wrap gap-2" data-testid="admin-tabs">
                    {tabs.map(([k, label]) => (
                        <button key={k} onClick={() => setTab(k)}
                            className={`btn-pill text-sm relative ${tab === k ? "btn-primary" : "btn-ghost"}`}
                            data-testid={`tab-${k}`}>
                            {label}
                            {k === "doctors" && pending.length > 0 && tab !== "doctors" && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full text-white text-[9px] flex items-center justify-center font-bold">
                                    {pending.length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* OVERVIEW */}
                {tab === "overview" && stats && (
                    <div className="mt-8 space-y-6">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="overview-stats">
                            <StatCard icon={Users} label="Patients" value={stats.patients} color="mint" />
                            <StatCard icon={Stethoscope} label="Doctors" value={stats.approved_doctors}
                                sub={`${stats.pending_doctors} pending`} color="mint" />
                            <StatCard icon={Building} label="Hospitals" value={stats.hospitals} color="mint" />
                            <StatCard icon={Calendar} label="Appointments" value={stats.appointments}
                                sub={`${stats.booked} booked · ${stats.completed} done`} color="mint" />
                        </div>
                        <div className="glass rounded-2xl p-5 sm:p-6">
                            <h2 className="editorial text-2xl text-mint-800 mb-4">Platform health</h2>
                            <div className="grid sm:grid-cols-3 gap-4">
                                <div className="rounded-xl bg-mint-50/60 border border-mint-100 p-4">
                                    <p className="text-xs text-mint-800/50 uppercase tracking-wider mb-1">Revenue</p>
                                    <p className="editorial text-2xl text-mint-800">₹{(stats.revenue || 0).toLocaleString()}</p>
                                </div>
                                <div className="rounded-xl bg-mint-50/60 border border-mint-100 p-4">
                                    <p className="text-xs text-mint-800/50 uppercase tracking-wider mb-1">Completion rate</p>
                                    <p className="editorial text-2xl text-mint-800">
                                        {stats.appointments > 0 ? Math.round((stats.completed / stats.appointments) * 100) : 0}%
                                    </p>
                                </div>
                                <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
                                    <p className="text-xs text-amber-700/70 uppercase tracking-wider mb-1">Pending approvals</p>
                                    <p className="editorial text-2xl text-amber-700">{stats.pending_doctors}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* DOCTORS */}
                {tab === "doctors" && (
                    <div className="mt-8 space-y-6">
                        {/* Invite Doctor */}
                        <InviteDoctor hospitals={hospitals} onInvited={load} />

                        {/* Pending */}
                        <div className="glass rounded-2xl p-5 sm:p-6">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                    <Clock size={15} className="text-amber-600" />
                                </div>
                                <div>
                                    <h2 className="editorial text-2xl text-mint-800">Pending approval</h2>
                                    <p className="text-xs text-mint-800/50">{pending.length} doctor{pending.length !== 1 ? "s" : ""} waiting</p>
                                </div>
                            </div>

                            {pending.length === 0 ? (
                                <div className="py-6 text-center">
                                    <CheckCircle2 size={28} className="text-mint-300 mx-auto mb-2" />
                                    <p className="text-sm text-mint-800/60">All doctors are reviewed. Nothing pending.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {pending.map(d => (
                                        <div key={d.id} className="rounded-2xl bg-white/60 border border-mint-100 p-4 flex flex-wrap items-start justify-between gap-4"
                                            data-testid={`pending-${d.id}`}>
                                            <div className="flex items-start gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-mint-100 flex items-center justify-center flex-shrink-0">
                                                    <Stethoscope size={16} className="text-mint-600" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-mint-800">
                                                        {d.name || "—"}
                                                        <span className="ml-2 text-xs text-mint-600 font-normal">{d.specialization}</span>
                                                    </p>
                                                    <p className="text-xs text-mint-800/60 mt-0.5">
                                                        {d.email} · License: <strong>{d.license_number || "not set"}</strong>
                                                    </p>
                                                    <p className="text-xs text-mint-800/50 mt-0.5">
                                                        {d.hospital?.name || "No hospital"} · {d.hospital?.area || ""}
                                                    </p>
                                                    {d.bio && <p className="text-xs text-mint-800/40 italic mt-1 max-w-md truncate">"{d.bio}"</p>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <button
                                                    onClick={() => approveDoctor(d.id, true)}
                                                    disabled={!!actionLoading[d.id]}
                                                    className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-mint-600 text-white text-xs font-medium hover:bg-mint-700 transition disabled:opacity-50"
                                                    data-testid={`approve-${d.id}`}>
                                                    {actionLoading[d.id] === "approving"
                                                        ? <><RefreshCw size={11} className="animate-spin" /> Approving…</>
                                                        : <><UserCheck size={12} /> Approve</>
                                                    }
                                                </button>
                                                <button
                                                    onClick={() => approveDoctor(d.id, false)}
                                                    disabled={!!actionLoading[d.id]}
                                                    className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 transition disabled:opacity-50"
                                                    data-testid={`reject-${d.id}`}>
                                                    {actionLoading[d.id] === "rejecting"
                                                        ? <><RefreshCw size={11} className="animate-spin" /> Rejecting…</>
                                                        : <><UserX size={12} /> Reject</>
                                                    }
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* All doctors table */}
                        <div className="glass rounded-2xl p-5 sm:p-6">
                            <h2 className="editorial text-2xl text-mint-800 mb-4">All doctors</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-mint-800/50 text-xs uppercase tracking-wider border-b border-mint-100">
                                            <th className="pb-3 pr-4">Doctor</th>
                                            <th className="pb-3 pr-4">Specialty</th>
                                            <th className="pb-3 pr-4">Hospital</th>
                                            <th className="pb-3 pr-4">Status</th>
                                            <th className="pb-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-mint-50">
                                        {allDoctors.map(d => (
                                            <tr key={d.id} data-testid={`admin-doc-${d.id}`}>
                                                <td className="py-3 pr-4 font-medium text-mint-800">{d.name || "—"}</td>
                                                <td className="py-3 pr-4 text-mint-800/70 text-xs">{d.specialization}</td>
                                                <td className="py-3 pr-4 text-mint-800/70 text-xs">{d.hospital?.name || "—"}</td>
                                                <td className="py-3 pr-4">
                                                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium
                                                        ${d.is_approved ? "bg-mint-100 text-mint-700" : "bg-amber-50 text-amber-700"}`}>
                                                        {d.is_approved ? "✓ Approved" : "Pending"}
                                                    </span>
                                                </td>
                                                <td className="py-3 text-right">
                                                    <button
                                                        onClick={() => approveDoctor(d.id, !d.is_approved)}
                                                        disabled={!!actionLoading[d.id]}
                                                        className={`text-xs px-3 py-1.5 rounded-full border transition disabled:opacity-50
                                                            ${d.is_approved
                                                                ? "border-red-200 text-red-600 hover:bg-red-50"
                                                                : "border-mint-300 text-mint-700 hover:bg-mint-50"}`}>
                                                        {actionLoading[d.id] ? <RefreshCw size={11} className="inline animate-spin" />
                                                            : d.is_approved ? "Suspend" : "Approve"}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* USERS */}
                {tab === "users" && (
                    <div className="mt-8 glass rounded-2xl p-5 sm:p-6">
                        <h2 className="editorial text-2xl text-mint-800 mb-4">All users</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-mint-800/50 text-xs uppercase tracking-wider border-b border-mint-100">
                                        <th className="pb-3 pr-4">Name</th>
                                        <th className="pb-3 pr-4">Email</th>
                                        <th className="pb-3 pr-4">Role</th>
                                        <th className="pb-3 pr-4">2FA</th>
                                        <th className="pb-3 pr-4">Active</th>
                                        <th className="pb-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-mint-50">
                                    {users.map(u => (
                                        <tr key={u.id} data-testid={`admin-user-${u.id}`}>
                                            <td className="py-3 pr-4 font-medium text-mint-800">{u.full_name}</td>
                                            <td className="py-3 pr-4 text-mint-800/60 text-xs">{u.email}</td>
                                            <td className="py-3 pr-4">
                                                <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize
                                                    ${u.role === "admin" ? "bg-purple-50 text-purple-700"
                                                    : u.role === "doctor" ? "bg-mint-100 text-mint-700"
                                                    : "bg-blue-50 text-blue-700"}`}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="py-3 pr-4 text-xs">{u.two_factor_enabled ? "✓" : "—"}</td>
                                            <td className="py-3 pr-4">
                                                <span className={`text-xs font-medium ${u.is_active ? "text-mint-600" : "text-red-500"}`}>
                                                    {u.is_active ? "Active" : "Disabled"}
                                                </span>
                                            </td>
                                            <td className="py-3 text-right">
                                                {u.role !== "admin" && (
                                                    <button onClick={() => toggleActive(u.id, !u.is_active)}
                                                        disabled={!!actionLoading[u.id]}
                                                        className={`text-xs px-3 py-1.5 rounded-full border transition disabled:opacity-50
                                                            ${u.is_active
                                                                ? "border-red-200 text-red-600 hover:bg-red-50"
                                                                : "border-mint-200 text-mint-600 hover:bg-mint-50"}`}>
                                                        {actionLoading[u.id] ? <RefreshCw size={11} className="inline animate-spin" />
                                                            : u.is_active ? "Disable" : "Enable"}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {tab === "hospitals" && <HospitalAdmin hospitals={hospitals} reload={load} />}

                {/* AUDIT */}
                {tab === "audit" && (
                    <div className="mt-8 glass rounded-2xl p-5 sm:p-6">
                        <h2 className="editorial text-2xl text-mint-800 mb-4">Audit logs</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="text-left text-mint-800/50 uppercase tracking-wider border-b border-mint-100">
                                        <th className="pb-3 pr-4">When</th>
                                        <th className="pb-3 pr-4">Who</th>
                                        <th className="pb-3 pr-4">Action</th>
                                        <th className="pb-3 pr-4">Resource</th>
                                        <th className="pb-3">IP</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-mint-50">
                                    {audit.slice(0, 100).map(a => (
                                        <tr key={a.id}>
                                            <td className="py-2 pr-4 text-mint-800/60 whitespace-nowrap">{new Date(a.created_at).toLocaleString()}</td>
                                            <td className="py-2 pr-4 text-mint-800/50 font-mono">{(a.user_id || "anon").slice(0, 8)}…</td>
                                            <td className="py-2 pr-4 font-semibold text-mint-800">{a.action}</td>
                                            <td className="py-2 pr-4 text-mint-800/60">{a.resource_type}/{(a.resource_id || "—").slice(0, 8)}</td>
                                            <td className="py-2 text-mint-800/50">{a.ip_address}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}

function StatCard({ icon: Icon, label, value, sub, color }) {
    return (
        <div className="glass-mint rounded-2xl p-4 sm:p-5" data-testid={`stat-${label.toLowerCase()}`}>
            <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-mint-600/10 flex items-center justify-center">
                    <Icon size={15} className="text-mint-600" />
                </div>
                <p className="overline text-[10px]">{label}</p>
            </div>
            <p className="editorial text-3xl sm:text-4xl text-mint-800">{value}</p>
            {sub && <p className="mt-1 text-xs text-mint-800/50">{sub}</p>}
        </div>
    );
}

function InviteDoctor({ hospitals, onInvited }) {
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [done, setDone] = useState(null); // { email, hospital, temp_password, email_sent }
    const [error, setError] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [form, setForm] = useState({
        email: "", full_name: "", hospital_id: "",
        specialization: "", license_number: "",
        years_of_experience: 1, consultation_fee: 1000,
    });
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const SPECS = [
        "Cardiology","Dermatology","Endocrinology","Gastroenterology",
        "General Medicine","General Surgery","Gynaecology","Neurology",
        "Oncology","Ophthalmology","Orthopaedics","Paediatrics",
        "Psychiatry","Pulmonology","Radiology","Urology",
    ];

    const send = async () => {
        setSaving(true); setError("");
        try {
            const { data } = await api.post("/admin/invite-doctor", {
                ...form,
                years_of_experience: Number(form.years_of_experience),
                consultation_fee: Number(form.consultation_fee),
            });
            setDone(data);
            onInvited();
        } catch (e) {
            setError(formatApiError(e.response?.data?.detail));
        } finally { setSaving(false); }
    };

    const reset = () => {
        setDone(null); setOpen(false); setError("");
        setForm({ email: "", full_name: "", hospital_id: "", specialization: "", license_number: "", years_of_experience: 1, consultation_fee: 1000 });
    };

    return (
        <div className="glass rounded-2xl overflow-hidden">
            {/* Header — always visible */}
            <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between p-5 sm:p-6 text-left hover:bg-mint-50/30 transition">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-mint-600/10 flex items-center justify-center">
                        <Mail size={18} className="text-mint-600" />
                    </div>
                    <div>
                        <h2 className="editorial text-2xl text-mint-800">Invite a doctor</h2>
                        <p className="text-xs text-mint-800/50 mt-0.5">Send login credentials via email to onboard a new doctor</p>
                    </div>
                </div>
                <ChevronDown size={18} className={`text-mint-600 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {/* Form */}
            {open && !done && (
                <div className="border-t border-mint-100 p-5 sm:p-6">
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <label className="block mb-1.5 text-xs font-semibold text-mint-800/50 uppercase tracking-wider">Doctor's email address</label>
                            <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
                                placeholder="doctor@example.com"
                                className="w-full px-4 py-3 rounded-xl border border-mint-100 bg-white/80 text-mint-800 text-sm outline-none focus:ring-2 focus:ring-mint-500" />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block mb-1.5 text-xs font-semibold text-mint-800/50 uppercase tracking-wider">Full name</label>
                            <input value={form.full_name} onChange={e => set("full_name", e.target.value)}
                                placeholder="Dr. Full Name"
                                className="w-full px-4 py-3 rounded-xl border border-mint-100 bg-white/80 text-mint-800 text-sm outline-none focus:ring-2 focus:ring-mint-500" />
                        </div>
                        <div>
                            <label className="block mb-1.5 text-xs font-semibold text-mint-800/50 uppercase tracking-wider">Hospital</label>
                            <select value={form.hospital_id} onChange={e => set("hospital_id", e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-mint-100 bg-white/80 text-mint-800 text-sm outline-none focus:ring-2 focus:ring-mint-500">
                                <option value="">Select hospital</option>
                                {hospitals.map(h => <option key={h.id} value={h.id}>{h.name} — {h.area}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block mb-1.5 text-xs font-semibold text-mint-800/50 uppercase tracking-wider">Specialization</label>
                            <select value={form.specialization} onChange={e => set("specialization", e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-mint-100 bg-white/80 text-mint-800 text-sm outline-none focus:ring-2 focus:ring-mint-500">
                                <option value="">Select specialization</option>
                                {SPECS.map(s => <option key={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block mb-1.5 text-xs font-semibold text-mint-800/50 uppercase tracking-wider">License number</label>
                            <input value={form.license_number} onChange={e => set("license_number", e.target.value)}
                                placeholder="MH-CARD-12001"
                                className="w-full px-4 py-3 rounded-xl border border-mint-100 bg-white/80 text-mint-800 text-sm outline-none focus:ring-2 focus:ring-mint-500" />
                        </div>
                        <div>
                            <label className="block mb-1.5 text-xs font-semibold text-mint-800/50 uppercase tracking-wider">Consultation fee (₹)</label>
                            <input type="number" min={0} value={form.consultation_fee} onChange={e => set("consultation_fee", e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-mint-100 bg-white/80 text-mint-800 text-sm outline-none focus:ring-2 focus:ring-mint-500" />
                        </div>
                    </div>

                    {error && (
                        <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                            <AlertCircle size={14} /> {error}
                        </div>
                    )}

                    <div className="mt-5 flex gap-3">
                        <button onClick={reset} className="btn-pill btn-ghost text-sm px-5">Cancel</button>
                        <button onClick={send}
                            disabled={saving || !form.email || !form.hospital_id || !form.specialization || !form.full_name}
                            className="flex-1 btn-pill btn-primary text-sm justify-center disabled:opacity-40">
                            {saving
                                ? <><RefreshCw size={14} className="animate-spin" /> Sending invite…</>
                                : <><Send size={14} /> Send invite email</>
                            }
                        </button>
                    </div>
                </div>
            )}

            {/* Success state */}
            {open && done && (
                <div className="border-t border-mint-100 p-5 sm:p-6">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 rounded-xl bg-mint-600/10 flex items-center justify-center">
                            <CheckCircle2 size={18} className="text-mint-600" />
                        </div>
                        <div>
                            <p className="font-semibold text-mint-800">Invite sent successfully!</p>
                            <p className="text-xs text-mint-800/50">
                                {done.email_sent ? "Email delivered to doctor's inbox." : "Email not configured — credentials shown below."}
                            </p>
                        </div>
                    </div>

                    {/* Credentials summary card */}
                    <div className="rounded-2xl bg-mint-50/60 border border-mint-200 overflow-hidden mb-5">
                        <div className="px-5 py-3 border-b border-mint-100 flex items-center justify-between">
                            <p className="text-xs font-semibold text-mint-800/50 uppercase tracking-wider">Doctor credentials</p>
                            {!done.email_sent && (
                                <span className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5">
                                    Email not sent — share manually
                                </span>
                            )}
                        </div>
                        <div className="divide-y divide-mint-100">
                            {[
                                ["Email", done.email],
                                ["Hospital", done.hospital],
                            ].map(([label, val]) => (
                                <div key={label} className="flex items-center justify-between px-5 py-3">
                                    <span className="text-xs text-mint-800/50 w-36">{label}</span>
                                    <span className="text-sm text-mint-800 font-medium">{val}</span>
                                </div>
                            ))}
                            <div className="flex items-center justify-between px-5 py-3">
                                <span className="text-xs text-mint-800/50 w-36">Temp password</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-mono text-mint-800 font-semibold">
                                        {showPass ? done.temp_password : "••••••••••••"}
                                    </span>
                                    <button onClick={() => setShowPass(s => !s)} className="text-mint-400 hover:text-mint-600 transition">
                                        {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="text-xs text-mint-800/40 mb-5">
                        The doctor needs to log in, complete their profile, and then wait for your approval to go live on the platform.
                    </div>

                    <button onClick={reset} className="btn-pill btn-primary text-sm">
                        <Mail size={14} /> Invite another doctor
                    </button>
                </div>
            )}
        </div>
    );
}

function HospitalImageUploader({ value, onChange }) {
    const [uploading, setUploading] = useState(false);
    const [err, setErr] = useState("");

    const handleFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { setErr("Max 5MB"); return; }
        setUploading(true); setErr("");
        try {
            const fd = new FormData();
            fd.append("file", file);
            const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/upload-hospital-image`, {
                method: "POST", credentials: "include", body: fd,
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.detail || "Upload failed"); }
            const { url } = await res.json();
            onChange(url);
        } catch(e) { setErr(e.message); }
        finally { setUploading(false); }
    };

    return (
        <div className="sm:col-span-2 space-y-2">
            <div className="flex items-center gap-3">
                <div className="w-24 h-14 rounded-xl bg-mint-50 border border-mint-100 flex-shrink-0 overflow-hidden">
                    {value
                        ? <img src={value} alt="Preview" className="w-full h-full object-cover" onError={e=>e.target.style.display="none"}/>
                        : <div className="w-full h-full flex items-center justify-center text-mint-300 text-xs">No image</div>}
                </div>
                <div className="flex-1">
                    <label className={`flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-xl border text-sm font-medium transition
                        ${uploading ? "bg-mint-50 text-mint-400 border-mint-100 cursor-wait" : "bg-white border-mint-200 text-mint-700 hover:bg-mint-50 hover:border-mint-400"}`}>
                        {uploading ? <><RefreshCw size={13} className="animate-spin"/> Uploading…</> : <><Upload size={13}/> Upload hospital photo</>}
                        <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} disabled={uploading}/>
                    </label>
                    <p className="text-xs text-mint-800/40 mt-1">JPG, PNG · 16:9 ratio recommended · max 5MB</p>
                </div>
            </div>
            {err && <p className="text-xs text-red-600">{err}</p>}
            <div>
                <p className="text-xs text-mint-800/40 mb-1">Or paste image URL</p>
                <input value={!value?.startsWith("data:") ? value : ""} onChange={e=>onChange(e.target.value)}
                    placeholder="https://example.com/hospital.jpg"
                    className="w-full px-3 py-2 rounded-xl border border-mint-100 bg-white/80 text-sm outline-none focus:ring-2 focus:ring-mint-400"/>
            </div>
        </div>
    );
}

function HospitalAdmin({ hospitals, reload }) {
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({ name: "", address: "", area: "", city: "", state: "", pin_code: "", phone: "", description: "", specialties_available: [], image_url: "" });
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const create = async () => {
        setSaving(true);
        try {
            await api.post("/admin/hospitals", form);
            setShowAdd(false);
            setForm({ name: "", address: "", area: "", city: "", state: "", pin_code: "", phone: "", description: "", specialties_available: [], image_url: "" });
            reload();
        } catch (e) { setError(formatApiError(e.response?.data?.detail)); }
        finally { setSaving(false); }
    };

    const remove = async (id) => {
        if (!window.confirm("Delete this hospital? This cannot be undone.")) return;
        await api.delete(`/admin/hospitals/${id}`);
        reload();
    };

    const toggleSpec = s => setForm(f => ({
        ...f, specialties_available: f.specialties_available.includes(s)
            ? f.specialties_available.filter(x => x !== s)
            : [...f.specialties_available, s]
    }));

    return (
        <div className="mt-8 space-y-4">
            <div className="glass rounded-2xl p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="editorial text-2xl text-mint-800">Hospitals</h2>
                    <button onClick={() => setShowAdd(v => !v)} className="btn-pill btn-primary text-sm" data-testid="add-hospital">
                        <Plus size={14} /> {showAdd ? "Cancel" : "New hospital"}
                    </button>
                </div>

                {showAdd && (
                    <div className="mb-6 rounded-2xl bg-white/60 border border-mint-100 p-5 grid sm:grid-cols-2 gap-3" data-testid="hospital-form">
                        <p className="sm:col-span-2 text-xs font-semibold text-mint-600 uppercase tracking-wider">New hospital details</p>
                        {[["name","Name *"],["phone","Phone"],["address","Address"],["area","Area *"],["city","City *"],["state","State"],["pin_code","Pin code"]].map(([k,p]) => (
                            <input key={k} placeholder={p} value={form[k]} onChange={e => setForm({...form,[k]:e.target.value})}
                                className={`rounded-xl border border-mint-100 bg-white/80 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-mint-500 ${k==="address"?"sm:col-span-2":""}`} />
                        ))}
                        <HospitalImageUploader value={form.image_url} onChange={v => setForm({...form, image_url: v})} />
                        <textarea placeholder="Description" rows={2} value={form.description} onChange={e => setForm({...form,description:e.target.value})}
                            className="sm:col-span-2 rounded-xl border border-mint-100 bg-white/80 px-3 py-2.5 text-sm resize-none outline-none focus:ring-2 focus:ring-mint-500" />
                        <div className="sm:col-span-2">
                            <p className="text-xs font-medium text-mint-800/60 mb-2">Specialties available</p>
                            <div className="flex flex-wrap gap-1.5">
                                {SPECIALTIES.map(s => (
                                    <button key={s} type="button" onClick={() => toggleSpec(s)}
                                        className={`rounded-full px-2.5 py-1 text-xs border transition ${form.specialties_available.includes(s) ? "bg-mint-600 text-white border-mint-600" : "bg-white/80 border-mint-100 text-mint-800 hover:border-mint-400"}`}>
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {error && <p className="text-red-600 text-xs sm:col-span-2">{error}</p>}
                        <button onClick={create} disabled={saving} className="btn-pill btn-primary text-sm sm:col-span-2 justify-center disabled:opacity-50" data-testid="submit-hospital">
                            {saving ? "Creating…" : "Create hospital"}
                        </button>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-mint-800/50 text-xs uppercase tracking-wider border-b border-mint-100">
                                <th className="pb-3 pr-4">Name</th><th className="pb-3 pr-4">Area</th>
                                <th className="pb-3 pr-4">City</th><th className="pb-3 pr-4">Pin</th>
                                <th className="pb-3 pr-4">Doctors</th><th className="pb-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-mint-50">
                            {hospitals.map(h => (
                                <tr key={h.id} data-testid={`admin-hosp-${h.id}`}>
                                    <td className="py-3 pr-4 font-medium text-mint-800">{h.name}</td>
                                    <td className="py-3 pr-4 text-mint-800/60 text-xs">{h.area}</td>
                                    <td className="py-3 pr-4 text-mint-800/60 text-xs">{h.city}</td>
                                    <td className="py-3 pr-4 text-mint-800/60 text-xs">{h.pin_code}</td>
                                    <td className="py-3 pr-4 text-mint-800/60 text-xs">{h.doctor_count}</td>
                                    <td className="py-3 text-right">
                                        <button onClick={() => remove(h.id)} className="text-xs px-3 py-1.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50 transition">
                                            <Trash2 size={11} className="inline mr-1" />Remove
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
