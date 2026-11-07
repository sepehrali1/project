export const CATEGORIES = [
  { value: 'obby', label: 'ماجراجویی (Obby)' },
  { value: 'simulator', label: 'شبیه‌ساز' },
  { value: 'tycoon', label: 'تایکون' },
  { value: 'rpg', label: 'نقش‌آفرینی (RPG)' },
  { value: 'horror', label: 'ترسناک' },
  { value: 'racing', label: 'مسابقه‌ای' },
  { value: 'fighting', label: 'مبارزه‌ای' },
  { value: 'building', label: 'ساخت و ساز' },
  { value: 'utility', label: 'ابزاری' },
  { value: 'other', label: 'سایر' },
] as const;

export function getCategoryLabel(value: string): string {
  return CATEGORIES.find((category) => category.value === value)?.label ?? value;
}

export const SORT_OPTIONS = [
  { value: 'newest', label: 'جدیدترین' },
  { value: 'likes', label: 'محبوب‌ترین' },
  { value: 'views', label: 'پربازدیدترین' },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]['value'];

export const REPORT_REASONS = [
  { value: 'spam', label: 'هرزنامه یا تبلیغ' },
  { value: 'abuse', label: 'توهین یا آزار' },
  { value: 'copyright', label: 'نقض حق کپی‌رایت' },
  { value: 'malicious', label: 'کد مخرب یا خطرناک' },
  { value: 'other', label: 'سایر موارد' },
] as const;

export const SCRIPT_STATUS_LABELS: Record<string, string> = {
  pending: 'در انتظار تأیید',
  approved: 'منتشر شده',
  rejected: 'رد شده',
};

export const REPORT_STATUS_LABELS: Record<string, string> = {
  open: 'باز',
  resolved: 'رسیدگی شده',
  dismissed: 'رد شده',
};

export const ACTION_LABELS: Record<string, string> = {
  script_approved: 'تأیید اسکریپت',
  script_rejected: 'رد اسکریپت',
  comment_hidden: 'پنهان کردن نظر',
  comment_shown: 'نمایش دوباره نظر',
  report_resolved: 'رسیدگی به گزارش',
  report_dismissed: 'رد گزارش',
  user_verified: 'دادن تأیید آبی',
  user_unverified: 'حذف تأیید آبی',
  user_warned: 'اخطار به کاربر',
  user_banned: 'مسدود کردن کاربر',
  user_unbanned: 'رفع مسدودیت کاربر',
};

export const TARGET_LABELS: Record<string, string> = {
  script: 'اسکریپت',
  comment: 'نظر',
  report: 'گزارش',
  user: 'کاربر',
};

export const SCRIPT_TITLE_MIN = 3;
export const SCRIPT_TITLE_MAX = 120;
export const SCRIPT_DESCRIPTION_MIN = 10;
export const SCRIPT_DESCRIPTION_MAX = 300;
export const SCRIPT_INFORMATION_MAX = 4000;
export const SCRIPT_CODE_MAX = 100000;
export const COMMENT_MAX = 1000;
export const REPORT_DETAILS_MAX = 500;
export const PASSWORD_MIN = 8;
export const THUMBNAIL_MAX_BYTES = 2 * 1024 * 1024;

export const THUMBNAIL_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;
