'use strict';

/**
 * Parser for the .html Vales (meal/food vouchers) report.
 *
 * Expected HTML table structure:
 *   <tbody>
 *     <tr>
 *       <td><strong>Nome</strong></td>
 *       <td>quantidade</td>
 *       <td>R$ 1.234,56</td>
 *     </tr>
 *     …
 *   </tbody>
 */

const cheerio = require('cheerio');
const { matchName } = require('./matcher');

/**
 * Parse an HTML vales report.
 *
 * @param {string} htmlContent
 * @returns {{
 *   matched:   Record<number, {funcionario, total, quantidade, entries}>,
 *   blocked:   Array,
 *   ambiguous: Array,
 *   notFound:  Array,
 *   ignored:   Array,
 *   rawTotal:  number
 * }}
 */
function parseVales(htmlContent) {
  const $ = cheerio.load(htmlContent);

  const results = {
    matched: {},
    blocked: [],
    ambiguous: [],
    notFound: [],
    ignored: [],
    rawTotal: 0,
  };

  $('tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 3) return;

    // Name: prefer <strong> text, fall back to full cell text
    const nameRaw =
      $(cells[0]).find('strong').first().text().trim() ||
      $(cells[0]).text().trim();

    if (!nameRaw) return;

    // Quantity (may be missing / non-numeric — that's ok)
    const qtdText = $(cells[1]).text().trim();
    const quantidade = parseInt(qtdText, 10) || 0;

    // Total value in BRL format
    const totalText = $(cells[2]).text().trim();
    const total = parseBRL(totalText);

    if (total <= 0) return;
    results.rawTotal += total;

    const matchResult = matchName(nameRaw);

    switch (matchResult.type) {
      case 'match': {
        const fid = matchResult.funcionario.id;
        if (!results.matched[fid]) {
          results.matched[fid] = {
            funcionario: matchResult.funcionario,
            total: 0,
            quantidade: 0,
            entries: [],
          };
        }
        results.matched[fid].total += total;
        results.matched[fid].quantidade += quantidade;
        results.matched[fid].entries.push({ originalName: nameRaw, total, quantidade });
        break;
      }
      case 'blocked':
        results.blocked.push({
          originalName: nameRaw,
          normalizedName: matchResult.normalizedName,
          valor: total,
        });
        break;
      case 'ambiguous':
        results.ambiguous.push({
          originalName: nameRaw,
          normalizedName: matchResult.normalizedName,
          options: matchResult.options,
          question: matchResult.question,
          valor: total,
        });
        break;
      case 'funcionario_nao_encontrado':
        results.notFound.push({
          originalName: nameRaw,
          normalizedName: matchResult.normalizedName,
          valor: total,
        });
        break;
      case 'ignored':
        results.ignored.push({
          originalName: nameRaw,
          normalizedName: matchResult.normalizedName,
          valor: total,
        });
        break;
      default:
        break;
    }
  });

  return results;
}

/**
 * Parse a Brazilian currency string to a float.
 *   "R$ 1.234,56"  →  1234.56
 *   "1.234,56"     →  1234.56
 *   "1234.56"      →  1234.56
 *
 * @param {string} text
 * @returns {number}
 */
function parseBRL(text) {
  const cleaned = text
    .replace(/R\$\s?/, '')   // remove currency symbol
    .replace(/\./g, '')      // remove thousands separator
    .replace(',', '.')       // decimal comma → dot
    .trim();
  return parseFloat(cleaned) || 0;
}

module.exports = { parseVales, parseBRL };
