import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";

export default function CallToAction() {
  return (
    <section className="section-sm">
      <div className="container">
        <div className="cta">
          <div className="cta-glow" />
          <div className="cta-content">
            <span className="cta-badge">
              <Sparkles size={14} />
              کاملاً رایگان
            </span>
            <h2>همین حالا به SSBLOX بپیوند</h2>
            <p>
              عضو جامعه‌ی رو به رشد اسکریپت‌نویسان و کاربران Roblox فارسی شو و از
              تمام امکانات پلتفرم استفاده کن.
            </p>
            <div className="cta-actions">
              <Link to="/register" className="btn btn-primary btn-lg">
                ساخت حساب رایگان
                <ArrowLeft size={18} />
              </Link>
              <Link to="/scripts" className="btn btn-outline btn-lg">
                مرور اسکریپت‌ها
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}