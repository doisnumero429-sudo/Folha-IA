'use strict';

/**
 * Self-contained HTML report generator for Folha IA.
 *
 * Outputs a single .html file with all CSS and JS inline.
 * Works offline, mobile-friendly, and print-ready.
 */

const { getCidInfo, buildClientCidScript, getCategoria } = require('./cid');

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const CATEGORY_ICONS = {
  'Osteomuscular':    '🦴',
  'Respiratório':     '🫁',
  'Mental':           '🧠',
  'Acidente/Trauma':  '🩹',
  'Digestivo':        '🫄',
  'Cardiovascular':   '❤️',
  'Geniturinário':    '💧',
  'Neurológico':      '⚡',
  'Infeccioso':       '🦠',
  'Endócrino':        '⚖️',
  'Sensorial':        '👁️',
  'Pele':             '🩺',
  'Maternidade':      '🤱',
  'Preventivo':       '✅',
  'Sintomas gerais':  '🌡️',
  'Oncológico':       '🎗️',
  'Outro':            '🏥',
};

function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

// Format an ISO date (YYYY-MM-DD) as Brazilian DD/MM/YYYY. Leaves anything
// that isn't a plain ISO date untouched, and returns '' for empty values.
function formatDateBR(value) {
  if (!value) return '';
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(value);
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

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

// ── Employee attention score ─────────────────────────────────────────────────
function getScore(l) {
  const dias = Number(l.dias_afastados) || 0;
  const isRecurrent = (l.historicalAtestados || []).some(ha =>
    (l.atestados || []).some(a => a.cid && a.cid === ha.cid)
  );
  const hasAltoRisco = (l.atestados || []).some(a => a.risco_recorrencia === 'alto');

  if (dias >= 7 || hasAltoRisco) return { emoji: '🔴', label: 'Atenção', cls: 'score-red' };
  if (dias >= 3 || isRecurrent)  return { emoji: '🟡', label: 'Observar', cls: 'score-yellow' };
  return { emoji: '🟢', label: 'Normal', cls: 'score-green' };
}

// ── Attention panel ──────────────────────────────────────────────────────────
function buildAttentionPanel(lancamentos, mesNome, ano) {
  const alertas = [];
  const positivos = [];

  // High-absence employees
  const altaAusencia = lancamentos.filter(l => (l.dias_afastados || 0) >= 7);
  if (altaAusencia.length > 0) {
    alertas.push(`⚠️ <strong>${altaAusencia.length} funcionário(s) com 7+ dias afastados</strong>: ${esc(altaAusencia.map(l => l.funcionario.nome.split(' ')[0]).join(', '))}`);
  }

  // CID clusters (same CID in 2+ employees)
  const cidEmployees = {};
  for (const l of lancamentos) {
    for (const a of (l.atestados || [])) {
      if (!a.cid) continue;
      if (!cidEmployees[a.cid]) cidEmployees[a.cid] = new Set();
      cidEmployees[a.cid].add(l.funcionario.nome.split(' ')[0]);
    }
  }
  for (const [cid, names] of Object.entries(cidEmployees)) {
    if (names.size >= 2) {
      alertas.push(`🔴 <strong>Cluster: CID ${esc(cid)}</strong> afetou ${names.size} funcionários (${esc([...names].join(', '))}) — verifique se há fator ocupacional.`);
    }
  }

  // Recurrences
  for (const l of lancamentos) {
    const currentCIDs = (l.atestados || []).map(a => a.cid).filter(Boolean);
    const recurrent = currentCIDs.filter(cid =>
      (l.historicalAtestados || []).some(ha => ha.cid === cid)
    );
    if (recurrent.length > 0) {
      alertas.push(`🔁 <strong>${esc(l.funcionario.nome.split(' ')[0])}</strong>: CID <strong>${esc(recurrent.join(', '))}</strong> já apareceu em meses anteriores.`);
    }
  }

  // High recurrence risk from AI
  const altoRisco = [];
  for (const l of lancamentos) {
    for (const a of (l.atestados || [])) {
      if (a.risco_recorrencia === 'alto') {
        altoRisco.push(`${esc(l.funcionario.nome.split(' ')[0])} (CID ${esc(a.cid || '—')})`);
      }
    }
  }
  if (altoRisco.length > 0) {
    alertas.push(`⚠️ Risco de recorrência <strong>alto</strong> identificado: ${altoRisco.join(', ')}`);
  }

  // Positive items
  const semAbsencias = lancamentos.filter(l => (l.dias_afastados || 0) === 0 && (l.faltas || 0) === 0).length;
  if (semAbsencias > 0) positivos.push(`✅ ${semAbsencias} funcionário(s) sem nenhuma falta ou afastamento no mês.`);
  if (Object.values(cidEmployees).filter(s => s.size >= 2).length === 0) {
    positivos.push(`✅ Nenhum cluster de doenças identificado este mês.`);
  }

  if (alertas.length === 0 && positivos.length === 0) return '';

  return `
<div class="no-print attention-panel">
  <div class="attention-title">📋 O que merece atenção em ${esc(mesNome)}/${ano}</div>
  <div class="attention-body">
    ${alertas.length > 0 ? `<div class="attention-col">
      <div class="attention-col-title" style="color:#b45309">Pontos de atenção</div>
      ${alertas.map(a => `<div class="attention-item">${a}</div>`).join('')}
    </div>` : ''}
    ${positivos.length > 0 ? `<div class="attention-col">
      <div class="attention-col-title" style="color:#166534">Pontos positivos</div>
      ${positivos.map(p => `<div class="attention-pos">${esc(p)}</div>`).join('')}
    </div>` : ''}
  </div>
</div>`;
}

// ── Ranking section ──────────────────────────────────────────────────────────
function buildRankingSection(lancamentos) {
  const withAbs = lancamentos
    .filter(l => (l.dias_afastados || 0) > 0)
    .sort((a, b) => (b.dias_afastados || 0) - (a.dias_afastados || 0))
    .slice(0, 8);

  if (withAbs.length === 0) return '';

  const maxDays = withAbs[0].dias_afastados || 1;
  const medals = ['🥇', '🥈', '🥉'];

  const items = withAbs.map((l, i) => {
    const pct = Math.round(((l.dias_afastados || 0) / maxDays) * 100);
    const score = getScore(l);
    return `<div class="rank-item">
      <span class="rank-pos">${medals[i] || `${i + 1}º`}</span>
      <span class="rank-name">${esc(l.funcionario.nome)}</span>
      <div class="rank-bar-wrap"><div class="rank-bar" style="width:${pct}%"></div></div>
      <span class="rank-days">${l.dias_afastados}d</span>
      <span class="score-badge ${score.cls}">${score.emoji}</span>
    </div>`;
  }).join('');

  return `
<div class="no-print ranking-section">
  <div class="section-title">🏆 Ranking de Afastamentos</div>
  <div class="rank-list">${items}</div>
</div>`;
}

// ── Health dashboard ─────────────────────────────────────────────────────────
function buildHealthDashboard(lancamentos) {
  const catMap = {};
  for (const l of lancamentos) {
    for (const a of (l.atestados || [])) {
      const cat = a.categoria_cid || getCategoria(a.cid) || 'Outro';
      if (!catMap[cat]) catMap[cat] = { days: 0, employees: new Set(), cids: new Set() };
      catMap[cat].days += Number(a.dias_afastados) || 0;
      catMap[cat].employees.add(l.funcionario.nome);
      if (a.cid) catMap[cat].cids.add(a.cid);
    }
  }

  if (Object.keys(catMap).length === 0) return '';

  const sorted = Object.entries(catMap).sort((a, b) => b[1].days - a[1].days);
  const maxDays = sorted[0][1].days || 1;

  const cards = sorted.map(([cat, info]) => {
    const icon = CATEGORY_ICONS[cat] || '🏥';
    const pct = Math.round((info.days / maxDays) * 100);
    return `<div class="dash-card">
      <div class="dash-icon">${icon}</div>
      <div class="dash-cat">${esc(cat)}</div>
      <div class="dash-bar-wrap"><div class="dash-bar" style="width:${pct}%"></div></div>
      <div class="dash-meta">${info.days}d · ${info.employees.size} func.</div>
    </div>`;
  }).join('');

  // Score distribution
  let verde = 0, amarelo = 0, vermelho = 0;
  for (const l of lancamentos) {
    const s = getScore(l).cls;
    if (s === 'score-red') vermelho++;
    else if (s === 'score-yellow') amarelo++;
    else verde++;
  }

  return `
<div class="no-print health-dashboard">
  <div class="health-dashboard-grid">
    <div>
      <div class="section-title">🏥 Saúde Ocupacional — por Categoria</div>
      <div class="dash-grid">${cards}</div>
    </div>
    <div>
      <div class="section-title">📊 Índice de Atenção</div>
      <div class="score-dist">
        <div class="score-dist-item"><span class="score-big">🟢</span><span class="score-dist-num">${verde}</span><span class="score-dist-lbl">Normal</span></div>
        <div class="score-dist-item"><span class="score-big">🟡</span><span class="score-dist-num">${amarelo}</span><span class="score-dist-lbl">Observar</span></div>
        <div class="score-dist-item"><span class="score-big">🔴</span><span class="score-dist-num">${vermelho}</span><span class="score-dist-lbl">Atenção</span></div>
      </div>
      <p class="score-legend">🟢 Normal: sem afastamentos ou poucos dias<br>🟡 Observar: 3-6 dias ou CID recorrente<br>🔴 Atenção: 7+ dias ou risco alto identificado</p>
    </div>
  </div>
</div>`;
}

// ── Absence timeline ─────────────────────────────────────────────────────────
function buildTimelineSection(lancamentos, fechamento) {
  const withAny = lancamentos.filter(l =>
    (l.dias_afastados || 0) > 0 || (l.faltas || 0) > 0
  );
  if (withAny.length === 0) return '';

  const daysInMonth = new Date(fechamento.ano, fechamento.mes, 0).getDate();

  const rows = withAny.map(l => {
    // Build a day-slot array for the month
    const slots = Array(daysInMonth).fill('');

    // Mark falta days
    for (const d of (l.faltasDatas || [])) {
      const day = parseInt(d.split('-')[2], 10) - 1;
      if (day >= 0 && day < daysInMonth) slots[day] = 'falta';
    }

    // Mark atestado periods
    for (const a of (l.atestados || [])) {
      if (!a.periodo_inicio) continue;
      const start = new Date(a.periodo_inicio + 'T12:00:00');
      const end   = a.periodo_fim ? new Date(a.periodo_fim + 'T12:00:00') : start;
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (d.getMonth() + 1 === fechamento.mes && d.getFullYear() === fechamento.ano) {
          const idx = d.getDate() - 1;
          if (idx >= 0 && idx < daysInMonth) slots[idx] = 'atestado';
        }
      }
    }

    const slotHtml = slots.map((type, idx) => {
      const cls = type === 'atestado' ? 'tl-atestado' : type === 'falta' ? 'tl-falta' : 'tl-empty';
      return `<span class="tl-cell ${cls}" title="Dia ${idx + 1}"></span>`;
    }).join('');

    const score = getScore(l);

    return `<div class="tl-row">
      <span class="tl-name">${esc(l.funcionario.nome.split(' ')[0])}</span>
      <span class="score-badge ${score.cls}" style="margin-right:4px">${score.emoji}</span>
      <div class="tl-cells">${slotHtml}</div>
    </div>`;
  }).join('');

  // Day headers
  const headers = Array.from({ length: daysInMonth }, (_, i) =>
    `<span class="tl-hdr">${i + 1}</span>`
  ).join('');

  return `
<div class="no-print timeline-section">
  <div class="section-title">📅 Linha do Tempo de Afastamentos — ${MONTHS_PT[fechamento.mes - 1]}/${fechamento.ano}</div>
  <div class="tl-legend">
    <span class="tl-cell tl-atestado" style="display:inline-block"></span> Atestado &nbsp;
    <span class="tl-cell tl-falta" style="display:inline-block"></span> Falta &nbsp;
    <span class="tl-cell tl-empty" style="display:inline-block"></span> Presente
  </div>
  <div class="tl-wrap">
    <div class="tl-headers"><span class="tl-name"></span><span style="width:28px;display:inline-block"></span>${headers}</div>
    ${rows}
  </div>
</div>`;
}

