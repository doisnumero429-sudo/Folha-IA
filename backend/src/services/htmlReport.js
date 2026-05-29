'use strict';

/**
 * Self-contained HTML report generator for Folha IA.
 *
 * Outputs a single .html file with all CSS and JS inline.
 * Works offline, mobile-friendly, and print-ready.
 */

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Build a tiny SVG bar chart for consumo vs vales for one employee.
 * @param {number} consumo
 * @param {number} vales
 * @param {number} maxVal - the maximum value in the entire dataset (for scale)
 */
function miniBarChart(consumo, vales, maxVal) {
  if (!maxVal) return '';
  const W = 60, H = 16, BAR_W = 20, GAP = 4, BASE = 2;
  const consumoH = Math.round(((consumo || 0) / maxVal) * (H - BASE)) + BASE;
  const valesH   = Math.round(((vales   || 0) / maxVal) * (H - BASE)) + BASE;
  const cx = 2;
  const vx = cx + BAR_W + GAP;
  return `<svg width="${W}" height="${H}" style="display:inline-block;vertical-align:middle">`
    + `<rect x="${cx}" y="${H - consumoH}" width="${BAR_W}" height="${consumoH}" fill="#9a7520" rx="2"/>`
    + `<rect x="${vx}" y="${H - valesH}" width="${BAR_W}" height="${valesH}" fill="#c9a96e" rx="2"/>`
    + `</svg>`;
}

/**
 * Generate a complete standalone HTML report.
 *
 * @param {object}   fechamento   - { mes, ano, status, aprovado_por, aprovado_em }
 * @param {object[]} lancamentos  - employee launch data
 * @param {object[]} pendencias   - pending items
 * @returns {string} HTML string
 */
