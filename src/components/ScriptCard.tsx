import { Link } from "react-router-dom";
import { Heart, Eye, BadgeCheck } from "lucide-react";
import type { ScriptItem } from "../types/script";
import { formatNumber, timeAgo } from "../utils/format";

interface Props {
  script: ScriptItem;
}

const GRADIENT_BY_CAT: Record<string, string> = {
  "auto-farm": "linear-gradient(135deg, #10b981, #059669)",
  speed: "linear-gradient(135deg, #f59e0b, #d97706)",
  esp: "linear-gradient(135deg, #06b6d4, #0891b2)",
  combat: "linear-gradient(135deg, #ef4444, #dc2626)",
  teleport: "linear-gradient(135deg, #a855f7, #7c3aed)",
  gui: "linear-gradient(135deg, #ec4899, #db2777)",
  tools: "linear-gradient(135deg, #64748b, #475569)",
  misc: "linear-gradient(135deg, #14b8a6, #0d9488)",
};

export default function ScriptCard({ script }: Props) {
  const gradient =
    GRADIENT_BY_CAT[script.category] ||
    "linear-gradient(135deg, #ff304f, #a855f7)";
  const scriptUrl = "/scripts/" + script.id;

  return (
    <Link to={scriptUrl} className="script-card">
      <div
        className="script-card-thumb"
        style={{
          background: script.image_url
            ? `url("${encodeURI(script.image_url)}") center/cover`
            : gradient,
        }}
      >
        <span className="script-card-category">{script.category}</span>
        {script.pending && <span className="script-card-game">منتظر تأیید</span>}
      </div>

      <div className="script-card-body">
        <h3 className="script-card-title">{script.title}</h3>
        <p className="script-card-desc">{script.description}</p>

        <div className="script-card-meta">
          <div className="script-card-author">
            <div className="script-card-avatar">
              {script.author.username.charAt(0).toUpperCase()}
            </div>
            <span className="script-card-username">
              {script.author.username}
            </span>
            {script.author.verified && (
              <BadgeCheck size={14} className="verified-badge" />
            )}
          </div>

          <div className="script-card-stats">
            <span title="لایک">
              <Heart size={14} />
              {formatNumber(script.likes_count)}
            </span>
            <span title="بازدید">
              <Eye size={14} />
              {formatNumber(script.views_count)}
            </span>
          </div>
        </div>

        <div className="script-card-time">{timeAgo(script.created_at)}</div>
      </div>
    </Link>
  );
}