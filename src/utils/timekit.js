// Helpers
const pad2 = (n) => String(n).padStart(2, '0');

// YYYY-MM-DD desde Date o ISO (LOCAL, sin desfase)
export const toIsoDateKey = (d0) => {
  const d = new Date(d0);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

// Inicio de semana (lunes) - LOCAL
export const startOfWeek = (d0) => {
  const d = new Date(d0);
  const diff = (d.getDay() + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diff);
  return d;
};

// Fin de semana (domingo) - LOCAL
export const endOfWeek = (d0) => {
  const s = startOfWeek(d0);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
};

// HH:MM válido
export const isValidTime = (v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(v));

// Minutos totales desde HH:MM
export const minutesOf = (v) => {
  if (!isValidTime(v)) return NaN;
  const [h, m] = String(v).split(':').map(Number);
  return h * 60 + m;
};

// Crear Date local desde YYYY-MM-DD + HH:MM
export const buildLocalDateTime = (dateStr, timeStr) => {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  const [hh, mm] = String(timeStr).split(':').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
};

// ✅ Date -> "YYYY-MM-DDTHH:mm:00" (LOCAL, SIN Z)
export const toLocalIsoNoZ = (d0) => {
  const d = new Date(d0);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:00`;
};

// ✅ YYYY-MM-DD en horario LOCAL (simple y sin ISO/offset hacks)
export const toLocalDateKey = (isoOrDate) => {
  const d = new Date(isoOrDate);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

// ✅ Calcular minutos entre startAt y endAt (evita errores por decimales)
export const calcMinutes = (l) => {
  if (!l) return 0;
  const s = l.startAt ? Date.parse(l.startAt) : NaN;
  const e = l.endAt ? Date.parse(l.endAt) : NaN;
  if (!Number.isFinite(s) || !Number.isFinite(e)) return 0;
  const diff = e - s;
  if (diff <= 0) return 0;
  return Math.round(diff / 60000);
};

// ✅ Calcular horas (en decimal) usando minutos (más estable)
export const calcHours = (l) => {
  if (typeof l?.hours === 'number' && !Number.isNaN(l.hours)) return l.hours;
  return calcMinutes(l) / 60;
};

// ✅ Formatear horas → "4 h 30 min" (con carry correcto cuando M=60)
export const fmtHours = (h) => {
  const totalMinutes = Math.round((Number(h) || 0) * 60);
  if (totalMinutes <= 0) return '0 h';

  const H = Math.floor(totalMinutes / 60);
  const M = totalMinutes % 60;

  if (M === 0) return `${H} h`;
  if (H === 0) return `${M} min`;
  return `${H} h ${M} min`;
};

// Etiqueta "01 ene – 07 ene"
export const rangeLabel = (a, b) => {
  const o = { month: 'short', day: '2-digit' };
  return `${a.toLocaleDateString('es-CR', o)} – ${b.toLocaleDateString('es-CR', o)}`;
};

/** Devuelve los 7 días de la semana a partir de weekStart */
export const getWeekDays = (weekStart) =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

/** ✅ Rango para API en LOCAL sin Z (evita corrimientos al filtrar) */
export const toIsoRange = (start, end) => ({
  from: toLocalIsoNoZ(startOfWeek(start)), // o start tal cual si ya viene startOfWeek
  to: toLocalIsoNoZ(endOfWeek(end)),       // o end tal cual si ya viene endOfWeek
});

/** Crea un Date desde un key tipo 'YYYY-MM-DD' en zona local */
export const fromDateKey = (key) => {
  const [y, m, d] = String(key).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

/** HH:MM desde un Date (local) */
export const toHHMM = (d0) => {
  const d = new Date(d0);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

/** Formatos de fecha para UI (es-CR) */
export const formatFullDateEs = (d) =>
  new Date(d).toLocaleDateString('es-CR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

export const formatShortWeekdayEs = (d) =>
  new Date(d).toLocaleDateString('es-CR', { weekday: 'short' });

export const formatDayMonthEs = (d) =>
  new Date(d).toLocaleDateString('es-CR', { day: '2-digit', month: '2-digit' });

/** Para labels genéricos con un key 'YYYY-MM-DD' */
export const formatDateLabelEsFromKey = (key) =>
  fromDateKey(key).toLocaleDateString('es-CR');

// Devuelve la fecha de hoy como key 'YYYY-MM-DD'
export const getTodayKey = () => toIsoDateKey(new Date());

// Devuelve las 7 keys de la semana a partir de un weekStart
export const getWeekDateKeys = (weekStart) =>
  getWeekDays(weekStart).map(toIsoDateKey);