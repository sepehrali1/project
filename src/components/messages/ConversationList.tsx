import { Link } from "react-router-dom";
import type { ConversationSummary } from "../../lib/messagesApi";
import { timeAgo } from "../../utils/format";

interface ConversationListProps {
  items: ConversationSummary[];
  activeId: string | null;
}

export default function ConversationList({ items, activeId }: ConversationListProps) {
  if (items.length === 0) {
    return <p className="messages-empty-list">هنوز گفتگویی ندارید. از صفحه‌ی اسکریپت یک نویسنده، پیام خصوصی بفرستید.</p>;
  }

  return (
    <ul className="conversation-list">
      {items.map((item) => {
        const name = item.display_name || item.username;
        return (
          <li key={item.other_id}>
            <Link
              to={`/messages/${item.other_id}`}
              state={{ username: item.username }}
              className={`conversation-item${activeId === item.other_id ? " active" : ""}`}
            >
              <div className="conversation-avatar">{name.charAt(0).toUpperCase()}</div>
              <div className="conversation-body">
                <div className="conversation-head">
                  <span className="conversation-name">{name}</span>
                  <span className="conversation-time">{timeAgo(item.last_at)}</span>
                </div>
                <div className="conversation-preview">
                  <span>{item.last_body}</span>
                  {item.unread > 0 && <span className="unread-badge">{item.unread}</span>}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
