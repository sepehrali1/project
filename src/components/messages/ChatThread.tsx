import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import {
  listMessages,
  markConversationRead,
  sendMessage,
  type MessageItem,
} from "../../lib/messagesApi";
import { describeError } from "../../lib/api";

const POLL_INTERVAL_MS = 8000;
const MAX_LENGTH = 2000;

interface ChatThreadProps {
  myId: string;
  otherId: string;
  title: string;
  onChange: () => void;
}

export default function ChatThread({ myId, otherId, title, onChange }: ChatThreadProps) {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const items = await listMessages(myId, otherId);
      setMessages(items);
      setError(null);
      if (items.some((m) => m.recipient_id === myId && m.read_at === null)) {
        await markConversationRead(otherId);
        onChange();
      }
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, [myId, otherId, onChange]);

  useEffect(() => {
    setLoading(true);
    load();
    const timer = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  async function handleSend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      await sendMessage(otherId, body);
      setDraft("");
      await load();
      onChange();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="chat-thread">
      <header className="chat-header">
        <h2>{title}</h2>
      </header>

      <div className="chat-messages">
        {loading && <p className="chat-note">در حال بارگذاری...</p>}
        {!loading && messages.length === 0 && (
          <p className="chat-note">هنوز پیامی رد و بدل نشده است.</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === myId;
          return (
            <div key={m.id} className={`chat-bubble ${mine ? "mine" : "theirs"}`}>
              <p>{m.body}</p>
              <span className="chat-time">
                {new Date(m.created_at).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {error && <div className="form-error">{error}</div>}

      <form className="chat-composer" onSubmit={handleSend}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={MAX_LENGTH}
          rows={2}
          placeholder="پیام خود را بنویسید..."
          aria-label="متن پیام"
        />
        <button type="submit" className="btn btn-primary" disabled={sending || draft.trim() === ""}>
          <Send size={16} />
          ارسال
        </button>
      </form>
    </section>
  );
}
