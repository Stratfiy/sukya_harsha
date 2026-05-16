import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import api, { formatApiError } from "../lib/api";
import { Users, Stethoscope, Calendar, IndianRupee, CheckCircle2, XCircle, Building, Plus, Trash2, Shield } from "lucide-react";

const SPECIALTIES = [
    "Cardiology", "Dermatology", "Neurology", "Orthopedics", "Pediatrics",
    "Psychiatry", "General Medicine", "ENT", "Ophthalmology", "Gynecology", "Dentistry",
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

    const load = async () => {
        try {
            const [s, p, d, u, h, a] = await Promise.all([
                api.get("/admin/stats"), api.get("/admin/doctors/pending"), api.get("/admin/doctors"),
                api.get("/admin/users"), api.get("/hospitals"), api.get("/admin/audit-logs"),
            ]);
            setStats(s.data); setPending(p.data); setAllDoctors(d.data);
            setUsers(u.data); setHospitals(h.data); setAudit(a.data);
        } catch (e) {
            setError(formatApiError(e.response?.data?.detail));
        }
    };
    useEffect(() => { load(); }, []);

    const approveDoctor = async (id, approved) => {
        await api.post(`/admin/doctors/${id}/${approved ? "approve" : "reject"}`, { reason: approved ? "" : "Pending docs" });
        load();
    };

    const toggleActive = async (uid, active) => {
        await api.patch(`/admin/users/${uid}/active`, { is_active: active });
        load();
    };

    return (
        <div className="min-h-screen">
            <Navbar />
            <section className="mx-auto max-w-7xl px-6 pt-10 pb-20" data-testid="admin-dashboard">
                <span className="overline">Admin panel</span>
                <h1 className="editorial mt-2 text-5xl text-mint-800">Operations <em className="italic text-mint-600">overview</em></h1>
                {error && <p className="text-red-600 text-sm mt-2">{error}</p>}

                <div className="mt-8 flex flex-wrap gap-2" data-testid="admin-tabs">
                    {[
                        ["overview", "Overview"],
                        ["doctors", `Doctors (${pending.length} pending)`],
                        ["users", "Users"],
                        ["hospitals", "Hospitals"],
                        ["audit", "Audit logs"],
                    ].map(([k, label]) => (
                        <button key={k} onClick={() => setTab(k)} className={`btn-pill text-sm ${tab === k ? "btn-primary" : "btn-ghost"}`} data-testid={`tab-${k}`}>
                            {label}
                        </button>
                    ))}
                </div>

                {tab === "overview" && stats && (
                    <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="overview-stats">
                        <Stat icon={Users} label="Patients" value={stats.patients} />
                        <Stat icon={Stethoscope} label="Doctors" value={stats.doctors} sub={`${stats.approved_doctors} approved · ${stats.pending_doctors} pending`} />
                        <Stat icon={Building} label="Hospitals" value={stats.hospitals} />
                        <Stat icon={IndianRupee} label="Revenue" value={`₹${stats.revenue.toLocaleString()}`} />
                        <Stat icon={Calendar} label="Appointments" value={stats.appointments} sub={`${stats.booked} booked · ${stats.completed} done`} />
                    </div>
                )}

                {tab === "doctors" && (
                    <div className="mt-8 space-y-8">
                        <Card title="Pending approval">
                            {pending.length === 0 ? <p className="text-sm text-mint-800/60">No pending doctors.</p> : (
                                <ul className="divide-y divide-mint-100">
                                    {pending.map((d) => (
                                        <li key={d.id} className="py-4 flex flex-wrap items-start justify-between gap-3" data-testid={`pending-${d.id}`}>
                                            <div>
                                                <p className="font-medium text-mint-800">{d.name} <span className="text-xs text-mint-600">· {d.specialization}</span></p>
                                                <p className="text-xs text-mint-800/60">{d.email} · License {d.license_number} · {d.hospital?.name || "no hospital"}</p>
                                                <p className="text-xs text-mint-800/70 mt-1 italic">{d.bio}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => approveDoctor(d.id, true)} className="btn-pill btn-primary text-xs" data-testid={`approve-${d.id}`}><CheckCircle2 size={12} /> Approve</button>
                                                <button onClick={() => approveDoctor(d.id, false)} className="btn-pill btn-ghost text-xs text-red-600" data-testid={`reject-${d.id}`}><XCircle size={12} /> Reject</button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Card>
                        <Card title="All doctors">
                            <table className="w-full text-sm">
                                <thead className="text-left text-mint-800/60 text-xs uppercase">
                                    <tr><th className="py-2">Doctor</th><th>Specialty</th><th>Hospital</th><th>Status</th><th className="text-right">Action</th></tr>
                                </thead>
                                <tbody className="divide-y divide-mint-100">
                                    {allDoctors.map((d) => (
                                        <tr key={d.id} data-testid={`admin-doc-${d.id}`}>
                                            <td className="py-2 font-medium text-mint-800">{d.name}</td>
                                            <td className="text-mint-800/70">{d.specialization}</td>
                                            <td className="text-mint-800/70">{d.hospital?.name || "—"}</td>
                                            <td>
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${d.is_approved ? "bg-mint-100 text-mint-700" : "bg-red-50 text-red-700"}`}>
                                                    {d.is_approved ? "Approved" : "Pending"}
                                                </span>
                                            </td>
                                            <td className="text-right">
                                                <button onClick={() => approveDoctor(d.id, !d.is_approved)} className="btn-pill btn-ghost text-xs">
                                                    {d.is_approved ? "Suspend" : "Approve"}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Card>
                    </div>
                )}

                {tab === "users" && (
                    <Card title="All users" extraClass="mt-8">
                        <table className="w-full text-sm">
                            <thead className="text-left text-mint-800/60 text-xs uppercase">
                                <tr><th className="py-2">Name</th><th>Email</th><th>Role</th><th>2FA</th><th>Active</th><th className="text-right">Action</th></tr>
                            </thead>
                            <tbody className="divide-y divide-mint-100">
                                {users.map((u) => (
                                    <tr key={u.id} data-testid={`admin-user-${u.id}`}>
                                        <td className="py-2 font-medium text-mint-800">{u.full_name}</td>
                                        <td className="text-mint-800/70">{u.email}</td>
                                        <td className="capitalize"><span className="rounded-full bg-mint-50 text-mint-700 text-xs px-2 py-0.5">{u.role}</span></td>
                                        <td>{u.two_factor_enabled ? "✓" : "—"}</td>
                                        <td>{u.is_active ? "Yes" : "No"}</td>
                                        <td className="text-right">
                                            {u.role !== "admin" && (
                                                <button onClick={() => toggleActive(u.id, !u.is_active)} className="btn-pill btn-ghost text-xs">
                                                    {u.is_active ? "Disable" : "Enable"}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>
                )}

                {tab === "hospitals" && <HospitalAdmin hospitals={hospitals} reload={load} />}

                {tab === "audit" && (
                    <Card title="Audit logs" extraClass="mt-8">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead className="text-left text-mint-800/60 uppercase">
                                    <tr><th className="py-2">When</th><th>Who</th><th>Action</th><th>Resource</th><th>IP</th></tr>
                                </thead>
                                <tbody className="divide-y divide-mint-100">
                                    {audit.slice(0, 100).map((a) => (
                                        <tr key={a.id}>
                                            <td className="py-1.5 text-mint-800/70">{new Date(a.created_at).toLocaleString()}</td>
                                            <td className="text-mint-800/70">{a.user_id || "anon"}</td>
                                            <td className="font-medium text-mint-800">{a.action}</td>
                                            <td className="text-mint-800/70">{a.resource_type}/{(a.resource_id || "—").slice(0, 8)}</td>
                                            <td className="text-mint-800/60">{a.ip_address}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}
            </section>
        </div>
    );
}

function Stat({ icon: Icon, label, value, sub }) {
    return (
        <div className="glass-mint rounded-2xl p-6" data-testid={`stat-${label.toLowerCase()}`}>
            <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-mint-500 text-white"><Icon size={16} /></div>
                <p className="overline">{label}</p>
            </div>
            <p className="editorial mt-3 text-4xl text-mint-800">{value}</p>
            {sub && <p className="mt-1 text-xs text-mint-800/60">{sub}</p>}
        </div>
    );
}

function Card({ title, children, extraClass = "" }) {
    return (
        <div className={`glass rounded-2xl p-6 ${extraClass}`}>
            <h2 className="editorial text-2xl text-mint-800">{title}</h2>
            <div className="mt-4 overflow-x-auto">{children}</div>
        </div>
    );
}

function HospitalAdmin({ hospitals, reload }) {
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({ name: "", address: "", area: "", city: "", state: "", pin_code: "", phone: "", email: "", description: "", specialties_available: [], image_url: "" });
    const [error, setError] = useState("");

    const create = async () => {
        try {
            await api.post("/admin/hospitals", form);
            setShowAdd(false); setForm({ name: "", address: "", area: "", city: "", state: "", pin_code: "", phone: "", email: "", description: "", specialties_available: [], image_url: "" });
            reload();
        } catch (e) {
            setError(formatApiError(e.response?.data?.detail));
        }
    };
    const remove = async (id) => {
        if (!window.confirm("Delete this hospital?")) return;
        await api.delete(`/admin/hospitals/${id}`);
        reload();
    };
    const toggleSpec = (s) => {
        setForm((f) => ({ ...f, specialties_available: f.specialties_available.includes(s) ? f.specialties_available.filter((x) => x !== s) : [...f.specialties_available, s] }));
    };

    return (
        <Card title="Hospitals" extraClass="mt-8">
            <div className="flex items-center justify-between">
                <p className="text-sm text-mint-800/70">Manage the hospitals available on Sukhya Med.</p>
                <button onClick={() => setShowAdd((v) => !v)} className="btn-pill btn-primary text-sm" data-testid="add-hospital"><Plus size={14} /> {showAdd ? "Close" : "New hospital"}</button>
            </div>
            {showAdd && (
                <div className="mt-4 rounded-2xl bg-white/60 border border-mint-100 p-4 grid sm:grid-cols-2 gap-3" data-testid="hospital-form">
                    <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl border border-mint-100 bg-white/80 px-3 py-2 text-sm" />
                    <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-xl border border-mint-100 bg-white/80 px-3 py-2 text-sm" />
                    <input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="sm:col-span-2 rounded-xl border border-mint-100 bg-white/80 px-3 py-2 text-sm" />
                    <input placeholder="Area" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className="rounded-xl border border-mint-100 bg-white/80 px-3 py-2 text-sm" />
                    <input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="rounded-xl border border-mint-100 bg-white/80 px-3 py-2 text-sm" />
                    <input placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="rounded-xl border border-mint-100 bg-white/80 px-3 py-2 text-sm" />
                    <input placeholder="Pin code" value={form.pin_code} onChange={(e) => setForm({ ...form, pin_code: e.target.value })} className="rounded-xl border border-mint-100 bg-white/80 px-3 py-2 text-sm" />
                    <input placeholder="Image URL" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="sm:col-span-2 rounded-xl border border-mint-100 bg-white/80 px-3 py-2 text-sm" />
                    <textarea placeholder="Description" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="sm:col-span-2 rounded-xl border border-mint-100 bg-white/80 px-3 py-2 text-sm" />
                    <div className="sm:col-span-2">
                        <p className="text-xs text-mint-800/70 mb-1">Specialties</p>
                        <div className="flex flex-wrap gap-1.5">
                            {SPECIALTIES.map((s) => (
                                <button key={s} type="button" onClick={() => toggleSpec(s)} className={`rounded-full px-2.5 py-1 text-xs border ${form.specialties_available.includes(s) ? "bg-mint-500 text-white border-mint-500" : "bg-white/80 border-mint-100"}`}>
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                    {error && <p className="text-red-600 text-xs sm:col-span-2">{error}</p>}
                    <button onClick={create} className="btn-pill btn-primary text-sm sm:col-span-2" data-testid="submit-hospital">Create hospital</button>
                </div>
            )}
            <table className="mt-4 w-full text-sm">
                <thead className="text-left text-mint-800/60 text-xs uppercase">
                    <tr><th className="py-2">Name</th><th>Area</th><th>City</th><th>Pin</th><th>Doctors</th><th className="text-right">Action</th></tr>
                </thead>
                <tbody className="divide-y divide-mint-100">
                    {hospitals.map((h) => (
                        <tr key={h.id} data-testid={`admin-hosp-${h.id}`}>
                            <td className="py-2 font-medium text-mint-800">{h.name}</td>
                            <td className="text-mint-800/70">{h.area}</td>
                            <td className="text-mint-800/70">{h.city}</td>
                            <td className="text-mint-800/70">{h.pin_code}</td>
                            <td className="text-mint-800/70">{h.doctor_count}</td>
                            <td className="text-right">
                                <button onClick={() => remove(h.id)} className="btn-pill btn-ghost text-xs text-red-600"><Trash2 size={12} /> Remove</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </Card>
    );
}
