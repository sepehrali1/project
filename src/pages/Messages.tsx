import { useCallback, useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import ConversationList from "../components/messages/ConversationList";
import ChatThread from "../components/messages/ChatThread";
import { listConversations, type ConversationSummary } from "../lib/messagesApi";
import { describeError } from "../lib/api";

const LIST_POLL_INTERVAL_MS = 15000;

export default function Messages() {
  const { user } = useAuth();
  const { userId } = useParams();
  const location = useLocation();
  const [items, setItems] = useState<ConversationSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setItems(await listConversations());
      setError(null);
    } catch (err) {
      setError(describeError(err));
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, LIST_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  if (!user) return null;

  const activeId = userId ?? null;
  const stateName = (location.state as { username?: string } | null)?.username;
  const activeTitle =
    items.find((i) => i.other_id === activeId)?.username ?? stateName ?? "گفتگو";

  return (
    <div className="messages-page">
      <div className="container">
        <h1 className="section-title">پیام‌های خصوصی</h1>
        {error && <div className="form-error">{error}</div>}
        <div className={`messages-layout${activeId ? " has-active" : ""}`}>
          <aside className="messages-sidebar">
            <ConversationList items={items} activeId={activeId} />
          </aside>
          <div className="messages-main">
            {activeId ? (
              <ChatThread
                key={activeId}
                myId={user.id}
                otherId={activeId}
                title={activeTitle}
                onChange={refresh}
              />
            ) : (
              <div className="messages-placeholder">یک گفتگو را از فهرست انتخاب کنید.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
