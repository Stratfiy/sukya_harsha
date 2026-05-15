import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import AIChatBubble from "./components/AIChatBubble";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Doctors from "./pages/Doctors";
import DoctorProfile from "./pages/DoctorProfile";
import PatientDashboard from "./pages/PatientDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";
import AdminDashboard from "./pages/AdminDashboard";

function App() {
    return (
        <div className="App">
            <BrowserRouter>
                <AuthProvider>
                    <Routes>
                        <Route path="/" element={<Landing />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/doctors" element={<Doctors />} />
                        <Route path="/doctors/:id" element={<DoctorProfile />} />
                        <Route
                            path="/dashboard/patient"
                            element={
                                <ProtectedRoute roles={["patient"]}>
                                    <PatientDashboard />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/dashboard/doctor"
                            element={
                                <ProtectedRoute roles={["doctor"]}>
                                    <DoctorDashboard />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/dashboard/admin"
                            element={
                                <ProtectedRoute roles={["admin"]}>
                                    <AdminDashboard />
                                </ProtectedRoute>
                            }
                        />
                    </Routes>
                    <AIChatBubble />
                </AuthProvider>
            </BrowserRouter>
        </div>
    );
}

export default App;
