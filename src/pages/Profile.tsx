import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { BadgeCheck, Shield, LogOut, Calendar, Mail, Save } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { describeError } from "../lib/api";
import { fetchMyStats, fetchOwnProfile, updateOwnProfile, type MyStats } from "../lib/profileApi";
import { toPersianDigits } from "../utils/format";

const ROLE_LABELS: Record<string, string> = {
  user: "کاربر",
  moderator: "ناظر",
  owner: "مالک پلتفرم",
};

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<MyStats | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    let active = true;
    Promise.all([fetchMyStats(), fetchOwnProfile(userId)])
      .then(([s, p]) => {
        if (!active) return;
        setStats(s);
        setDisplayName(p.display_name);
        setBio(p.bio);
      })
      .catch(() => {
        if (active) setStats(null);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  if (!user) return null;

  const joinDate = new Date(user.created_at).toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setMessage(null);
    setSaving(true);
    try {
      await updateOwnProfile(user.id, { display_name: displayName, bio });
      setMessage({ type: "ok", text: "پروفایل ذخیره شد." });
    } catch (err) {
      setMessage({ type: "error", text: describeError(err) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="profile-page">
      <div className="container">
        <div className="profile-card">
          <div className="profile-header">
            <div className="profile-avatar">{user.username.charAt(0).toUpperCase()}</div>
            <div className="profile-info">
              <div className="profile-name-row">
                <h1>{displayName || user.username}</h1>
                {user.verified && (
                  <span className="profile-verified" title="حساب تأیید شده">
                    <BadgeCheck size={22} />
                  </span>
                )}
                {user.role !== "user" && (
                  <span className="profile-role-badge">
                    <Shield size={14} />
                    {ROLE_LABELS[user.role]}
                  </span>
                )}
              </div>
              <p className="profile-subtitle">@{user.username} · عضو SSBLOX از {joinDate}</p>
            </div>
          </div>

          <div className="profile-body">
            <div className="profile-field">
              <Mail size={16} />
              <span dir="ltr">{user.email}</span>
            </div>
            <div className="profile-field">
              <Calendar size={16} />
              <span>عضو شده در {toPersianDigits(new Date(user.created_at).getFullYear())}</span>
            </div>
          </div>

          <form onSubmit={handleSave} className="form-grid" style={{ marginTop: 24 }}>
            <label className="form-field full">
              <span>نام نمایشی</span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={50}
                placeholder="نام نمایشی (اختیاری)"
              />
            </label>
            <label className="form-field full">
              <span>درباره من</span>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={300}
                rows={3}
                placeholder="چند خط درباره خودت..."
              />
            </label>
            {message && (
              <div
                className="form-error full"
                style={message.type === "ok" ? { borderColor: "#10b981", color: "#10b981" } : undefined}
              >
                {message.text}
              </div>
            )}
            <div className="form-actions full">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <Save size={16} />
                {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
              </button>
            </div>
          </form>

          <div className="profile-actions">
            <button type="button" className="btn btn-outline" onClick={handleLogout}>
              <LogOut size={16} />
              خروج از حساب
            </button>
          </div>
        </div>

        <div className="profile-stats">
          <div className="profile-stat-card">
            <div className="profile-stat-value">{toPersianDigits(stats?.scripts ?? 0)}</div>
            <div className="profile-stat-label">اسکریپت منتشرشده</div>
          </div>
          <div className="profile-stat-card">
            <div className="profile-stat-value">{toPersianDigits(stats?.likes ?? 0)}</div>
            <div className="profile-stat-label">لایک دریافتی</div>
          </div>
          <div className="profile-stat-card">
            <div className="profile-stat-value">{toPersianDigits(stats?.comments ?? 0)}</div>
            <div className="profile-stat-label">کامنت</div>
          </div>
        </div>
      </div>
    </div>
  );
}