// ── Employee analysis cards ──────────────────────────────────────────────────
function buildEmployeeAnalysis(lancamentos) {
  const withData = lancamentos.filter(l =>
    (l.dias_afastados || 0) > 0 || (l.atestados || []).length > 0
  );
  if (withData.length === 0) return '';

  const cards = withData.map(l => {
    const score = getScore(l);

    // AI interpretation (best available across all atestados)
    const interpretacoes = (l.atestados || [])
      .map(a => a.interpretacao_contextual)
      .filter(Boolean);
    const interpretacao = interpretacoes[0] || null;

    // Recurrence risk (worst across all atestados)
    const riscos = (l.atestados || []).map(a => a.risco_recorrencia).filter(Boolean);
    const risco = riscos.includes('alto') ? 'alto' : riscos.includes('médio') ? 'médio' : riscos[0] || null;

    // Categories
    const categorias = [...new Set((l.atestados || []).map(a =>
      a.categoria_cid || getCategoria(a.cid) || null
    ).filter(Boolean))];

    // CIDs
    const cids = [...new Set((l.atestados || []).map(a => a.cid).filter(Boolean))];

    // Historical months
    const histByMonth = {};
    for (const ha of (l.historicalAtestados || [])) {
      const key = ha.fechamentos
        ? `${MONTHS_PT[(ha.fechamentos.mes || 1) - 1].slice(0, 3)}/${ha.fechamentos.ano}`
        : '?';
      if (!histByMonth[key]) histByMonth[key] = 0;
      histByMonth[key] += Number(ha.dias_afastados) || 0;
    }
    const histHtml = Object.entries(histByMonth).slice(0, 6).map(([month, days]) =>
      `<span class="hist-chip">${esc(month)}: ${days}d</span>`
    ).join('');

    // Recurrence check
    const recurrentCIDs = cids.filter(cid =>
      (l.historicalAtestados || []).some(ha => ha.cid === cid)
    );

    const ricoColor = risco === 'alto' ? '#ef4444' : risco === 'médio' ? '#f59e0b' : '#22c55e';
    const ricoEmoji = risco === 'alto' ? '🔴' : risco === 'médio' ? '🟡' : '🟢';

    return `<div class="emp-card">
      <div class="emp-card-header">
        <span class="score-badge ${score.cls} score-lg">${score.emoji} ${esc(score.label)}</span>
        <span class="emp-name">${esc(l.funcionario.nome)}</span>
        <span class="emp-funcao">${esc(l.funcionario.funcao)}</span>
      </div>
      <div class="emp-card-body">
        <div class="emp-stat"><span class="emp-stat-n">${l.dias_afastados || 0}</span><span class="emp-stat-lbl">dias afastado(a)</span></div>
        <div class="emp-stat"><span class="emp-stat-n">${l.faltas || 0}</span><span class="emp-stat-lbl">falta(s)</span></div>
        ${cids.length > 0 ? `<div class="emp-cids">${cids.map(c => `<span class="cid-badge" onclick="showCIDModal('${esc(c)}',event)">${esc(c)}</span>`).join(' ')}</div>` : ''}
        ${categorias.length > 0 ? `<div class="emp-cats">${categorias.map(cat => `<span class="cat-chip">${CATEGORY_ICONS[cat] || '🏥'} ${esc(cat)}</span>`).join('')}</div>` : ''}
        ${interpretacao ? `<div class="emp-interp">"${esc(interpretacao)}"</div>` : ''}
        ${risco ? `<div class="emp-risco" style="color:${ricoColor}">${ricoEmoji} Risco de recorrência: <strong>${risco}</strong></div>` : ''}
        ${recurrentCIDs.length > 0 ? `<div class="emp-recurrence">🔁 CID recorrente: ${recurrentCIDs.map(c => `<strong>${esc(c)}</strong>`).join(', ')}</div>` : ''}
        ${histHtml ? `<div class="emp-hist-label">Histórico:</div><div class="emp-hist">${histHtml}</div>` : ''}
      </div>
    </div>`;
  }).join('');

  return `
<div class="no-print emp-analysis-section">
  <div class="section-title">👤 Análise por Funcionário</div>
  <div class="emp-grid">${cards}</div>
</div>`;
}

