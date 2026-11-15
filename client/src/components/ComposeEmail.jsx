import { useState } from "react";
import { X } from "lucide-react";

function ComposeEmail({ onClose, onSend, isSending }) {
  const [receiverEmail, setReceiverEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    try {
      await onSend({ receiverEmail, subject, message });
    } catch (sendError) {
      setError(sendError.message);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="compose-card" role="dialog" aria-modal="true" aria-labelledby="compose-title">
        <div className="compose-heading">
          <div>
            <p className="eyebrow">NEW MESSAGE</p>
            <h2 id="compose-title">Compose email</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close compose window">
            <X size={19} />
          </button>
        </div>
        <form className="compose-form" onSubmit={handleSubmit}>
          <label htmlFor="receiver-email">To</label>
          <input
            id="receiver-email"
            type="email"
            placeholder="recipient@example.com"
            required
            value={receiverEmail}
            onChange={(event) => setReceiverEmail(event.target.value)}
          />
          <label htmlFor="email-subject">Subject</label>
          <input
            id="email-subject"
            type="text"
            placeholder="Add a subject"
            required
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
          />
          <label htmlFor="email-message">Message</label>
          <textarea
            id="email-message"
            rows="8"
            placeholder="Write your message..."
            required
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="compose-actions">
            <span className="internal-note">Only registered Smart Mail users can receive this email.</span>
            <button className="primary-button" disabled={isSending}>
              {isSending ? "Sending..." : "Send email"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default ComposeEmail;
