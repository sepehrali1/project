const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export function toPersianDigits(value: number | string): string {
  return String(value).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) {
    const m = (n / 1_000_000).toFixed(1).replace(/\.0$/, "");
    return toPersianDigits(m) + " میلیون";
  }
  if (n >= 1_000) {
    const k = (n / 1_000).toFixed(1).replace(/\.0$/, "");
    return toPersianDigits(k) + " هزار";
  }
  return toPersianDigits(n);
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 1) return "امروز";
  if (days === 1) return "دیروز";
  if (days < 7) return toPersianDigits(days) + " روز پیش";
  if (days < 30) return toPersianDigits(Math.floor(days / 7)) + " هفته پیش";
  if (days < 365) return toPersianDigits(Math.floor(days / 30)) + " ماه پیش";
  return toPersianDigits(Math.floor(days / 365)) + " سال پیش";
}