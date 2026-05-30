'use strict';

/**
 * CID-10 (ICD-10) lookup for Folha IA.
 *
 * Built for everyday (non-technical) users. For each code we try to provide:
 *   - descricao : technical disease name
 *   - simples   : plain / lay name
 *   - explica   : a short "Pode indicar..." explanation
 *
 * Rules (product spec, items 7–9):
 *   - Whenever a CID exists, try to show its description.
 *   - If the code exists but isn't catalogued → encontrada=false, so the
 *     caller shows "Não encontrada" + a friendly message (never blank).
 *
 * The same DB is serialized into the standalone HTML report (see
 * buildClientCidScript) so the downloaded file keeps working offline.
 */

// code → { descricao, simples, explica }
const CID_DB = {
  // ── A/B — Infecciosas ──────────────────────────────────────────────
  A09: { descricao: 'Gastroenterite e diarreia de origem infecciosa', simples: 'Infecção intestinal', explica: 'Diarreia, vômito, cólica e mal-estar.' },
  A90: { descricao: 'Dengue clássica', simples: 'Dengue', explica: 'Febre, dor no corpo, dor atrás dos olhos e cansaço.' },
  B01: { descricao: 'Varicela', simples: 'Catapora', explica: 'Manchas e bolhas na pele, coceira e febre.' },
  B34: { descricao: 'Infecção viral não especificada', simples: 'Virose', explica: 'Febre, mal-estar e sintomas gerais de infecção por vírus.' },

  // ── E — Endócrinas/metabólicas ─────────────────────────────────────
  E11: { descricao: 'Diabetes tipo 2', simples: 'Diabetes', explica: 'Açúcar alto no sangue; pode causar cansaço e mal-estar.' },

  // ── F — Saúde mental ───────────────────────────────────────────────
  F32: { descricao: 'Episódio depressivo', simples: 'Depressão', explica: 'Tristeza persistente, desânimo e falta de energia.' },
  F41: { descricao: 'Transtorno de ansiedade', simples: 'Ansiedade', explica: 'Preocupação excessiva, tensão e nervosismo.' },
  F43: { descricao: 'Reação ao estresse grave e transtorno de adaptação', simples: 'Estresse', explica: 'Sintomas físicos e emocionais após situação estressante.' },

  // ── G — Sistema nervoso ────────────────────────────────────────────
  G43: { descricao: 'Enxaqueca', simples: 'Enxaqueca', explica: 'Dor de cabeça forte, às vezes com enjoo e sensibilidade à luz.' },

  // ── H — Olhos/ouvidos ──────────────────────────────────────────────
  H10: { descricao: 'Conjuntivite', simples: 'Conjuntivite', explica: 'Olho vermelho, lacrimejando e com coceira.' },
  H66: { descricao: 'Otite média', simples: 'Infecção de ouvido', explica: 'Dor de ouvido e, às vezes, febre.' },

  // ── I — Circulatório ───────────────────────────────────────────────
  I10: { descricao: 'Hipertensão arterial', simples: 'Pressão alta', explica: 'Pressão do sangue elevada; pode dar dor de cabeça e tontura.' },

  // ── J — Respiratório ───────────────────────────────────────────────
  J00: { descricao: 'Rinite aguda (resfriado comum)', simples: 'Resfriado', explica: 'Coriza, espirros, nariz entupido e mal-estar leve.' },
  J02: { descricao: 'Faringite aguda', simples: 'Dor de garganta', explica: 'Garganta inflamada e dor ao engolir.' },
  J03: { descricao: 'Amigdalite aguda', simples: 'Inflamação nas amígdalas', explica: 'Dor de garganta forte, febre e dificuldade para engolir.' },
  J06: { descricao: 'Infecção aguda das vias aéreas superiores', simples: 'Infecção de garganta/nariz', explica: 'Tosse, coriza, dor de garganta e mal-estar.' },
  J11: { descricao: 'Influenza', simples: 'Gripe', explica: 'Febre, dor no corpo, tosse, coriza e mal-estar.' },
  J18: { descricao: 'Pneumonia', simples: 'Pneumonia', explica: 'Tosse, febre e falta de ar; infecção no pulmão.' },
  J20: { descricao: 'Bronquite aguda', simples: 'Bronquite', explica: 'Tosse com catarro e desconforto no peito.' },
  J45: { descricao: 'Asma', simples: 'Asma', explica: 'Falta de ar, chiado no peito e tosse.' },

  // ── K — Digestivo ──────────────────────────────────────────────────
  K21: { descricao: 'Refluxo gastroesofágico', simples: 'Refluxo / azia', explica: 'Queimação no estômago e azia.' },
  K29: { descricao: 'Gastrite', simples: 'Gastrite', explica: 'Dor e queimação no estômago, enjoo.' },
  K52: { descricao: 'Gastroenterocolite não infecciosa', simples: 'Inflamação intestinal', explica: 'Diarreia, cólica e desconforto na barriga.' },
  K80: { descricao: 'Colelitíase (cálculo na vesícula)', simples: 'Pedra na vesícula', explica: 'Dor forte na parte de cima da barriga, enjoo.' },

  // ── L — Pele ───────────────────────────────────────────────────────
  L03: { descricao: 'Celulite (infecção de pele)', simples: 'Infecção na pele', explica: 'Pele vermelha, quente, inchada e dolorida.' },

  // ── M — Osteomuscular ──────────────────────────────────────────────
  M25: { descricao: 'Transtorno articular não especificado', simples: 'Dor na articulação', explica: 'Dor ou inchaço em uma junta (joelho, ombro etc.).' },
  M51: { descricao: 'Hérnia de disco', simples: 'Hérnia de disco', explica: 'Dor na coluna que pode irradiar para braços ou pernas.' },
  M54: { descricao: 'Dorsalgia', simples: 'Dor nas costas', explica: 'Dor muscular, lombalgia, torcicolo ou desconforto na coluna.' },
  M75: { descricao: 'Lesão do ombro', simples: 'Dor no ombro', explica: 'Dor e dificuldade para mover o ombro.' },
  M79: { descricao: 'Dor em tecidos moles / membros', simples: 'Dor muscular', explica: 'Dor em músculos ou membros, sem causa específica.' },

  // ── N — Geniturinário ──────────────────────────────────────────────
  N30: { descricao: 'Cistite', simples: 'Infecção urinária', explica: 'Ardência ao urinar e vontade frequente de ir ao banheiro.' },
  N39: { descricao: 'Transtorno do trato urinário', simples: 'Infecção urinária', explica: 'Ardência e desconforto ao urinar.' },

  // ── R — Sintomas/sinais ────────────────────────────────────────────
  R05: { descricao: 'Tosse', simples: 'Tosse', explica: 'Tosse persistente.' },
  R10: { descricao: 'Dor abdominal', simples: 'Dor na barriga', explica: 'Dor ou cólica na região da barriga.' },
  R11: { descricao: 'Náuseas e vômitos', simples: 'Enjoo e vômito', explica: 'Enjoo, ânsia e vômito.' },
  R50: { descricao: 'Febre', simples: 'Febre', explica: 'Temperatura do corpo elevada.' },
  R51: { descricao: 'Cefaleia', simples: 'Dor de cabeça', explica: 'Dor de cabeça.' },
  R53: { descricao: 'Mal-estar e fadiga', simples: 'Cansaço / mal-estar', explica: 'Sensação de fraqueza e cansaço geral.' },

  // ── S/T — Lesões/traumas ───────────────────────────────────────────
  S52: { descricao: 'Fratura do antebraço', simples: 'Fratura no braço', explica: 'Osso quebrado no antebraço.' },
  S82: { descricao: 'Fratura da perna', simples: 'Fratura na perna', explica: 'Osso quebrado na perna.' },
  S93: { descricao: 'Entorse de tornozelo', simples: 'Torção no tornozelo', explica: 'Dor e inchaço no tornozelo após torção.' },
  T14: { descricao: 'Traumatismo de região não especificada', simples: 'Machucado / trauma', explica: 'Lesão ou machucado por acidente.' },

  // ── Z — Acompanhamento ─────────────────────────────────────────────
  Z00: { descricao: 'Exame médico geral', simples: 'Consulta / exame', explica: 'Avaliação ou exame de rotina.' },
  Z09: { descricao: 'Consulta de acompanhamento', simples: 'Retorno médico', explica: 'Consulta de acompanhamento após tratamento.' },
};

