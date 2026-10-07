// FILE: src/api/axiosInstance.js
// NEW FILE — Distributors-PWA-App
// PURPOSE: exactly the same pattern used by the Admin Dashboard's
// axiosInstance.js, but with the distributor's own localStorage key so
// it never collides with the admin token if both are ever opened on the
// same device/browser.
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000"; 

// const BASE_URL = "http://localhost:5000";

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("sridhi_distributor_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axiosInstance.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("sridhi_distributor_token");
      localStorage.removeItem("sridhi_distributor");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default axiosInstance;