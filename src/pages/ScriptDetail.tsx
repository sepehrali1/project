import { useEffect, useState, type FormEvent } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Heart,
  Eye,
  Copy,
  Check,
  BadgeCheck,
  Clock,
  Trash2,
  ArrowRight,
  Flag,
  Pencil,
  EyeOff,
} from "lucide-react";
import {
  fetchScript,
  toggleLike,
  deleteScript,
  fetchComments,
  postComment,
  deleteComment,
  recordView,
  reportTarget,
} from "../lib/scriptsApi";
import { adminDeleteScript, setCommentHidden } from "../lib/adminApi";
import { describeError } from "../lib/api";
import type { ScriptItem, CommentItem } from "../types/script";
import { useAuth } from "../contexts/AuthContext";
import { formatNumber, timeAgo, toPersianDigits } from "../utils/format";

const REPORT_REASONS = [
  { value: "spam", label: "هرزنامه یا تبلیغ" },
  { value: "abuse", label: "توهین یا آزار" },
  { value: "copyright", label: "نقض حق کپی‌رایت" },
  { value: "malicious", label: "کد مخرب یا خطرناک" },
  { value: "other", label: "سایر موارد" },
];

interface ReportTarget {
  scriptId?: string;
  commentId?: string;
  label: string;
}

