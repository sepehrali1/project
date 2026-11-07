import { Link } from "react-router-dom";

interface Props {
  kind: "terms" | "privacy";
}

export default function LegalPage({ kind }: Props) {
  const isTerms = kind === "terms";
  return (
    <div className="form-page">
      <div className="container">
        <div className="form-card" style={{ lineHeight: 2 }}>
          <h1>{isTerms ? "قوانین استفاده" : "حریم خصوصی"}</h1>
          {isTerms ? (
            <>
              <p>SSBLOX محلی برای اشتراک‌گذاری اسکریپت‌های آموزشی Roblox Studio است. با استفاده از سایت، موارد زیر را می‌پذیرید:</p>
              <ul>
                <li>فقط اسکریپت‌هایی را منتشر کنید که خودتان نوشته‌اید یا اجازه‌ی انتشارشان را دارید.</li>
                <li>انتشار کد مخرب، سرقت اطلاعات یا اسکریپتی که قوانین Roblox را نقض کند ممنوع است.</li>
                <li>توهین، هرزنامه و تبلیغ در نظرات و توضیحات ممنوع است.</li>
                <li>ناظران می‌توانند محتوای نقض‌کننده را رد، حذف یا حساب خاطی را مسدود کنند.</li>
              </ul>
            </>
          ) : (
            <>
              <p>برای کارکرد سایت فقط اطلاعات لازم را نگه می‌داریم:</p>
              <ul>
                <li>ایمیل و رمز عبور (رمز به‌صورت رمزنگاری‌شده توسط Supabase Auth نگه‌داری می‌شود).</li>
                <li>نام کاربری، نام نمایشی و توضیح پروفایل که خودتان وارد می‌کنید (عمومی).</li>
                <li>اسکریپت‌ها، نظرها، لایک‌ها و گزارش‌های شما.</li>
              </ul>
              <p>ایمیل شما برای کاربران دیگر نمایش داده نمی‌شود و اطلاعات شما فروخته نمی‌شود.</p>
            </>
          )}
          <Link to="/" className="btn btn-primary">
            بازگشت به خانه
          </Link>
        </div>
      </div>
    </div>
  );
}
