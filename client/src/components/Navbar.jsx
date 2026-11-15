import { LogOut, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import Notification from "./Notification.jsx";

function Navbar({ user, unreadCount, notifications, onOpenNotification, onLogout }) {
  return (
    <header className="topbar">
      <Link className="topbar-brand" to="/dashboard">
        <span className="brand-mark small-brand"><Mail size={17} /></span>
        <span>smartmail<span className="brand-period">.</span></span>
      </Link>
      <div className="topbar-actions">
        <Notification
          notifications={notifications}
          unreadCount={unreadCount}
          onOpen={onOpenNotification}
        />
        <div className="profile-chip">
          <span className="avatar profile-avatar">{(user?.name || user?.email || "U").slice(0, 1).toUpperCase()}</span>
          <span className="profile-copy">
            <strong>{user?.name || "Your account"}</strong>
            <small>{user?.email}</small>
          </span>
        </div>
        <button className="icon-button logout-button" type="button" onClick={onLogout} aria-label="Log out">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}

export default Navbar;
