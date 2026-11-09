import { useEffect, useState } from "react";
import { Trophy, BadgeCheck } from "lucide-react";
import { describeError } from "../lib/api";
import { fetchLeaderboard, type LeaderboardEntry } from "../lib/leaderboardApi";

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchLeaderboard(20)
      .then((rows) => {
        if (active) setEntries(rows);
      })
      .catch((err) => {
        if (active) setError(describeError(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="form-page">
      <div className="container">
        <div className="owner-header">
          <Trophy size={28} />
          <div>
            <h1 className="section-title">جدول برترین‌ها</h1>
            <p className="section-subtitle">برترین نویسندگان اسکریپت بر اساس لایک و بازدید</p>
          </div>
        </div>

        {error && <div className="form-error">{error}</div>}

        {!error && entries.length === 0 && (
          <p className="section-subtitle">هنوز اسکریپت تأییدشده‌ای برای رتبه‌بندی وجود ندارد.</p>
        )}

        {entries.length > 0 && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>رتبه</th>
                  <th>کاربر</th>
                  <th>اسکریپت</th>
                  <th>لایک</th>
                  <th>بازدید</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.username}>
                    <td>{e.rank}</td>
                    <td>
                      {e.display_name || e.username}
                      {e.verified && <BadgeCheck size={16} style={{ marginInlineStart: 6, verticalAlign: "middle" }} />}
                    </td>
                    <td>{e.scripts_count}</td>
                    <td>{e.likes_count}</td>
                    <td>{e.views_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