// Chapter fallback (first letter) — plain-language area of the body.
const CHAPTERS = {
  A: 'Doença infecciosa', B: 'Doença infecciosa', C: 'Neoplasia (tumor)',
  D: 'Sangue / neoplasia', E: 'Doença hormonal ou metabólica',
  F: 'Saúde mental', G: 'Sistema nervoso', H: 'Olhos ou ouvidos',
  I: 'Coração e circulação', J: 'Respiração (vias aéreas/pulmão)',
  K: 'Sistema digestivo', L: 'Pele', M: 'Ossos, músculos e juntas',
  N: 'Rins e vias urinárias', O: 'Gravidez e parto', P: 'Período do nascimento',
  Q: 'Malformação congênita', R: 'Sintomas gerais', S: 'Lesão / trauma',
  T: 'Lesão / intoxicação', W: 'Acidente / causa externa', Z: 'Acompanhamento de saúde',
};

function normalizeCid(code) {
  return String(code || '').toUpperCase().trim().replace(/\s+/g, '');
}

/**
 * Resolve a CID code to rich info.
 * @returns {{cid, descricao, simples, explica, encontrada}}
 *   encontrada=false means the code wasn't precisely found (caller shows
 *   "Não encontrada" + friendly message). cid='' when no code was provided.
 */
