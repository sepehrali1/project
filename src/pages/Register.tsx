import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus, Mail, Lock, User, AlertCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { ApiError } from "../lib/api";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const normalized = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(normalized)) {
      setError("نام کاربری باید ۳ تا ۲۰ کاراکتر و فقط شامل حروف انگلیسی، عدد یا _ باشد.");
      return;
    }
    if (password.length < 8) {
      setError("رمز عبور باید حداقل ۸ کاراکتر باشد.");
      return;
    }
    setSubmitting(true);

    try {
      const res = await register(email.trim(), normalized, password);
      if (res.needsEmailConfirmation) {
        setNotice("حساب ساخته شد. لینک تأیید به ایمیل شما ارسال شد؛ پس از تأیید وارد شوید.");
      } else {
        navigate("/profile");
      }
    } catch (err) {
      const first = err instanceof ApiError && err.fields ? Object.values(err.fields)[0] : null;
      setError(first ?? (err instanceof Error ? err.message : "خطا در ثبت‌نام"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-icon">
              <UserPlus size={28} />
            </div>
            <h1>ساخت حساب در SSBLOX</h1>
            <p>رایگان، سریع، و بدون نیاز به کارت بانکی.</p>
          </div>

          {notice && (
            <div className="auth-error" style={{ borderColor: "#10b981", color: "#10b981" }}>
              <span>{notice}</span>
            </div>
          )}

          {error && (
            <div className="auth-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <label className="form-field">
              <span>ایمیل</span>
              <div className="input-wrap">
                <Mail size={16} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  dir="ltr"
                />
              </div>
            </label>

            <label className="form-field">
              <span>نام کاربری</span>
              <div className="input-wrap">
                <User size={16} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="sskid"
                  dir="ltr"
                  required
                  minLength={3}
                  maxLength={20}
                  autoComplete="username"
                />
              </div>
            </label>

            <label className="form-field">
              <span>رمز عبور (حداقل ۸ کاراکتر)</span>
              <div className="input-wrap">
                <Lock size={16} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  maxLength={72}
                  autoComplete="new-password"
                  dir="ltr"
                />
              </div>
            </label>

            <button
              type="submit"
              className="btn btn-primary btn-lg auth-submit"
              disabled={submitting}
            >
              {submitting ? "در حال ساخت حساب..." : "ثبت‌نام"}
            </button>
          </form>

          <div className="auth-footer">
            قبلاً حساب داشتی؟{" "}
            <Link to="/login" className="auth-link">
              وارد شو
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}