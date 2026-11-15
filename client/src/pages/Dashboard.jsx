import {
  Check,
  ChevronRight,
  Inbox as InboxIcon,
  MailPlus,
  Pause,
  Play,
  RefreshCw,
  Send,
  Square,
  Volume2,
  VolumeX
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useNavigate } from "react-router-dom";
import ComposeEmail from "../components/ComposeEmail.jsx";
import Inbox from "../components/Inbox.jsx";
import Navbar from "../components/Navbar.jsx";
import api, { clearSession, getErrorMessage, getSavedUser } from "../api.js";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

function formatFullDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "long",
    timeStyle: "short"
  }).format(new Date(value));
}

function Dashboard() {
  const navigate = useNavigate();
  const user = getSavedUser();
  const token = localStorage.getItem("mailToken");
  const [activeFolder, setActiveFolder] = useState("inbox");
  const [emailLists, setEmailLists] = useState({ inbox: [], sent: [] });
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [listError, setListError] = useState("");
  const [toast, setToast] = useState("");
  const [connection, setConnection] = useState("connecting");
  const [isMuted, setIsMuted] = useState(false);
  const muteRef = useRef(isMuted);

  useEffect(() => {
    muteRef.current = isMuted;
    if (isMuted && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, [isMuted]);

  const showToast = useCallback((message) => {
    setToast(message);
  }, []);

  const loadEmails = useCallback(async (folder) => {
    setIsLoading(true);
    setListError("");
    try {
      const { data } = await api.get(`/emails/${folder}`);
      setEmailLists((current) => ({ ...current, [folder]: data.emails }));
      if (folder === "inbox") {
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      setListError(getErrorMessage(error, `Could not load your ${folder}.`));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadUnreadCount = useCallback(async () => {
    try {
      const { data } = await api.get("/emails/unread-count");
      setUnreadCount(data.unreadCount);
    } catch (error) {
      setListError(getErrorMessage(error, "Could not load unread message count."));
    }
  }, []);

  const announceNewEmail = useCallback((email) => {
    if (muteRef.current || !("speechSynthesis" in window)) return;
    const senderName = email.sender?.name || email.sender?.email || "a user";
    const utterance = new SpeechSynthesisUtterance(
      `New email from ${senderName}. Subject: ${email.subject}.`
    );
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function loadInitialData() {
      try {
        const [inboxResponse, sentResponse, unreadResponse] = await Promise.all([
          api.get("/emails/inbox"),
          api.get("/emails/sent"),
          api.get("/emails/unread-count")
        ]);
        if (isCancelled) return;

        setEmailLists({
          inbox: inboxResponse.data.emails,
          sent: sentResponse.data.emails
        });
        setUnreadCount(unreadResponse.data.unreadCount);
      } catch (error) {
        if (!isCancelled) {
          setListError(getErrorMessage(error, "Could not load your mail."));
        }
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    loadInitialData();
    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!token) return undefined;
    const socket = io(SOCKET_URL, { auth: { token } });

    socket.on("connect", () => setConnection("connected"));
    socket.on("disconnect", () => setConnection("offline"));
    socket.on("connect_error", () => setConnection("offline"));
    socket.on("email:new", ({ email, unreadCount: newUnreadCount }) => {
      setUnreadCount(newUnreadCount);
      setNotifications((current) => [
        { id: email._id, email },
        ...current.filter((item) => item.id !== email._id)
      ].slice(0, 8));
      showToast(`New email from ${email.sender?.name || email.sender?.email || "a user"}`);
      announceNewEmail(email);
      loadEmails("inbox");
    });

    return () => socket.disconnect();
  }, [announceNewEmail, loadEmails, showToast, token]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(""), 4500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => () => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  async function openEmail(email) {
    setSelectedEmail(email);
    try {
      const { data } = await api.get(`/emails/${email._id}`);
      let fullEmail = data.email;
      const receiverId = fullEmail.receiver?._id || fullEmail.receiver;
      const isReceived = receiverId?.toString() === user?.id?.toString();

      if (isReceived && !fullEmail.isRead) {
        const update = await api.patch(`/emails/${fullEmail._id}/read`);
        fullEmail = update.data.email;
        await Promise.all([loadEmails("inbox"), loadUnreadCount()]);
      }

      setSelectedEmail(fullEmail);
    } catch (error) {
      showToast(getErrorMessage(error, "Could not open this email."));
    }
  }

  async function openNotification(email) {
    setActiveFolder("inbox");
    await openEmail(email);
  }

  async function toggleReadStatus() {
    if (!selectedEmail) return;
    const endpoint = selectedEmail.isRead ? "unread" : "read";
    try {
      const { data } = await api.patch(`/emails/${selectedEmail._id}/${endpoint}`);
      setSelectedEmail(data.email);
      await Promise.all([loadEmails("inbox"), loadUnreadCount()]);
    } catch (error) {
      showToast(getErrorMessage(error, "Could not update this email."));
    }
  }

  async function sendEmail(details) {
    setIsSending(true);
    try {
      const { data } = await api.post("/emails/send", details);
      setIsComposeOpen(false);
      setActiveFolder("sent");
      setSelectedEmail(data.email);
      await loadEmails("sent");
      showToast("Email sent to the recipient’s Smart Mail inbox.");
    } catch (error) {
      throw new Error(getErrorMessage(error, "Email could not be sent."), { cause: error });
    } finally {
      setIsSending(false);
    }
  }

  function speakSelectedEmail() {
    if (!selectedEmail || !("speechSynthesis" in window)) {
      showToast("Speech playback is not supported by this browser.");
      return;
    }
    if (isMuted) {
      showToast("Unmute voice playback to listen to this email.");
      return;
    }
    const senderName = selectedEmail.sender?.name || selectedEmail.sender?.email || "Unknown sender";
    const utterance = new SpeechSynthesisUtterance(
      `Email from ${senderName}. Subject: ${selectedEmail.subject}. Message: ${selectedEmail.message}`
    );
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function toggleMute() {
    setIsMuted((current) => !current);
  }

  function handleLogout() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    clearSession();
    navigate("/login", { replace: true });
  }

  const displayedEmails = emailLists[activeFolder];
  const selectedReceiverId = selectedEmail?.receiver?._id || selectedEmail?.receiver;
  const selectedIsReceived = selectedReceiverId?.toString() === user?.id?.toString();

  return (
    <div className="dashboard-shell">
      <Navbar
        user={user}
        unreadCount={unreadCount}
        notifications={notifications}
        onOpenNotification={openNotification}
        onLogout={handleLogout}
      />
      <div className="dashboard-layout">
        <aside className="sidebar">
          <button className="primary-button compose-button" type="button" onClick={() => setIsComposeOpen(true)}>
            <MailPlus size={18} />
            Compose
          </button>
          <p className="sidebar-label">MAILBOX</p>
          <button
            className={`sidebar-link ${activeFolder === "inbox" ? "active" : ""}`}
            type="button"
            onClick={() => {
              setActiveFolder("inbox");
              setSelectedEmail(null);
            }}
          >
            <InboxIcon size={18} />
            <span>Inbox</span>
            {unreadCount > 0 && <span className="sidebar-count">{unreadCount}</span>}
          </button>
          <button
            className={`sidebar-link ${activeFolder === "sent" ? "active" : ""}`}
            type="button"
            onClick={() => {
              setActiveFolder("sent");
              setSelectedEmail(null);
            }}
          >
            <Send size={17} />
            <span>Sent</span>
          </button>
          <div className="sidebar-bottom">
            <span className={`connection-dot ${connection}`} />
            <span>{connection === "connected" ? "Live notifications on" : "Reconnecting notifications..."}</span>
          </div>
        </aside>

        <main className="mail-workspace">
          <div className="workspace-heading">
            <div>
              <p className="eyebrow">YOUR WORKSPACE</p>
              <h1>Good mail, {user?.name?.split(" ")[0] || "there"}.</h1>
              <p className="workspace-subtitle">A quieter, smarter place for your conversations.</p>
            </div>
            <button
              className="icon-button refresh-button"
              type="button"
              aria-label="Refresh messages"
              onClick={() => {
                loadEmails(activeFolder);
                loadUnreadCount();
              }}
            >
              <RefreshCw size={17} />
            </button>
          </div>

          <div className={`mail-content ${selectedEmail ? "has-selection" : ""}`}>
            <Inbox
              emails={displayedEmails}
              folder={activeFolder}
              selectedEmail={selectedEmail}
              onSelectEmail={openEmail}
              isLoading={isLoading}
              error={listError}
            />
            <section className="reading-panel">
              {selectedEmail ? (
                <>
                  <div className="reading-actions">
                    <span className="eyebrow">MESSAGE</span>
                    {selectedIsReceived && (
                      <button className="text-button" type="button" onClick={toggleReadStatus}>
                        <Check size={15} />
                        Mark as {selectedEmail.isRead ? "unread" : "read"}
                      </button>
                    )}
                  </div>
                  <h2 className="reading-subject">{selectedEmail.subject}</h2>
                  <div className="reading-person">
                    <span className="avatar">
                      {(selectedEmail.sender?.name || selectedEmail.sender?.email || "?").slice(0, 1).toUpperCase()}
                    </span>
                    <div>
                      <strong>{selectedEmail.sender?.name || selectedEmail.sender?.email}</strong>
                      <span>
                        {selectedEmail.sender?.email}
                        {selectedEmail.receiver?.email && ` · to ${selectedEmail.receiver.email}`}
                      </span>
                    </div>
                    <time>{formatFullDate(selectedEmail.createdAt)}</time>
                  </div>
                  <div className="reading-message">{selectedEmail.message}</div>
                  <div className="voice-panel">
                    <div className="voice-heading">
                      <div>
                        <p className="eyebrow">VOICE ASSISTANT</p>
                        <strong>Listen to this message</strong>
                      </div>
                      <button
                        className={`icon-button ${isMuted ? "muted" : ""}`}
                        type="button"
                        aria-label={isMuted ? "Unmute voice assistant" : "Mute voice assistant"}
                        onClick={toggleMute}
                      >
                        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                      </button>
                    </div>
                    <div className="voice-actions">
                      <button className="voice-button play-button" type="button" onClick={speakSelectedEmail}>
                        <Play size={15} fill="currentColor" /> Play email
                      </button>
                      <button
                        className="voice-button"
                        type="button"
                        disabled={!("speechSynthesis" in window)}
                        onClick={() => window.speechSynthesis.pause()}
                      >
                        <Pause size={15} /> Pause
                      </button>
                      <button
                        className="voice-button"
                        type="button"
                        disabled={!("speechSynthesis" in window)}
                        onClick={() => window.speechSynthesis.resume()}
                      >
                        <Play size={15} /> Resume
                      </button>
                      <button
                        className="voice-button"
                        type="button"
                        disabled={!("speechSynthesis" in window)}
                        onClick={() => window.speechSynthesis.cancel()}
                      >
                        <Square size={14} /> Stop
                      </button>
                    </div>
                    <p className="voice-hint">New message alerts are spoken when voice is unmuted.</p>
                  </div>
                </>
              ) : (
                <div className="reading-empty">
                  <div className="reading-empty-icon"><MailPlus size={25} /></div>
                  <h2>Select a message</h2>
                  <p>Choose an email from your {activeFolder} to read it here.</p>
                  <span><ChevronRight size={15} /> Your mail stays between registered Smart Mail users.</span>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      {isComposeOpen && (
        <ComposeEmail onClose={() => setIsComposeOpen(false)} onSend={sendEmail} isSending={isSending} />
      )}
      {toast && <div className="toast-message" role="status">{toast}</div>}
    </div>
  );
}

export default Dashboard;