// ── Main function ─────────────────────────────────────────────────────────────

/**
 * @param {object}   fechamento  - { mes, ano, status, aprovado_por, aprovado_em }
 * @param {object[]} lancamentos - employee launch data
 * @param {object[]} pendencias  - pending items
 * @returns {string} HTML string
 */
function gerarHTML(fechamento, lancamentos, pendencias) {
  const mesNome    = MONTHS_PT[fechamento.mes - 1];
  const titulo     = `${mesNome}/${fechamento.ano}`;
  const geradoEm   = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const isAprovado = fechamento.status === 'aprovado';
  const statusText = isAprovado
    ? `APROVADO${fechamento.aprovado_por ? ' — ' + esc(fechamento.aprovado_por) : ''}`
    : 'EM ANDAMENTO';

  const cidClientScript = buildClientCidScript();

  const totConsumo = lancamentos.reduce((s, l) => s + (Number(l.consumo) || 0), 0);
  const totVales   = lancamentos.reduce((s, l) => s + (Number(l.vales)   || 0), 0);
  const totFaltas  = lancamentos.reduce((s, l) => s + (Number(l.faltas)  || 0), 0);
  const totDSR     = lancamentos.reduce((s, l) => s + (Number(l.dsr)     || 0), 0);
  const totDesc    = lancamentos.reduce((s, l) => s + (Number(l.dias_descontados) || 0), 0);
  const totAfas    = lancamentos.reduce((s, l) => s + (Number(l.dias_afastados)   || 0), 0);
  const maxVal     = Math.max(...lancamentos.map(l => Math.max(Number(l.consumo) || 0, Number(l.vales) || 0)), 1);
  const roles      = [...new Set(lancamentos.map(l => l.funcionario.funcao))].sort();

  // ── Row generation ──────────────────────────────────────────────────────────
  const rows = lancamentos.map((l) => {
    const hasFalta    = (l.faltas   || 0) > 0;
    const hasAtestado = (l.dias_afastados || 0) > 0;
    const chart = miniBarChart(Number(l.consumo) || 0, Number(l.vales) || 0, maxVal);

    const faltaDatas = (l.faltasDatas || []).map(d => esc(formatDateBR(d))).join(', ') || '—';
    const certHtml = (l.atestados || []).length === 0 ? '—' : (l.atestados || []).map(a => {
      const cidBadge = a.cid
        ? `<span class="cid-badge" onclick="showCIDModal('${esc(a.cid)}',event)" title="Ver descrição do CID">${esc(a.cid)}</span>`
        : '';
      const period = a.periodo_inicio && a.periodo_fim
        ? `${esc(formatDateBR(a.periodo_inicio))} → ${esc(formatDateBR(a.periodo_fim))}`
        : '';
      return `<div class="cert-item">${cidBadge} ${period ? `<span>${period}</span>` : ''} <span class="cert-days">${a.dias_afastados}d</span> ${a.medico ? `<span class="cert-doctor">Dr. ${esc(a.medico)}</span>` : ''}</div>`;
    }).join('');

    const currentCIDs    = (l.atestados || []).map(a => a.cid).filter(Boolean);
    const recurrenceCIDs = currentCIDs.filter(cid =>
      (l.historicalAtestados || []).some(ha => ha.cid === cid)
    );
    const recurrenceHtml = recurrenceCIDs.length > 0
      ? `<div class="recurrence-warning">⚠️ Recorrência: CID ${recurrenceCIDs.join(', ')} já apareceu em meses anteriores</div>`
      : '';

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
        <div><strong>Atestado(s):</strong> ${certHtml}</div>
        ${recurrenceHtml ? `<div style="grid-column:span 2">${recurrenceHtml}</div>` : ''}
      </div>
    </div>
  </td>
</tr>`;
  }).join('\n');

  // ── Script data ─────────────────────────────────────────────────────────────
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

  // ── Atestados summary table ──────────────────────────────────────────────────
  const atestadosList = lancamentos.filter(l => (l.atestados || []).length > 0);
  const cidSummaryHtml = atestadosList.length === 0 ? '' : (() => {
    const cidRows = atestadosList.map(l => {
      const cids = (l.atestados || []).map(a => a.cid).filter(Boolean);
      const cidBadges = cids.length > 0
        ? cids.map(c => `<span class="cid-badge" onclick="showCIDModal('${esc(c)}',event)">${esc(c)}</span>`).join(' ')
        : '<span style="color:#57534e">—</span>';
      const multiCert = (l.atestados || []).length > 1
        ? `<span class="recurrence-tag">×${(l.atestados || []).length}</span>`
        : '';
      const hasRecurrence = (l.historicalAtestados || []).some(ha => cids.includes(ha.cid));
      return `<tr${hasRecurrence ? ' class="recurrence-row"' : ''}>
      <td>${esc(l.funcionario.nome)}</td>
      <td>${(l.atestados || []).reduce((s, a) => s + (a.dias_afastados || 0), 0)} dias ${multiCert}</td>
      <td>${cidBadges}</td>
      <td>${(l.atestados || []).map(a => a.periodo_inicio ? `${esc(formatDateBR(a.periodo_inicio))} → ${esc(formatDateBR(a.periodo_fim) || '?')}` : '—').join('<br>')}</td>
      ${hasRecurrence ? '<td><span style="color:#f59e0b">⚠️ Recorrente</span></td>' : '<td>—</td>'}
    </tr>`;
    }).join('');

    return `
<div class="atestados-section no-print" id="atestadosSection">
  <div class="section-title" style="color:#2563eb">Atestados Médicos — ${atestadosList.length} funcionário(s)</div>
  <div class="table-wrap">
  <table>
    <thead><tr>
      <th style="background:#2563eb">Funcionário</th>
      <th style="background:#2563eb">Dias Afastados</th>
      <th style="background:#2563eb">CID(s)</th>
      <th style="background:#2563eb">Período</th>
      <th style="background:#2563eb">Histórico</th>
    </tr></thead>
    <tbody>${cidRows}</tbody>
  </table>
  </div>
</div>`;
  })();

  // ── CID Intelligence section ─────────────────────────────────────────────────
  const cidFreqMap = {};
  for (const l of lancamentos) {
    for (const a of (l.atestados || [])) {
      if (!a.cid) continue;
      const cid = a.cid.toUpperCase().trim();
      if (!cidFreqMap[cid]) cidFreqMap[cid] = { count: 0, employees: new Set(), totalDays: 0, historicalCount: 0, categoria: a.categoria_cid || getCategoria(a.cid) };
      cidFreqMap[cid].count++;
      cidFreqMap[cid].employees.add(l.funcionario.nome);
      cidFreqMap[cid].totalDays += Number(a.dias_afastados) || 0;
    }
    for (const ha of (l.historicalAtestados || [])) {
      if (!ha.cid) continue;
      const cid = ha.cid.toUpperCase().trim();
      if (cidFreqMap[cid]) cidFreqMap[cid].historicalCount++;
    }
  }
  const cidRanked = Object.entries(cidFreqMap).sort((a, b) =>
    (b[1].totalDays - a[1].totalDays) || (b[1].count - a[1].count)
  );

  const cidIntelligenceHtml = cidRanked.length === 0 ? '' : (() => {
    const ciRows = cidRanked.map(([cid, info]) => {
      const isCluster  = info.employees.size >= 2;
      const isRecurrent = info.historicalCount > 0;
      const empList    = [...info.employees].join(', ');
      const cidInfo    = getCidInfo(cid);
      const desc       = cidInfo.encontrada
        ? `${cidInfo.descricao} — ${cidInfo.simples}`
        : 'Não encontrada';
      const catIcon    = CATEGORY_ICONS[info.categoria] || '🏥';
      return `<tr${isCluster ? ' style="background:#fff7ed"' : ''}>
        <td style="font-weight:700;white-space:nowrap">
          ${esc(cid)}
          ${isCluster ? '<span style="margin-left:4px;background:#f59e0b;color:#fff;font-size:10px;padding:1px 5px;border-radius:8px">CLUSTER</span>' : ''}
          ${isRecurrent ? '<span style="margin-left:4px;background:#dc2626;color:#fff;font-size:10px;padding:1px 5px;border-radius:8px">RECORRENTE</span>' : ''}
        </td>
        <td style="font-size:12px;color:#374151">${esc(desc)}</td>
        <td style="font-size:11px;color:#6b7280">${catIcon} ${esc(info.categoria)}</td>
        <td style="text-align:center;font-weight:700">${info.count}</td>
        <td style="text-align:center;font-weight:700;color:#2563eb">${info.totalDays}</td>
        <td style="font-size:11px;color:#6b7280">${esc(empList)}</td>
        <td style="text-align:center;color:${isRecurrent ? '#dc2626' : '#9ca3af'};font-weight:${isRecurrent ? '700' : '400'}">${info.historicalCount > 0 ? info.historicalCount + '×' : '—'}</td>
      </tr>`;
    }).join('');

    const clusterWarnings = cidRanked.filter(([, info]) => info.employees.size >= 2);
    const clusterAlert = clusterWarnings.length > 0
      ? `<div style="background:#fff7ed;border:1px solid #f59e0b;border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:12px;color:#92400e">
          <strong>⚠️ Atenção — Cluster detectado:</strong> ${clusterWarnings.map(([cid, info]) =>
            `CID ${cid} afetou ${info.employees.size} funcionários (${[...info.employees].join(', ')})`).join(' | ')}
        </div>`
      : '';

    return `
<div class="no-print" style="background:#fff;border-radius:10px;padding:16px 20px;box-shadow:0 1px 4px rgba(0,0,0,.08);margin-bottom:20px">
  <div style="font-size:15px;font-weight:700;margin-bottom:10px;color:#1c1917">Análise de CIDs — Mês Atual</div>
  ${clusterAlert}
  <div style="overflow-x:auto">
  <table style="width:100%;border-collapse:collapse;font-size:12px">
    <thead><tr style="background:#1d4ed8;color:#fff">
      <th style="padding:7px 10px;text-align:left;white-space:nowrap">CID</th>
      <th style="padding:7px 10px;text-align:left">Doença / Condição</th>
      <th style="padding:7px 10px;text-align:left">Categoria</th>
      <th style="padding:7px 10px;text-align:center">Ocorr.</th>
      <th style="padding:7px 10px;text-align:center">Dias perdidos</th>
      <th style="padding:7px 10px;text-align:left">Funcionário(s)</th>
      <th style="padding:7px 10px;text-align:center;white-space:nowrap">Histórico</th>
    </tr></thead>
    <tbody>${ciRows}</tbody>
  </table>
  </div>
  <p style="font-size:10px;color:#9ca3af;margin-top:8px">CLUSTER = mesmo CID em 2+ funcionários no mesmo mês. RECORRENTE = CID já apareceu em meses anteriores.</p>
</div>`;
  })();

  // ── Build new sections ───────────────────────────────────────────────────────
  const attentionPanelHtml   = buildAttentionPanel(lancamentos, mesNome, fechamento.ano);
  const rankingSectionHtml   = buildRankingSection(lancamentos);
  const healthDashboardHtml  = buildHealthDashboard(lancamentos);
  const timelineSectionHtml  = buildTimelineSection(lancamentos, fechamento);
  const empAnalysisHtml      = buildEmployeeAnalysis(lancamentos);

  // ── HTML ─────────────────────────────────────────────────────────────────────
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

/* ── Summary cards ─────────────────────────────────────────────── */
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-bottom:20px}
.card{background:#fff;border-radius:10px;padding:14px 16px;box-shadow:0 1px 4px rgba(0,0,0,.08);border-left:4px solid #9a7520}
.card.card-faltas{border-color:#d97706}
.card.card-atestado{border-color:#2563eb}
.card.card-dsr{border-color:#dc2626}
.card-label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#78716c}
.card-value{font-size:22px;font-weight:700;color:#1c1917;margin-top:2px}

/* ── Attention panel ───────────────────────────────────────────── */
.attention-panel{background:#fff;border-radius:10px;padding:16px 20px;box-shadow:0 1px 4px rgba(0,0,0,.08);margin-bottom:20px;border-left:4px solid #b45309}
.attention-title{font-size:15px;font-weight:700;color:#1c1917;margin-bottom:12px}
.attention-body{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.attention-col-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}
.attention-item{font-size:12px;padding:5px 8px;background:#fffbeb;border-radius:6px;margin-bottom:4px;line-height:1.5;border-left:3px solid #f59e0b}
.attention-pos{font-size:12px;padding:5px 8px;background:#f0fdf4;border-radius:6px;margin-bottom:4px;border-left:3px solid #22c55e}
@media(max-width:640px){.attention-body{grid-template-columns:1fr}}

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

/* ── Score badges ──────────────────────────────────────────────── */
.score-badge{font-size:11px;padding:2px 7px;border-radius:10px;font-weight:600;white-space:nowrap}
.score-green{background:#f0fdf4;color:#166534}
.score-yellow{background:#fffbeb;color:#92400e}
.score-red{background:#fff1f0;color:#991b1b}
.score-lg{font-size:12px;padding:3px 9px}

/* ── Ranking ───────────────────────────────────────────────────── */
.ranking-section{background:#fff;border-radius:10px;padding:16px 20px;box-shadow:0 1px 4px rgba(0,0,0,.08);margin-bottom:20px}
.rank-list{display:flex;flex-direction:column;gap:8px}
.rank-item{display:flex;align-items:center;gap:10px;font-size:13px}
.rank-pos{width:28px;text-align:center;font-size:16px;flex-shrink:0}
.rank-name{width:180px;font-weight:500;flex-shrink:0}
.rank-bar-wrap{flex:1;background:#f5f1eb;border-radius:6px;height:10px;overflow:hidden}
.rank-bar{height:10px;background:linear-gradient(90deg,#2563eb,#60a5fa);border-radius:6px;transition:width .3s}
.rank-days{width:36px;text-align:right;font-weight:700;color:#2563eb;flex-shrink:0}

/* ── Health Dashboard ──────────────────────────────────────────── */
.health-dashboard{background:#fff;border-radius:10px;padding:16px 20px;box-shadow:0 1px 4px rgba(0,0,0,.08);margin-bottom:20px}
.health-dashboard-grid{display:grid;grid-template-columns:2fr 1fr;gap:24px}
@media(max-width:640px){.health-dashboard-grid{grid-template-columns:1fr}}
.dash-grid{display:flex;flex-direction:column;gap:8px}
.dash-card{display:flex;align-items:center;gap:10px;font-size:12px}
.dash-icon{width:24px;text-align:center;flex-shrink:0;font-size:16px}
.dash-cat{width:140px;font-weight:500;flex-shrink:0}
.dash-bar-wrap{flex:1;background:#f5f1eb;border-radius:4px;height:8px;overflow:hidden}
.dash-bar{height:8px;background:linear-gradient(90deg,#9a7520,#c9a96e);border-radius:4px}
.dash-meta{width:80px;text-align:right;color:#78716c;flex-shrink:0}
.score-dist{display:flex;gap:16px;justify-content:center;padding:16px 0}
.score-dist-item{display:flex;flex-direction:column;align-items:center;gap:4px}
.score-big{font-size:28px}
.score-dist-num{font-size:24px;font-weight:700}
.score-dist-lbl{font-size:11px;color:#78716c}
.score-legend{font-size:11px;color:#78716c;line-height:1.8;margin-top:8px}

/* ── Timeline ──────────────────────────────────────────────────── */
.timeline-section{background:#fff;border-radius:10px;padding:16px 20px;box-shadow:0 1px 4px rgba(0,0,0,.08);margin-bottom:20px}
.tl-legend{font-size:11px;color:#78716c;margin-bottom:10px;display:flex;align-items:center;gap:8px}
.tl-wrap{overflow-x:auto}
.tl-headers,.tl-row{display:flex;align-items:center;gap:2px;margin-bottom:3px;min-width:max-content}
.tl-name{width:110px;font-size:12px;font-weight:500;flex-shrink:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.tl-hdr{width:14px;text-align:center;font-size:9px;color:#9ca3af;flex-shrink:0}
.tl-cells{display:flex;gap:2px}
.tl-cell{display:inline-block;width:14px;height:14px;border-radius:3px;flex-shrink:0}
.tl-empty{background:#f0ece6}
.tl-falta{background:#f59e0b}
.tl-atestado{background:#2563eb}

/* ── Employee analysis cards ───────────────────────────────────── */
.emp-analysis-section{background:#fff;border-radius:10px;padding:16px 20px;box-shadow:0 1px 4px rgba(0,0,0,.08);margin-bottom:20px}
.emp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}
.emp-card{border:1px solid #e7e0d8;border-radius:10px;padding:14px;background:#fafaf8}
.emp-card-header{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:10px;border-bottom:1px solid #f0ece6;padding-bottom:8px}
.emp-name{font-weight:600;font-size:13px;flex:1}
.emp-funcao{font-size:11px;color:#78716c;width:100%}
.emp-card-body{display:flex;flex-direction:column;gap:7px;font-size:12px}
.emp-stat{display:inline-flex;align-items:baseline;gap:4px;margin-right:12px}
.emp-stat-n{font-size:18px;font-weight:700;color:#1d4ed8}
.emp-stat-lbl{font-size:11px;color:#78716c}
.emp-cids{display:flex;flex-wrap:wrap;gap:4px}
.emp-cats{display:flex;flex-wrap:wrap;gap:4px}
.cat-chip{display:inline-block;padding:2px 7px;background:#f5f1eb;border-radius:10px;font-size:11px;font-weight:500;color:#44403c}
.emp-interp{font-size:12px;color:#44403c;font-style:italic;background:#fffbeb;border-radius:6px;padding:6px 8px;line-height:1.5;border-left:3px solid #f59e0b}
.emp-risco{font-size:12px;font-weight:500}
.emp-recurrence{font-size:12px;color:#92400e;background:#fffbeb;border-radius:6px;padding:4px 8px}
.emp-hist-label{font-size:11px;color:#78716c;font-weight:600;margin-top:2px}
.emp-hist{display:flex;flex-wrap:wrap;gap:4px}
.hist-chip{display:inline-block;padding:2px 7px;background:#eff6ff;border-radius:10px;font-size:11px;color:#1d4ed8}

/* ── Cert / atestados ──────────────────────────────────────────── */
.cid-badge{display:inline-block;padding:2px 7px;border-radius:12px;font-size:11px;font-weight:700;background:#1e3a5f;color:#93c5fd;border:1px solid #2563eb;cursor:pointer;transition:background .15s}
.cid-badge:hover{background:#2563eb;color:#fff}
.cert-item{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:2px 0;font-size:12px}
.cert-days{color:#2563eb;font-weight:600}
.cert-doctor{color:#78716c;font-size:11px}
.recurrence-warning{margin-top:4px;padding:4px 8px;background:#fffbeb;border-radius:4px;font-size:11px;color:#92400e}
.recurrence-tag{padding:1px 5px;border-radius:8px;background:#fef3c7;color:#92400e;font-size:10px;font-weight:700}
.recurrence-row td{background:#fffbeb!important}
.atestados-section{margin-bottom:20px}

/* ── CID Modal ─────────────────────────────────────────────────── */
#cidModal{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:100;display:flex;align-items:center;justify-content:center;padding:16px}
#cidModal.hidden{display:none}
#cidModalBox{background:#fff;border-radius:12px;padding:20px 24px;max-width:400px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.3)}
#cidModalCode{font-size:22px;font-weight:800;color:#1e3a5f;margin-bottom:10px}
#cidModalBody{margin-bottom:16px}
.cid-row{display:flex;gap:10px;padding:4px 0;font-size:14px}
.cid-k{width:120px;min-width:120px;color:#6b7280;font-weight:600}
.cid-v{color:#1c1917;flex:1}
.cid-msg{margin-top:8px;font-size:13px;color:#b45309;font-style:italic}
#cidModalClose{padding:6px 18px;border-radius:8px;background:#1e3a5f;color:#fff;border:none;cursor:pointer;font-weight:600}
#cidModalClose:hover{background:#2563eb}
.cid-sev-alto{color:#dc2626}
.cid-sev-medio{color:#d97706}
.cid-sev-baixo{color:#16a34a}

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
  .rank-name{width:120px}
  .emp-grid{grid-template-columns:1fr}
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

${attentionPanelHtml}

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

${rankingSectionHtml}
${healthDashboardHtml}
${timelineSectionHtml}
${empAnalysisHtml}
${cidSummaryHtml}

<!-- CID Modal -->
<div id="cidModal" class="hidden">
  <div id="cidModalBox">
    <div id="cidModalCode"></div>
    <div id="cidModalBody"></div>
    <button id="cidModalClose" onclick="closeCIDModal()">Fechar</button>
  </div>
</div>

${cidIntelligenceHtml}

<div class="report-footer">
  Folha IA Araçá Grill &bull; ${esc(titulo)} &bull; Gerado em ${esc(geradoEm)}
</div>
</div>

<script>
${cidClientScript}
${scriptData}

// ── State ────────────────────────────────────────────────────────
let currentFilter = 'todos';
let sortCol = -1;
let sortDir = 1;

// ── Filter ───────────────────────────────────────────────────────
function setFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll('.controls .btn').forEach(b => b.classList.remove('active'));
  applyFilters();
}

function applyFilters() {
  const search = (document.getElementById('searchInput').value || '').toLowerCase().trim();
  const rows = document.querySelectorAll('#tableBody tr.data-row');
  rows.forEach(row => {
    const detail = row.nextElementSibling;
    let show = true;
    if (search && !row.dataset.nome.includes(search)) show = false;
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

  document.querySelectorAll('thead th').forEach((th, i) => {
    th.classList.remove('sorted-asc','sorted-desc');
    if (i === colIdx) th.classList.add(sortDir === 1 ? 'sorted-asc' : 'sorted-desc');
  });

  const tbody = document.getElementById('tableBody');
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

  const totalsRow = tbody.querySelector('.totals-row');
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
    'Consumo Total:          ${formatBRL(totConsumo)}',
    'Vales Total:            ${formatBRL(totVales)}',
    'Total Faltas:           ${totFaltas}',
    'Total DSR:              ${totDSR}',
    'Total Dias Descontados: ${totDesc}',
    'Total Dias Afastados:   ${totAfas}',
    'Funcionários:           ${lancamentos.length}',
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

// ── CID Modal ─────────────────────────────────────────────────────
function cidEsc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function showCIDModal(code, event) {
  event && event.stopPropagation();
  var info = getCidInfo(code);
  var cat  = getCategoriaCid(code);
  var sev  = getSeveridadeCid(code);
  document.getElementById('cidModalCode').textContent = 'CID ' + (info.cid || code);
  var body = document.getElementById('cidModalBody');
  var sevColor = sev.nivel === 'alto' ? '#dc2626' : sev.nivel === 'médio' ? '#d97706' : '#16a34a';
  if (info.encontrada) {
    body.innerHTML =
      '<div class="cid-row"><span class="cid-k">Nome técnico</span><span class="cid-v">' + cidEsc(info.descricao) + '</span></div>' +
      '<div class="cid-row"><span class="cid-k">Nome simples</span><span class="cid-v">' + cidEsc(info.simples) + '</span></div>' +
      '<div class="cid-row"><span class="cid-k">Pode indicar</span><span class="cid-v">' + cidEsc(info.explica) + '</span></div>' +
      '<div class="cid-row"><span class="cid-k">Categoria</span><span class="cid-v">' + cidEsc(cat) + '</span></div>' +
      '<div class="cid-row"><span class="cid-k">Afastamento</span><span class="cid-v" style="color:' + sevColor + '">' + cidEsc(sev.text) + '</span></div>';
  } else {
    body.innerHTML =
      '<div class="cid-row"><span class="cid-k">Categoria</span><span class="cid-v">' + cidEsc(cat) + '</span></div>' +
      '<div class="cid-row"><span class="cid-k">Descrição</span><span class="cid-v">Não encontrada</span></div>' +
      '<div class="cid-msg">Não foi possível localizar a descrição deste CID.</div>';
  }
  document.getElementById('cidModal').classList.remove('hidden');
}
function closeCIDModal() {
  document.getElementById('cidModal').classList.add('hidden');
}
document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeCIDModal(); });

</script>
</body>
</html>`;
}

module.exports = { gerarHTML };
