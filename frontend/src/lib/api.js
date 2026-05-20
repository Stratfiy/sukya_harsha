import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const api = axios.create({
    baseURL: API,
    withCredentials: true,
    headers: { "Content-Type": "application/json" },
});

// Attach CSRF token from cookie on every state-changing request
api.interceptors.request.use((config) => {
    const method = (config.method || "get").toLowerCase();
    if (["post", "put", "patch", "delete"].includes(method)) {
        const csrf = readCookie("csrf_token");
        if (csrf) config.headers["X-CSRF-Token"] = csrf;
    }
    return config;
});

function readCookie(name) {
    const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
    return match ? decodeURIComponent(match[2]) : null;
}

// Auto-refresh: if any request gets 401, try /auth/refresh once then retry
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
    failedQueue.forEach(({ resolve, reject }) => error ? reject(error) : resolve());
    failedQueue = [];
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error.config;
        // If 401 and not already retrying and not the refresh/login endpoint itself
        if (error.response?.status === 401 && !original._retry &&
            !original.url?.includes("/auth/refresh") && !original.url?.includes("/auth/login")) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(() => api(original)).catch(e => Promise.reject(e));
            }
            original._retry = true;
            isRefreshing = true;
            try {
                await api.post("/auth/refresh");
                processQueue(null);
                return api(original);
            } catch (refreshError) {
                processQueue(refreshError);
                // Refresh failed — clear user state by reloading
                window.location.href = "/login";
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }
        return Promise.reject(error);
    }
);

export function formatApiError(detail) {
    if (detail == null) return "Something went wrong. Please try again.";
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail))
        return detail
            .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
            .filter(Boolean)
            .join(" ");
    if (detail && typeof detail.msg === "string") return detail.msg;
    return String(detail);
}

export default api;
