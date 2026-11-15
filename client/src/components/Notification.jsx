import { Bell, Mail } from "lucide-react";
import { useState } from "react";

function Notification({ notifications, unreadCount, onOpen }) {
  const [isOpen, setIsOpen] = useState(false);

  function handleOpen(email) {
    setIsOpen(false);
    onOpen(email);
  }

  return (
    <div className="notification-wrap">
      <button
        className="icon-button notification-button"
        type="button"
        aria-label={`Notifications, ${unreadCount} unread emails`}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <Bell size={19} />
        {unreadCount > 0 && <span className="notification-count">{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>
      {isOpen && (
        <div className="notification-menu">
          <div className="notification-menu-title">
            <strong>Notifications</strong>
            <span>{unreadCount} unread</span>
          </div>
          {notifications.length === 0 ? (
            <p className="notification-empty">You’re all caught up.</p>
          ) : (
            notifications.map(({ id, email }) => (
              <button className="notification-item" type="button" key={id} onClick={() => handleOpen(email)}>
                <span className="notification-icon"><Mail size={16} /></span>
                <span>
                  <strong>{email.sender?.name || email.sender?.email || "New sender"}</strong>
                  <span>{email.subject}</span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default Notification;
