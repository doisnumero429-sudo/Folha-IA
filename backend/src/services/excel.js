'use strict';

/**
 * Excel report generator using ExcelJS.
 *
 * Produces a workbook with three sheets:
 *   1. Folha      — main payroll data table
 *   2. Resumo     — aggregated summary
 *   3. Pendências — pending items list
 */

const ExcelJS = require('exceljs');

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

/**
 * Generate an Excel workbook for a monthly closing.
 *
 * @param {object}   fechamento   - { mes, ano, status, aprovado_por, aprovado_em }
 * @param {object[]} lancamentos  - [{ funcionario: {nome, funcao}, consumo, vales, faltas, dsr, dias_descontados, dias_afastados }]
 * @param {object[]} pendencias   - [{ tipo, descricao, nome_original, valor, status }]
 * @returns {Promise<Buffer>} xlsx buffer
 */
async function gerarExcel(fechamento, lancamentos, pendencias) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Folha IA - Araçá Grill';
  workbook.created = new Date();

  const mesNome = MONTHS_PT[fechamento.mes - 1];
  const titulo = `${mesNome}/${fechamento.ano}`;
  const geradoEm = new Date().toLocaleString('pt-BR');
  const statusLabel = fechamento.status === 'aprovado' ? 'APROVADO' : 'EM ANDAMENTO';

  // ==========================================================================
  // SHEET 1 — Folha
  // ==========================================================================
  const folha = workbook.addWorksheet('Folha', {
    properties: { tabColor: { argb: 'FF9A7520' } },
  });

  // ── Audit header (rows 1-5) ────────────────────────────────────────────────
  const r1 = folha.addRow(['ARAÇÁ GRILL']);
  r1.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF9A7520' } };

  const r2 = folha.addRow([`Referente ao mês: ${titulo}`]);
  r2.getCell(1).font = { size: 11 };

  const r3 = folha.addRow([`Gerado em: ${geradoEm}`]);
  r3.getCell(1).font = { size: 10, color: { argb: 'FF666666' } };

  const r4 = folha.addRow([`Status: ${statusLabel}`]);
  r4.getCell(1).font = {
    bold: true,
    size: 11,
    color: { argb: fechamento.status === 'aprovado' ? 'FF1C7A3A' : 'FFCC6600' },
  };
  if (fechamento.status === 'aprovado' && fechamento.aprovado_por) {
    r4.getCell(1).value = `Status: APROVADO — por ${fechamento.aprovado_por}`;
  }

  folha.addRow([]); // row 5 blank

  // ── Column header row (row 6) ──────────────────────────────────────────────
  const HEADER_ROW_IDX = 6;
  const DATA_START_ROW = 7;

  const headerRow = folha.addRow([
    'Funcionário', 'Função',
    'Consumo (R$)', 'Vales (R$)',
    'Faltas', 'DSR',
    'Dias Descontados', 'Dias Afastados',
  ]);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9A7520' } };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.height = 20;

  // ── Data rows ──────────────────────────────────────────────────────────────
  let rowIdx = DATA_START_ROW;
  for (const l of lancamentos) {
    const dataRow = folha.addRow([
      l.funcionario.nome,
      l.funcionario.funcao,
      Number(l.consumo) || 0,
      Number(l.vales) || 0,
      Number(l.faltas) || 0,
      Number(l.dsr) || 0,
      Number(l.dias_descontados) || 0,
      Number(l.dias_afastados) || 0,
    ]);

    // Zebra stripe on odd data rows
    if ((rowIdx - DATA_START_ROW) % 2 === 1) {
      dataRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF8F0' } };
    }
    rowIdx++;
  }

  const lastDataRow = rowIdx - 1;

  // ── Totals row ─────────────────────────────────────────────────────────────
  const totalsRow = folha.addRow([
    'TOTAL', '',
    { formula: `SUM(C${DATA_START_ROW}:C${lastDataRow})` },
    { formula: `SUM(D${DATA_START_ROW}:D${lastDataRow})` },
    { formula: `SUM(E${DATA_START_ROW}:E${lastDataRow})` },
    { formula: `SUM(F${DATA_START_ROW}:F${lastDataRow})` },
    { formula: `SUM(G${DATA_START_ROW}:G${lastDataRow})` },
    { formula: `SUM(H${DATA_START_ROW}:H${lastDataRow})` },
  ]);
  totalsRow.font = { bold: true };
  totalsRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEB9C' } };
  totalsRow.eachCell(cell => { cell.border = { top: { style: 'medium' } }; });

  // ── Column widths & formats ────────────────────────────────────────────────
  folha.getColumn(1).width = 36;   // Funcionário
  folha.getColumn(2).width = 16;   // Função
  folha.getColumn(3).width = 14;   // Consumo
  folha.getColumn(4).width = 13;   // Vales
  folha.getColumn(5).width = 8;    // Faltas
  folha.getColumn(6).width = 7;    // DSR
  folha.getColumn(7).width = 18;   // Dias Descontados
  folha.getColumn(8).width = 17;   // Dias Afastados

  folha.getColumn(3).numFmt = 'R$ #,##0.00';
  folha.getColumn(4).numFmt = 'R$ #,##0.00';

  // ── Header border ──────────────────────────────────────────────────────────
  headerRow.eachCell(cell => {
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FF7A5C14' } },
    };
  });

  // ── AutoFilter ────────────────────────────────────────────────────────────
  folha.autoFilter = { from: `A${HEADER_ROW_IDX}`, to: `H${HEADER_ROW_IDX}` };

  // ── Freeze pane: freeze header rows + first column ────────────────────────
  folha.views = [{
    state: 'frozen',
    xSplit: 1,
    ySplit: HEADER_ROW_IDX,
    topLeftCell: 'B7',
    activeCell: 'B7',
  }];

  // ── Conditional formatting ─────────────────────────────────────────────────
  if (lastDataRow >= DATA_START_ROW) {
    // Faltas > 0 → amber highlight (column E)
    folha.addConditionalFormatting({
      ref: `E${DATA_START_ROW}:E${lastDataRow}`,
      rules: [{
        type: 'cellIs',
        operator: 'greaterThan',
        formulae: ['0'],
        style: {
          fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFFEB9C' } },
          font: { bold: true },
        },
        priority: 1,
      }],
    });

    // Dias afastados > 0 → blue highlight (column H)
    folha.addConditionalFormatting({
      ref: `H${DATA_START_ROW}:H${lastDataRow}`,
      rules: [{
        type: 'cellIs',
        operator: 'greaterThan',
        formulae: ['0'],
        style: {
          fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFBDD7EE' } },
        },
        priority: 1,
      }],
    });
  }

  // ==========================================================================
  // SHEET 2 — Resumo
  // ==========================================================================
  const resumo = workbook.addWorksheet('Resumo', {
    properties: { tabColor: { argb: 'FF1C7A3A' } },
  });

  const rS1 = resumo.addRow(['ARAÇÁ GRILL — RESUMO']);
  rS1.getCell(1).font = { bold: true, size: 13, color: { argb: 'FF9A7520' } };
  resumo.addRow([`Mês: ${titulo}`]);
  resumo.addRow([`Gerado em: ${geradoEm}`]);
  resumo.addRow([]);

  const rHeader = resumo.addRow(['Métrica', 'Valor']);
  rHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  rHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9A7520' } };

  const totConsumo = lancamentos.reduce((s, l) => s + (Number(l.consumo) || 0), 0);
  const totVales   = lancamentos.reduce((s, l) => s + (Number(l.vales)   || 0), 0);
  const totFaltas  = lancamentos.reduce((s, l) => s + (Number(l.faltas)  || 0), 0);
  const totDSR     = lancamentos.reduce((s, l) => s + (Number(l.dsr)     || 0), 0);
  const totDesc    = lancamentos.reduce((s, l) => s + (Number(l.dias_descontados) || 0), 0);
  const totAfas    = lancamentos.reduce((s, l) => s + (Number(l.dias_afastados)   || 0), 0);

  const summaryData = [
    ['Total Consumo',           totConsumo],
    ['Total Vales',             totVales],
    ['Total Faltas',            totFaltas],
    ['Total DSR',               totDSR],
    ['Total Dias Descontados',  totDesc],
    ['Total Dias Afastados',    totAfas],
    ['Total Funcionários',      lancamentos.length],
  ];

  let isAlt = false;
  for (const [label, value] of summaryData) {
    const row = resumo.addRow([label, value]);
    if (isAlt) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF8F0' } };
    isAlt = !isAlt;
  }

  resumo.getColumn(1).width = 26;
  resumo.getColumn(2).width = 16;
  // Currency format for money rows only
  resumo.getCell('B6').numFmt = 'R$ #,##0.00';
  resumo.getCell('B7').numFmt = 'R$ #,##0.00';

  resumo.views = [{ state: 'frozen', ySplit: 5 }];

  // ==========================================================================
  // SHEET 3 — Pendências
  // ==========================================================================
  const sheet3 = workbook.addWorksheet('Pendências', {
    properties: { tabColor: { argb: 'FFCC0000' } },
  });

  const rP1 = sheet3.addRow(['PENDÊNCIAS']);
  rP1.getCell(1).font = { bold: true, size: 13, color: { argb: 'FFCC0000' } };
  sheet3.addRow([`Mês: ${titulo}`]);
  sheet3.addRow([]);

  const pendHeader = sheet3.addRow(['Tipo', 'Descrição', 'Nome Original', 'Valor (R$)', 'Status']);
  pendHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  pendHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCC0000' } };

  for (const p of (pendencias || [])) {
    const row = sheet3.addRow([
      p.tipo || '',
      p.descricao || '',
      p.nome_original || '',
      p.valor != null ? Number(p.valor) : '',
      p.status || '',
    ]);
    if (p.status === 'resolvida') {
      row.getCell(5).font = { color: { argb: 'FF1C7A3A' } };
    } else {
      row.getCell(1).font = { color: { argb: 'FFCC0000' } };
    }
  }

  sheet3.getColumn(1).width = 26;
  sheet3.getColumn(2).width = 52;
  sheet3.getColumn(3).width = 32;
  sheet3.getColumn(4).width = 13;
  sheet3.getColumn(5).width = 13;
  sheet3.getColumn(4).numFmt = 'R$ #,##0.00';

  sheet3.autoFilter = { from: 'A4', to: 'E4' };
  sheet3.views = [{ state: 'frozen', ySplit: 4 }];

  // ==========================================================================
  // Return buffer
  // ==========================================================================
  return await workbook.xlsx.writeBuffer();
}

module.exports = { gerarExcel };
