// Data/hora "agora" no fuso do pet shop. O servidor pode rodar em UTC,
// entao nao da pra usar new Date().getHours() direto.
const TIMEZONE = process.env.TZ_SHOP || "America/Sao_Paulo";

export function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1000 || month < 1 || month > 12 || day < 1) return false;
  return day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isValidMonth(value) {
  return typeof value === "string" && /^\d{4}-\d{2}$/.test(value) && isValidDate(`${value}-01`);
}

// Mesma grade exibida ao cliente: 08:00 ate 17:30, a cada meia hora.
export function isValidSlot(value) {
  return typeof value === "string" && /^(0[89]|1[0-7]):(00|30)$/.test(value);
}

export function nowInShop() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type).value;
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

// Funcionamento: segunda a sabado. Agendamentos com ate 60 dias de antecedencia.
// (Mesmos valores em frontend/js/agendar.js.)
export const MAX_ADVANCE_DAYS = 60;

export function isClosedDay(date) {
  return new Date(`${date}T00:00:00Z`).getUTCDay() === 0;
}

export function isBeyondBookingWindow(date) {
  const limit = new Date(`${nowInShop().date}T00:00:00Z`);
  limit.setUTCDate(limit.getUTCDate() + MAX_ADVANCE_DAYS);
  return date > limit.toISOString().slice(0, 10);
}

// Mensagem de erro de calendario (ou null) para uma data YYYY-MM-DD valida.
export function bookingDateError(date) {
  if (isClosedDay(date)) return "O pet shop não abre aos domingos. Escolha outro dia.";
  if (isBeyondBookingWindow(date)) return `Agendamentos podem ser feitos com até ${MAX_ADVANCE_DAYS} dias de antecedência.`;
  return null;
}

// true se o horario (YYYY-MM-DD + HH:MM) ja passou (ou e agora) no fuso do pet shop.
// Strings nesse formato comparam corretamente em ordem lexicografica.
export function isPast(date, time) {
  const now = nowInShop();
  if (date !== now.date) return date < now.date;
  return time <= now.time;
}
