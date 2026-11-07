import { useEffect, useState } from "react";
import { formatNumber } from "../../utils/format";
import { fetchStats } from "../../lib/scriptsApi";
import type { StatsData } from "../../types";

export default function Stats() {
  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  if (!stats) return null;

  const items = [
    { label: "اسکریپت منتشرشده", value: stats.scripts },
    { label: "کاربر", value: stats.users },
    { label: "بازدید کل", value: stats.views },
    { label: "لایک", value: stats.likes },
  ];

  const isFresh = stats.scripts === 0 && stats.users <= 1;

  return (
    <section className="stats">
      <div className="container">
        <div className="stats-grid">
          {items.map((s) => (
            <div key={s.label} className="stat">
              <div className="stat-value gradient-text">
                {formatNumber(s.value)}
              </div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
        {isFresh && (
          <p className="stats-fresh">
            این پلتفرم تازه شروع کرده — اولین نفر باشید که اسکریپت منتشر می‌کند!
          </p>
        )}
      </div>
    </section>
  );
}