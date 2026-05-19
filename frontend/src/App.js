import "@/App.css";
import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import AIChatBubble from "./components/AIChatBubble";
import api from "./lib/api";

import Landing from "./pages/Landing";
import About from "./pages/About";
import Services from "./pages/Services";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import FindDoctors from "./pages/FindDoctors";
import HospitalDetail from "./pages/HospitalDetail";
import DoctorProfile from "./pages/DoctorProfile";
import PatientDashboard from "./pages/PatientDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import TwoFactorSettings from "./pages/TwoFactorSettings";
import GoogleCalendarCallback from "./pages/GoogleCalendarCallback";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
function App() {
    const [googleClientId, setGoogleClientId] = useState("");
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        api.get("/config/public")
            .then((r) => setGoogleClientId(r.data.google_client_id || ""))
            .catch(() => {})
            .finally(() => setLoaded(true));
    }, []);

    if (!loaded) {
        return <div className="min-h-screen grid place-items-center"><p className="text-mint-800/60">Loading Sukhya Med…</p></div>;
    }

    const Inner = (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/services" element={<Services />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password/:token" element={<ResetPassword />} />

                    <Route path="/find-doctors" element={<FindDoctors />} />
                    <Route path="/hospitals/:id" element={<HospitalDetail />} />
                    <Route path="/doctors/:id" element={<DoctorProfile />} />

                    <Route path="/patient/dashboard" element={<ProtectedRoute roles={["patient"]}><PatientDashboard /></ProtectedRoute>} />
                    <Route path="/doctor/dashboard" element={<ProtectedRoute roles={["doctor"]}><DoctorDashboard /></ProtectedRoute>} />
                    <Route path="/doctor/setup" element={<ProtectedRoute roles={["doctor"]}><DoctorDashboard /></ProtectedRoute>} />
                    <Route path="/doctor/profile" element={<ProtectedRoute roles={["doctor"]}><DoctorDashboard /></ProtectedRoute>} />
                    <Route path="/doctor/google-calendar/callback" element={<ProtectedRoute roles={["doctor"]}><GoogleCalendarCallback /></ProtectedRoute>} />
                    <Route path="/admin/dashboard" element={<ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>} />

                    <Route path="/settings/2fa" element={<ProtectedRoute roles={["doctor", "admin"]}><TwoFactorSettings /></ProtectedRoute>} />
                </Routes>
                <AIChatBubble />
            </AuthProvider>
        </BrowserRouter>
    );

    if (googleClientId) {
        return <div className="App"><GoogleOAuthProvider clientId={googleClientId}>{Inner}</GoogleOAuthProvider></div>;
    }
    return <div className="App">{Inner}</div>;
}

export default App;
