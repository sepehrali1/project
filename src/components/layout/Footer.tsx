import { Link } from "react-router-dom";
import { Github, Send } from "lucide-react";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link to="/" className="navbar-logo">
              <span className="logo-mark">S</span>
              <span className="logo-text">SSBLOX</span>
            </Link>
            <p>
              پلتفرم اشتراک‌گذاری اسکریپت‌های Luau برای Roblox. امن، سریع و رایگان.
            </p>
            <div className="footer-social">
              <a
                href="https://github.com/sepehrali1"
                target="_blank"
                rel="noreferrer"
                aria-label="گیت‌هاب Sskid"
                title="گیت‌هاب: sepehrali1"
              >
                <Github size={18} />
              </a>
              <a
                href="https://t.me/Sskidv"
                target="_blank"
                rel="noreferrer"
                aria-label="تلگرام Sskid"
                title="تلگرام: @Sskidv"
              >
                <Send size={18} />
              </a>
            </div>
          </div>

          <div className="footer-col">
            <h4>پلتفرم</h4>
            <Link to="/scripts">اسکریپت‌ها</Link>
            <Link to="/scripts?sort=trending">پرطرفدار</Link>
            <Link to="/scripts?sort=new">جدیدترین</Link>
          </div>

          <div className="footer-col">
            <h4>حساب کاربری</h4>
            <Link to="/login">ورود</Link>
            <Link to="/register">ثبت‌نام</Link>
            <Link to="/profile">پروفایل</Link>
          </div>

          <div className="footer-col">
            <h4>درباره SSBLOX</h4>
            <a href="/#about">درباره ما</a>
            <Link to="/terms">قوانین</Link>
            <Link to="/privacy">حریم خصوصی</Link>
          </div>
        </div>

        <div className="footer-bottom">
          <p>
            © {new Date().getFullYear()} SSBLOX — تمامی حقوق محفوظ است.
          </p>
          <p>ساخته‌شده با ❤️ توسط Sskid (سپهر)</p>
        </div>
      </div>
    </footer>
  );
}