export default function ScriptDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isStaff = user?.role === "moderator" || user?.role === "owner";

  const [script, setScript] = useState<ScriptItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [reportTargetState, setReportTargetState] = useState<ReportTarget | null>(null);
  const [reportReason, setReportReason] = useState("spam");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const userId = user?.id;

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoading(true);
    setError(null);

    Promise.all([fetchScript(id), fetchComments(id)])
      .then(([sRes, cRes]) => {
        if (!mounted) return;
        setScript(sRes.script);
        setComments(cRes.comments);
        if (sRes.script.status === "approved") {
          recordView(id).then((views) => {
            if (mounted && views !== null) {
              setScript((prev) => (prev ? { ...prev, views_count: views } : prev));
            }
          });
        }
      })
      .catch((err) => {
        if (!mounted) return;
        setError(describeError(err));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
    // re-run when the signed-in user changes so liked_by_me / is_mine are correct
  }, [id, userId]);

  async function handleLike() {
    if (!script) return;
    if (!user) {
      navigate("/login");
      return;
    }
    try {
      const res = await toggleLike(script.id);
      setScript((prev) => (prev ? { ...prev, liked_by_me: res.liked, likes_count: res.likes_count } : prev));
    } catch (err) {
      setError(describeError(err));
    }
  }

  async function handleCopy() {
    if (!script) return;
    try {
      await navigator.clipboard.writeText(script.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("کپی ناموفق");
    }
  }

  async function handleDelete() {
    if (!script) return;
    if (!confirm("آیا مطمئنید؟")) return;
    try {
      if (script.is_mine) await deleteScript(script.id);
      else await adminDeleteScript(script.id);
      navigate("/scripts");
    } catch (err) {
      setError(describeError(err));
    }
  }

  async function handleComment(e: FormEvent) {
    e.preventDefault();
    if (!script || !commentText.trim()) return;
    setCommentSubmitting(true);
    try {
      const res = await postComment(script.id, commentText);
      setComments((prev) => [...prev, res.comment]);
      setCommentText("");
    } catch (err) {
      setError(describeError(err));
    } finally {
      setCommentSubmitting(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      setError(describeError(err));
    }
  }

  async function handleToggleHidden(comment: CommentItem) {
    try {
      await setCommentHidden(comment.id, !comment.is_hidden);
      setComments((prev) => prev.map((c) => (c.id === comment.id ? { ...c, is_hidden: !c.is_hidden } : c)));
    } catch (err) {
      setError(describeError(err));
    }
  }

  function openReport(target: ReportTarget) {
    if (!user) {
      navigate("/login");
      return;
    }
    setReportReason("spam");
    setReportDetails("");
    setReportTargetState(target);
  }

  async function handleReport(e: FormEvent) {
    e.preventDefault();
    if (!reportTargetState) return;
    setReportSubmitting(true);
    try {
      await reportTarget({
        scriptId: reportTargetState.scriptId,
        commentId: reportTargetState.commentId,
        reason: reportReason,
        details: reportDetails,
      });
      setReportTargetState(null);
      setNotice("گزارش شما ثبت شد. ممنون!");
      setTimeout(() => setNotice(null), 4000);
    } catch (err) {
      setError(describeError(err));
      setReportTargetState(null);
    } finally {
      setReportSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner" />
        <p>در حال بارگذاری...</p>
      </div>
    );
  }

  if (!script) {
    return (
      <div className="container detail-error">
        <p>{error ?? "اسکریپت یافت نشد"}</p>
        <Link to="/scripts" className="btn btn-primary">
          <ArrowRight size={16} />
          بازگشت به لیست
        </Link>
      </div>
    );
  }

  const canManage = script.is_mine;
  const canDelete = script.is_mine || isStaff;

  return (
    <div className="script-detail-page">
      <div className="container">
        <Link to="/scripts" className="back-link">
          <ArrowRight size={16} />
          بازگشت به لیست
        </Link>

        {error && <div className="form-error">{error}</div>}
        {notice && (
          <div className="form-error" style={{ borderColor: "#10b981", color: "#10b981" }}>
            {notice}
          </div>
        )}

        <div className="detail-card">
          {script.image_url && (
            <div
              className="detail-image"
              style={{ backgroundImage: `url("${encodeURI(script.image_url)}")` }}
            />
          )}

          <div className="detail-header">
            <div className="detail-meta-top">
              <span className="badge-category">{script.category}</span>
              {script.status === "pending" && <span className="badge-pending">منتظر تأیید</span>}
              {script.status === "rejected" && <span className="badge-banned">رد شده</span>}
            </div>
            <h1>{script.title}</h1>
            <div className="detail-author">
              <div className="author-avatar">{script.author.username.charAt(0).toUpperCase()}</div>
              <span>{script.author.username}</span>
              {script.author.verified && <BadgeCheck size={16} className="verified-badge" />}
              <span className="dot-sep">•</span>
              <Clock size={14} />
              <span>{timeAgo(script.created_at)}</span>
              {user && !script.is_mine && script.author.id && (
                <Link
                  to={`/messages/${script.author.id}`}
                  state={{ username: script.author.username }}
                  className="btn btn-outline btn-sm author-message-link"
                >
                  پیام خصوصی
                </Link>
              )}
            </div>
          </div>

          {script.status === "rejected" && script.rejection_reason && (
            <div className="form-error">دلیل رد شدن: {script.rejection_reason}</div>
          )}

          <p className="detail-description">{script.description}</p>

          <div className="detail-actions">
            <button
              type="button"
              className={script.liked_by_me ? "btn btn-primary" : "btn btn-outline"}
              onClick={handleLike}
              disabled={script.status !== "approved"}
            >
              <Heart size={16} fill={script.liked_by_me ? "currentColor" : "none"} />
              {formatNumber(script.likes_count)}
            </button>
            <div className="stat">
              <Eye size={16} />
              {formatNumber(script.views_count)}
            </div>
            {canManage && (
              <Link to={"/scripts/" + script.id + "/edit"} className="btn btn-outline">
                <Pencil size={16} />
                ویرایش
              </Link>
            )}
            {canDelete && (
              <button type="button" className="btn btn-ghost" onClick={handleDelete}>
                <Trash2 size={16} />
                حذف
              </button>
            )}
            {!script.is_mine && script.status === "approved" && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => openReport({ scriptId: script.id, label: "این اسکریپت" })}
              >
                <Flag size={16} />
                گزارش
              </button>
            )}
          </div>

          <div className="code-block">
            <div className="code-header">
              <span className="code-lang">Luau</span>
              <button type="button" className="btn btn-ghost btn-copy" onClick={handleCopy}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "کپی شد" : "کپی کد"}
              </button>
            </div>
            <pre className="code-body">
              <code>{script.code}</code>
            </pre>
          </div>

          <div className="comments-section">
            <h2>کامنت‌ها ({toPersianDigits(comments.length)})</h2>

            {user && script.status === "approved" ? (
              <form onSubmit={handleComment} className="comment-form">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="نظرت رو بنویس..."
                  rows={3}
                  maxLength={1000}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={commentSubmitting || !commentText.trim()}
                >
                  {commentSubmitting ? "در حال ارسال..." : "ارسال"}
                </button>
              </form>
            ) : !user ? (
              <p className="comment-login-hint">
                برای کامنت گذاشتن <Link to="/login">وارد</Link> شوید.
              </p>
            ) : null}

            <div className="comments-list">
              {comments.length === 0 ? (
                <p className="empty-comments">هنوز کامنتی نیست — اولین نفر باشید!</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="comment-item" style={c.is_hidden ? { opacity: 0.55 } : undefined}>
                    <div className="comment-avatar">{c.author.username.charAt(0).toUpperCase()}</div>
                    <div className="comment-body">
                      <div className="comment-head">
                        <span className="comment-username">{c.author.username}</span>
                        {c.author.verified && <BadgeCheck size={14} className="verified-badge" />}
                        <span className="comment-time">{timeAgo(c.created_at)}</span>
                        {c.is_hidden && <span className="badge-pending">پنهان شده</span>}
                      </div>
                      <p>{c.content}</p>
                    </div>
                    {isStaff && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon"
                        onClick={() => handleToggleHidden(c)}
                        aria-label={c.is_hidden ? "نمایش نظر" : "پنهان کردن نظر"}
                        title={c.is_hidden ? "نمایش نظر" : "پنهان کردن نظر"}
                      >
                        {c.is_hidden ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                    )}
                    {user && !c.is_mine && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon"
                        onClick={() => openReport({ commentId: c.id, label: "این نظر" })}
                        aria-label="گزارش نظر"
                        title="گزارش نظر"
                      >
                        <Flag size={14} />
                      </button>
                    )}
                    {(c.is_mine || isStaff) && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon"
                        onClick={() => handleDeleteComment(c.id)}
                        aria-label="حذف"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {reportTargetState && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 16,
          }}
          onClick={() => setReportTargetState(null)}
        >
          <form
            onSubmit={handleReport}
            onClick={(e) => e.stopPropagation()}
            className="form-card"
            style={{ maxWidth: 440, width: "100%" }}
          >
            <h2>گزارش {reportTargetState.label}</h2>
            <label className="form-field">
              <span>دلیل</span>
              <select value={reportReason} onChange={(e) => setReportReason(e.target.value)}>
                {REPORT_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>توضیحات (اختیاری)</span>
              <textarea
                rows={3}
                maxLength={500}
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
              />
            </label>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={reportSubmitting}>
                {reportSubmitting ? "در حال ارسال..." : "ارسال گزارش"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setReportTargetState(null)}>
                انصراف
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
