import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Ban, CheckCircle2, Eye, EyeOff, ShieldAlert, Trash2, XCircle } from "lucide-react";
import { describeError } from "../lib/api";
import {
  adminDeleteScript,
  fetchActivityLogs,
  fetchAdminUsers,
  fetchPendingScripts,
  fetchRecentComments,
  fetchReports,
  rejectScript,
  resolveReport,
  setCommentHidden,
  setUserBanned,
  warnUser,
  type ActivityLogItem,
  type AdminComment,
  type AdminUser,
  type PendingScript,
  type ReportItem,
} from "../lib/adminApi";
import { approveScript } from "../lib/scriptsApi";
import { useAuth } from "../contexts/AuthContext";
import { timeAgo, formatNumber } from "../utils/format";

type Tab = "users" | "pending" | "reports" | "comments" | "logs";

const ROLE_LABELS: Record<string, string> = { user: "کاربر", moderator: "ناظر", owner: "مالک" };
const REPORT_STATUS: Record<string, string> = { open: "باز", resolved: "رسیدگی شده", dismissed: "رد شده" };
const REASON_LABELS: Record<string, string> = {
  spam: "هرزنامه",
  abuse: "توهین",
  copyright: "کپی‌رایت",
  malicious: "کد مخرب",
  other: "سایر",
};
const ACTION_LABELS: Record<string, string> = {
  script_approved: "تأیید اسکریپت",
  script_rejected: "رد اسکریپت",
  script_deleted: "حذف اسکریپت",
  comment_hidden: "پنهان کردن نظر",
  comment_shown: "نمایش دوباره نظر",
  report_resolved: "رسیدگی به گزارش",
  report_dismissed: "رد گزارش",
  user_verified: "دادن تیک آبی",
  user_unverified: "حذف تیک آبی",
  user_warned: "اخطار به کاربر",
  user_banned: "مسدود کردن کاربر",
  user_unbanned: "رفع مسدودیت",
  user_role_changed: "تغییر نقش",
};

