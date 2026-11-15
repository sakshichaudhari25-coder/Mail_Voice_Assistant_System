import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api"
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("mailToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function saveSession({ token, user }) {
  localStorage.setItem("mailToken", token);
  localStorage.setItem("mailUser", JSON.stringify(user));
}

export function getSavedUser() {
  try {
    const user = localStorage.getItem("mailUser");
    return user ? JSON.parse(user) : null;
  } catch {
    localStorage.removeItem("mailUser");
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem("mailToken");
  localStorage.removeItem("mailUser");
}

export function getErrorMessage(error, fallback) {
  return error.response?.data?.message || fallback;
}

export default api;
