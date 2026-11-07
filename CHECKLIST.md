# چک‌لیست قابلیت‌ها و گزارش تست — SSBLOX

## ⚠️ وضعیت واقعی تست (صادقانه)
در محیطی که این کار انجام شد **اینترنت خاموش بود**: `npm install`، `npm run build`، `npm run typecheck`، `npm run lint` و هر اتصال به Supabase/سایت **اجرا نشد**.
تنها چیزی که واقعاً انجام شد: بررسی نحوی (Parse) هر ۴۴ فایل TS/TSX و Edge Function با esbuild (۰ خطا) و بررسی اینکه همه‌ی importهای نسبی/`@/` به فایل موجود اشاره می‌کنند (۰ مورد ناموجود).
بنابراین **هیچ مورد زیر «Tested» نیست.** وضعیت‌ها یعنی: کد نوشته/اصلاح شده، ولی اجرا نشده.

برچسب‌ها: **Connected** = به Supabase وصل شد (کد) · **Fixed** = باگ اصلاح شد · **Manual** = نیاز به کار دستی شما

## باگ‌های پیدا و اصلاح‌شده
| مشکل | وضعیت |
|---|---|
| `login/index.ts`: کاراکترهای خراب به‌جای `\|\|` (Syntax Error) | Fixed |
| `me/index.ts`: `Bearer ${token}` بدون backtick (Syntax Error) | Fixed |
| فرانت‌اند به `/api/auth/*` (Express) می‌رفت | Fixed → Edge Functions |
| `token` در برابر `access_token` | Fixed (`LoginResponse`) |
| `AuthUser` ≠ `MeResponse` (verified/banned/created_at نبود) | Fixed |
| فقط یک `functions.register` در config.toml، `verify_jwt` | Fixed (هر سه تابع) |
| `register` به `postgres` driver و `SUPABASE_DB_URL` وابسته بود | Fixed → RPC `register_profile` |
| نقش `member` در دیتابیس ↔ `user` در UI | Fixed (مایگریشن + constraint) |
| دو لایه‌ی API (Express-style و Supabase-style) و تایپ‌های ناسازگار | Fixed (دومی به `legacy/` رفت) |
| alias `@/` در Vite/tsconfig نبود | Fixed |
| `scrtipts.ts` تکراری | به `legacy/server` رفت |
| صفحه‌ی Scripts پارامتر `?sort=` و `?category=` را نمی‌خواند (لینک «پرطرفدار» و دسته‌ها کار نمی‌کرد) | Fixed |
| لینک‌های «قوانین» و «حریم خصوصی» به /register می‌رفت | Fixed (صفحه‌ی واقعی) |
| دکمه‌ی «تأیید و انتشار» برای نویسنده = دور زدن تأیید ناظر | حذف شد (امنیت؛ ناظر/مالک خودکار تأیید می‌شوند) |
| فرم ثبت‌نام: حداقل رمز ۶ و نام کاربری تا ۳۰ (با سرور ناسازگار) | Fixed (۸ و ۲۰) |

