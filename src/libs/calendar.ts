export function todayInSaoPaulo() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function dateFromKey(value: string) {
  return new Date(`${value}T12:00:00Z`);
}

export function addDays(value: string, days: number) {
  const date = dateFromKey(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function mondayOf(value: string) {
  const date = dateFromKey(value);
  return addDays(value, -((date.getUTCDay() + 6) % 7));
}

export function formatDay(value: string, options: Intl.DateTimeFormatOptions = {}) {
  return dateFromKey(value).toLocaleDateString("pt-BR", { timeZone: "UTC", ...options });
}

export function weekLabel(week: string) {
  const end = addDays(week, 6);
  const startLabel = formatDay(week, { day: "2-digit" });
  const endLabel = formatDay(end, { day: "2-digit", month: "short" }).replace(" de ", " ");
  return `${startLabel} — ${endLabel}`;
}