function getCidInfo(code) {
  const cid = normalizeCid(code);
  if (!cid) {
    return { cid: '', descricao: '', simples: '', explica: '', encontrada: false };
  }
  // Exact match, then base (strip subcategory after the dot, e.g. M54.5 → M54).
  const base = cid.split('.')[0];
  const hit = CID_DB[cid] || CID_DB[base];
  if (hit) {
    return { cid, descricao: hit.descricao, simples: hit.simples, explica: hit.explica, encontrada: true };
  }
  // Chapter-level fallback: still useful, but not a precise match.
  const chapter = CHAPTERS[cid[0]];
  if (chapter) {
    return {
      cid,
      descricao: chapter,
      simples: chapter,
      explica: 'Categoria geral — descrição específica não localizada.',
      encontrada: false,
    };
  }
  return { cid, descricao: '', simples: '', explica: '', encontrada: false };
}

/**
 * Build the JS embedded in the standalone HTML report, exposing the same
 * CID_DB, CHAPTERS and a getCidInfo() so the downloaded file works offline.
 */
function buildClientCidScript() {
  return `
const CID_DB = ${JSON.stringify(CID_DB)};
const CID_CHAPTERS = ${JSON.stringify(CHAPTERS)};
function cidNormalize(code){return String(code||'').toUpperCase().trim().replace(/\\s+/g,'');}
function getCidInfo(code){
  const cid=cidNormalize(code);
  if(!cid)return{cid:'',descricao:'',simples:'',explica:'',encontrada:false};
  const base=cid.split('.')[0];
  const hit=CID_DB[cid]||CID_DB[base];
  if(hit)return{cid:cid,descricao:hit.descricao,simples:hit.simples,explica:hit.explica,encontrada:true};
  const ch=CID_CHAPTERS[cid[0]];
  if(ch)return{cid:cid,descricao:ch,simples:ch,explica:'Categoria geral — descrição específica não localizada.',encontrada:false};
  return{cid:cid,descricao:'',simples:'',explica:'',encontrada:false};
}`;
}

module.exports = { getCidInfo, buildClientCidScript, CID_DB };