## صفحات و قابلیت‌ها
| قابلیت | فایل | Backend | وضعیت |
|---|---|---|---|
| ثبت‌نام (اعتبارسنجی، ایمیل/نام تکراری، خطا) | Register.tsx, functions/register | Edge `register` + RPC | Connected + Fixed |
| تأیید ایمیل | functions/register | `REQUIRE_EMAIL_CONFIRMATION` | Connected · Manual (SMTP) |
| ورود، رمز اشتباه، حساب مسدود | Login.tsx, functions/login | Edge `login` | Connected + Fixed |
| ساخت Session مشترک با supabase-js + Refresh Token خودکار | AuthContext.tsx | `setSession` | Connected |
| `me` / بازیابی بعد از Refresh / Session منقضی | AuthContext.tsx, functions/me | Edge `me` | Connected + Fixed |
| خروج واقعی | AuthContext.tsx | `auth.signOut` | Connected |
| ProtectedRoute / RoleRoute | components/ | رابط کاربری + RLS/RPC در سرور | Connected |
| پروفایل + ویرایش نام نمایشی/بیو + آمار واقعی | Profile.tsx | `profiles`, RPC `my_stats` | Connected |
| لیست اسکریپت‌ها: جستجو، دسته، مرتب‌سازی، Pagination | Scripts.tsx, scriptsApi.ts | `scripts` + count | Connected + Fixed |
| منتخب‌ها / آمار / شمارش دسته‌ها در خانه | home/* | RPC `site_stats` | Connected |
| جزئیات اسکریپت + بازدید | ScriptDetail.tsx | RPC `record_script_view` | Connected |
| ایجاد اسکریپت + آپلود تصویر (۲MB، png/jpg/webp) | NewScript.tsx | `scripts` + Storage | Connected |
| ویرایش اسکریپت (بازگشت به pending برای کاربر عادی) | NewScript.tsx (`/scripts/:id/edit`) | `scripts` + trigger | Connected (جدید) |
| حذف اسکریپت + پاک‌شدن تصویر | ScriptDetail/MyScripts | RLS + trigger | Connected |
| اسکریپت‌های من + وضعیت (pending/approved/rejected + دلیل) | MyScripts.tsx | `scripts` | Connected |
| لایک / برداشتن لایک | ScriptDetail.tsx | RPC `toggle_script_like` | Connected |
| کامنت: ایجاد/نمایش/حذف توسط نویسنده | ScriptDetail.tsx | `script_comments` + RLS | Connected |
| گزارش اسکریپت و کامنت (جلوگیری از تکراری) | ScriptDetail.tsx | RPC `create_report` | Connected (جدید) |
| پنل ادمین: کاربران، Ban/Unban، اخطار | Admin.tsx | RPC | Connected |
| پنل ادمین: Pending → تأیید / رد (با دلیل) / حذف | Admin.tsx | RPC | Connected |
| پنل ادمین: گزارش‌ها (رسیدگی/رد) | Admin.tsx | RPC `resolve_report` | Connected |
| پنل ادمین: مدیریت نظرها (پنهان/نمایش) + لاگ فعالیت | Admin.tsx | RPC + `activity_logs` | Connected (جدید) |
| پنل مالک: نقش، تیک آبی | Owner.tsx | RPC owner-only | Connected |
| جلوگیری از ارتقای نقش از سمت کلاینت | SQL | ستون `role` قابل‌نوشتن نیست؛ RPC فقط owner | Connected |
| RLS روی هر ۹ جدول + محافظ RPC + Storage policy | migrations | — | Connected · Manual (اجرای SQL) |
| جدول `notifications` (با ثبت خودکار برای تأیید/رد/اخطار) | SQL | — | Connected، **رابط کاربری ندارد** (Not Working از نظر UI) |
| جدول `saved_scripts` | SQL | — | جدول+RLS آماده، **UI ندارد** |
| ویرایش/حذف حساب کاربری توسط خود کاربر (Account deletion) | — | — | پیاده نشد |
| Rate limiting روی register/login/comment | — | — | پیاده نشد (Manual: Auth rate limits در Dashboard) |

## کارهای دستی باقی‌مانده (شما)
1. Backup + `preflight.sql` → اجرای دو مایگریشن → **بررسی خروجی**: اگر جدول‌های قدیمی ستون‌های متفاوتی دارند، ممکن است اصلاح دستی لازم باشد (من ساختار فعلی دیتابیس را ندیدم؛ مایگریشن‌ها را از روی کد فرانت‌اند نوشتم).
2. `supabase functions deploy register login me`.
3. تنظیم Site URL و (اختیاری) SMTP.
4. تنظیم `VITE_SUPABASE_*` در هاست، سپس `npm install && npm run typecheck && npm run lint && npm run build` — **خروجی‌ها را برایم بفرستید تا خطاهای احتمالی را رفع کنم.**
5. اطمینان از وجود حداقل یک owner (بخش ۶ DEPLOY.md).
6. حذف/محافظت `legacy/server/data/db.json` (ایمیل + هش رمز).
7. یک‌بار تست دستی سناریوهای ۱ تا ۲۵ روی سایت واقعی.

## ریسک‌ها و نکات صادقانه
- تایپ‌چک واقعی انجام نشد؛ احتمال چند خطای تایپی (مثلاً typing نتیجه‌ی `supabase.from().select()`) وجود دارد.
- «اولین کاربر = owner»: تا وقتی owner وجود ندارد، هر کسی که اول ثبت‌نام کند مالک می‌شود؛ بعد از ساخت owner این مسیر بسته است.
- `style.css` و `src/styles/*.css` دو سیستم استایل موازی‌اند (فقط `style.css` import می‌شود)؛ دست نزدم تا ظاهر سایت حفظ شود.
