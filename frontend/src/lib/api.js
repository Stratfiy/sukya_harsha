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
// Tracks whether a refresh is already in-flight to avoid multiple simultaneous refresh calls
let isRefreshing = false;
let failedQueue = [];
let hasRedirected = false; // prevent infinite redirect loop

const processQueue = (error) => {
    failedQueue.forEach(({ resolve, reject }) => error ? reject(error) : resolve());
    failedQueue = [];
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error.config;

        // Skip refresh logic for auth endpoints themselves
        const isAuthEndpoint = original.url?.includes("/auth/refresh") ||
            original.url?.includes("/auth/login") ||
            original.url?.includes("/auth/register") ||
            original.url?.includes("/auth/google");

        if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
            if (isRefreshing) {
                // Queue this request until refresh completes
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(() => api(original)).catch(e => Promise.reject(e));
            }

            original._retry = true;
            isRefreshing = true;

            try {
                await api.post("/auth/refresh");
                processQueue(null);
                isRefreshing = false;
                return api(original);
            } catch (refreshError) {
                processQueue(refreshError);
                isRefreshing = false;
                // Only redirect once — prevent infinite loop
                if (!hasRedirected && !window.location.pathname.includes("/login")) {
                    hasRedirected = true;
                    // Small delay so queue settles before redirect
                    setTimeout(() => {
                        hasRedirected = false;
                        window.location.href = "/login";
                    }, 200);
                }
                return Promise.reject(refreshError);
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
