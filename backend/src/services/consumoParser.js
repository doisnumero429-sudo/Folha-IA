'use strict';

/**
 * Parser for the legacy .xls Consumo (consumption) report.
 *
 * The XLS has variable-width rows; we look for rows where:
 *   - at least one cell is a non-empty string (the name)
 *   - at least one other cell is a positive number != 3 (the value; 3 is the
 *     product-type code used in some rows)
 *
 * Last 2 rows are totals and are skipped.
 */

const XLSX = require('xlsx');
const { matchName } = require('./matcher');

/**
 * Parse a consumption XLS buffer.
 *
 * @param {Buffer} buffer
 * @returns {{
 *   matched:   Record<number, {funcionario: object, total: number, entries: Array}>,
 *   blocked:   Array<{originalName, normalizedName, valor}>,
 *   ambiguous: Array<{originalName, normalizedName, options, question, valor}>,
 *   notFound:  Array<{originalName, normalizedName, valor}>,
 *   ignored:   Array<{originalName, normalizedName, valor}>,
 *   rawTotal:  number
 * }}
 */
function parseConsumo(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  const results = {
    matched: {},
    blocked: [],
    ambiguous: [],
    notFound: [],
    ignored: [],
    rawTotal: 0,
  };

  // Skip last 2 rows (total/grand-total rows)
  const dataRows = rows.slice(0, Math.max(0, rows.length - 2));

  for (const row of dataRows) {
    const nameCell = findNameCell(row);
    const valueCell = findValueCell(row);

    if (nameCell === null || valueCell === null || valueCell <= 0) continue;

    const valor = valueCell;
    results.rawTotal += valor;

    const matchResult = matchName(nameCell);

    switch (matchResult.type) {
      case 'match': {
        const fid = matchResult.funcionario.id;
        if (!results.matched[fid]) {
          results.matched[fid] = {
            funcionario: matchResult.funcionario,
            total: 0,
            entries: [],
          };
        }
        results.matched[fid].total += valor;
        results.matched[fid].entries.push({ originalName: nameCell, valor });
        break;
      }
      case 'blocked':
        results.blocked.push({
          originalName: nameCell,
          normalizedName: matchResult.normalizedName,
          valor,
        });
        break;
      case 'ambiguous':
        results.ambiguous.push({
          originalName: nameCell,
          normalizedName: matchResult.normalizedName,
          options: matchResult.options,
          question: matchResult.question,
          valor,
        });
        break;
      case 'funcionario_nao_encontrado':
        results.notFound.push({
          originalName: nameCell,
          normalizedName: matchResult.normalizedName,
          valor,
        });
        break;
      case 'ignored':
        results.ignored.push({
          originalName: nameCell,
          normalizedName: matchResult.normalizedName,
          valor,
        });
        break;
      default:
        break;
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Find the first string cell in the row that looks like a name
 * (length > 1, not purely numeric).
 */
function findNameCell(row) {
  for (const cell of row) {
    if (typeof cell !== 'string') continue;
    const trimmed = cell.trim();
    if (trimmed.length > 1 && !/^\d+[\d.,]*$/.test(trimmed)) {
      return trimmed;
    }
  }
  return null;
}

/**
 * Find the first positive numeric cell that is not the product-type
 * code (3). We also skip values that look like year numbers (> 2000)
 * which occasionally appear in header rows.
 */
function findValueCell(row) {
  for (const cell of row) {
    if (typeof cell !== 'number') continue;
    if (cell <= 0) continue;
    if (cell === 3) continue;        // product-type code
    if (cell > 100000) continue;     // sanity guard — no single-person tab > 100 k
    return cell;
  }
  return null;
}

module.exports = { parseConsumo };
