import { MailOpen } from "lucide-react";

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function getPerson(email, folder) {
  return folder === "inbox" ? email.sender : email.receiver;
}

function Inbox({ emails, folder, selectedEmail, onSelectEmail, isLoading, error }) {
  const title = folder === "inbox" ? "Inbox" : "Sent";

  return (
    <section className="message-list-panel" aria-label={`${title} messages`}>
      <div className="list-heading">
        <div>
          <p className="eyebrow">{folder === "inbox" ? "YOUR MAIL" : "OUTGOING"}</p>
          <h2>{title}</h2>
        </div>
        <span className="message-total">{emails.length}</span>
      </div>
      {error && <p className="inline-error" role="alert">{error}</p>}
      {isLoading ? (
        <p className="empty-state">Loading your messages...</p>
      ) : emails.length === 0 ? (
        <div className="empty-state">
          <MailOpen size={25} />
          <p>{folder === "inbox" ? "Your inbox is clear." : "No sent messages yet."}</p>
          <span>{folder === "inbox" ? "New messages will appear here." : "Messages you send will show here."}</span>
        </div>
      ) : (
        <div className="message-list">
          {emails.map((email) => {
            const person = getPerson(email, folder);
            return (
              <button
                className={`message-row ${!email.isRead && folder === "inbox" ? "unread" : ""} ${selectedEmail?._id === email._id ? "selected" : ""}`}
                key={email._id}
                type="button"
                onClick={() => onSelectEmail(email)}
              >
                <span className="avatar small-avatar">
                  {(person?.name || person?.email || "?").slice(0, 1).toUpperCase()}
                </span>
                <span className="message-row-content">
                  <span className="message-row-top">
                    <strong>{person?.name || person?.email || "Unknown user"}</strong>
                    <time>{formatDate(email.createdAt)}</time>
                  </span>
                  <span className="message-subject">{email.subject}</span>
                  <span className="message-preview">{email.message}</span>
                </span>
                {!email.isRead && folder === "inbox" && <span className="unread-dot" aria-label="Unread" />}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default Inbox;
