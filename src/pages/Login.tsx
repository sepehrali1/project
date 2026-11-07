import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogIn, Mail, Lock, AlertCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "خطا در ورود";
      setError(msg);
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
              <LogIn size={28} />
            </div>
            <h1>ورود به SSBLOX</h1>
            <p>خوش برگشتی! اطلاعات حسابت رو وارد کن.</p>
          </div>

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
              <span>رمز عبور</span>
              <div className="input-wrap">
                <Lock size={16} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  dir="ltr"
                />
              </div>
            </label>

            <button
              type="submit"
              className="btn btn-primary btn-lg auth-submit"
              disabled={submitting}
            >
              {submitting ? "در حال ورود..." : "ورود"}
            </button>
          </form>

          <div className="auth-footer">
            حساب نداری؟{" "}
            <Link to="/register" className="auth-link">
              ثبت‌نام کن
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}