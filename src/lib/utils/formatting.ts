import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";
import { sv } from "date-fns/locale";

export function formatPrice(amount: number | null | undefined): string {
  if (amount == null) return "–";
  return new Intl.NumberFormat("sv-SE", {
    style: "decimal",
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace(/\s/g, "\u00A0")
    .concat("\u00A0kr");
}

export function formatArea(sqm: number | null | undefined): string {
  if (sqm == null) return "–";
  return `${sqm} m²`;
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return "–";
  const parsed = parseISO(date);
  if (!isValid(parsed)) return "–";
  return format(parsed, "yyyy-MM-dd");
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return "–";
  const parsed = parseISO(date);
  if (!isValid(parsed)) return "–";
  return format(parsed, "yyyy-MM-dd HH:mm");
}

export function formatRelativeTime(date: string | null | undefined): string {
  if (!date) return "–";
  const parsed = parseISO(date);
  if (!isValid(parsed)) return "–";
  return formatDistanceToNow(parsed, { addSuffix: true, locale: sv });
}
