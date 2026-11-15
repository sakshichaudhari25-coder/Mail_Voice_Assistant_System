import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import "./App.css";

function ProtectedRoutes() {
  return localStorage.getItem("mailToken")
    ? <Outlet />
    : <Navigate to="/login" replace />;
}

function GuestRoutes() {
  return localStorage.getItem("mailToken")
    ? <Navigate to="/dashboard" replace />
    : <Outlet />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route element={<GuestRoutes />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>
        <Route element={<ProtectedRoutes />}>
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
