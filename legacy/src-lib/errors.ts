const ERROR_MESSAGES: Array<[string, string]> = [
  ['Invalid login credentials', 'نام کاربری یا رمز عبور اشتباه است.'],
  ['User already registered', 'این نام کاربری قبلاً ثبت شده است.'],
  ['username_taken', 'این نام کاربری قبلاً گرفته شده است.'],
  ['invalid_username', 'نام کاربری معتبر نیست.'],
  ['Database error saving new user', 'ثبت‌نام انجام نشد. لطفاً دوباره تلاش کنید.'],
  ['Password should be', 'رمز عبور باید حداقل ۸ کاراکتر باشد.'],
  ['rate limit', 'تلاش‌های زیاد انجام شده است. کمی صبر کنید.'],
  ['duplicate key', 'این مورد قبلاً ثبت شده است.'],
  ['row-level security', 'شما اجازه انجام این کار را ندارید.'],
  ['not_allowed', 'حساب شما اجازه انجام این کار را ندارد.'],
  ['not_authorized', 'شما دسترسی لازم برای این کار را ندارید.'],
  ['reason_required', 'لطفاً دلیل این کار را وارد کنید.'],
  ['cannot_target_self', 'این عملیات روی حساب خودتان مجاز نیست.'],
  ['cannot_target_owner', 'این عملیات روی مالک سایت مجاز نیست.'],
  ['report_already_resolved', 'این گزارش قبلاً بررسی شده است.'],
  ['script_not_found_or_already', 'این اسکریپت قبلاً بررسی شده است.'],
  ['script_not_found', 'اسکریپت پیدا نشد.'],
  ['user_not_found', 'کاربر پیدا نشد.'],
  ['comment_not_found', 'نظر پیدا نشد.'],
  ['report_not_found', 'گزارش پیدا نشد.'],
  ['Failed to fetch', 'اتصال به سرور برقرار نشد. اینترنت خود را بررسی کنید.'],
  ['Payload too large', 'حجم فایل بیش از حد مجاز است.'],
  ['mime type', 'فقط فایل‌های تصویری PNG، JPEG یا WebP مجاز هستند.'],
];

const FALLBACK_MESSAGE = 'خطایی رخ داد. لطفاً دوباره تلاش کنید.';

function readMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return '';
}

export function describeError(error: unknown): string {
  const message = readMessage(error);
  const match = ERROR_MESSAGES.find(([key]) => message.includes(key));
  return match ? match[1] : FALLBACK_MESSAGE;
}
