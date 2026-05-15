import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import api from "../lib/api";
import { Users, Stethoscope, Calendar, IndianRupee, CheckCircle2, XCircle } from "lucide-react";

export default function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [doctors, setDoctors] = useState([]);

    const load = async () => {
        const [s, u, d] = await Promise.all([
            api.get("/admin/stats"),
            api.get("/admin/users"),
            api.get("/admin/doctors"),
        ]);
        setStats(s.data); setUsers(u.data); setDoctors(d.data);
    };
    useEffect(() => { load(); }, []);

    const toggleApproval = async (id, approved) => {
        await api.patch(`/admin/doctors/${id}/approval`, { approved });
        load();
    };

    return (
        <div className="min-h-screen">
            <Navbar />
            <section className="mx-auto max-w-7xl px-6 pt-10 pb-20" data-testid="admin-dashboard">
                <span className="overline">Admin panel</span>
                <h1 className="editorial mt-2 text-5xl text-mint-800">Operations <em className="italic text-mint-600">overview</em></h1>

                {!stats ? <p className="mt-6 text-mint-800/60">Loading…</p> : (
                    <>
                        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <Stat icon={Users} label="Users" value={stats.users} sub={`${stats.patients} patients · ${stats.doctors} doctors`} />
                            <Stat icon={Stethoscope} label="Doctors" value={stats.doctor_profiles} sub={`${stats.approved_doctors} approved · ${stats.pending_doctors} pending`} />
                            <Stat icon={Calendar} label="Appointments" value={stats.appointments} sub={`${stats.confirmed_appointments} confirmed · ${stats.completed_appointments} done`} />
                            <Stat icon={IndianRupee} label="Revenue" value={`₹${stats.revenue.toLocaleString()}`} sub="From confirmed + completed" />
                        </div>

                        <div className="mt-10 glass rounded-2xl p-6" data-testid="admin-doctors-table">
                            <h2 className="editorial text-3xl text-mint-800">Doctors</h2>
                            <div className="mt-4 overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-left text-mint-800/60 text-xs uppercase">
                                        <tr><th className="py-2 pr-3">Doctor</th><th className="py-2 pr-3">Specialty</th><th className="py-2 pr-3">Hospital</th><th className="py-2 pr-3">Status</th><th className="py-2 pr-3 text-right">Action</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-mint-100">
                                        {doctors.map((d) => (
                                            <tr key={d.id} data-testid={`admin-doc-${d.id}`}>
                                                <td className="py-3 pr-3 font-medium text-mint-800">{d.name}</td>
                                                <td className="py-3 pr-3 text-mint-800/70">{d.specialty}</td>
                                                <td className="py-3 pr-3 text-mint-800/70">{d.hospital}</td>
                                                <td className="py-3 pr-3">
                                                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs ${d.approved ? "bg-mint-100 text-mint-700" : "bg-red-50 text-red-700"}`}>
                                                        {d.approved ? <><CheckCircle2 size={12} /> Approved</> : <><XCircle size={12} /> Pending</>}
                                                    </span>
                                                </td>
                                                <td className="py-3 pr-3 text-right">
                                                    <button
                                                        onClick={() => toggleApproval(d.id, !d.approved)}
                                                        className="btn-pill btn-ghost text-xs"
                                                        data-testid={`toggle-approval-${d.id}`}
                                                    >
                                                        {d.approved ? "Suspend" : "Approve"}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="mt-8 glass rounded-2xl p-6" data-testid="admin-users-table">
                            <h2 className="editorial text-3xl text-mint-800">Users</h2>
                            <div className="mt-4 overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-left text-mint-800/60 text-xs uppercase">
                                        <tr><th className="py-2 pr-3">Name</th><th className="py-2 pr-3">Email</th><th className="py-2 pr-3">Role</th><th className="py-2 pr-3">Joined</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-mint-100">
                                        {users.map((u) => (
                                            <tr key={u.id}>
                                                <td className="py-3 pr-3 font-medium text-mint-800">{u.name}</td>
                                                <td className="py-3 pr-3 text-mint-800/70">{u.email}</td>
                                                <td className="py-3 pr-3"><span className="rounded-full bg-mint-50 text-mint-700 text-xs px-2 py-0.5 capitalize">{u.role}</span></td>
                                                <td className="py-3 pr-3 text-mint-800/60 text-xs">{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </section>
        </div>
    );
}

function Stat({ icon: Icon, label, value, sub }) {
    return (
        <div className="glass-mint rounded-2xl p-6" data-testid={`admin-stat-${label.toLowerCase()}`}>
            <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-mint-500 text-white"><Icon size={16} /></div>
                <p className="overline">{label}</p>
            </div>
            <p className="editorial mt-3 text-4xl text-mint-800">{value}</p>
            <p className="mt-1 text-xs text-mint-800/60">{sub}</p>
        </div>
    );
}