export default function Admin() {
  const { user: me } = useAuth();
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pending, setPending] = useState<PendingScript[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warnInput, setWarnInput] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    try {
      const [u, p, r, c, l] = await Promise.all([
        fetchAdminUsers(),
        fetchPendingScripts(),
        fetchReports(),
        fetchRecentComments(),
        fetchActivityLogs(),
      ]);
      setUsers(u);
      setPending(p);
      setReports(r);
      setComments(c);
      setLogs(l);
      setError(null);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function run(action: () => Promise<void>) {
    setError(null);
    try {
      await action();
      await refresh();
    } catch (err) {
      setError(describeError(err));
    }
  }

  function canModerate(target: AdminUser): boolean {
    if (!me || target.id === me.id || target.role === "owner") return false;
    if (me.role === "owner") return true;
    return me.role === "moderator" && target.role === "user";
  }

  function toggleBan(target: AdminUser) {
    if (target.banned) {
      return run(() => setUserBanned(target.id, false, ""));
    }
    const reason = prompt("دلیل مسدودسازی؟");
    if (reason === null) return;
    return run(() => setUserBanned(target.id, true, reason));
  }

  function warn(target: AdminUser) {
    const reason = warnInput[target.id]?.trim();
    if (!reason) {
      setError("دلیل اخطار را بنویسید");
      return;
    }
    return run(async () => {
      await warnUser(target.id, reason);
      setWarnInput((s) => ({ ...s, [target.id]: "" }));
    });
  }

  function reject(id: string) {
    const reason = prompt("دلیل رد اسکریپت؟");
    if (reason === null) return;
    return run(() => rejectScript(id, reason));
  }

  function removeScript(id: string) {
    if (!confirm("حذف شود؟")) return;
    return run(() => adminDeleteScript(id));
  }

  return (
    <div className="form-page">
      <div className="container">
        <h1 className="section-title">پنل مدیریت</h1>
        <p className="section-subtitle" style={{ marginBottom: 24 }}>
          مدیریت کاربران، اسکریپت‌های منتظر تأیید، گزارش‌ها، نظرها و گزارش فعالیت
        </p>

        {error && <div className="form-error">{error}</div>}

        <div className="admin-tabs">
          <button type="button" className={tab === "users" ? "tab active" : "tab"} onClick={() => setTab("users")}>
            کاربران ({formatNumber(users.length)})
          </button>
          <button type="button" className={tab === "pending" ? "tab active" : "tab"} onClick={() => setTab("pending")}>
            منتظر تأیید ({formatNumber(pending.length)})
          </button>
          <button type="button" className={tab === "reports" ? "tab active" : "tab"} onClick={() => setTab("reports")}>
            گزارش‌ها ({formatNumber(reports.filter((r) => r.status === "open").length)})
          </button>
          <button type="button" className={tab === "comments" ? "tab active" : "tab"} onClick={() => setTab("comments")}>
            نظرها
          </button>
          <button type="button" className={tab === "logs" ? "tab active" : "tab"} onClick={() => setTab("logs")}>
            فعالیت‌ها
          </button>
        </div>

        {loading ? (
          <div className="page-loading">
            <div className="loading-spinner" />
          </div>
        ) : (
          <>
            {tab === "users" && (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>کاربر</th>
                      <th>ایمیل</th>
                      <th>نقش</th>
                      <th>اسکریپت‌ها</th>
                      <th>اخطارها</th>
                      <th>وضعیت</th>
                      <th>عملیات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>{u.username}</td>
                        <td dir="ltr">{u.email}</td>
                        <td>{ROLE_LABELS[u.role] ?? u.role}</td>
                        <td>{formatNumber(u.scripts_count)}</td>
                        <td>{formatNumber(u.warnings_count)}</td>
                        <td>
                          {u.banned ? (
                            <span className="badge-banned" title={u.ban_reason ?? undefined}>مسدود</span>
                          ) : (
                            <span className="badge-active">فعال</span>
                          )}
                        </td>
                        <td>
                          <div className="admin-actions">
                            {canModerate(u) && (
                              <>
                                <button type="button" className="btn btn-outline btn-sm" onClick={() => toggleBan(u)}>
                                  <Ban size={14} />
                                  {u.banned ? "رفع مسدودی" : "مسدودسازی"}
                                </button>
                                <input
                                  type="text"
                                  placeholder="دلیل اخطار..."
                                  className="admin-input"
                                  maxLength={500}
                                  value={warnInput[u.id] ?? ""}
                                  onChange={(e) => setWarnInput((s) => ({ ...s, [u.id]: e.target.value }))}
                                />
                                <button type="button" className="btn btn-ghost btn-sm" onClick={() => warn(u)}>
                                  <ShieldAlert size={14} />
                                  اخطار
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === "pending" && (
              <div className="admin-table-wrap">
                {pending.length === 0 ? (
                  <p className="empty-state">اسکریپتی منتظر تأیید نیست</p>
                ) : (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>عنوان</th>
                        <th>نویسنده</th>
                        <th>دسته</th>
                        <th>تاریخ</th>
                        <th>عملیات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pending.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <Link to={"/scripts/" + p.id}>{p.title}</Link>
                          </td>
                          <td>{p.author_username}</td>
                          <td>{p.category}</td>
                          <td>{timeAgo(p.created_at)}</td>
                          <td>
                            <div className="admin-actions">
                              <button type="button" className="btn btn-primary btn-sm" onClick={() => run(() => approveScript(p.id))}>
                                <CheckCircle2 size={14} />
                                تأیید
                              </button>
                              <button type="button" className="btn btn-outline btn-sm" onClick={() => reject(p.id)}>
                                <XCircle size={14} />
                                رد
                              </button>
                              <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeScript(p.id)}>
                                <Trash2 size={14} />
                                حذف
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {tab === "reports" && (
              <div className="admin-table-wrap">
                {reports.length === 0 ? (
                  <p className="empty-state">گزارشی نیست</p>
                ) : (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>گزارش‌دهنده</th>
                        <th>مورد</th>
                        <th>دلیل</th>
                        <th>وضعیت</th>
                        <th>تاریخ</th>
                        <th>عملیات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.map((r) => (
                        <tr key={r.id}>
                          <td>{r.reporter_username}</td>
                          <td>
                            {r.script_id ? <Link to={"/scripts/" + r.script_id}>{r.target_label}</Link> : r.target_label}
                          </td>
                          <td title={r.details || undefined}>{REASON_LABELS[r.reason] ?? r.reason}</td>
                          <td>{REPORT_STATUS[r.status]}</td>
                          <td>{timeAgo(r.created_at)}</td>
                          <td>
                            {r.status === "open" && (
                              <div className="admin-actions">
                                <button type="button" className="btn btn-outline btn-sm" onClick={() => run(() => resolveReport(r.id, "action"))}>
                                  رسیدگی شد
                                </button>
                                <button type="button" className="btn btn-ghost btn-sm" onClick={() => run(() => resolveReport(r.id, "dismiss"))}>
                                  رد گزارش
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {tab === "comments" && (
              <div className="admin-table-wrap">
                {comments.length === 0 ? (
                  <p className="empty-state">نظری ثبت نشده</p>
                ) : (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>نویسنده</th>
                        <th>متن</th>
                        <th>تاریخ</th>
                        <th>عملیات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comments.map((c) => (
                        <tr key={c.id}>
                          <td>{c.author_username}</td>
                          <td style={c.is_hidden ? { opacity: 0.55 } : undefined}>
                            <Link to={"/scripts/" + c.script_id}>{c.body.slice(0, 100)}</Link>
                          </td>
                          <td>{timeAgo(c.created_at)}</td>
                          <td>
                            <button type="button" className="btn btn-outline btn-sm" onClick={() => run(() => setCommentHidden(c.id, !c.is_hidden))}>
                              {c.is_hidden ? <Eye size={14} /> : <EyeOff size={14} />}
                              {c.is_hidden ? "نمایش" : "پنهان کردن"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {tab === "logs" && (
              <div className="admin-table-wrap">
                {logs.length === 0 ? (
                  <p className="empty-state">فعالیتی ثبت نشده</p>
                ) : (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>انجام‌دهنده</th>
                        <th>عملیات</th>
                        <th>جزئیات</th>
                        <th>تاریخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((l) => (
                        <tr key={l.id}>
                          <td>{l.actor_username}</td>
                          <td>{ACTION_LABELS[l.action] ?? l.action}</td>
                          <td>{typeof l.details.title === "string" ? l.details.title : typeof l.details.reason === "string" ? l.details.reason : ""}</td>
                          <td>{timeAgo(l.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
