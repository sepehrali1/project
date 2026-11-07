import { Sparkles, Code2, Heart } from "lucide-react";

export default function About() {
  return (
    <section className="section about" id="about">
      <div className="container about-inner">
        <div className="about-content">
          <span className="about-badge">
            <Sparkles size={14} />
            داستان SSBLOX
          </span>

          <h2 className="section-title">درباره ما</h2>

          <p className="about-text">
            SSBLOX یک پلتفرم مستقل و رایگان برای اشتراک‌گذاری اسکریپت‌های
            Luau در Roblox است. هدف ما ساختن فضایی امن، سریع و فارسی برای
            اسکریپت‌نویسان و کاربران ایرانی است.
          </p>

          <p className="about-text">
            این پروژه یک تلاش شخصی است: از طراحی رابط کاربری تا پیاده‌سازی
            بک‌اند و سیستم امنیتی، همه و همه توسط یک نفر و با عشق به
            برنامه‌نویسی ساخته شده است.
          </p>

          <div className="about-author">
            <div className="about-author-avatar">S</div>
            <div>
              <div className="about-author-name">Sskid (سپهر)</div>
              <div className="about-author-role">
                بنیان‌گذار و تنها توسعه‌دهنده SSBLOX
              </div>
            </div>
          </div>
        </div>

        <div className="about-visual">
          <div className="about-card">
            <div className="about-card-icon">
              <Code2 size={28} />
            </div>
            <h3>ساخته‌شده توسط یک نفر</h3>
            <p>
              از طراحی UI تا کدهای بک‌اند، همه‌چیز توسط Sskid (سپهر) و
              به‌تنهایی نوشته شده است.
            </p>
          </div>

          <div className="about-card">
            <div className="about-card-icon">
              <Heart size={28} />
            </div>
            <h3>با عشق برای جامعه Roblox فارسی</h3>
            <p>
              هدف SSBLOX این است که کاربران فارسی‌زبان به یک منبع امن و
              قابل‌اعتماد دسترسی داشته باشند.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}