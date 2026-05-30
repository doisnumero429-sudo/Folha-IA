'use strict';

/**
 * PDF report generator using pdfmake.
 *
 * Landscape A4, with main payroll table, summary section, and
 * optional pending items section.
 */

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

/**
 * Format a number as BRL currency string.
 * @param {number} value
 * @returns {string}
 */
function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

/**
 * Generate a PDF buffer for a monthly closing.
 *
 * @param {object}   fechamento   - { mes, ano, status, aprovado_por }
 * @param {object[]} lancamentos  - employee entries
 * @param {object[]} pendencias   - pending items
 * @returns {Promise<Buffer>}
 */
function gerarPDF(fechamento, lancamentos, pendencias) {
  // Lazy-require so the module doesn't crash if pdfmake is unavailable during tests
  const PdfPrinter = require('pdfmake/src/printer');
  const pdfFonts   = require('pdfmake/build/vfs_fonts');

  // The vfs export shape changed across pdfmake versions: older releases expose
  // it under `pdfFonts.pdfMake.vfs`, while 0.2.x exports the vfs map directly.
  const vfs = (pdfFonts && pdfFonts.pdfMake && pdfFonts.pdfMake.vfs)
    || (pdfFonts && pdfFonts.vfs)
    || pdfFonts;

  const fonts = {
    Roboto: {
      normal:      Buffer.from(vfs['Roboto-Regular.ttf'],       'base64'),
      bold:        Buffer.from(vfs['Roboto-Medium.ttf'],        'base64'),
      italics:     Buffer.from(vfs['Roboto-Italic.ttf'],        'base64'),
      bolditalics: Buffer.from(vfs['Roboto-MediumItalic.ttf'], 'base64'),
    },
  };

  const printer = new PdfPrinter(fonts);

  const mesNome    = MONTHS_PT[fechamento.mes - 1];
  const titulo     = `${mesNome}/${fechamento.ano}`;
  const geradoEm   = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const statusText = fechamento.status === 'aprovado'
    ? `APROVADO${fechamento.aprovado_por ? ' — por ' + fechamento.aprovado_por : ''}`
    : 'EM ANDAMENTO';

  // ── Totals ─────────────────────────────────────────────────────────────────
  const totConsumo = lancamentos.reduce((s, l) => s + (Number(l.consumo) || 0), 0);
  const totVales   = lancamentos.reduce((s, l) => s + (Number(l.vales)   || 0), 0);
  const totFaltas  = lancamentos.reduce((s, l) => s + (Number(l.faltas)  || 0), 0);
  const totDSR     = lancamentos.reduce((s, l) => s + (Number(l.dsr)     || 0), 0);
  const totDesc    = lancamentos.reduce((s, l) => s + (Number(l.dias_descontados) || 0), 0);
  const totAfas    = lancamentos.reduce((s, l) => s + (Number(l.dias_afastados)   || 0), 0);

  // ── Main table ─────────────────────────────────────────────────────────────
  const COL_WIDTHS = ['*', 60, 60, 55, 35, 30, 55, 55];

  const tableBody = [
    // Header row
    [
      { text: 'Funcionário',    style: 'tableHeader' },
      { text: 'Função',         style: 'tableHeader' },
      { text: 'Consumo',        style: 'tableHeader' },
      { text: 'Vales',          style: 'tableHeader' },
      { text: 'Faltas',         style: 'tableHeader' },
      { text: 'DSR',            style: 'tableHeader' },
      { text: 'Dias Desc.',     style: 'tableHeader' },
      { text: 'Dias Afas.',     style: 'tableHeader' },
    ],
    // Data rows
    ...lancamentos.map((l, idx) => [
      { text: l.funcionario.nome,                              fillColor: idx % 2 ? '#FFF8F0' : null },
      { text: l.funcionario.funcao,                            fillColor: idx % 2 ? '#FFF8F0' : null },
      { text: formatBRL(l.consumo),   alignment: 'right',     fillColor: idx % 2 ? '#FFF8F0' : null },
      { text: formatBRL(l.vales),     alignment: 'right',     fillColor: idx % 2 ? '#FFF8F0' : null },
      { text: String(l.faltas  || 0), alignment: 'center',    fillColor: l.faltas  > 0 ? '#FFFFEB9C' : (idx % 2 ? '#FFF8F0' : null) },
      { text: String(l.dsr     || 0), alignment: 'center',    fillColor: idx % 2 ? '#FFF8F0' : null },
      { text: String(l.dias_descontados || 0), alignment: 'center', fillColor: idx % 2 ? '#FFF8F0' : null },
      { text: String(l.dias_afastados   || 0), alignment: 'center', fillColor: l.dias_afastados > 0 ? '#BDD7EE' : (idx % 2 ? '#FFF8F0' : null) },
    ]),
    // Totals row
    [
      { text: 'TOTAL', bold: true, colSpan: 2, fillColor: '#FFFFEB9C' }, {},
      { text: formatBRL(totConsumo), bold: true, alignment: 'right',  fillColor: '#FFFFEB9C' },
      { text: formatBRL(totVales),   bold: true, alignment: 'right',  fillColor: '#FFFFEB9C' },
      { text: String(totFaltas), bold: true, alignment: 'center',    fillColor: '#FFFFEB9C' },
      { text: String(totDSR),    bold: true, alignment: 'center',    fillColor: '#FFFFEB9C' },
      { text: String(totDesc),   bold: true, alignment: 'center',    fillColor: '#FFFFEB9C' },
      { text: String(totAfas),   bold: true, alignment: 'center',    fillColor: '#FFFFEB9C' },
    ],
  ];

  // ── Summary section ────────────────────────────────────────────────────────
  const summaryItems = [
    { label: 'Consumo Total',         value: formatBRL(totConsumo) },
    { label: 'Vales Total',           value: formatBRL(totVales)   },
    { label: 'Total Faltas',          value: String(totFaltas)     },
    { label: 'Total DSR',             value: String(totDSR)        },
    { label: 'Total Dias Descontados',value: String(totDesc)       },
    { label: 'Total Dias Afastados',  value: String(totAfas)       },
    { label: 'Funcionários',          value: String(lancamentos.length) },
  ];

  const summaryTable = {
    table: {
      widths: ['auto', 'auto'],
      body: summaryItems.map(item => [
        { text: item.label, bold: true },
        { text: item.value, alignment: 'right' },
      ]),
    },
    layout: 'noBorders',
    margin: [0, 0, 0, 12],
  };

  // ── Doc definition ─────────────────────────────────────────────────────────
  const content = [
    { text: 'ARAÇÁ GRILL',                     style: 'title'    },
    { text: `REFERENTE AO MÊS: ${titulo.toUpperCase()}`, style: 'subtitle' },
    {
      text: `Gerado em: ${geradoEm}   |   Status: ${statusText}`,
      style: 'meta',
      margin: [0, 0, 0, 10],
    },
    {
      table: {
        headerRows: 1,
        widths: COL_WIDTHS,
        body: tableBody,
        dontBreakRows: false,
      },
      layout: 'lightHorizontalLines',
    },
    { text: '', margin: [0, 12] },
    { text: 'RESUMO GERAL', style: 'sectionTitle' },
    summaryTable,
  ];

  // ── Pendências section (optional) ─────────────────────────────────────────
  if (pendencias && pendencias.length > 0) {
    content.push({ text: 'PENDÊNCIAS', style: 'sectionTitle', color: '#CC0000' });

    const pendBody = [
      [
        { text: 'Tipo',        style: 'tableHeader' },
        { text: 'Descrição',   style: 'tableHeader' },
        { text: 'Nome',        style: 'tableHeader' },
        { text: 'Valor',       style: 'tableHeader' },
        { text: 'Status',      style: 'tableHeader' },
      ],
      ...pendencias.map(p => [
        { text: p.tipo        || '' },
        { text: p.descricao   || '' },
        { text: p.nome_original || '' },
        { text: p.valor != null ? formatBRL(p.valor) : '', alignment: 'right' },
        {
          text: p.status || '',
          color: p.status === 'resolvida' ? '#1C7A3A' : '#CC0000',
        },
      ]),
    ];

    content.push({
      table: {
        headerRows: 1,
        widths: [80, '*', 120, 60, 60],
        body: pendBody,
      },
      layout: 'lightHorizontalLines',
    });
  }

  const docDefinition = {
    pageOrientation: 'landscape',
    pageMargins: [30, 30, 30, 40],
    footer: (currentPage, pageCount) => ({
      text: `Página ${currentPage} de ${pageCount}  —  Folha IA Araçá Grill`,
      alignment: 'center',
      fontSize: 7,
      color: '#999999',
      margin: [0, 10, 0, 0],
    }),
    content,
    styles: {
      title: {
        fontSize: 18,
        bold: true,
        alignment: 'center',
        color: '#9A7520',
        margin: [0, 0, 0, 4],
      },
      subtitle: {
        fontSize: 13,
        alignment: 'center',
        margin: [0, 0, 0, 4],
      },
      meta: {
        fontSize: 9,
        alignment: 'center',
        color: '#666666',
      },
      sectionTitle: {
        fontSize: 12,
        bold: true,
        margin: [0, 0, 0, 6],
        color: '#333333',
      },
      tableHeader: {
        bold: true,
        fillColor: '#9A7520',
        color: 'white',
        alignment: 'center',
        fontSize: 8,
      },
    },
    defaultStyle: {
      fontSize: 8,
      font: 'Roboto',
    },
  };

  // ── Return as buffer ───────────────────────────────────────────────────────
  return new Promise((resolve, reject) => {
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const chunks = [];
    pdfDoc.on('data',  chunk => chunks.push(chunk));
    pdfDoc.on('end',   ()    => resolve(Buffer.concat(chunks)));
    pdfDoc.on('error', err   => reject(err));
    pdfDoc.end();
  });
}

module.exports = { gerarPDF };