function gerarHTML(fechamento, lancamentos, pendencias) {
  const mesNome    = MONTHS_PT[fechamento.mes - 1];
  const titulo     = `${mesNome}/${fechamento.ano}`;
  const geradoEm   = new Date().toLocaleString('pt-BR');
  const isAprovado = fechamento.status === 'aprovado';
  const statusText = isAprovado
    ? `APROVADO${fechamento.aprovado_por ? ' — ' + esc(fechamento.aprovado_por) : ''}`
    : 'EM ANDAMENTO';

  const totConsumo = lancamentos.reduce((s, l) => s + (Number(l.consumo) || 0), 0);
  const totVales   = lancamentos.reduce((s, l) => s + (Number(l.vales)   || 0), 0);
  const totFaltas  = lancamentos.reduce((s, l) => s + (Number(l.faltas)  || 0), 0);
  const totDSR     = lancamentos.reduce((s, l) => s + (Number(l.dsr)     || 0), 0);
  const totDesc    = lancamentos.reduce((s, l) => s + (Number(l.dias_descontados) || 0), 0);
  const totAfas    = lancamentos.reduce((s, l) => s + (Number(l.dias_afastados)   || 0), 0);
  // Max for mini bar charts
  const maxVal = Math.max(...lancamentos.map(l => Math.max(Number(l.consumo) || 0, Number(l.vales) || 0)), 1);

  // Unique roles for filter buttons
  const roles = [...new Set(lancamentos.map(l => l.funcionario.funcao))].sort();

  // ── Row generation ─────────────────────────────────────────────────────────
  const rows = lancamentos.map((l, idx) => {
    const hasFalta   = (l.faltas   || 0) > 0;
    const hasAtestado = (l.dias_afastados || 0) > 0;
    const chart = miniBarChart(Number(l.consumo) || 0, Number(l.vales) || 0, maxVal);

    const faltaDatas = (l.faltasDatas || []).map(d => esc(d)).join(', ') || '—';
    const certPeriod = (l.atestados  || []).map(a => {
      if (a.periodo_inicio && a.periodo_fim) return `${esc(a.periodo_inicio)} → ${esc(a.periodo_fim)} (${a.dias_afastados}d)`;
      return `${a.dias_afastados}d`;
    }).join('<br>') || '—';

    return `<tr class="data-row${hasFalta ? ' has-falta' : ''}${hasAtestado ? ' has-atestado' : ''}"
              data-funcao="${esc(l.funcionario.funcao)}"
              data-nome="${esc(l.funcionario.nome.toLowerCase())}"
              data-consumo="${Number(l.consumo) || 0}"
              data-vales="${Number(l.vales) || 0}"
              data-faltas="${Number(l.faltas) || 0}"
              data-dsr="${Number(l.dsr) || 0}"
              data-diasdesc="${Number(l.dias_descontados) || 0}"
              data-diasafas="${Number(l.dias_afastados) || 0}"
              onclick="toggleDetail(this)">
  <td class="td-nome">${esc(l.funcionario.nome)}</td>
  <td class="td-funcao">${esc(l.funcionario.funcao)}</td>
  <td class="td-num td-consumo">${formatBRL(l.consumo)}</td>
  <td class="td-num td-vales">${formatBRL(l.vales)}</td>
  <td class="td-num td-faltas${hasFalta ? ' cell-falta' : ''}">${l.faltas || 0}</td>
  <td class="td-num td-dsr">${l.dsr || 0}</td>
  <td class="td-num td-diasdesc">${l.dias_descontados || 0}</td>
  <td class="td-num td-diasafas${hasAtestado ? ' cell-atestado' : ''}">${l.dias_afastados || 0}</td>
  <td class="td-chart no-print">${chart}</td>
</tr>
<tr class="detail-row no-print" style="display:none">
  <td colspan="9">
    <div class="detail-box">
      <div class="detail-grid">
        <div><strong>Faltas:</strong> ${faltaDatas}</div>
        <div><strong>Atestado(s):</strong> ${certPeriod}</div>
      </div>
    </div>
  </td>
</tr>`;
  }).join('\n');

  // ── Embed data for JS ──────────────────────────────────────────────────────
  const scriptData = `
const LANCAMENTOS = ${JSON.stringify(lancamentos.map(l => ({
    id: l.funcionario_id || l.funcionario.id,
    nome: l.funcionario.nome,
    funcao: l.funcionario.funcao,
    consumo: Number(l.consumo) || 0,
    vales: Number(l.vales) || 0,
    faltas: Number(l.faltas) || 0,
    dsr: Number(l.dsr) || 0,
    dias_descontados: Number(l.dias_descontados) || 0,
    dias_afastados: Number(l.dias_afastados) || 0,
  })))};
`;

  // ── HTML ───────────────────────────────────────────────────────────────────
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Folha IA — ${esc(titulo)}</title>
<style>
/* ── Reset & base ──────────────────────────────────────────────── */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;background:#f5f1eb;color:#1c1917;line-height:1.5}
a{color:inherit}

/* ── Layout ────────────────────────────────────────────────────── */
.container{max-width:1200px;margin:0 auto;padding:16px}

/* ── Header ────────────────────────────────────────────────────── */
.report-header{background:linear-gradient(135deg,#1c1917 0%,#2c2520 100%);color:#fff;padding:20px 24px;border-radius:12px;margin-bottom:20px}
.report-header h1{font-size:24px;font-weight:700;color:#c9a96e;letter-spacing:.5px}
.report-header .sub{font-size:13px;color:#a8998a;margin-top:4px}
.badge-status{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;margin-left:8px}
.badge-aprovado{background:#1C7A3A;color:#fff}
.badge-em_andamento{background:#CC6600;color:#fff}

/* ── Alert banner ──────────────────────────────────────────────── */
.alert-banner{background:#fff1f0;border:1px solid #ffa39e;border-radius:8px;padding:10px 16px;margin-bottom:16px;color:#a8071a;font-weight:500;display:flex;align-items:center;gap:8px}

/* ── Summary cards ─────────────────────────────────────────────── */
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-bottom:20px}
.card{background:#fff;border-radius:10px;padding:14px 16px;box-shadow:0 1px 4px rgba(0,0,0,.08);border-left:4px solid #9a7520}
.card.card-faltas{border-color:#d97706}
.card.card-atestado{border-color:#2563eb}
.card.card-dsr{border-color:#dc2626}
.card-label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#78716c}
.card-value{font-size:22px;font-weight:700;color:#1c1917;margin-top:2px}

/* ── Controls ──────────────────────────────────────────────────── */
.controls{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;align-items:center}
.search-input{flex:1;min-width:180px;padding:7px 12px;border:1px solid #d1c9bc;border-radius:8px;font-size:13px;background:#fff;outline:none}
.search-input:focus{border-color:#9a7520;box-shadow:0 0 0 2px rgba(154,117,32,.15)}
.btn{padding:6px 14px;border-radius:8px;border:1px solid #d1c9bc;background:#fff;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap}
.btn:hover{background:#f5f1eb;border-color:#9a7520}
.btn.active{background:#9a7520;color:#fff;border-color:#9a7520}
.btn-primary{background:#9a7520;color:#fff;border-color:#9a7520;font-size:13px;padding:7px 16px}
.btn-primary:hover{background:#7a5c14}
.btn-outline{background:transparent;border-color:#9a7520;color:#9a7520}
.btn-outline:hover{background:#9a7520;color:#fff}

/* ── Table ─────────────────────────────────────────────────────── */
.table-wrap{overflow-x:auto;border-radius:10px;box-shadow:0 1px 4px rgba(0,0,0,.08);background:#fff;margin-bottom:20px}
table{width:100%;border-collapse:collapse;min-width:700px}
thead tr{background:#9a7520;color:#fff}
thead th{padding:10px 12px;text-align:left;font-size:12px;font-weight:700;white-space:nowrap;cursor:pointer;user-select:none;position:sticky;top:0;z-index:2}
thead th:hover{background:#7a5c14}
thead th.sorted-asc::after{content:' ↑'}
thead th.sorted-desc::after{content:' ↓'}
.td-num{text-align:right}
.td-chart{text-align:center;width:70px}
tbody tr.data-row:hover{background:#fef9f0!important;cursor:pointer}
tbody td{padding:8px 12px;border-bottom:1px solid #f0ece6;font-size:13px}
tbody tr.data-row:last-child td{border-bottom:none}
tbody tr.data-row:nth-child(4n+3) td{background:#fffdf9}
.cell-falta{color:#d97706;font-weight:700}
.cell-atestado{color:#2563eb;font-weight:700}
.td-nome{font-weight:500}
.td-funcao{color:#78716c;font-size:12px}

/* ── Detail row ────────────────────────────────────────────────── */
.detail-row td{padding:0!important;background:#fef9f0}
.detail-box{padding:10px 16px;border-top:1px dashed #d1c9bc}
.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;color:#44403c}
.detail-grid strong{color:#1c1917}

/* ── Totals row ────────────────────────────────────────────────── */
.totals-row td{font-weight:700;background:#fff7e0;border-top:2px solid #9a7520;padding:9px 12px;font-size:13px}

/* ── Pending section ───────────────────────────────────────────── */
.section-title{font-size:15px;font-weight:700;margin-bottom:10px;color:#1c1917}
.pend-resolvida td{color:#999;text-decoration:line-through}
.badge{padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600}
.badge-aberta{background:#fff1f0;color:#a8071a;border:1px solid #ffa39e}
.badge-resolvida{background:#f0fdf4;color:#1C7A3A;border:1px solid #86efac}

/* ── Footer ────────────────────────────────────────────────────── */
.report-footer{text-align:center;font-size:11px;color:#a8998a;margin-top:24px;padding-bottom:24px}

/* ── Print ─────────────────────────────────────────────────────── */
@media print{
  body{background:#fff;font-size:11px}
  .no-print,.controls,.alert-banner{display:none!important}
  .container{padding:0}
  .report-header{background:#9a7520!important;-webkit-print-color-adjust:exact;print-color-adjust:exact;border-radius:0}
  thead tr{background:#9a7520!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .table-wrap{box-shadow:none;border:1px solid #ccc}
  .totals-row td{background:#ffe!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .cards{display:none}
}

/* ── Responsive ────────────────────────────────────────────────── */
@media(max-width:640px){
  .cards{grid-template-columns:1fr 1fr}
  .detail-grid{grid-template-columns:1fr}
  .report-header h1{font-size:18px}
  .card-value{font-size:18px}
}
</style>
</head>
<body>
<div class="container">

<!-- Header -->
<div class="report-header">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
    <div>
      <h1>ARAÇÁ GRILL
        <span class="badge-status badge-${esc(fechamento.status)}">${statusText}</span>
      </h1>
      <div class="sub">Referente ao mês: ${esc(titulo)}</div>
      <div class="sub" style="font-size:11px">Gerado em: ${esc(geradoEm)}</div>
    </div>
    <div class="no-print" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">
      <button class="btn btn-primary" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
      <button class="btn btn-outline" style="color:#c9a96e;border-color:#c9a96e" onclick="copiarResumo()">📋 Copiar resumo</button>
    </div>
  </div>
</div>

<!-- Summary cards -->
<div class="cards">
  <div class="card">
    <div class="card-label">Consumo Total</div>
    <div class="card-value">${formatBRL(totConsumo)}</div>
  </div>
  <div class="card">
    <div class="card-label">Vales Total</div>
    <div class="card-value">${formatBRL(totVales)}</div>
  </div>
  <div class="card card-faltas">
    <div class="card-label">Faltas</div>
    <div class="card-value">${totFaltas}</div>
  </div>
  <div class="card card-dsr">
    <div class="card-label">DSR</div>
    <div class="card-value">${totDSR}</div>
  </div>
  <div class="card card-dsr">
    <div class="card-label">Dias Descontados</div>
    <div class="card-value">${totDesc}</div>
  </div>
  <div class="card card-atestado">
    <div class="card-label">Dias Afastados</div>
    <div class="card-value">${totAfas}</div>
  </div>
</div>

<!-- Controls -->
<div class="controls no-print">
  <input class="search-input" type="text" id="searchInput" placeholder="Buscar funcionário…" oninput="applyFilters()">
  <button class="btn" id="btnTodos" onclick="setFilter('todos')">Todos</button>
  ${roles.map(r => `<button class="btn" onclick="setFilter('funcao:${esc(r)}')">${esc(r)}</button>`).join('')}
  <button class="btn" onclick="setFilter('comFaltas')">Só com faltas</button>
  <button class="btn" onclick="setFilter('comAtestado')">Só com atestado</button>
</div>

<!-- Main table -->
<div class="table-wrap">
<table id="mainTable">
  <thead>
    <tr>
      <th onclick="sortTable(0)" data-col="nome">Funcionário</th>
      <th onclick="sortTable(1)" data-col="funcao">Função</th>
      <th onclick="sortTable(2)" data-col="consumo" class="td-num">Consumo</th>
      <th onclick="sortTable(3)" data-col="vales" class="td-num">Vales</th>
      <th onclick="sortTable(4)" data-col="faltas" class="td-num">Faltas</th>
      <th onclick="sortTable(5)" data-col="dsr" class="td-num">DSR</th>
      <th onclick="sortTable(6)" data-col="diasdesc" class="td-num">Dias Desc.</th>
      <th onclick="sortTable(7)" data-col="diasafas" class="td-num">Dias Afas.</th>
      <th class="no-print td-chart">Gráfico</th>
    </tr>
  </thead>
  <tbody id="tableBody">
${rows}
    <tr class="totals-row">
      <td><strong>TOTAL</strong></td>
      <td></td>
      <td class="td-num">${formatBRL(totConsumo)}</td>
      <td class="td-num">${formatBRL(totVales)}</td>
      <td class="td-num">${totFaltas}</td>
      <td class="td-num">${totDSR}</td>
      <td class="td-num">${totDesc}</td>
      <td class="td-num">${totAfas}</td>
      <td class="no-print"></td>
    </tr>
  </tbody>
</table>
</div>

<div class="report-footer">
  Folha IA Araçá Grill &bull; ${esc(titulo)} &bull; Gerado em ${esc(geradoEm)}
</div>
</div>

<script>
${scriptData}

// ── State ────────────────────────────────────────────────────────
let currentFilter = 'todos';
let sortCol = -1;
let sortDir = 1;

// ── Filter ───────────────────────────────────────────────────────
function setFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll('.controls .btn').forEach(b => b.classList.remove('active'));
  // Mark active btn
  applyFilters();
}

function applyFilters() {
  const search = (document.getElementById('searchInput').value || '').toLowerCase().trim();
  const rows = document.querySelectorAll('#tableBody tr.data-row');
  rows.forEach(row => {
    const detail = row.nextElementSibling;
    let show = true;
    // Name search
    if (search && !row.dataset.nome.includes(search)) show = false;
    // Function filter
    if (currentFilter.startsWith('funcao:')) {
      const funcao = currentFilter.slice(7);
      if (row.dataset.funcao !== funcao) show = false;
    } else if (currentFilter === 'comFaltas') {
      if (parseInt(row.dataset.faltas) <= 0) show = false;
    } else if (currentFilter === 'comAtestado') {
      if (parseInt(row.dataset.diasafas) <= 0) show = false;
    }
    row.style.display = show ? '' : 'none';
    if (detail && detail.classList.contains('detail-row')) {
      if (!show) detail.style.display = 'none';
    }
  });
}

// ── Sort ─────────────────────────────────────────────────────────
function sortTable(colIdx) {
  const attrMap = ['nome','funcao','consumo','vales','faltas','dsr','diasdesc','diasafas'];
  const attr = attrMap[colIdx];
  if (!attr) return;

  if (sortCol === colIdx) sortDir *= -1;
  else { sortCol = colIdx; sortDir = 1; }

  // Update header indicators
  document.querySelectorAll('thead th').forEach((th, i) => {
    th.classList.remove('sorted-asc','sorted-desc');
    if (i === colIdx) th.classList.add(sortDir === 1 ? 'sorted-asc' : 'sorted-desc');
  });

  const tbody = document.getElementById('tableBody');
  // Collect data-row + its immediately following detail-row as pairs
  const pairs = [];
  const allRows = [...tbody.querySelectorAll('tr')];
  for (let i = 0; i < allRows.length; i++) {
    if (allRows[i].classList.contains('data-row')) {
      pairs.push([allRows[i], allRows[i+1] && allRows[i+1].classList.contains('detail-row') ? allRows[i+1] : null]);
    }
  }

  const isNumeric = ['consumo','vales','faltas','dsr','diasdesc','diasafas'].includes(attr);
  pairs.sort((a, b) => {
    const av = a[0].dataset[attr] || '';
    const bv = b[0].dataset[attr] || '';
    if (isNumeric) return (parseFloat(av) - parseFloat(bv)) * sortDir;
    return av.localeCompare(bv, 'pt') * sortDir;
  });

  // Keep totals row
  const totalsRow = tbody.querySelector('.totals-row');
  // Remove and re-insert
  pairs.forEach(([dr, detR]) => {
    tbody.insertBefore(dr, totalsRow);
    if (detR) tbody.insertBefore(detR, totalsRow);
  });
}

// ── Detail toggle ────────────────────────────────────────────────
function toggleDetail(row) {
  const detail = row.nextElementSibling;
  if (detail && detail.classList.contains('detail-row')) {
    detail.style.display = detail.style.display === 'none' ? 'table-row' : 'none';
  }
}

// ── Copy summary ─────────────────────────────────────────────────
function copiarResumo() {
  const lines = [
    'ARAÇÁ GRILL — RESUMO ${esc(titulo)}',
    'Gerado em: ${esc(geradoEm)}',
    '',
    'Consumo Total:         ${formatBRL(totConsumo)}',
    'Vales Total:           ${formatBRL(totVales)}',
    'Total Faltas:          ${totFaltas}',
    'Total DSR:             ${totDSR}',
    'Total Dias Descontados:${totDesc}',
    'Total Dias Afastados:  ${totAfas}',
    'Funcionários:          ${lancamentos.length}',
  ];
  const text = lines.join('\\n');
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => alert('Resumo copiado!'));
  } else {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    alert('Resumo copiado!');
  }
}

</script>
</body>
</html>`;
}

module.exports = { gerarHTML };
