# SSBLOX — راهنمای Deploy (Supabase)

معماری Production: **فرانت‌اند (Vite/React) ← Supabase** (Auth + Postgres/RLS + Storage + Edge Functions `register`, `login`, `me`).
سرور Express و دیتابیس JSON دیگر لازم نیستند و به `legacy/` منتقل شده‌اند.

## ۰. قبل از شروع
1. در Supabase Dashboard یک Backup بگیرید (Database → Backups).
2. `supabase/preflight.sql` را در SQL Editor اجرا کنید و خروجی را نگه دارید (ساختار فعلی دیتابیس).

## ۱. دیتابیس
به ترتیب در SQL Editor اجرا کنید (یا `supabase db push`):
1. `supabase/migrations/20261108000001_core_schema.sql`
2. `supabase/migrations/20261108000002_rpc_functions.sql`

هر دو idempotent هستند و داده‌ای حذف نمی‌کنند (فقط نقش `member` → `user`).

## ۲. Edge Functions
```bash
npm i -g supabase
supabase login
supabase link --project-ref gelsgkjvzjoujggevkcn
supabase functions deploy register login me
```
`supabase/config.toml` مقدار `verify_jwt = false` را برای هر سه تابع تنظیم کرده است (خود توابع اعتبارسنجی می‌کنند).
Secretهای `SUPABASE_URL`، `SUPABASE_ANON_KEY` و `SUPABASE_SERVICE_ROLE_KEY` به‌صورت خودکار در Edge Functions موجودند.

اختیاری — تأیید ایمیل: در Dashboard → Auth → SMTP تنظیم کنید و secret زیر را بگذارید:
`supabase secrets set REQUIRE_EMAIL_CONFIRMATION=true` (پیش‌فرض: حساب بلافاصله تأیید می‌شود).

## ۳. تنظیمات Auth (Dashboard)
- Auth → URL Configuration: `Site URL` = `https://ssblox-script-sharin-dd7z.bolt.host`
- Auth → Providers → Email: فعال؛ حداقل طول رمز ۸.

## ۴. Environment فرانت‌اند
در هاست (Bolt/Netlify/Vercel) فقط این دو متغیر:
```
VITE_SUPABASE_URL=https://gelsgkjvzjoujggevkcn.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```
**Service Role Key را هرگز در فرانت‌اند نگذارید.** فایل `public/_redirects` برای SPA fallback وجود دارد.

## ۵. Build
```bash
npm install
npm run typecheck && npm run lint && npm run build
```

## ۶. مالک (Owner)
- اگر دیتابیس هنوز هیچ owner ندارد، **اولین حساب ثبت‌شده** مالک می‌شود (تابع `register_profile`).
- اگر کاربران/مالک قبلی در Supabase دارید، مطمئن شوید یک ردیف `profiles` با `role='owner'` وجود دارد:
  `update public.profiles set role='owner' where username='YOUR_USERNAME';`

## ۷. مهاجرت داده‌های قدیمی (اختیاری)
فقط یک کاربر در `legacy/server/data/db.json` بود. برای انتقال با همان رمز:
```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-legacy-json.mjs legacy/server/data/db.json --dry-run
```
سپس بدون `--dry-run`. **فایل db.json حاوی ایمیل و هش رمز است؛ آن را در گیت/اشتراک عمومی نگذارید و بعد از مهاجرت پاک کنید.**
