
// YYYY-MM-DD desde Date o ISO
export const toIsoDateKey = (d0) => {
  const d = new Date(d0);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

// Inicio de semana (lunes)
export const startOfWeek = (d0) => {
  const d = new Date(d0);
  const diff = (d.getDay() + 6) % 7; 
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() - diff);
  return d;
};

// Fin de semana (domingo)
export const endOfWeek = (d0) => {
  const s = startOfWeek(d0);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  e.setHours(23,59,59,999);
  return e;
};

// HH:MM válido
export const isValidTime = (v) =>
  /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

// Minutos totales desde HH:MM
export const minutesOf = (v) => {
  const [h, m] = String(v).split(':').map(Number);
  return h * 60 + m;
};

// Crear Date local desde YYYY-MM-DD + HH:MM
export const buildLocalDateTime = (dateStr, timeStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
};

// Calcular horas entre startAt y endAt
export const calcHours = (l) =>
  typeof l.hours === 'number' && !Number.isNaN(l.hours)
    ? l.hours
    : Math.max(
        0,
        Number(((new Date(l.endAt) - new Date(l.startAt)) / 36e5).toFixed(2))
      );

// Formatear horas → "4 h 30 min"
export const fmtHours = (h) => {
  const H = Math.floor(h);
  const M = Math.round((h - H) * 60);
  return M === 0
    ? `${H} h`
    : H === 0
    ? `${M} min`
    : `${H} h ${M} min`;
};

// Etiqueta "01 ene – 07 ene"
export const rangeLabel = (a, b) => {
  const o = { month: 'short', day: '2-digit' };
  return `${a.toLocaleDateString('es-CR', o)} – ${b.toLocaleDateString('es-CR', o)}`;
};

// YYYY-MM-DD en horario LOCAL (evita desfases)
export const toLocalDateKey = (isoOrDate) => {
  const d = new Date(isoOrDate);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

/** Devuelve los 7 días de la semana a partir de weekStart */
export const getWeekDays = (weekStart: Date): Date[] =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

/** Devuelve un rango ISO para usar en filtros de API */
export const toIsoRange = (start: Date, end: Date) => ({
  from: start.toISOString(),
  to: end.toISOString(),
});

/** Crea un Date desde un key tipo 'YYYY-MM-DD' en zona local */
export const fromDateKey = (key: string): Date => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
};

/** HH:MM desde un Date (local) */
export const toHHMM = (d) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** Formatos de fecha para UI (es-CR) */
export const formatFullDateEs = (d) =>
  d.toLocaleDateString('es-CR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

export const formatShortWeekdayEs = (d) =>
  d.toLocaleDateString('es-CR', { weekday: 'short' });

export const formatDayMonthEs = (d) =>
  d.toLocaleDateString('es-CR', { day: '2-digit', month: '2-digit' });

/** Para labels genéricos con un key 'YYYY-MM-DD' */
export const formatDateLabelEsFromKey = (key) =>
  fromDateKey(key).toLocaleDateString('es-CR');

// Devuelve la fecha de hoy como key 'YYYY-MM-DD'
export const getTodayKey = () => toIsoDateKey(new Date());

// Devuelve las 7 keys de la semana a partir de un weekStart
export const getWeekDateKeys = (weekStart) =>
  getWeekDays(weekStart).map(toIsoDateKey);