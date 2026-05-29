'use strict';

/**
 * DSR (Descanso Semanal Remunerado) calculation service.
 *
 * Brazilian labour law: one unjustified absence in a week forfeits the
 * DSR rest day for that week. Weeks are Sun-Sat. Each affected week
 * costs 1 DSR day.
 */

/**
 * Return the ISO-date string (YYYY-MM-DD) of the Sunday that starts
 * the week containing `date`.
 */
function getWeekKey(date) {
  const d = new Date(date);
  // Ensure we work in UTC to avoid timezone shifts
  const dayOfWeek = d.getUTCDay(); // 0 = Sunday
  const sunday = new Date(d);
  sunday.setUTCDate(d.getUTCDate() - dayOfWeek);
  return sunday.toISOString().slice(0, 10);
}

/**
 * Calculate DSR for a list of unjustified absence dates within a
 * specific month.
 *
 * @param {string[]} absenceDates  - ISO date strings (unjustified only)
 * @param {number}   mes           - 1-based month
 * @param {number}   ano           - full year
 * @returns {{ dsrCount: number, dsrWeeks: Array<{weekStart: string, absenceDates: string[]}> }}
 */
function calculateDSR(absenceDates, mes, ano) {
  // Keep only dates that fall in the given month/year
  const monthAbsences = absenceDates.filter(d => {
    const date = new Date(d);
    return date.getUTCMonth() + 1 === mes && date.getUTCFullYear() === ano;
  });

  // Group by week (one DSR lost per week that has at least one absence)
  const weekMap = {};
  for (const d of monthAbsences) {
    const weekKey = getWeekKey(d);
    if (!weekMap[weekKey]) weekMap[weekKey] = [];
    weekMap[weekKey].push(d);
  }

  const dsrWeeks = Object.entries(weekMap).map(([weekStart, dates]) => ({
    weekStart,
    absenceDates: dates,
  }));

  return {
    dsrCount: dsrWeeks.length,
    dsrWeeks,
  };
}

/**
 * Check whether a date (ISO string) falls within the period of any
 * certificate in the array.
 *
 * @param {string}   date          - ISO date string
 * @param {object[]} certificates  - array with periodo_inicio / periodo_fim
 * @returns {boolean}
 */
function isDateCoveredByCertificate(date, certificates) {
  const d = new Date(date);
  for (const cert of certificates) {
    if (!cert.periodo_inicio || !cert.periodo_fim) continue;
    const start = new Date(cert.periodo_inicio);
    const end = new Date(cert.periodo_fim);
    if (d >= start && d <= end) return true;
  }
  return false;
}

/**
 * Find absence dates that fall within certificate periods (conflicts).
 *
 * @param {string[]} absenceDates
 * @param {object[]} certificates
 * @returns {Array<{date: string, certificate: object}>}
 */
function findConflicts(absenceDates, certificates) {
  const conflicts = [];
  for (const date of absenceDates) {
    for (const cert of certificates) {
      if (!cert.periodo_inicio || !cert.periodo_fim) continue;
      const d = new Date(date);
      const start = new Date(cert.periodo_inicio);
      const end = new Date(cert.periodo_fim);
      if (d >= start && d <= end) {
        conflicts.push({ date, certificate: cert });
      }
    }
  }
  return conflicts;
}

/**
 * Compute full absence/DSR metrics for one employee.
 *
 * @param {string[]} absenceDates  - all (raw) absence ISO date strings
 * @param {object[]} certificates  - medical certificates with periodo_inicio/fim/dias_afastados
 * @param {number}   mes           - 1-based month
 * @param {number}   ano           - full year
 * @returns {{
 *   faltas: number,
 *   dsr: number,
 *   dias_descontados: number,
 *   dias_afastados: number,
 *   justified: string[],
 *   unjustified: string[]
 * }}
 */
function computeEmployee(absenceDates, certificates, mes, ano) {
  const justified = absenceDates.filter(d =>
    isDateCoveredByCertificate(d, certificates)
  );
  const unjustified = absenceDates.filter(d =>
    !isDateCoveredByCertificate(d, certificates)
  );

  const { dsrCount } = calculateDSR(unjustified, mes, ano);

  const dias_afastados = (certificates || []).reduce(
    (sum, c) => sum + (c.dias_afastados || 0),
    0
  );

  return {
    faltas: unjustified.length,
    dsr: dsrCount,
    dias_descontados: unjustified.length + dsrCount,
    dias_afastados,
    justified,
    unjustified,
  };
}

module.exports = {
  calculateDSR,
  isDateCoveredByCertificate,
  findConflicts,
  computeEmployee,
  getWeekKey,
};
