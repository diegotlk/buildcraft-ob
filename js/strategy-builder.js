/* ============================================================
   Binaryzando — Strategy Builder Logic (Fixed)
   ============================================================ */

let strategyState = {
  mode: 'pintar', // 'pintar', 'quadrante' ou 'indicador'
  timeframe: 'M1', // pergunta global, sempre a primeira fase
  patternLength: null,
  pattern: [],
  direction: null,
  anchoring: null,
  mirror: false,
  mirrorChosen: false,
  mirrorDirection: null,
  testandoExistente: null, // { origemId, origemNome } quando vem da aba "Testar Estratégia"
  pairFilter: 'otc', // 'otc' ou 'op'
  pair: null,
  scheduleStart: '00:00',
  scheduleEnd: '23:59',
  periodoModo: 'tudo', // 'tudo' (todo o histórico disponível) ou 'personalizado'
  periodoDataDe: null,
  periodoDataAte: null,
  // ── Campos do modo quadrante ──
  q: {
    tipo: 'quadrante',     // 'quadrante' (Família 1) ou 'referencia' (Famílias 2/3)
    ref: null,             // params da estratégia de referência (quando tipo='referencia')
    approach: null,        // 'preset' ou 'custom'
    presetNome: null,      // nome do preset escolhido (ex: 'MHI 1')
    bloco: 'M5',           // quadrante: 'M5' (5 velas) ou 'M15' (15 velas) — sempre maior que strategyState.timeframe
    analiseModo: 'contar', // 'contar' (maioria/minoria) ou 'editar' (pintar)
    analisePadrao: [],     // se editar: cores das velas do bloco
    posicoes: null,        // se contar: quais velas olhar (null=todas)
    posicoesLabel: 'todas',
    entradaModo: 'minoria', // 'maioria' (a favor) ou 'minoria' (contra)
    entradaPos: 0,          // 1ª=0, 2ª=1, 3ª=2... do próximo bloco
    entradaCor: 1,          // se direção por cor fixa (1=verde, -1=vermelha)
  },
  // ── Campos do modo indicador ──
  ind: {
    tipo: null,        // 'media' | 'rsi' | 'macd' | 'bollinger' | 'montador'
    params: {},        // parâmetros do indicador escolhido
  },
  // ── Campos do modo figura ──
  fig: { tipo: null },
};

// Figuras gráficas: rótulo, direção e descrição
const FIGURAS = {
  engolfo_alta: { nome: 'Engolfo de Alta', dir: 'CALL', desc: 'Vela verde engole a vermelha anterior.' },
  engolfo_baixa: { nome: 'Engolfo de Baixa', dir: 'PUT', desc: 'Vela vermelha engole a verde anterior.' },
  martelo: { nome: 'Martelo', dir: 'CALL', desc: 'Pavio inferior longo — rejeição de baixa.' },
  estrela_cadente: { nome: 'Estrela Cadente', dir: 'PUT', desc: 'Pavio superior longo — rejeição de alta.' },
  tres_soldados: { nome: 'Três Soldados Brancos', dir: 'CALL', desc: '3 velas verdes consecutivas subindo.' },
  tres_corvos: { nome: 'Três Corvos', dir: 'PUT', desc: '3 velas vermelhas consecutivas caindo.' },
};

// Indicadores: rótulo, defaults clássicos e campos editáveis
const INDICADORES = {
  media: {
    nome: 'Média Móvel',
    defaults: { tipo: 'EMA', periodo: 20 },
    campos: [
      { key: 'tipo', label: 'Tipo', tipo: 'select', opcoes: ['EMA', 'SMA'] },
      { key: 'periodo', label: 'Período', tipo: 'number', min: 2, max: 400 },
    ],
  },
  rsi: {
    nome: 'RSI',
    defaults: { periodo: 14, sobrevenda: 30, sobrecompra: 70 },
    campos: [
      { key: 'periodo', label: 'Período', tipo: 'number', min: 2, max: 100 },
      { key: 'sobrevenda', label: 'Sobrevenda (CALL abaixo de)', tipo: 'number', min: 1, max: 50 },
      { key: 'sobrecompra', label: 'Sobrecompra (PUT acima de)', tipo: 'number', min: 50, max: 99 },
    ],
  },
  macd: {
    nome: 'MACD',
    defaults: { rapida: 12, lenta: 26, sinal: 9 },
    campos: [
      { key: 'rapida', label: 'Média rápida', tipo: 'number', min: 2, max: 100 },
      { key: 'lenta', label: 'Média lenta', tipo: 'number', min: 3, max: 200 },
      { key: 'sinal', label: 'Linha de sinal', tipo: 'number', min: 2, max: 100 },
    ],
  },
  bollinger: {
    nome: 'Bandas de Bollinger',
    defaults: { periodo: 20, desvios: 2 },
    campos: [
      { key: 'periodo', label: 'Período', tipo: 'number', min: 2, max: 200 },
      { key: 'desvios', label: 'Desvios padrão', tipo: 'number', min: 0.5, max: 4, step: 0.1 },
    ],
  },
};

// Presets clássicos de quadrante — Família 1 (Maioria/Minoria).
// A direção (maioria/minoria) é escolhida pelo usuário ao clicar no preset.
const PRESETS_QUADRANTE = [
  { nome: 'MHI 1', bloco: 'M5', posicoes: [2, 3, 4], posicoesLabel: '3 últimas', entradaPos: 0, desc: '3 últimas velas; entra na 1ª do próximo.' },
  { nome: 'MHI 2', bloco: 'M5', posicoes: [2, 3, 4], posicoesLabel: '3 últimas', entradaPos: 1, desc: '3 últimas velas; entra na 2ª do próximo.' },
  { nome: 'MHI 3', bloco: 'M5', posicoes: [2, 3, 4], posicoesLabel: '3 últimas', entradaPos: 2, desc: '3 últimas velas; entra na 3ª do próximo.' },
  { nome: 'Milhão', bloco: 'M5', posicoes: null, posicoesLabel: 'todas (5)', entradaPos: 0, desc: '5 velas do bloco; entra na 1ª do próximo.' },
  { nome: 'Vituxo 2.0', bloco: 'M5', posicoes: [0, 1, 2], posicoesLabel: '3 primeiras', entradaPos: 2, desc: '3 primeiras velas; entra na 3ª do próximo.' },
  { nome: 'D21', bloco: 'M5', posicoes: [0, 2, 3], posicoesLabel: 'velas 1, 3 e 4', entradaPos: 0, desc: 'Velas 1, 3 e 4; entra na 1ª do próximo.' },
  { nome: 'Padrão 3x1', bloco: 'M5', posicoes: [0, 1, 2], posicoesLabel: '3 primeiras', entradaPos: 0, desc: '3 primeiras velas; entra na 1ª do próximo.' },
];

// ── PLANO ──────────────────────────────────────────────────────────────
// No plano Free só liberamos estes dois presets. Todo o resto (demais presets
// de quadrante, presets de referência/flip e o modo "montar do zero") é Premium.
// A coluna 'plano' no servidor é a fonte da verdade; ehPremium() (auth.js) lê o
// reflexo guardado na sessão.
const PRESETS_FREE = ['MHI 1', 'Milhão'];

function presetBloqueado(nome) {
  return false;
}

// Aviso amigável quando um free toca em algo Premium (preset trancado ou o
// modo "montar do zero"). O servidor controla quem é premium; isto é só a UX.
function upsellPremium(oQue, contexto) {
  const base = contexto === 'par'
    ? `"${oQue}" é um par Premium. No Free você testa em EURUSD, GBPUSD e USDJPY. `
    : `"${oQue}" é do plano Premium. No Free você tem as estratégias MHI 1 e Milhão. `;
  showToast('🔒 Recurso Premium', base + 'Assine o Premium pra liberar tudo.', 'default');
}

// Presets de Repetição de posição (Família 2) e Reversão/Flip (Família 3).
// tipo 'referencia': olha a vela em refPos e entra em entryPos repetindo ou
// invertendo a cor. refBloco 'atual' (mesmo ciclo) ou 'anterior'.
// condPosicoes: exige mesma cor nessas posições (Triplicação/Não Triplicação).
const PRESETS_REFERENCIA = [
  // ── Família 2: Repetição de posição ──
  { nome: 'Torres Gêmeas', familia: 'Repetição', blocoVelas: 5, refPos: 0, entryPos: 4, relacao: 'repete', refBloco: 'atual', condPosicoes: null, desc: '1ª vela referência; entra na 5ª repetindo a cor.' },
  { nome: 'Padrão 23', familia: 'Repetição', blocoVelas: 5, refPos: 0, entryPos: 1, relacao: 'repete', refBloco: 'atual', condPosicoes: null, desc: '1ª vela referência; entra na 2ª repetindo a cor.' },
  { nome: 'Padrão Ímpar', familia: 'Repetição', blocoVelas: 5, refPos: 2, entryPos: 3, relacao: 'repete', refBloco: 'atual', condPosicoes: null, desc: '3ª vela referência; entra na 4ª na mesma cor.' },
  { nome: '3 Mosqueteiros', familia: 'Repetição', blocoVelas: 5, refPos: 2, entryPos: 3, relacao: 'repete', refBloco: 'atual', condPosicoes: null, desc: '3ª vela referência; entra na 4ª na mesma cor.' },
  { nome: '3 Vizinhos', familia: 'Repetição', blocoVelas: 5, refPos: 3, entryPos: 4, relacao: 'repete', refBloco: 'atual', condPosicoes: null, desc: '4ª vela referência; entra na 5ª na mesma cor.' },
  { nome: 'Triplicação', familia: 'Repetição', blocoVelas: 5, refPos: 0, entryPos: 2, relacao: 'repete', refBloco: 'atual', condPosicoes: [0, 1], desc: '1ª e 2ª iguais; entra na 3ª formando trio.' },
  { nome: 'DAKA', familia: 'Repetição', blocoVelas: 5, refPos: 3, entryPos: 0, relacao: 'repete', refBloco: 'anterior', condPosicoes: null, desc: '4ª vela do ciclo anterior; entra na 1ª do atual na mesma cor.' },
  { nome: 'R7', familia: 'Repetição', blocoVelas: 10, refPos: 7, entryPos: 6, relacao: 'repete', refBloco: 'anterior', condPosicoes: null, desc: 'Ciclo de 10: 8ª do anterior; entra na 7ª do atual na mesma cor.' },
  // ── Família 3: Reversão / Flip ──
  { nome: 'Seven Flip', familia: 'Flip', blocoVelas: 8, refPos: 6, entryPos: 7, relacao: 'flip', refBloco: 'atual', condPosicoes: null, desc: '7ª vela; entra na 8ª na cor oposta.' },
  { nome: 'Five Flip', familia: 'Flip', blocoVelas: 6, refPos: 4, entryPos: 5, relacao: 'flip', refBloco: 'atual', condPosicoes: null, desc: '5ª vela; entra na 6ª na cor oposta.' },
  { nome: 'Não Triplicação', familia: 'Flip', blocoVelas: 5, refPos: 0, entryPos: 2, relacao: 'flip', refBloco: 'atual', condPosicoes: [0, 1], desc: '1ª e 2ª iguais; entra na 3ª na cor oposta (quebra o trio).' },
  { nome: 'MSF', familia: 'Flip', blocoVelas: 5, refPos: 0, entryPos: 4, relacao: 'flip', refBloco: 'anterior', condPosicoes: null, desc: '1ª vela do ciclo anterior; entra na 5ª do atual na cor oposta.' },
];

// Specs reutilizáveis (formato que a API entende em _mapa_sinais)
const SPEC = {
  mhi1: { tipo: 'quadrante', bloco: 'M5', analise_modo: 'maioria', posicoes_analise: [2, 3, 4], entrada_modo: 'minoria', entrada_pos: 0 },
  mhi2: { tipo: 'quadrante', bloco: 'M5', analise_modo: 'maioria', posicoes_analise: [2, 3, 4], entrada_modo: 'minoria', entrada_pos: 1 },
  mhi3: { tipo: 'quadrante', bloco: 'M5', analise_modo: 'maioria', posicoes_analise: [2, 3, 4], entrada_modo: 'minoria', entrada_pos: 2 },
  p3x1: { tipo: 'quadrante', bloco: 'M5', analise_modo: 'maioria', posicoes_analise: [0, 1, 2], entrada_modo: 'minoria', entrada_pos: 0 },
  impar: { tipo: 'referencia', bloco_velas: 5, ref_pos: 2, entry_pos: 3, relacao: 'repete', ref_bloco: 'atual', cond_posicoes: null },
  r7: { tipo: 'referencia', bloco_velas: 10, ref_pos: 7, entry_pos: 6, relacao: 'repete', ref_bloco: 'anterior', cond_posicoes: null },
  sevenFlip: { tipo: 'referencia', bloco_velas: 8, ref_pos: 6, entry_pos: 7, relacao: 'flip', ref_bloco: 'atual', cond_posicoes: null },
  torres: { tipo: 'referencia', bloco_velas: 5, ref_pos: 0, entry_pos: 4, relacao: 'repete', ref_bloco: 'atual', cond_posicoes: null },
};

// Presets de Confluência (Família 4) — A é a principal, B confirma a direção.
const PRESETS_CONFLUENCIA = [
  { nome: 'MHI + Ímpar', specA: SPEC.mhi1, specB: SPEC.impar, desc: 'MHI 1 confirmada pelo Padrão Ímpar.' },
  { nome: 'MHI2 + R7', specA: SPEC.mhi2, specB: SPEC.r7, desc: 'MHI 2 confirmada pelo R7.' },
  { nome: 'MHI3 + Seven Flip', specA: SPEC.mhi3, specB: SPEC.sevenFlip, desc: 'MHI 3 confirmada pelo Seven Flip.' },
  { nome: 'Torres Gêmeas + 3x1', specA: SPEC.torres, specB: SPEC.p3x1, desc: 'Torres Gêmeas confirmada pelo 3x1.' },
];

// ── Cores do padrão ──
const COLORS = {
  white: '⬜',
  green: '🟩',
  red: '🟥',
};

const COLOR_ORDER = [COLORS.white, COLORS.green, COLORS.red];

// ── FASE 1: MONTAR PADRÃO ──
function setPatternLength(length) {
  strategyState.patternLength = length;
  strategyState.pattern = Array(length).fill(COLORS.white);

  document.getElementById('pattern-container-wrapper').style.display = 'block';
  document.getElementById('custom-input-container').style.display = 'none';
  document.getElementById('custom-length').value = '';

  renderPattern();
  setTimeout(() => {
    document.getElementById('pattern-container').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 100);
}

function showCustomInput() {
  document.getElementById('custom-input-container').style.display = 'block';
  document.getElementById('custom-length').focus();
}

function setCustomPatternLength() {
  const value = parseInt(document.getElementById('custom-length').value);

  if (isNaN(value) || value < 1 || value > 20) {
    showToast('⚠️ Valor inválido', 'Digite um número entre 1 e 20.', 'default');
    return;
  }

  setPatternLength(value);
}

function renderPattern() {
  const container = document.getElementById('pattern-container');
  container.innerHTML = '';

  strategyState.pattern.forEach((color, index) => {
    const candle = document.createElement('div');
    candle.className = 'candle ' + getColorClass(color);
    candle.textContent = color;
    candle.onclick = () => toggleCandle(index);
    container.appendChild(candle);
  });
}

function getColorClass(color) {
  if (color === COLORS.white) return 'white';
  if (color === COLORS.green) return 'green';
  if (color === COLORS.red) return 'red';
  return 'white';
}

function toggleCandle(index) {
  const currentColor = strategyState.pattern[index];
  const currentIndex = COLOR_ORDER.indexOf(currentColor);
  const nextIndex = (currentIndex + 1) % COLOR_ORDER.length;
  strategyState.pattern[index] = COLOR_ORDER[nextIndex];

  renderPattern();
  updateMirrorPreview();
}

function resetPattern() {
  strategyState.pattern = Array(strategyState.patternLength).fill(COLORS.white);
  renderPattern();
  updateMirrorPreview();
}

// ── FASE 2: DIREÇÃO ──
function setDirection(direction) {
  strategyState.direction = direction;

  document.querySelectorAll('#phase-direction .direction-btn').forEach(btn => {
    btn.classList.remove('selected');
  });
  event.target.closest('.direction-btn').classList.add('selected');
}

// ── FASE 3: ANCORAGEM ──
function setAnchoring(anchoring) {
  strategyState.anchoring = anchoring;

  document.querySelectorAll('#phase-anchoring .anchoring-card').forEach(card => {
    card.classList.remove('selected');
  });
  event.target.closest('.anchoring-card').classList.add('selected');
}

// ── FASE 4: ESPELHO ──
function getMirrorPattern() {
  return strategyState.pattern.map(color => {
    if (color === COLORS.green) return COLORS.red;
    if (color === COLORS.red) return COLORS.green;
    return COLORS.white;
  });
}

function updateMirrorPreview() {
  const original = document.getElementById('original-mirror');
  original.innerHTML = '';
  strategyState.pattern.forEach(color => {
    const candle = document.createElement('div');
    candle.className = 'mirror-candle ' + getColorClass(color);
    candle.textContent = color;
    original.appendChild(candle);
  });

  const mirrored = document.getElementById('mirrored-mirror');
  mirrored.innerHTML = '';
  const mirrorPattern = getMirrorPattern();
  mirrorPattern.forEach(color => {
    const candle = document.createElement('div');
    candle.className = 'mirror-candle ' + getColorClass(color);
    candle.textContent = color;
    mirrored.appendChild(candle);
  });
}

function setMirror(enabled) {
  strategyState.mirror = enabled;
  strategyState.mirrorChosen = true;

  document.querySelectorAll('#phase-mirror .direction-btn').forEach(btn => {
    btn.classList.remove('selected');
  });
  event.target.closest('.direction-btn').classList.add('selected');

  if (enabled) {
    document.getElementById('mirror-direction-container').style.display = 'block';
  } else {
    document.getElementById('mirror-direction-container').style.display = 'none';
  }
}

function setMirrorDirection(direction) {
  strategyState.mirrorDirection = direction;

  document.querySelectorAll('#mirror-direction-container .direction-btn').forEach(btn => {
    btn.classList.remove('selected');
  });
  event.target.closest('.direction-btn').classList.add('selected');
}

// ── FASE 5: PAR ──
function setPairFilter(filter) {
  strategyState.pairFilter = filter;

  document.getElementById('filter-otc-btn').classList.remove('selected');
  document.getElementById('filter-op-btn').classList.remove('selected');

  if (filter === 'otc') {
    document.getElementById('filter-otc-btn').classList.add('selected');
  } else {
    document.getElementById('filter-op-btn').classList.add('selected');
  }

  renderPairsForFilter();
}

function renderPairsForFilter() {
  const pares = strategyState.pairFilter === 'otc' ? PARES_OTC : PARES_OP;
  renderPairs(pares);
}

function renderPairs(pairs) {
  const container = document.getElementById('pairs-container');
  container.innerHTML = '';

  if (pairs.length === 0) {
    container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">Nenhum par encontrado</p>';
    return;
  }

  pairs.slice(0, 20).forEach(pair => {
    const locked = parBloqueado(pair);
    const btn = document.createElement('button');
    btn.className = 'direction-btn' + (locked ? ' preset-locked' : '');
    btn.textContent = locked ? `🔒 ${pair}` : pair;
    btn.onclick = locked ? () => upsellPremium(pair, 'par') : () => setPair(pair);
    if (!locked && strategyState.pair === pair) {
      btn.classList.add('selected');
    }
    container.appendChild(btn);
  });
}

function searchPairs() {
  const search = document.getElementById('pair-search').value.toUpperCase();

  if (!search) {
    renderPairsForFilter();
    return;
  }

  // Buscar em TODOS os pares (OTC + op)
  const filtered = TODOS_OS_PARES.filter(pair => pair.includes(search));
  renderPairs(filtered);
}

function clearSearch() {
  document.getElementById('pair-search').value = '';
  renderPairsForFilter();
}

function setPair(pair) {
  strategyState.pair = pair;

  document.querySelectorAll('#phase-pair .direction-btn:not(#filter-otc-btn):not(#filter-op-btn)').forEach(btn => {
    btn.classList.remove('selected');
  });
  event.target.classList.add('selected');
}

// ── FASE 6: HORÁRIO ──
function setSchedule() {
  const start = document.getElementById('schedule-start').value;
  const end = document.getElementById('schedule-end').value;

  if (!start || !end) {
    showToast('⚠️ Horários inválidos', 'Digite um horário de início e fim válidos.', 'default');
    return false;
  }

  strategyState.scheduleStart = start;
  strategyState.scheduleEnd = end;

  if (strategyState.periodoModo === 'personalizado') {
    const de = document.getElementById('schedule-data-de').value;
    const ate = document.getElementById('schedule-data-ate').value;
    if (!de || !ate) {
      showToast('⚠️ Período inválido', 'Escolha a data de início e fim do período personalizado.', 'default');
      return false;
    }
    strategyState.periodoDataDe = de;
    strategyState.periodoDataAte = ate;
  } else {
    strategyState.periodoDataDe = null;
    strategyState.periodoDataAte = null;
  }
  return true;
}

function setSchedulePeriodo(modo, el) {
  strategyState.periodoModo = modo;
  document.querySelectorAll('#schedule-periodo-grid .direction-btn').forEach(b => b.classList.remove('selected'));
  if (el) el.classList.add('selected');
  document.getElementById('schedule-periodo-datas').style.display = modo === 'personalizado' ? 'block' : 'none';
}

function setSchedulePeriodoRapido(dias, el) {
  const hoje = new Date();
  const fim = new Date(hoje);
  const inicio = new Date(hoje);
  inicio.setDate(inicio.getDate() - dias);

  const fmt = (d) => d.toISOString().slice(0, 10);
  document.getElementById('schedule-data-de').value = fmt(inicio);
  document.getElementById('schedule-data-ate').value = fmt(fim);
  setSchedulePeriodo('personalizado', document.querySelector('#schedule-periodo-grid [data-periodo="personalizado"]'));
  marcarAtalhoPeriodo(el);
}

// Destaca o atalho de período clicado (Ontem/Última semana/Último mês). Antes
// nenhum ficava marcado — o usuário não via qual período tinha escolhido.
function marcarAtalhoPeriodo(el) {
  if (!el || !el.parentElement) return;
  // Anel ciano + ✓, igual à seleção de carta na aba Personalizar — mas sem
  // preencher o fundo do botão (ver .btn-outline.periodo-ativo em global.css).
  el.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('periodo-ativo'));
  el.classList.add('periodo-ativo');
}

// Quando o usuário edita a data na mão, o atalho marcado deixa de valer: limpa
// o destaque pra não mostrar "Último mês" aceso com datas diferentes.
// prefixo: 'schedule' (teste) ou 'historico' (gerador de histórico).
function limparAtalhosPeriodo(prefixo) {
  const datas = document.getElementById(prefixo + '-periodo-datas');
  if (!datas) return;
  datas.querySelectorAll('.btn-sm').forEach(b => b.classList.remove('periodo-ativo'));
}

// ── DIAS DA SEMANA (filtro por cima do período) ──
// Os chips no DOM são a fonte da verdade (Seg=0 .. Dom=6, mesma base do motor).
function toggleDiaSemana(el) {
  const ligados = document.querySelectorAll('#schedule-dias-grid .dia-chip.selected');
  if (el.classList.contains('selected') && ligados.length <= 1) {
    showToast('⚠️ Pelo menos um dia', 'Deixe ao menos um dia da semana ativo pra testar.', 'default');
    return;
  }
  el.classList.toggle('selected');
}

// Dias selecionados (array de ints) ou null = sem filtro. Os 7 dias também viram
// null, pra não mandar filtro à toa pro backend.
function getDiasSemanaSelecionados() {
  const chips = document.querySelectorAll('#schedule-dias-grid .dia-chip');
  if (!chips.length) return null;
  const sel = [...chips]
    .filter(c => c.classList.contains('selected'))
    .map(c => parseInt(c.dataset.dia, 10));
  if (sel.length === 0 || sel.length === 7) return null;
  return sel;
}

// Reacende todos os dias (volta ao padrão "opera todos"). Usado no reset e na
// reprodução exata de uma carta.
function resetDiasSemanaUI() {
  document.querySelectorAll('#schedule-dias-grid .dia-chip')
    .forEach(c => c.classList.add('selected'));
}

// Aplica um recorte específico de dias da semana na UI (array de ints 0-6,
// ou null/undefined = todos). Usado ao carregar uma estratégia salva (com
// o recorte que ela tinha) e depois do botão "Otimizar" (reflete o corte
// achado, pra "Salvar" e qualquer novo teste já saírem com ele aplicado).
function aplicarDiasSemanaUI(dias) {
  const chips = document.querySelectorAll('#schedule-dias-grid .dia-chip');
  if (!chips.length) return;
  if (!Array.isArray(dias) || dias.length === 0 || dias.length === 7) {
    chips.forEach(c => c.classList.add('selected'));
    return;
  }
  const set = new Set(dias);
  chips.forEach(c => c.classList.toggle('selected', set.has(parseInt(c.dataset.dia, 10))));
}

// Melhorar a interatividade dos inputs de horário
document.addEventListener('DOMContentLoaded', () => {
  const startInput = document.getElementById('schedule-start');
  const endInput = document.getElementById('schedule-end');

  const styleOnFocus = (input) => {
    input.style.borderColor = 'var(--accent-hover)';
    input.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.2)';
  };

  const styleOnBlur = (input) => {
    input.style.borderColor = 'var(--accent)';
    input.style.boxShadow = 'none';
  };

  if (startInput) {
    startInput.addEventListener('focus', styleOnFocus);
    startInput.addEventListener('blur', () => styleOnBlur(startInput));
    startInput.addEventListener('click', (e) => e.target.click());
  }

  if (endInput) {
    endInput.addEventListener('focus', styleOnFocus);
    endInput.addEventListener('blur', () => styleOnBlur(endInput));
    endInput.addEventListener('click', (e) => e.target.click());
  }
});

// ── NAVEGAÇÃO ──
function goToPhase(phase) {
  // Validações
  if (phase === 'direction' && !strategyState.patternLength) {
    showToast('⚠️ Escolha a quantidade de velas', 'Selecione 3, 5, 10, 20 ou outro número.', 'default');
    return;
  }

  if (phase === 'anchoring' && !strategyState.direction) {
    showToast('⚠️ Escolha a direção', 'CALL, PUT ou OS DOIS?', 'default');
    return;
  }

  if (phase === 'mirror' && !strategyState.anchoring) {
    showToast('⚠️ Escolha a ancoragem', 'Exato ou No Mínimo?', 'default');
    return;
  }

  if (phase === 'pair' && strategyState.mode === 'pintar' && !strategyState.mirrorChosen) {
    showToast('⚠️ Escolha uma opção', 'Selecione "Só o Meu" ou "Os Dois" para continuar.', 'default');
    return;
  }

  if (phase === 'pair' && strategyState.mirror && !strategyState.mirrorDirection) {
    showToast('⚠️ Escolha a direção do espelho', 'CALL ou PUT?', 'default');
    return;
  }

  if (phase === 'schedule' && !strategyState.pair) {
    showToast('⚠️ Escolha um par', 'Selecione qual par você quer testar.', 'default');
    return;
  }

  if (phase === 'q-analise' && !strategyState.q.bloco) {
    showToast('⚠️ Escolha um quadrante válido', 'O quadrante precisa ser maior que o timeframe das velas.', 'default');
    return;
  }

  if (phase === 'review') {
    if (!setSchedule()) {
      return;
    }
    updateReviewContent();
    resetPostTestButtons();
  }

  // Inicializar pares na fase 5 — se já tem um par definido (testando
  // existente), usa o filtro correspondente pra ele aparecer marcado.
  if (phase === 'pair') {
    const filtro = (strategyState.pair && PARES_OP.includes(strategyState.pair)) ? 'op' : 'otc';
    setPairFilter(filtro);
  }

  // Aba "Testar Estratégia" agora é o painel "Criar Histórico" (js/historico.js):
  // roda uma estratégia salva num par/horário/período à escolha e gera uma
  // sequência real de W/L reutilizável em Gerenciamentos.
  if (phase === 'existente') {
    abrirCriarHistorico();
  }

  // Renderizar gerenciamentos e históricos (padrões + criados pelo usuário) ao entrar na aba
  if (phase === 'gerenciamento') {
    renderGerenciamentos();
    renderHistoricos();
  }

  // Renderizar os seletores de estratégia/gerenciamento ao entrar na aba Build
  if (phase === 'build') {
    document.getElementById('build-resultado').style.display = 'none';
    renderBuildPickers();
  }

  // Sincroniza os inputs de horário com o estado (útil ao testar uma
  // estratégia existente, que já vem com horário pré-definido)
  if (phase === 'schedule') {
    const inicio = document.getElementById('schedule-start');
    const fim = document.getElementById('schedule-end');
    if (inicio) inicio.value = strategyState.scheduleStart;
    if (fim) fim.value = strategyState.scheduleEnd;
  }

  // Renderizar botões de vela de entrada ao chegar na fase Q5
  if (phase === 'q-entrada') {
    renderEntradaPos();
  }

  // Renderizar as opções de quadrante (filtradas pelo timeframe global) ao chegar na fase Q2
  if (phase === 'q-bloco') {
    renderQBlocoOpcoes();
  }

  // Sincronizar o botão selecionado ao (re)entrar na fase de timeframe
  if (phase === 'timeframe') {
    document.querySelectorAll('#global-tf-grid .direction-btn').forEach(b => {
      b.classList.toggle('selected', b.dataset.tf === strategyState.timeframe);
    });
  }

  // Avisar que quadrantes não estão disponíveis em M15 ao chegar na fase de modo
  if (phase === 'mode') {
    const cardQuadrante = document.getElementById('card-modo-quadrante');
    const descQuadrante = document.getElementById('desc-modo-quadrante');
    const semQuadrante = strategyState.timeframe === 'M15';
    if (cardQuadrante) {
      cardQuadrante.style.opacity = semQuadrante ? '.45' : '';
      cardQuadrante.style.cursor = semQuadrante ? 'not-allowed' : '';
      cardQuadrante.onclick = semQuadrante
        ? () => showToast('⚠️ Não disponível em M15', 'Quadrante precisa de um bloco maior que o timeframe. Volte e escolha M1 ou M5.', 'default')
        : () => setMode('quadrante');
    }
    if (descQuadrante) {
      descQuadrante.textContent = semQuadrante
        ? 'Não disponível para M15 — não existe bloco maior. Volte e escolha M1 ou M5.'
        : 'Olha um bloco maior de velas (ex: quadrante de 5 min = 5 velas de 1 min), analisa a maioria/minoria e entra na próxima. Estilo MHI, Milhão.';
    }
  }

  // Destacar a direção atual ao chegar na fase Q4
  if (phase === 'q-direction') {
    destacarDirecao(strategyState.q.entradaModo);
  }

  // Esconder todas as fases
  document.querySelectorAll('.phase-section').forEach(section => {
    section.classList.remove('active');
  });

  // Mostrar fase desejada
  document.getElementById(`phase-${phase}`).classList.add('active');

  // Scroll para o topo
  document.querySelector('.strategy-builder').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── REVISÃO ──
function updateReviewContent() {
  if (strategyState.mode === 'quadrante') {
    updateReviewQuadrante();
    return;
  }
  if (strategyState.mode === 'indicador') {
    updateReviewIndicador();
    return;
  }
  if (strategyState.mode === 'figura') {
    updateReviewFigura();
    return;
  }

  const directionText = {
    call: '🟢 CALL (Vela Verde)',
    put: '🔴 PUT (Vela Vermelha)',
    both: '⚖️ OS DOIS (CALL + PUT)',
  };

  const anchoringText = {
    exato: '📌 Exato',
    minimo: '➡️ No Mínimo',
  };

  let content = `
    <div style="margin-bottom: 20px;">
      <p style="margin-bottom: 12px;"><strong>🎯 Padrão:</strong></p>
      <div style="display: flex; gap: 4px; justify-content: center; font-size: 28px; margin-bottom: 16px;">
        ${strategyState.pattern.join('')}
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 14px; margin-bottom: 16px;">
      <div>
        <p><strong>Direção:</strong></p>
        <p>${directionText[strategyState.direction]}</p>
      </div>
      <div>
        <p><strong>Ancoragem:</strong></p>
        <p>${anchoringText[strategyState.anchoring]}</p>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 14px; margin-bottom: 16px;">
      <div>
        <p><strong>Timeframe:</strong></p>
        <p>${strategyState.timeframe}</p>
      </div>
      <div>
        <p><strong>Par:</strong></p>
        <p><code style="background: rgba(99, 102, 241, 0.1); padding: 4px 8px; border-radius: 4px;">${strategyState.pair}</code></p>
      </div>
    </div>

    <div style="font-size: 14px;">
      <p><strong>Horário:</strong></p>
      <p>${strategyState.scheduleStart} - ${strategyState.scheduleEnd}</p>
    </div>
  `;

  if (strategyState.mirror) {
    const mirrorPattern = getMirrorPattern();
    const mirrorDirectionText = {
      call: '🟢 CALL',
      put: '🔴 PUT',
    };

    content += `
      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border-color);">
        <p style="margin-bottom: 12px;"><strong>🔀 Padrão Espelho:</strong></p>
        <div style="display: flex; gap: 4px; justify-content: center; font-size: 28px; margin-bottom: 12px;">
          ${mirrorPattern.join('')}
        </div>
        <p style="text-align: center; color: var(--text-secondary);">
          Direção: ${mirrorDirectionText[strategyState.mirrorDirection]}
        </p>
      </div>
    `;
  }

  document.getElementById('review-content').innerHTML = content;
}

// ── REVISÃO (modo quadrante) ──
function updateReviewQuadrante() {
  const q = strategyState.q;

  // Confluência (Família 4)
  if (q.tipo === 'confluencia' && q.conf) {
    document.getElementById('review-content').innerHTML = `
      <div style="margin-bottom: 16px;">
        <p style="margin-bottom: 8px;"><strong>🔗 Confluência — ${q.conf.nome}</strong></p>
        <p style="color: var(--text-secondary); font-size: 14px;">Só entra quando as duas estratégias apontam a mesma direção.</p>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 14px;">
        <div><p><strong>Par:</strong></p><p><code style="background: rgba(99,102,241,0.1); padding: 4px 8px; border-radius: 4px;">${strategyState.pair}</code></p></div>
        <div><p><strong>Horário:</strong></p><p>${strategyState.scheduleStart} - ${strategyState.scheduleEnd}</p></div>
      </div>
    `;
    return;
  }

  // Estratégia de referência/flip (Famílias 2 e 3)
  if (q.tipo === 'referencia' && q.ref) {
    const ref = q.ref;
    const ordinais = ['1ª', '2ª', '3ª', '4ª', '5ª', '6ª', '7ª', '8ª', '9ª', '10ª'];
    const relTxt = ref.relacao === 'repete' ? '🔁 Repete a cor' : '🔄 Inverte a cor (flip)';
    const refTxt = ref.condPosicoes
      ? `Velas ${ref.condPosicoes.map(p => ordinais[p]).join(' e ')} iguais`
      : `${ordinais[ref.refPos]} vela${ref.refBloco === 'anterior' ? ' (ciclo anterior)' : ''}`;
    document.getElementById('review-content').innerHTML = `
      <div style="margin-bottom: 16px;">
        <p style="margin-bottom: 8px;"><strong>🔲 ${ref.nome}</strong></p>
        <p style="color: var(--text-secondary); font-size: 14px;">Ciclo de ${ref.blocoVelas} velas de 1 min</p>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 14px; margin-bottom: 16px;">
        <div><p><strong>Referência:</strong></p><p>${refTxt}</p></div>
        <div><p><strong>Relação:</strong></p><p>${relTxt}</p></div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 14px; margin-bottom: 16px;">
        <div><p><strong>Vela de entrada:</strong></p><p>${ordinais[ref.entryPos]} vela do ciclo</p></div>
        <div><p><strong>Par:</strong></p><p><code style="background: rgba(99,102,241,0.1); padding: 4px 8px; border-radius: 4px;">${strategyState.pair}</code></p></div>
      </div>
      <div style="font-size: 14px;"><p><strong>Horário:</strong></p><p>${strategyState.scheduleStart} - ${strategyState.scheduleEnd}</p></div>
    `;
    return;
  }
  const ordinais = ['1ª', '2ª', '3ª', '4ª', '5ª', '6ª'];
  const entradaTxt = q.entradaModo === 'maioria' ? '🟢 Entrar pra maioria'
    : q.entradaModo === 'ambas' ? '⚖️ Ambas (mostra a melhor)'
    : '🔴 Entrar pra minoria';

  let analiseTxt;
  if (q.analiseModo === 'editar') {
    analiseTxt = `🎨 Bloco pintado: <span style="font-size:20px;">${q.analisePadrao.join('')}</span>`;
  } else {
    analiseTxt = `🔢 Maioria/minoria · olhando ${q.posicoesLabel}`;
  }

  let content = `
    <div style="margin-bottom: 16px;">
      <p style="margin-bottom: 8px;"><strong>🔲 Estratégia de Quadrante${q.presetNome ? ' — ' + q.presetNome : ''}</strong></p>
      <p style="color: var(--text-secondary); font-size: 14px;">Quadrante de ${q.bloco === 'M15' ? '15' : '5'} min (${velasPorBloco()} velas de ${strategyState.timeframe})</p>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 14px; margin-bottom: 16px;">
      <div><p><strong>Análise:</strong></p><p>${analiseTxt}</p></div>
      <div><p><strong>Direção:</strong></p><p>${entradaTxt}</p></div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 14px; margin-bottom: 16px;">
      <div><p><strong>Vela de entrada:</strong></p><p>${ordinais[q.entradaPos] || (q.entradaPos + 1) + 'ª'} vela do próximo quadrante</p></div>
      <div><p><strong>Par:</strong></p><p><code style="background: rgba(99,102,241,0.1); padding: 4px 8px; border-radius: 4px;">${strategyState.pair}</code></p></div>
    </div>

    <div style="font-size: 14px;">
      <p><strong>Horário:</strong></p>
      <p>${strategyState.scheduleStart} - ${strategyState.scheduleEnd}</p>
    </div>
  `;

  document.getElementById('review-content').innerHTML = content;
}

// ── REVISÃO (modo figura) ──
function updateReviewFigura() {
  const f = FIGURAS[strategyState.fig.tipo];
  document.getElementById('review-content').innerHTML = `
    <div style="margin-bottom: 16px;">
      <p style="margin-bottom: 8px;"><strong>🕯️ ${f.nome}</strong></p>
      <p style="color: var(--text-secondary); font-size: 14px;">${f.desc} → entrar <strong>${f.dir}</strong></p>
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 14px; margin-bottom: 16px;">
      <div><p><strong>Timeframe:</strong></p><p>${strategyState.timeframe}</p></div>
      <div><p><strong>Par:</strong></p><p><code style="background: rgba(99,102,241,0.1); padding: 4px 8px; border-radius: 4px;">${strategyState.pair}</code></p></div>
    </div>
    <div style="font-size: 14px;"><p><strong>Horário:</strong></p><p>${strategyState.scheduleStart} - ${strategyState.scheduleEnd}</p></div>
  `;
}

// ── REVISÃO (modo indicador) ──
function updateReviewIndicador() {
  const ind = strategyState.ind;

  // Montador de condições
  if (ind.tipo === 'montador') {
    const m = strategyState.mont;
    const nomeBloco = (o) => {
      if (o.tipo === 'numero') return o.valor;
      if (o.tipo === 'preco') return 'Preço';
      if (o.tipo === 'rsi') return `RSI(${o.periodo})`;
      if (o.tipo === 'media') return `${o.matipo}(${o.periodo})`;
      if (o.tipo === 'macd') return 'MACD';
      if (o.tipo === 'macd_sinal') return 'MACD sinal';
      return o.tipo;
    };
    const opTxt = { '<': '<', '>': '>', 'cruza_cima': 'cruza ↑', 'cruza_baixo': 'cruza ↓' };
    const linhas = m.condicoes
      .map(c => `${nomeBloco(c.esq)} ${opTxt[c.op]} ${nomeBloco(c.dir)}`)
      .join(`<br/><span style="color:var(--accent-hover);font-weight:700;">${m.combinador}</span><br/>`);
    document.getElementById('review-content').innerHTML = `
      <div style="margin-bottom: 16px;">
        <p style="margin-bottom: 8px;"><strong>🛠️ Meu indicador</strong></p>
        <div style="font-size: 15px; line-height: 1.8;">${linhas}</div>
        <p style="margin-top: 10px;">→ entrar <strong>${m.direcao}</strong></p>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 14px; margin-bottom: 16px;">
        <div><p><strong>Timeframe:</strong></p><p>${strategyState.timeframe}</p></div>
        <div><p><strong>Par:</strong></p><p><code style="background: rgba(99,102,241,0.1); padding: 4px 8px; border-radius: 4px;">${strategyState.pair}</code></p></div>
      </div>
      <div style="font-size: 14px;"><p><strong>Horário:</strong></p><p>${strategyState.scheduleStart} - ${strategyState.scheduleEnd}</p></div>
    `;
    return;
  }

  const def = INDICADORES[ind.tipo];
  const paramsTxt = def.campos
    .map(c => `${c.label.replace(/\s*\(.*\)/, '')}: <strong>${ind.params[c.key]}</strong>`)
    .join(' · ');

  document.getElementById('review-content').innerHTML = `
    <div style="margin-bottom: 16px;">
      <p style="margin-bottom: 8px;"><strong>📈 ${def.nome}</strong></p>
      <p style="color: var(--text-secondary); font-size: 14px;">${paramsTxt}</p>
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 14px; margin-bottom: 16px;">
      <div><p><strong>Timeframe:</strong></p><p>${strategyState.timeframe}</p></div>
      <div><p><strong>Par:</strong></p><p><code style="background: rgba(99,102,241,0.1); padding: 4px 8px; border-radius: 4px;">${strategyState.pair}</code></p></div>
    </div>
    <div style="font-size: 14px;"><p><strong>Horário:</strong></p><p>${strategyState.scheduleStart} - ${strategyState.scheduleEnd}</p></div>
  `;
}

// ── TESTAR CONTRA API ──
const API_URL = 'https://api.binaryzando.com';

function testStrategy() {
  if (!strategyState.pair) {
    showToast('⚠️ Erro', 'Volte e selecione um par.', 'default');
    return;
  }

  // Estado de carregando no botão
  const btn = document.getElementById('btn-test-strategy');
  const textoOriginal = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:middle;"></span> Testando contra velas.db...';

  // Momento da revelação: abre o suspense (suspense + flip + confete vivem no
  // bloco "REVELAÇÃO" no fim deste arquivo). O backtest roda por baixo; o
  // resultado só aparece depois do tempo mínimo de suspense (fecharSuspense).
  mostrarSuspense();

  const emojiParaNum = (c) => (c === '🟩' ? 1 : c === '🟥' ? -1 : null);
  let payload;

  if (strategyState.mode === 'figura') {
    payload = {
      mode: 'figura',
      figura: strategyState.fig.tipo,
      timeframe: strategyState.timeframe,
      pair: strategyState.pair,
      schedule_start: strategyState.scheduleStart,
      schedule_end: strategyState.scheduleEnd,
    };
  } else if (strategyState.mode === 'indicador' && strategyState.ind.tipo === 'montador') {
    const m = strategyState.mont;
    payload = {
      mode: 'montador',
      condicoes: m.condicoes,
      combinador: m.combinador,
      direcao: m.direcao,
      timeframe: strategyState.timeframe,
      pair: strategyState.pair,
      schedule_start: strategyState.scheduleStart,
      schedule_end: strategyState.scheduleEnd,
    };
  } else if (strategyState.mode === 'indicador') {
    const ind = strategyState.ind;
    payload = {
      mode: 'indicador',
      indicador: ind.tipo,
      params: ind.params,
      timeframe: strategyState.timeframe,
      pair: strategyState.pair,
      schedule_start: strategyState.scheduleStart,
      schedule_end: strategyState.scheduleEnd,
    };
  } else if (strategyState.mode === 'quadrante' && strategyState.q.tipo === 'confluencia') {
    const conf = strategyState.q.conf;
    payload = {
      mode: 'confluencia',
      nome: conf.nome,
      spec_a: conf.specA,
      spec_b: conf.specB,
      tf_entrada: strategyState.timeframe,
      pair: strategyState.pair,
      schedule_start: strategyState.scheduleStart,
      schedule_end: strategyState.scheduleEnd,
    };
  } else if (strategyState.mode === 'quadrante' && strategyState.q.tipo === 'referencia') {
    const ref = strategyState.q.ref;
    payload = {
      mode: 'referencia',
      nome: ref.nome,
      bloco_velas: ref.blocoVelas,
      ref_pos: ref.refPos,
      entry_pos: ref.entryPos,
      relacao: ref.relacao,
      ref_bloco: ref.refBloco,
      cond_posicoes: ref.condPosicoes,
      tf_entrada: strategyState.timeframe,
      pair: strategyState.pair,
      schedule_start: strategyState.scheduleStart,
      schedule_end: strategyState.scheduleEnd,
    };
  } else if (strategyState.mode === 'quadrante') {
    const q = strategyState.q;
    payload = {
      mode: 'quadrante',
      tf_entrada: strategyState.timeframe,
      bloco: q.bloco,
      analise_modo: q.analiseModo,
      analise_padrao: q.analiseModo === 'editar' ? q.analisePadrao.map(emojiParaNum) : null,
      posicoes_analise: q.analiseModo === 'contar' ? q.posicoes : null,
      entrada_modo: q.entradaModo,
      entrada_pos: q.entradaPos,
      pair: strategyState.pair,
      schedule_start: strategyState.scheduleStart,
      schedule_end: strategyState.scheduleEnd,
    };
  } else {
    payload = {
      pattern: strategyState.pattern.map(emojiParaNum),
      anchoring: strategyState.anchoring, // 'exato' ou 'minimo'
      direction: strategyState.direction, // 'call', 'put' ou 'both'
      mirror: strategyState.mirror,
      mirror_direction: strategyState.mirrorDirection,
      timeframe: strategyState.timeframe,
      pair: strategyState.pair,
      schedule_start: strategyState.scheduleStart,
      schedule_end: strategyState.scheduleEnd,
      periodo_modo: strategyState.periodoModo,
      data_de: strategyState.periodoDataDe,
      data_ate: strategyState.periodoDataAte,
      dias_semana: getDiasSemanaSelecionados(),
      timezone: typeof getFusoHorario === 'function' ? getFusoHorario() : null,
    };
  }

  // Guarda o payload exato desse teste — é o que o botão "Otimizar" reenvia
  // (com um recorte de dias da semana) quando o resultado fica perto de subir.
  strategyState.lastPayload = payload;
  strategyState.jaOtimizado = false;

  callBacktestAPI(payload, btn, textoOriginal);
}

function callBacktestAPI(payload, btn, textoOriginal) {
  fetch(`${API_URL}/api/test-build`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
    .then(response => response.json().then(data => ({ ok: response.ok, data })))
    .then(({ ok, data }) => {
      if (ok && data.success) {
        // Espera o suspense terminar antes de revelar — o momento é o produto.
        fecharSuspense(() => renderResult(data.resultado));
      } else {
        fecharSuspense(() => showToast('⚠️ Backtest falhou', data.message || 'Tente novamente.', 'default'));
      }
    })
    .catch(error => {
      console.error('Erro na API:', error);
      fecharSuspense(() => showToast('❌ API offline', 'Inicie o backtest_api.py (clique em start_api.bat) e tente de novo.', 'default'));
    })
    .finally(() => {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = textoOriginal;
      }
    });
}

// ── BOTÃO "OTIMIZAR" (quase-lendária) ──
// Reenvia o payload do último teste pro back-end achar um recorte de dias da
// semana que melhora o resultado, removendo os mais fracos. Não sorteia nada
// novo: só reagrupa as operações que já aconteceram no teste original.
function otimizarBuild() {
  if (!strategyState.lastPayload) return;
  const btn = document.getElementById('btn-otimizar-build');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;border-width:2px;display:inline-block;vertical-align:middle;"></span> Otimizando...';
  }

  fetch(`${API_URL}/api/otimizar-build`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(strategyState.lastPayload),
  })
    .then(response => response.json().then(data => ({ ok: response.ok, data })))
    .then(({ ok, data }) => {
      if (!ok || !data.success) {
        showToast('⚠️ Não foi possível otimizar', (data && data.message) || 'Tente novamente.', 'default');
        return;
      }
      if (!data.otimizado) {
        showToast('🔍 Sem recorte melhor', data.message || 'Não achamos uma combinação de dias que melhore esse resultado.', 'default');
        return;
      }
      aplicarResultadoOtimizado(data.resultado, data.antes, data.dias_removidos_texto || []);
    })
    .catch(() => showToast('❌ API offline', 'Não consegui falar com o servidor agora.', 'default'))
    .finally(() => {
      const b = document.getElementById('btn-otimizar-build');
      if (b) { b.disabled = false; b.innerHTML = '⚙️ Otimizar'; }
    });
}

// Aplica o resultado otimizado na tela: atualiza o filtro de dias da semana
// (pra "Salvar" e qualquer novo teste já saírem com o recorte achado),
// re-renderiza a carta com os novos números e mostra o "antes × depois".
function aplicarResultadoOtimizado(r, antes, diasRemovidosTexto) {
  strategyState.jaOtimizado = true;
  aplicarDiasSemanaUI(r.dias_semana_otimizados);

  renderResult(r); // já guarda lastResult, dispara confete proporcional à raridade, etc.

  const melhorou = r.rarity !== antes.rarity || r.grade !== antes.grade;
  const cor = melhorou ? 'var(--rarity-legendary)' : 'var(--success)';
  const banner = document.createElement('div');
  banner.style.cssText = `max-width:620px;margin:0 auto 16px;padding:14px 18px;border-radius:10px;` +
    `background:rgba(34,197,94,.08);border:1px solid ${cor};font-size:13px;line-height:1.6;`;
  banner.innerHTML = `
    <div style="font-weight:700;margin-bottom:6px;">
      ⚙️ Otimizado: ${antes.winrate}% (${antes.grade}) → <span style="color:${cor};">${r.winrate}% (${r.grade})</span>
    </div>
    <div style="color:var(--text-secondary);">Removemos: ${diasRemovidosTexto.join(' · ')}</div>
  `;
  const container = document.getElementById('test-result');
  if (container) container.insertBefore(banner, container.firstChild);

  showToast('⚙️ Otimizado!', `Sua build melhorou pra ${r.winrate}% (${r.grade}) removendo os dias mais fracos da semana.`, 'discovery');
}

// renderConfidenceBar() agora vive em inventario.js (carregado antes deste
// arquivo) — a carta também precisa dela, não só este painel de resultado.

// Devolve a tela de revisão ao estado "ainda não testei": mostra o botão
// Testar e o Voltar-de-passo, esconde os botões pós-teste e limpa o resultado
// anterior. Chamado toda vez que se entra na revisão (goToPhase('review')).
function resetPostTestButtons() {
  const mostra = (id, on) => {
    const el = document.getElementById(id);
    if (el) el.style.display = on ? 'inline-flex' : 'none';
  };
  mostra('btn-test-strategy', true);
  mostra('btn-review-voltar', true);
  // "Sortear Cenário" DESATIVADO temporariamente (pedido do Diego) — mantido
  // oculto. Pra reativar: voltar pra `true` aqui e no bloco de renderResult.
  mostra('btn-sortear-cenario', false);
  mostra('btn-salvar-estrategia', false);
  mostra('btn-salvar-historico', false);
  mostra('btn-nova-estrategia', false);
  mostra('btn-ver-inventario', false);
  const tr = document.getElementById('test-result');
  if (tr) { tr.style.display = 'none'; tr.innerHTML = ''; }
  const sf = document.getElementById('save-form');
  if (sf) sf.style.display = 'none';
}

// ── RENDERIZAR RESULTADO DO BACKTEST ──
function renderResult(r) {
  const rarityLabel = {
    common: 'Comum', rare: 'Rara', epic: 'Épica', legendary: 'Lendária',
  };
  const rarityColor = {
    common: 'var(--text-secondary)', rare: 'var(--rarity-rare)',
    epic: 'var(--rarity-epic)', legendary: 'var(--rarity-legendary)',
  };
  const cor = rarityColor[r.rarity] || 'var(--text-secondary)';

  // winrate vs breakeven (~53.5% para payout 87%)
  const acima = r.winrate >= 53.5;
  const corWinrate = acima ? 'var(--success)' : 'var(--danger)';

  const insightsHTML = (r.insights || [])
    .map(i => `<li style="margin-bottom:6px;">${i}</li>`).join('');

  // Comparação "antes × agora": só aparece quando o usuário está TESTANDO uma
  // estratégia que já existe no inventário (aba Testar). Mostra se o desempenho
  // melhorou ou piorou em relação ao teste original da carta.
  let comparacaoHTML = '';
  if (strategyState.testandoExistente) {
    const origem = getInventario().find(e => e.id === strategyState.testandoExistente.origemId);
    if (origem && origem.teste) {
      const ot = origem.teste;
      const dW = Math.round((r.winrate - ot.winrate) * 100) / 100;
      const c = dW > 0 ? 'var(--success)' : dW < 0 ? 'var(--danger)' : 'var(--text-secondary)';
      const txt = dW > 0 ? `▲ Melhorou +${dW}%` : dW < 0 ? `▼ Piorou ${dW}%` : '= Igual';
      comparacaoHTML = `
        <div style="border:1px solid ${c}; border-radius:12px; padding:18px; margin-bottom:18px; background:rgba(99,102,241,0.04);">
          <div style="font-weight:700; margin-bottom:12px;">📊 Comparação com a original "${origem.nome}"</div>
          <div style="display:grid; grid-template-columns:1fr auto 1fr; gap:12px; align-items:center; text-align:center;">
            <div>
              <div style="font-size:11px; color:var(--text-secondary); text-transform:uppercase;">Antes</div>
              <div style="font-size:24px; font-weight:800;">${ot.winrate}%</div>
              <div style="font-size:11px; color:var(--text-secondary);">${(ot.entries || 0).toLocaleString('pt-BR')} ops</div>
            </div>
            <div style="font-size:22px; color:var(--text-secondary);">➜</div>
            <div>
              <div style="font-size:11px; color:var(--text-secondary); text-transform:uppercase;">Agora</div>
              <div style="font-size:24px; font-weight:800; color:${c};">${r.winrate}%</div>
              <div style="font-size:11px; color:var(--text-secondary);">${r.entries.toLocaleString('pt-BR')} ops</div>
            </div>
          </div>
          <div style="text-align:center; margin-top:12px; font-weight:800; color:${c};">${txt}</div>
        </div>`;
    }
  }

  const html = `
    ${comparacaoHTML}
    <div style="border:2px solid ${cor}; border-radius:12px; padding:24px; background:rgba(99,102,241,0.04);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
        <div>
          <div style="font-size:12px; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em;">Resultado do Backtest</div>
          <div style="font-size:20px; font-weight:700;">${r.pair} · ${r.timeframe}</div>
        </div>
        <div style="text-align:center;">
          <div style="display:inline-block; padding:4px 16px; border-radius:999px; background:${cor}; color:#fff; font-size:12px; font-weight:700;">${rarityLabel[r.rarity] || 'Comum'}</div>
          <div style="font-size:40px; font-weight:900; color:${cor}; line-height:1;">${r.grade}</div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(110px, 1fr)); gap:16px; margin-bottom:20px;">
        <div style="text-align:center; padding:12px; background:var(--bg); border-radius:8px;">
          <div style="font-size:26px; font-weight:800; color:${corWinrate};">${r.winrate}%</div>
          <div style="font-size:11px; color:var(--text-secondary);">Taxa de Acerto</div>
        </div>
        <div style="text-align:center; padding:12px; background:var(--bg); border-radius:8px;">
          <div style="font-size:26px; font-weight:800;">${r.entries.toLocaleString('pt-BR')}</div>
          <div style="font-size:11px; color:var(--text-secondary);">Operações</div>
        </div>
        <div style="text-align:center; padding:12px; background:var(--bg); border-radius:8px;">
          <div style="font-size:26px; font-weight:800; color:var(--success);">${r.wins.toLocaleString('pt-BR')}</div>
          <div style="font-size:11px; color:var(--text-secondary);">Ganhos</div>
        </div>
        <div style="text-align:center; padding:12px; background:var(--bg); border-radius:8px;">
          <div style="font-size:26px; font-weight:800; color:var(--danger);">${r.losses.toLocaleString('pt-BR')}</div>
          <div style="font-size:11px; color:var(--text-secondary);">Perdas</div>
        </div>
      </div>

      <div style="margin-bottom:20px; padding:14px 16px; background:var(--bg); border-radius:8px;">
        ${renderConfidenceBar(r.entries)}
      </div>

      <div style="font-size:13px; color:var(--text-secondary); margin-bottom:16px; padding:12px; background:var(--bg); border-radius:8px;">
        📅 Período testado: <strong>${r.periodo_de}</strong> até <strong>${r.periodo_ate}</strong>
        &nbsp;·&nbsp; ${r.velas_usadas.toLocaleString('pt-BR')} velas reais analisadas
      </div>

      <div style="padding:16px; background:rgba(99,102,241,0.06); border-radius:8px; border-left:3px solid ${cor};">
        <div style="font-weight:600; margin-bottom:8px;">📊 Análise</div>
        <ul style="list-style:none; padding:0; margin:0; font-size:13px;">${insightsHTML}</ul>
      </div>
    </div>
    ${montarPainelSimulacaoHTML(r)}
  `;

  // Guarda o último resultado para poder salvar junto com a estratégia
  strategyState.lastResult = r;

  const container = document.getElementById('test-result');
  container.innerHTML = montarHeroReveal(r) + html;
  container.style.display = 'block';
  dispararConfete(r.rarity);
  tocarRevelacao(r.rarity);
  strategyState.cenarioSorteado = null; // consumido na revelação

  // "Sortear Cenário" DESATIVADO temporariamente (pedido do Diego) — mantido
  // oculto pós-teste também. Pra reativar: restaurar o bloco abaixo.
  // const btnSorteia = document.getElementById('btn-sortear-cenario');
  // if (btnSorteia) { btnSorteia.style.display = 'inline-flex'; btnSorteia.innerHTML = '🎲 Sortear de Novo'; }
  const btnSorteia = document.getElementById('btn-sortear-cenario');
  if (btnSorteia) btnSorteia.style.display = 'none';

  // Já testou: o botão "Testar" e o "Voltar" de passo não fazem mais sentido aqui.
  const btnTestar = document.getElementById('btn-test-strategy');
  if (btnTestar) btnTestar.style.display = 'none';
  const btnVoltarPasso = document.getElementById('btn-review-voltar');
  if (btnVoltarPasso) btnVoltarPasso.style.display = 'none';

  // Mostra o botão de salvar agora que há um resultado real (resultado novo
  // = ainda não foi salvo, então esconde o "Ver no Inventário" de uma
  // eventual carta salva anterior nesta mesma sessão).
  const btnSalvar = document.getElementById('btn-salvar-estrategia');
  if (btnSalvar) btnSalvar.style.display = 'inline-flex';
  const btnVerInv = document.getElementById('btn-ver-inventario');
  if (btnVerInv) btnVerInv.style.display = 'none';

  // O 3º botão muda conforme o contexto:
  //  - Testando uma estratégia existente  -> "Voltar" pra lista de Testar
  //    (NUNCA "Criar nova do zero" — isso é coisa da aba Criar).
  //  - Criando do zero                     -> "Criar Nova Estratégia".
  const btnNova = document.getElementById('btn-nova-estrategia');
  if (btnNova) {
    btnNova.style.display = 'inline-flex';
    if (strategyState.testandoExistente) {
      btnNova.innerHTML = '↩ Voltar';
      btnNova.onclick = () => trocarAbaLab('testar-estrategia');
    } else {
      btnNova.innerHTML = '🔄 Criar Nova Estratégia';
      btnNova.onclick = () => resetStrategy();
    }
  }

  // Histórico (sequência real W/L) só existe quando o backtest devolveu uma —
  // não acontece com o espelho ativado, por exemplo (mistura duas ordens cronológicas).
  const btnHistorico = document.getElementById('btn-salvar-historico');
  if (btnHistorico) btnHistorico.style.display = (Array.isArray(r.sequencia) && r.sequencia.length) ? 'inline-flex' : 'none';

  container.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ── SALVAR HISTÓRICO (direto do teste, sem precisar salvar a estratégia) ──
// Cobre o caso de "testar estratégia" (nova ou já existente) quando o usuário
// só quer o histórico de entradas pra testar um Gerenciamento — sem criar
// outra carta duplicada no inventário.
function salvarHistoricoDoTeste() {
  const r = strategyState.lastResult;
  if (!r || !Array.isArray(r.sequencia) || !r.sequencia.length) {
    showToast('⚠️ Sem sequência', 'Esse teste não gerou uma sequência cronológica utilizável.', 'default');
    return;
  }

  const nome = `${strategyState.testandoExistente ? strategyState.testandoExistente.origemNome : r.pair} · ${r.timeframe} (${new Date().toLocaleDateString('pt-BR')})`;

  const historicos = getHistoricos();
  historicos.push({
    id: 'hist_' + Date.now(),
    nome,
    origem: 'estrategia',
    estrategiaId: strategyState.testandoExistente ? strategyState.testandoExistente.origemId : null,
    pair: r.pair,
    timeframe: r.timeframe,
    winrate: r.winrate,
    entries: r.entries,
    periodoDe: r.periodo_de,
    periodoAte: r.periodo_ate,
    velasUsadas: r.velas_usadas,
    sequencia: r.sequencia,
    sequencia_rica: r.sequencia_rica || null,
    criadoEm: new Date().toISOString(),
  });
  if (!salvarHistoricos(historicos)) return;

  showToast('✅ Histórico salvo', `"${nome}" tem ${r.sequencia.length} entradas reais — já disponível em Criar Gerenciamento e no Inventário.`, 'discovery');
}

// ── CRIAR NOVA ESTRATÉGIA (recomeçar do zero) ──
function resetStrategy() {
  // Zera todo o estado
  strategyState = {
    mode: 'pintar',
    timeframe: 'M1',
    patternLength: null,
    pattern: [],
    direction: null,
    anchoring: null,
    mirror: false,
    mirrorChosen: false,
    mirrorDirection: null,
    testandoExistente: null,
    pairFilter: 'otc',
    pair: null,
    scheduleStart: '00:00',
    scheduleEnd: '23:59',
    q: {
      tipo: 'quadrante', ref: null,
      approach: null, presetNome: null, bloco: 'M5',
      analiseModo: 'contar', analisePadrao: [], posicoes: null, posicoesLabel: 'todas',
      entradaModo: 'minoria', entradaPos: 0, entradaCor: 1,
    },
    ind: { tipo: null, params: {} },
    fig: { tipo: null },
  };

  // Esconde sub-áreas do quadrante e a lista de presets
  ['q-presets-list', 'q-posicoes-area', 'q-paint-area'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  // Esconde e limpa o resultado do backtest
  const container = document.getElementById('test-result');
  if (container) {
    container.style.display = 'none';
    container.innerHTML = '';
  }
  const btnNova = document.getElementById('btn-nova-estrategia');
  if (btnNova) btnNova.style.display = 'none';
  const btnSalvar = document.getElementById('btn-salvar-estrategia');
  if (btnSalvar) btnSalvar.style.display = 'none';
  const btnHistorico = document.getElementById('btn-salvar-historico');
  if (btnHistorico) btnHistorico.style.display = 'none';

  // Esconde o formulário de salvar (caso esteja aberto)
  const saveForm = document.getElementById('save-form');
  if (saveForm) saveForm.style.display = 'none';

  // Reseta a fase 1 (esconde o padrão e o input customizado)
  const wrapper = document.getElementById('pattern-container-wrapper');
  if (wrapper) wrapper.style.display = 'none';
  const custom = document.getElementById('custom-input-container');
  if (custom) custom.style.display = 'none';

  // Reseta seleções visuais (direção, ancoragem, espelho, par)
  document.querySelectorAll('.direction-btn.selected, .anchoring-card.selected')
    .forEach(el => el.classList.remove('selected'));
  const mirrorDir = document.getElementById('mirror-direction-container');
  if (mirrorDir) mirrorDir.style.display = 'none';
  const busca = document.getElementById('pair-search');
  if (busca) busca.value = '';

  // Reseta os horários
  const inicio = document.getElementById('schedule-start');
  if (inicio) inicio.value = '00:00';
  const fim = document.getElementById('schedule-end');
  if (fim) fim.value = '23:59';

  // Reseta o filtro de dias da semana (volta a operar todos) e o atalho de período
  resetDiasSemanaUI();
  limparAtalhosPeriodo('schedule');

  // Atualiza o preview do espelho (vazio) e volta para a aba "Criar Estratégia"
  updateMirrorPreview();
  const tabCriar = document.getElementById('lab-tab-criar');
  const tabExistente = document.getElementById('lab-tab-existente');
  if (tabCriar) tabCriar.classList.add('active');
  if (tabExistente) tabExistente.classList.remove('active');
  goToPhase('timeframe');

  showToast('🆕 Nova estratégia', 'Tudo limpo. Escolha como montar a próxima!', 'default');
}

// ── SALVAR ESTRATÉGIA (vai para o Inventário do usuário) ──
// Armazenamento, cálculo de período/entradas-por-dia e renderização de
// carta moram em js/inventario.js (compartilhado com a página Inventário).

// Quando o usuário escolheu "OS DOIS (CALL + PUT)", o backend testou os dois
// lados e devolveu o vencedor. Aqui descobrimos qual foi pra salvar SÓ ele —
// nunca 'both' (carta não é "tanto faz"). Usa direcao_final do backend novo e,
// como reforço (se o backend ainda for o antigo), lê dos insights.
function direcaoVencedoraDoResultado(r) {
  if (!r) return null;
  if (r.direcao_final === 'call' || r.direcao_final === 'put') return r.direcao_final;
  const txt = (r.insights || []).join(' ').toUpperCase();
  if (txt.includes('MELHOR COMO CALL')) return 'call';
  if (txt.includes('MELHOR COMO PUT')) return 'put';
  return null;
}

function snapshotDefinicao() {
  const s = strategyState;
  if (s.mode === 'pintar') {
    let direction = s.direction;
    if (direction === 'both') {
      direction = direcaoVencedoraDoResultado(s.lastResult) || 'call';
    }
    return {
      pattern: [...s.pattern], direction, anchoring: s.anchoring, mirror: s.mirror,
      mirrorDirection: s.mirrorDirection,
      // recorte de dias da semana (ex.: o que o botão "Otimizar" achou) — sem
      // isso, reproduzir/testar de novo essa estratégia ignorava o corte e
      // sempre voltava a testar todos os dias.
      diasSemana: getDiasSemanaSelecionados(),
    };
  }
  if (s.mode === 'quadrante') {
    return { q: JSON.parse(JSON.stringify(s.q)) };
  }
  if (s.mode === 'indicador') {
    return { ind: JSON.parse(JSON.stringify(s.ind)), mont: s.mont ? JSON.parse(JSON.stringify(s.mont)) : null };
  }
  if (s.mode === 'figura') {
    return { fig: { ...s.fig } };
  }
  return {};
}

function showSaveForm() {
  // Validações específicas do modo "pintar" (os outros modos já são
  // validados pela navegação entre fases antes de chegar na revisão).
  if (strategyState.mode === 'pintar') {
    if (!strategyState.pattern || strategyState.pattern.length === 0) {
      showToast('⚠️ Nada para salvar', 'Monte um padrão antes de salvar.', 'default');
      return;
    }
    if (!strategyState.direction || !strategyState.anchoring) {
      showToast('⚠️ Estratégia incompleta', 'Defina a direção e a ancoragem antes de salvar.', 'default');
      return;
    }
  }

  // Precisa do resultado real do backtest: é ele que vai junto pro inventário
  // (par, horário, período testado, winrate, entradas/dia).
  if (!strategyState.lastResult) {
    showToast('⚠️ Teste antes de salvar', 'Rode o backtest primeiro — o inventário guarda o resultado real.', 'default');
    return;
  }

  const form = document.getElementById('save-form');
  form.style.display = 'block';
  const input = document.getElementById('strategy-name');
  input.value = '';
  input.focus();
  form.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function cancelSaveStrategy() {
  document.getElementById('save-form').style.display = 'none';
}

function confirmSaveStrategy() {
  const input = document.getElementById('strategy-name');
  const nome = input.value.trim();

  if (!nome) {
    showToast('⚠️ Nome obrigatório', 'Digite um nome para a estratégia.', 'default');
    input.focus();
    return;
  }

  const lista = getInventario();

  // Evita nomes duplicados (itens na lixeira não contam — já não existem de fato)
  if (lista.some(e => !e.deletadoEm && e.nome.toLowerCase() === nome.toLowerCase())) {
    showToast('⚠️ Nome já existe', 'Você já tem uma estratégia com esse nome no inventário.', 'default');
    input.focus();
    return;
  }

  const r = strategyState.lastResult;
  const dias = diasEntrePeriodo(r.periodo_de, r.periodo_ate);

  // Linhagem: se veio da aba "Testar Estratégia", essa carta é filha da original.
  // deltaWinrate compara o desempenho com o da carta-mãe (seta pra cima/baixo na exibição).
  let linhagem = { origemId: null, origemNome: null, geracao: 0, deltaWinrate: null };
  if (strategyState.testandoExistente) {
    const origem = lista.find(e => e.id === strategyState.testandoExistente.origemId);
    linhagem = {
      origemId: strategyState.testandoExistente.origemId,
      origemNome: strategyState.testandoExistente.origemNome,
      geracao: (origem?.linhagem?.geracao || 0) + 1,
      deltaWinrate: origem ? Math.round((r.winrate - origem.teste.winrate) * 100) / 100 : null,
    };
  }

  const item = {
    id: 'est_' + Date.now(),
    nome: nome,
    mode: strategyState.mode,
    definicao: snapshotDefinicao(),
    criadaEm: new Date().toISOString(),
    linhagem: linhagem,
    teste: {
      pair: r.pair,
      timeframe: r.timeframe,
      // valor puro M1/M5/M15 (timeframe pode vir como rótulo composto pro
      // quadrante, ex: "M1 · quadrante M5" — esse aqui é sempre limpo)
      timeframeOperado: strategyState.timeframe,
      scheduleStart: strategyState.scheduleStart,
      scheduleEnd: strategyState.scheduleEnd,
      winrate: r.winrate,
      grade: r.grade,
      rarity: r.rarity,
      entries: r.entries,
      wins: r.wins,
      losses: r.losses,
      periodoDe: r.periodo_de,
      periodoAte: r.periodo_ate,
      diasTestados: dias,
      entradasPorDia: dias ? Math.max(1, Math.round(r.entries / dias)) : null,
      velasUsadas: r.velas_usadas,
    },
    carta: criarMetaCarta(),
  };

  lista.push(item);
  // Se o navegador bloqueou o armazenamento local (modo privado, sem espaço),
  // salvarInventario já avisou o motivo — não segue pra mostrar "Carta
  // criada!" sobre uma carta que na verdade não foi salva em lugar nenhum.
  if (!salvarInventario(lista)) return;

  // Toda estratégia salva já nasce com seu histórico de backtest (a sequência
  // real de W/L do teste que acabou de rodar). É esse histórico que habilita a
  // criação de Gerenciamentos. Sem sequência (ex.: espelho ativado), não dá.
  if (Array.isArray(r.sequencia) && r.sequencia.length) {
    const historicos = getHistoricos();
    historicos.push({
      id: 'hist_' + Date.now(),
      nome: `${nome} (histórico)`,
      origem: 'estrategia',
      estrategiaId: item.id,
      pair: r.pair,
      timeframe: r.timeframe,
      winrate: r.winrate,
      entries: r.entries,
      periodoDe: r.periodo_de,
      periodoAte: r.periodo_ate,
      velasUsadas: r.velas_usadas,
      sequencia: r.sequencia,
      criadoEm: new Date().toISOString(),
    });
    salvarHistoricos(historicos);
  }

  document.getElementById('save-form').style.display = 'none';

  // Já salvou — some com os botões que não fazem mais sentido pra ESSE
  // resultado (salvar de novo criaria carta/histórico duplicado) e dá um
  // caminho claro de saída em vez de deixar a tela igual a antes de salvar.
  const btnSalvar = document.getElementById('btn-salvar-estrategia');
  if (btnSalvar) btnSalvar.style.display = 'none';
  const btnHistorico = document.getElementById('btn-salvar-historico');
  if (btnHistorico) btnHistorico.style.display = 'none';
  const btnVerInv = document.getElementById('btn-ver-inventario');
  if (btnVerInv) btnVerInv.style.display = 'inline-flex';

  if (linhagem.origemId) {
    const sinal = linhagem.deltaWinrate > 0 ? '▲ melhor' : linhagem.deltaWinrate < 0 ? '▼ pior' : '= igual';
    showToast('🃏 Carta criada!', `"${nome}" é a carta #${String(item.carta.numero).padStart(3, '0')}, filha de "${linhagem.origemNome}" (geração ${linhagem.geracao}) — desempenho ${sinal} (${linhagem.deltaWinrate > 0 ? '+' : ''}${linhagem.deltaWinrate}%).`, 'discovery');
  } else {
    showToast('🃏 Carta criada!', `"${nome}" agora é a carta #${String(item.carta.numero).padStart(3, '0')} do seu inventário.`, 'discovery');
  }
  avisarShinySeAplicavel(item);
  avisarGenesisSeAplicavel(item);
}

// ════════════════════════════════════════════════
// MODO QUADRANTE
// ════════════════════════════════════════════════
const Q_CORES = ['⬜', '🟩', '🟥'];

function velasPorBloco() {
  const tf = strategyState.timeframe || 'M1';
  return Q_BLOCO_SEG[strategyState.q.bloco] / Q_TF_SEG[tf];
}

// ── ABAS: CRIAR NOVA × TESTAR EXISTENTE × CATALOGAR ──
// Grupo de alto nível: "criar", "testar" ou "catalogador". Criar/Testar têm
// suas 3 sub-abas (Estratégia / Gerenciamento / Build) — ver trocarAbaLab().
// Catalogador não tem sub-aba — é uma fase única (movida de catalogador.html).
function trocarGrupoLab(grupo) {
  document.getElementById('lab-grupo-criar').classList.toggle('active', grupo === 'criar');
  document.getElementById('lab-grupo-testar').classList.toggle('active', grupo === 'testar');
  document.getElementById('lab-grupo-catalogador')?.classList.toggle('active', grupo === 'catalogador');
  document.getElementById('lab-grupo-refinar')?.classList.toggle('active', grupo === 'refinar');
  document.getElementById('lab-grupo-simulacao')?.classList.toggle('active', grupo === 'simulacao');
  document.getElementById('lab-grupo-personalizar')?.classList.toggle('active', grupo === 'personalizar');
  document.getElementById('lab-subtabs-criar').style.display = grupo === 'criar' ? 'flex' : 'none';
  document.getElementById('lab-subtabs-testar').style.display = grupo === 'testar' ? 'flex' : 'none';

  if (grupo === 'catalogador') {
    goToPhase('catalogador');
    if (typeof carregarCatalogador === 'function') carregarCatalogador();
    return;
  }
  if (grupo === 'refinar') {
    goToPhase('refinar');
    if (typeof renderRefinarEstrategias === 'function') renderRefinarEstrategias();
    return;
  }
  if (grupo === 'simulacao') {
    goToPhase('simulacao');
    if (typeof renderSimulacaoFinanceira === 'function') renderSimulacaoFinanceira();
    return;
  }
  if (grupo === 'personalizar') {
    goToPhase('personalizar');
    if (typeof renderPersonalizarCartas === 'function') renderPersonalizarCartas();
    if (typeof renderPersonalizarEmblemas === 'function') renderPersonalizarEmblemas();
    return;
  }
  trocarAbaLab(grupo === 'criar' ? 'criar-estrategia' : 'testar-estrategia');
}

// ── PERSONALIZAR (nome e imagem da carta) ──
const personalizarState = { cartaId: null };

function renderPersonalizarCartas() {
  const cont = document.getElementById('personalizar-cartas');
  if (!cont) return;
  const cartas = getInventario().filter(e => !e.deletadoEm && !e.arquivadoEm && e.carta);
  if (personalizarState.cartaId && !cartas.find(e => e.id === personalizarState.cartaId)) {
    personalizarState.cartaId = null;
  }
  cont.innerHTML = cartas.length
    ? cartas.slice().sort((a, b) => a.carta.numero - b.carta.numero)
        .map(e => renderBuildCardPick(e, personalizarState.cartaId === e.id, 'setPersonalizarCarta')).join('')
    : '<p class="ger-empty">Nenhuma carta no inventário ainda. Teste uma estratégia em "Criar" pra ganhar sua primeira.</p>';

  const form = document.getElementById('personalizar-form');
  if (form) form.style.display = personalizarState.cartaId ? 'block' : 'none';
}

function setPersonalizarCarta(id) {
  personalizarState.cartaId = id;
  const item = getInventario().find(e => e.id === id);
  const input = document.getElementById('personalizar-nome');
  if (input) input.value = item?.nome || '';
  renderPersonalizarCartas();
  renderPersonalizarEmblemas();
}

// ── PERSONALIZAR · brasão de fundo (emblema de título conquistado) ──
function renderPersonalizarEmblemas() {
  const cont = document.getElementById('personalizar-emblemas');
  if (!cont) return;
  const item = getInventario().find(e => e.id === personalizarState.cartaId);
  if (!item || typeof TITULOS_DEFS === 'undefined') { cont.innerHTML = ''; return; }

  const desbloqueados = typeof atualizarTitulosDesbloqueados === 'function' ? atualizarTitulosDesbloqueados() : {};
  const emblemaAtual = item.personalizacao?.emblema || null;

  const nenhumCard = `
    <div class="titulo-card titulo-desbloqueado${!emblemaAtual ? ' titulo-ativo' : ''}" onclick="selecionarEmblemaPersonalizar(null)">
      <div class="titulo-emblema-wrap">🚫</div>
      <div class="titulo-card-nome">Nenhum</div>
      <div class="titulo-card-criterio">Só a peça de xadrez padrão</div>
      ${!emblemaAtual ? '<div class="titulo-card-badge-ativo">✓ Ativo</div>' : ''}
    </div>
  `;

  const cards = TITULOS_DEFS.map((def) => {
    const desbloqueado = !!desbloqueados[def.id];
    const ativo = emblemaAtual === def.id;
    if (!desbloqueado) {
      return `
        <div class="titulo-card titulo-bloqueado" title="${def.criterioTexto}">
          <div class="titulo-emblema-wrap">${renderEmblemaSVG(def.icone, '#4a4a55', 40)}</div>
          <div class="titulo-card-nome">${def.nome}</div>
          <div class="titulo-card-criterio">🔒 ${def.criterioTexto}</div>
        </div>
      `;
    }
    return `
      <div class="titulo-card titulo-desbloqueado${ativo ? ' titulo-ativo' : ''}" style="--titulo-cor:${def.cor}" onclick="selecionarEmblemaPersonalizar('${def.id}')">
        <div class="titulo-emblema-wrap">${renderEmblemaSVG(def.icone, def.cor, 40)}</div>
        <div class="titulo-card-nome" style="color:${def.cor}">${def.nome}</div>
        <div class="titulo-card-criterio">${desbloqueados[def.id].detalhe || ''}</div>
        ${ativo ? '<div class="titulo-card-badge-ativo">✓ Ativo</div>' : ''}
      </div>
    `;
  }).join('');

  cont.innerHTML = nenhumCard + cards;
}

function selecionarEmblemaPersonalizar(emblemaId) {
  if (!personalizarState.cartaId) return;
  const r = definirEmblemaCarta(personalizarState.cartaId, emblemaId);
  if (!r.ok) {
    showToast('⚠️ Não foi possível aplicar', 'Esse título ainda não foi conquistado.', 'default');
    return;
  }
  showToast(emblemaId ? '✅ Brasão aplicado!' : '✅ Brasão removido', 'Confira sua carta no Inventário.', 'success');
  renderPersonalizarEmblemas();
}

function salvarNomePersonalizar() {
  if (!personalizarState.cartaId) return;
  const novoNome = document.getElementById('personalizar-nome')?.value || '';
  const r = renomearCarta(personalizarState.cartaId, novoNome);
  if (!r.ok) {
    const msgs = {
      vazio: 'Digite um nome pra carta.',
      duplicado: 'Você já tem uma carta com esse nome — escolha outro.',
      naoencontrado: 'Não achei essa carta no seu inventário.',
    };
    showToast('⚠️ Não foi possível salvar', msgs[r.motivo] || 'Tenta de novo.', 'default');
    return;
  }
  showToast('✅ Nome atualizado!', 'A carta já aparece com o novo nome no seu Inventário.', 'success');
  renderPersonalizarCartas();
}

const LAB_SUBABAS = [
  'criar-estrategia', 'criar-gerenciamento', 'criar-build',
  'testar-estrategia', 'testar-gerenciamento', 'testar-build',
];

function trocarAbaLab(aba) {
  LAB_SUBABAS.forEach(a => {
    const tab = document.getElementById('lab-tab-' + a);
    if (tab) tab.classList.toggle('active', a === aba);
  });

  const grupo = aba.startsWith('testar') ? 'testar' : 'criar';
  document.getElementById('lab-grupo-criar').classList.toggle('active', grupo === 'criar');
  document.getElementById('lab-grupo-testar').classList.toggle('active', grupo === 'testar');
  document.getElementById('lab-grupo-catalogador')?.classList.remove('active');
  document.getElementById('lab-grupo-refinar')?.classList.remove('active');
  document.getElementById('lab-grupo-personalizar')?.classList.remove('active');
  document.getElementById('lab-subtabs-criar').style.display = grupo === 'criar' ? 'flex' : 'none';
  document.getElementById('lab-subtabs-testar').style.display = grupo === 'testar' ? 'flex' : 'none';

  if (aba === 'criar-estrategia') {
    strategyState.testandoExistente = null;
    goToPhase('timeframe');
  } else if (aba === 'testar-estrategia') {
    goToPhase('existente');
  } else if (aba === 'criar-gerenciamento') {
    goToPhase('gerenciamento');
    document.getElementById('ger-bloco-criar').style.display = 'block';
    document.getElementById('ger-bloco-testar').style.display = 'none';
    document.getElementById('ger-btn-voltar').setAttribute('onclick', "trocarAbaLab('criar-gerenciamento')");
  } else if (aba === 'testar-gerenciamento') {
    goToPhase('gerenciamento');
    document.getElementById('ger-bloco-criar').style.display = 'none';
    document.getElementById('ger-bloco-testar').style.display = 'block';
    document.getElementById('ger-btn-voltar').setAttribute('onclick', "trocarAbaLab('testar-gerenciamento')");
    renderGerenciamentosTestar();
  } else if (aba === 'criar-build') {
    goToPhase('build');
    document.getElementById('build-btn-voltar').setAttribute('onclick', "trocarAbaLab('criar-build')");
  } else if (aba === 'testar-build') {
    goToPhase('testar-build');
    renderListaTestarBuild();
  }
}

// ── FASE -1: TIMEFRAME GLOBAL (primeira pergunta, sempre) ──
function setTimeframeGlobal(tf, el) {
  strategyState.timeframe = tf;
  document.querySelectorAll('#global-tf-grid .direction-btn').forEach(b => b.classList.remove('selected'));
  if (el) el.classList.add('selected');
}

// MVP: M5/M15 ainda sem dados — botões desativados disparam só um aviso.
function avisarTimeframeIndisponivel() {
  showToast('🔒 Só M1 por enquanto', 'Ainda só temos dados/estratégias de M1. M5 e M15 chegam depois.', 'default');
}

// Só estratégias aqui — Gerenciamento e Build têm suas próprias sub-abas de
// teste ("Testar Gerenciamento" / "Testar Build"), pra cada tipo rodar no
// fluxo certo em vez de tentar adivinhar pelo item clicado.
function renderListaExistente() {
  const lista = getInventario().filter(e => !e.deletadoEm && BUILD_STRATEGY_MODES.includes(e.mode));
  const cont = document.getElementById('existente-lista');

  if (lista.length === 0) {
    cont.innerHTML = '<p style="text-align:center;color:var(--text-secondary);grid-column:1/-1;">Você ainda não tem nenhuma estratégia salva. Crie uma primeiro na aba "Criar Estratégia".</p>';
    return;
  }

  cont.innerHTML = lista.map(item => `
    <div class="carta-flip-wrap" onclick="carregarDefinicaoExistente('${item.id}')">
      <div class="carta-flip-inner">
        ${renderCartaFront(item)}
      </div>
    </div>
  `).join('');
}

function carregarDefinicaoExistente(id) {
  const lista = getInventario();
  const item = lista.find(e => e.id === id);
  if (!item) return;

  strategyState.mode = item.mode;
  strategyState.testandoExistente = { origemId: item.id, origemNome: item.nome };
  // Vem pré-preenchido com o que já foi testado — o usuário edita o que quiser
  // (par, horário ou até o timeframe) pra criar uma variação.
  strategyState.timeframe = item.teste.timeframeOperado || 'M1';
  strategyState.pair = item.teste.pair;
  strategyState.scheduleStart = item.teste.scheduleStart;
  strategyState.scheduleEnd = item.teste.scheduleEnd;
  strategyState.lastResult = undefined;

  const d = item.definicao || {};
  if (item.mode === 'pintar') {
    strategyState.pattern = [...d.pattern];
    strategyState.patternLength = d.pattern.length;
    strategyState.direction = d.direction;
    strategyState.anchoring = d.anchoring;
    strategyState.mirror = d.mirror;
    strategyState.mirrorChosen = true;
    strategyState.mirrorDirection = d.mirrorDirection;
    aplicarDiasSemanaUI(d.diasSemana || null);
  } else if (item.mode === 'quadrante') {
    strategyState.q = JSON.parse(JSON.stringify(d.q));
  } else if (item.mode === 'indicador') {
    strategyState.ind = JSON.parse(JSON.stringify(d.ind));
    strategyState.mont = d.mont ? JSON.parse(JSON.stringify(d.mont)) : null;
  } else if (item.mode === 'figura') {
    strategyState.fig = { ...d.fig };
  }

  showToast('♻️ Estratégia carregada', `"${item.nome}" carregada. Ajuste o que quiser e teste em outro cenário.`, 'default');
  goToPhase('timeframe');
}

// Reproduz exatamente o mesmo teste de uma carta/estratégia salva: mesma
// definição, mesmo par/horário, e o período TRAVADO nas datas exatas que
// geraram o resultado salvo (em vez de "tudo", que desliza conforme o banco
// de velas cresce e nunca bate na mesma janela de novo).
function reproduzirCarta(id) {
  const item = getInventario().find(e => e.id === id);
  if (!item) return;

  if (item.mode === 'build' || item.mode === 'gerenciamento') {
    showToast('⚠️ Ainda não suportado', 'Reproduzir builds/gerenciamentos exatos chega em breve. Por enquanto, reproduza a estratégia-base.', 'default');
    return;
  }
  if (!item.teste || !item.teste.periodoDe || item.teste.periodoDe === '—') {
    showToast('⚠️ Sem período salvo', 'Essa carta não tem um período exato salvo para reproduzir.', 'default');
    return;
  }

  carregarDefinicaoExistente(id);

  strategyState.periodoModo = 'personalizado';
  strategyState.periodoDataDe = item.teste.periodoDe;
  strategyState.periodoDataAte = item.teste.periodoAte;
  // dias da semana já foram restaurados por carregarDefinicaoExistente() (o
  // recorte exato que essa carta tinha — inclusive se veio do "Otimizar").

  goToPhase('pair');
  showToast('🔁 Reproduzindo', `Rodando "${item.nome}" travado em ${item.teste.periodoDe} – ${item.teste.periodoAte}, igual a quando foi salva.`, 'default');
  setTimeout(() => testStrategy(), 50);
}

// Botão "Próximo" da fase de timeframe: se está testando uma estratégia
// existente, pula a escolha de tipo (já está definida) e vai pro par.
function proximoDoTimeframe() {
  if (strategyState.testandoExistente) {
    if (strategyState.mode === 'quadrante' && strategyState.q.tipo === 'quadrante') {
      const validos = QUADRANTES_DISP[strategyState.timeframe] || [];
      if (!validos.includes(strategyState.q.bloco)) {
        const tamanho = strategyState.q.bloco === 'M15' ? '15' : '5';
        showToast('⚠️ Combinação inválida', `O quadrante de ${tamanho} min não funciona com velas de ${strategyState.timeframe}. Escolha outro timeframe.`, 'default');
        return;
      }
    }
    goToPhase('pair');
  } else {
    goToPhase('mode');
  }
}

// ── Escolha de modo (pintar / quadrante / indicador) ──
function setMode(mode) {
  strategyState.mode = mode;
  if (mode === 'quadrante') {
    goToPhase('q-approach');
    setQApproach('preset', null);
  } else if (mode === 'indicador') {
    strategyState.ind.tipo = null;
    goToPhase('ind-escolher');
  } else if (mode === 'figura') {
    goToPhase('fig-escolher');
  } else {
    goToPhase('pattern');
  }
}

// ════════════════════════════════════════════════
// MODO FIGURA GRÁFICA
// ════════════════════════════════════════════════
function setFigura(tipo, el) {
  strategyState.fig.tipo = tipo;
  document.querySelectorAll('#phase-fig-escolher .anchoring-card').forEach(c => c.classList.remove('selected'));
  if (el) el.classList.add('selected');
  goToPhase('pair');
}

// ════════════════════════════════════════════════
// MODO INDICADOR
// ════════════════════════════════════════════════
function setIndicador(tipo, el) {
  strategyState.ind.tipo = tipo;
  // carrega os defaults clássicos (cópia)
  strategyState.ind.params = { ...INDICADORES[tipo].defaults };
  document.querySelectorAll('#phase-ind-escolher .anchoring-card').forEach(c => c.classList.remove('selected'));
  if (el) el.classList.add('selected');
  renderIndConfig();
  goToPhase('ind-config');
}

function renderIndConfig() {
  const def = INDICADORES[strategyState.ind.tipo];
  document.getElementById('ind-config-titulo').textContent = `⚙️ Configurar ${def.nome}`;
  const cont = document.getElementById('ind-config-campos');
  cont.innerHTML = '';
  def.campos.forEach(campo => {
    const valor = strategyState.ind.params[campo.key];
    const wrap = document.createElement('div');
    wrap.style.cssText = 'margin-bottom:16px;';
    let input;
    if (campo.tipo === 'select') {
      input = `<select id="ind-campo-${campo.key}" class="form-select" onchange="atualizarIndParam('${campo.key}', this.value)">` +
        campo.opcoes.map(o => `<option value="${o}" ${o === valor ? 'selected' : ''}>${o}</option>`).join('') +
        '</select>';
    } else {
      const step = campo.step ? ` step="${campo.step}"` : '';
      input = `<input type="number" id="ind-campo-${campo.key}" class="form-input" value="${valor}" min="${campo.min}" max="${campo.max}"${step} oninput="atualizarIndParam('${campo.key}', this.value)">`;
    }
    wrap.innerHTML = `<label class="form-label" style="display:block; margin-bottom:6px;">${campo.label}</label>${input}`;
    cont.appendChild(wrap);
  });
}

function atualizarIndParam(key, valor) {
  // mantém número como número (exceto o 'tipo' da média, que é texto)
  const num = parseFloat(valor);
  strategyState.ind.params[key] = (key === 'tipo' || isNaN(num)) ? valor : num;
}

function proximoIndConfig() {
  goToPhase('pair');
}

// ════════════════════════════════════════════════
// MONTADOR DE CONDIÇÕES ("crie seu indicador")
// ════════════════════════════════════════════════
const BLOCOS_ESQ = [['rsi', 'RSI'], ['media', 'Média'], ['macd', 'MACD'], ['macd_sinal', 'MACD sinal'], ['preco', 'Preço']];
const BLOCOS_DIR = [['numero', 'Número'], ['preco', 'Preço'], ['media', 'Média'], ['rsi', 'RSI'], ['macd', 'MACD'], ['macd_sinal', 'MACD sinal']];
const OPERADORES = [['<', '< menor que'], ['>', '> maior que'], ['cruza_cima', 'cruza ↑ pra cima'], ['cruza_baixo', 'cruza ↓ pra baixo']];

function condicaoPadrao() {
  return {
    esq: { tipo: 'rsi', periodo: 14, matipo: 'EMA' },
    op: '<',
    dir: { tipo: 'numero', valor: 30, periodo: 20, matipo: 'EMA' },
  };
}

function abrirMontador() {
  strategyState.mode = 'indicador';
  strategyState.ind.tipo = 'montador';
  strategyState.mont = { condicoes: [condicaoPadrao()], combinador: 'E', direcao: 'CALL' };
  goToPhase('mont-builder');
  renderMontador();
}

function addCondicao() {
  if (strategyState.mont.condicoes.length >= 3) {
    showToast('⚠️ Limite', 'Máximo de 3 condições.', 'default');
    return;
  }
  strategyState.mont.condicoes.push(condicaoPadrao());
  renderMontador();
}

function removeCondicao(i) {
  strategyState.mont.condicoes.splice(i, 1);
  renderMontador();
}

function _ladoHTML(cond, lado, i) {
  const o = cond[lado];
  const opts = lado === 'esq' ? BLOCOS_ESQ : BLOCOS_DIR;
  let html = `<select class="form-select" style="flex:1;min-width:90px;" onchange="setBlocoTipo(${i},'${lado}',this.value)">` +
    opts.map(([v, n]) => `<option value="${v}" ${o.tipo === v ? 'selected' : ''}>${n}</option>`).join('') + '</select>';
  if (o.tipo === 'numero') {
    html += `<input type="number" class="form-input" style="width:80px;" value="${o.valor}" step="0.1" oninput="setBlocoParam(${i},'${lado}','valor',this.value)">`;
  } else if (o.tipo === 'rsi') {
    html += `<input type="number" class="form-input" style="width:70px;" value="${o.periodo}" min="2" max="100" title="período" oninput="setBlocoParam(${i},'${lado}','periodo',this.value)">`;
  } else if (o.tipo === 'media') {
    html += `<select class="form-select" style="width:80px;" onchange="setBlocoParam(${i},'${lado}','matipo',this.value)"><option value="EMA" ${o.matipo === 'EMA' ? 'selected' : ''}>EMA</option><option value="SMA" ${o.matipo === 'SMA' ? 'selected' : ''}>SMA</option></select>`;
    html += `<input type="number" class="form-input" style="width:70px;" value="${o.periodo}" min="2" max="400" title="período" oninput="setBlocoParam(${i},'${lado}','periodo',this.value)">`;
  }
  return html;
}

function renderMontador() {
  const cont = document.getElementById('mont-condicoes');
  cont.innerHTML = '';
  strategyState.mont.condicoes.forEach((cond, i) => {
    const row = document.createElement('div');
    row.style.cssText = 'background:rgba(99,102,241,0.05); border:1px solid var(--border-color); border-radius:8px; padding:12px; margin-bottom:10px;';
    const opSel = `<select class="form-select" style="width:130px;" onchange="setOpCondicao(${i},this.value)">` +
      OPERADORES.map(([v, n]) => `<option value="${v}" ${cond.op === v ? 'selected' : ''}>${n}</option>`).join('') + '</select>';
    const remover = strategyState.mont.condicoes.length > 1
      ? `<button class="btn btn-sm btn-outline" style="margin-left:auto;" onclick="removeCondicao(${i})">✕</button>` : '';
    row.innerHTML = `
      <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px;">
        <span style="font-size:12px; color:var(--text-secondary);">Condição ${i + 1}</span>
        ${remover}
      </div>
      <div style="display:flex; flex-wrap:wrap; gap:6px; align-items:center;">
        ${_ladoHTML(cond, 'esq', i)}
        ${opSel}
        ${_ladoHTML(cond, 'dir', i)}
      </div>`;
    cont.appendChild(row);
  });
}

function setBlocoTipo(i, lado, tipo) {
  strategyState.mont.condicoes[i][lado].tipo = tipo;
  renderMontador(); // muda os campos de parâmetro
}

function setBlocoParam(i, lado, key, valor) {
  const num = parseFloat(valor);
  strategyState.mont.condicoes[i][lado][key] = (key === 'matipo' || isNaN(num)) ? valor : num;
}

function setOpCondicao(i, op) {
  strategyState.mont.condicoes[i].op = op;
}

function setMontCombinador(c, el) {
  strategyState.mont.combinador = c;
  document.querySelectorAll('#mont-comb-grid .direction-btn').forEach(b => b.classList.remove('selected'));
  if (el) el.classList.add('selected');
}

function setMontDirecao(d, el) {
  strategyState.mont.direcao = d;
  document.querySelectorAll('#mont-dir-grid .direction-btn').forEach(b => b.classList.remove('selected'));
  if (el) el.classList.add('selected');
}

function proximoMontador() {
  goToPhase('pair');
}

// ── Q1: presets ou custom ──
function setQApproach(approach, el) {

  // Os presets clássicos (MHI, Milhão, Torres Gêmeas...) são todos baseados
  // em velas M1 — só fazem sentido se o timeframe global escolhido for M1.
  if (approach === 'preset' && strategyState.timeframe !== 'M1') {
    showToast('⚠️ Não disponível nesse timeframe', 'As estratégias prontas são todas em M1. Volte e escolha M1, ou monte do zero.', 'default');
    return;
  }

  strategyState.q.approach = approach;
  document.querySelectorAll('#phase-q-approach .anchoring-card').forEach(c => c.classList.remove('selected'));
  if (el) el.classList.add('selected');

  if (approach === 'preset') {
    renderPresets();
    document.getElementById('q-presets-list').style.display = 'block';
  } else {
    document.getElementById('q-presets-list').style.display = 'none';
    goToPhase('q-bloco');
  }
}

function renderPresets() {
  const container = document.getElementById('q-presets-container');
  container.innerHTML = '';

  const addGrupo = (titulo, lista, render) => {
    const head = document.createElement('div');
    head.style.cssText = 'grid-column:1/-1; margin-top:8px; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:var(--text-secondary);';
    head.textContent = titulo;
    container.appendChild(head);
    lista.forEach(render);
  };

  addGrupo('Maioria / Minoria', PRESETS_QUADRANTE, p => {
    const locked = presetBloqueado(p.nome);
    const card = document.createElement('div');
    card.className = 'anchoring-card' + (locked ? ' preset-locked' : '');
    card.onclick = locked ? () => upsellPremium(p.nome) : () => loadPreset(p.nome);
    card.innerHTML = `
      ${locked ? '<div class="preset-lock-badge">🔒 Premium</div>' : ''}
      <div class="anchoring-title">${p.nome}</div>
      <div class="anchoring-desc">${p.desc}</div>
      <div style="margin-top:8px; font-size:11px; color:var(--accent-hover);">Quadrante ${p.bloco} · ${p.posicoesLabel}</div>
    `;
    container.appendChild(card);
  });

  const refRepete = PRESETS_REFERENCIA.filter(p => p.familia === 'Repetição');
  const refFlip = PRESETS_REFERENCIA.filter(p => p.familia === 'Flip');

  const renderRef = p => {
    const locked = presetBloqueado(p.nome);
    const card = document.createElement('div');
    card.className = 'anchoring-card' + (locked ? ' preset-locked' : '');
    card.onclick = locked ? () => upsellPremium(p.nome) : () => loadPreset(p.nome);
    card.innerHTML = `
      ${locked ? '<div class="preset-lock-badge">🔒 Premium</div>' : ''}
      <div class="anchoring-title">${p.nome}</div>
      <div class="anchoring-desc">${p.desc}</div>
      <div style="margin-top:8px; font-size:11px; color:var(--accent-hover);">Ciclo de ${p.blocoVelas} velas</div>
    `;
    container.appendChild(card);
  };

  addGrupo('Repetição de posição', refRepete, renderRef);
  addGrupo('Reversão / Flip', refFlip, renderRef);

  // MVP: estratégias de Confluência (duas concordam) temporariamente DESATIVADAS
  // (não remover — os dados em PRESETS_CONFLUENCIA e a lógica em loadPreset
  // continuam intactos; basta reabilitar o addGrupo abaixo quando for o caso).
  // addGrupo('Confluência (duas concordam)', PRESETS_CONFLUENCIA, p => {
  //   const card = document.createElement('div');
  //   card.className = 'anchoring-card';
  //   card.onclick = () => loadPreset(p.nome);
  //   card.innerHTML = `
  //     <div class="anchoring-title">${p.nome}</div>
  //     <div class="anchoring-desc">${p.desc}</div>
  //     <div style="margin-top:8px; font-size:11px; color:var(--accent-hover);">Só entra quando as duas concordam</div>
  //   `;
  //   container.appendChild(card);
  // });
}

function loadPreset(nome) {
  // Procura nas três listas
  const pQ = PRESETS_QUADRANTE.find(x => x.nome === nome);
  const pR = PRESETS_REFERENCIA.find(x => x.nome === nome);
  const pC = PRESETS_CONFLUENCIA.find(x => x.nome === nome);
  strategyState.q.approach = 'preset';
  strategyState.q.presetNome = nome;

  if (pC) {
    strategyState.q.tipo = 'confluencia';
    strategyState.q.ref = null;
    strategyState.q.conf = { nome: pC.nome, specA: pC.specA, specB: pC.specB };
    showToast('⚡ Confluência carregada', `${pC.nome}. Agora escolha o par.`, 'default');
    goToPhase('pair');
    return;
  }

  if (pQ) {
    strategyState.q.tipo = 'quadrante';
    strategyState.q.ref = null;
    strategyState.q.bloco = pQ.bloco;
    strategyState.q.analiseModo = 'contar';
    strategyState.q.posicoes = pQ.posicoes;
    strategyState.q.posicoesLabel = pQ.posicoesLabel;
    strategyState.q.entradaModo = 'minoria'; // padrão; usuário escolhe na próxima tela
    strategyState.q.entradaPos = pQ.entradaPos;
    // Família 1 tem duas interpretações: deixa o usuário escolher maioria/minoria
    showToast('⚡ Preset carregado', `${pQ.nome} · agora escolha maioria ou minoria.`, 'default');
    goToPhase('q-direction');
    return;
  } else if (pR) {
    strategyState.q.tipo = 'referencia';
    strategyState.q.ref = {
      nome: pR.nome,
      blocoVelas: pR.blocoVelas,
      refPos: pR.refPos,
      entryPos: pR.entryPos,
      relacao: pR.relacao,
      refBloco: pR.refBloco,
      condPosicoes: pR.condPosicoes,
    };
    showToast('⚡ Preset carregado', `${pR.nome}. Agora escolha o par.`, 'default');
  } else {
    return;
  }
  goToPhase('pair');
}

// ── Q2: bloco do quadrante ──
// Mesma regra do backend (quadrantes.QUADRANTES_DISP): o quadrante tem que
// ser maior que o timeframe global escolhido na Fase -1, senão não cabe
// mais de 1 vela no bloco.
const QUADRANTES_DISP = { M1: ['M5', 'M15'], M5: ['M15'], M15: [] };
const Q_TF_SEG = { M1: 60, M5: 300, M15: 900 };
const Q_BLOCO_SEG = { M5: 300, M15: 900 };
const Q_BLOCO_INFO = {
  M5: { titulo: '🕔 Quadrante de 5 min', desc: 'O mais usado (MHI, Milhão).' },
  M15: { titulo: '🕒 Quadrante de 15 min', desc: 'Blocos maiores, menos sinais.' },
};

function renderQBlocoOpcoes() {
  const tf = strategyState.timeframe || 'M1';
  const lembrete = document.getElementById('q-tf-lembrete');
  if (lembrete) lembrete.textContent = tf;

  const opcoes = QUADRANTES_DISP[tf];
  const cont = document.getElementById('q-bloco-grid');

  if (opcoes.length === 0) {
    cont.innerHTML = `<p style="text-align:center;color:var(--text-secondary);grid-column:1/-1;">
      Não dá pra usar quadrante com velas de ${tf} — não existe bloco maior. Volte e escolha M1 ou M5.
    </p>`;
    strategyState.q.bloco = null;
    return;
  }

  if (!opcoes.includes(strategyState.q.bloco)) {
    strategyState.q.bloco = null;
  }

  cont.innerHTML = opcoes.map(bloco => {
    const n = Q_BLOCO_SEG[bloco] / Q_TF_SEG[tf];
    const info = Q_BLOCO_INFO[bloco];
    const selecionado = strategyState.q.bloco === bloco ? ' selected' : '';
    return `
      <div class="anchoring-card${selecionado}" onclick="setQBloco('${bloco}', this)">
        <div class="anchoring-title">${info.titulo}</div>
        <div class="anchoring-desc">${n} velas de ${tf}. ${info.desc}</div>
      </div>
    `;
  }).join('');
}

function setQBloco(bloco, el) {
  strategyState.q.bloco = bloco;
  document.querySelectorAll('#q-bloco-grid .anchoring-card').forEach(c => c.classList.remove('selected'));
  if (el) el.classList.add('selected');
}

// ── Q3: análise ──
function setQAnaliseModo(modo) {
  strategyState.q.analiseModo = modo;
  document.getElementById('q-analise-contar').classList.toggle('selected', modo === 'contar');
  document.getElementById('q-analise-editar').classList.toggle('selected', modo === 'editar');

  const posArea = document.getElementById('q-posicoes-area');
  const paintArea = document.getElementById('q-paint-area');
  if (modo === 'contar') {
    posArea.style.display = 'block';
    paintArea.style.display = 'none';
  } else {
    posArea.style.display = 'none';
    paintArea.style.display = 'block';
    // inicializa o bloco pintado com ⬜
    strategyState.q.analisePadrao = Array(velasPorBloco()).fill('⬜');
    renderQBlock();
  }
}

function setQPosicoes(label) {
  const n = velasPorBloco();
  if (label === 'todas') {
    strategyState.q.posicoes = null;
    strategyState.q.posicoesLabel = `todas (${n})`;
  } else if (label === 'primeiras') {
    strategyState.q.posicoes = [0, 1, 2];
    strategyState.q.posicoesLabel = '3 primeiras';
  } else if (label === 'ultimas') {
    strategyState.q.posicoes = [n - 3, n - 2, n - 1];
    strategyState.q.posicoesLabel = '3 últimas';
  }
  document.getElementById('q-pos-todas').classList.toggle('selected', label === 'todas');
  document.getElementById('q-pos-primeiras').classList.toggle('selected', label === 'primeiras');
  document.getElementById('q-pos-ultimas').classList.toggle('selected', label === 'ultimas');
}

function renderQBlock() {
  const container = document.getElementById('q-block-container');
  container.innerHTML = '';
  strategyState.q.analisePadrao.forEach((cor, i) => {
    const candle = document.createElement('div');
    candle.className = 'candle ' + getColorClass(cor);
    candle.textContent = cor;
    candle.onclick = () => toggleQCandle(i);
    container.appendChild(candle);
  });
}

function toggleQCandle(i) {
  const atual = strategyState.q.analisePadrao[i];
  const prox = (Q_CORES.indexOf(atual) + 1) % Q_CORES.length;
  strategyState.q.analisePadrao[i] = Q_CORES[prox];
  renderQBlock();
}

// ── Q4: direção (a favor/contra) ──
function setQEntradaModo(modo) {
  strategyState.q.entradaModo = modo;
  destacarDirecao(modo);
}

function destacarDirecao(modo) {
  document.getElementById('q-dir-maioria').classList.toggle('selected', modo === 'maioria');
  document.getElementById('q-dir-minoria').classList.toggle('selected', modo === 'minoria');
  const ambas = document.getElementById('q-dir-ambas');
  if (ambas) ambas.classList.toggle('selected', modo === 'ambas');
}

// Navegação da fase de direção (difere entre preset e custom)
function voltarDaDirecao() {
  goToPhase(strategyState.q.approach === 'preset' ? 'q-approach' : 'q-analise');
}
function proximoDaDirecao() {
  // No preset a posição de entrada já está definida -> vai direto para o par.
  // No custom o usuário ainda escolhe em qual vela entrar.
  goToPhase(strategyState.q.approach === 'preset' ? 'pair' : 'q-entrada');
}

// ── Q5: vela de entrada ──
function renderEntradaPos() {
  const container = document.getElementById('q-entrada-container');
  container.innerHTML = '';
  const n = Math.min(velasPorBloco(), 6); // até 6 opções
  const ordinais = ['1ª', '2ª', '3ª', '4ª', '5ª', '6ª'];
  for (let i = 0; i < n; i++) {
    const btn = document.createElement('button');
    btn.className = 'direction-btn';
    if (strategyState.q.entradaPos === i) btn.classList.add('selected');
    btn.innerHTML = `<strong>${ordinais[i]} vela</strong><br/><span style="font-size:11px;color:var(--text-secondary);">do próximo quadrante</span>`;
    btn.onclick = () => setQEntradaPos(i, btn);
    container.appendChild(btn);
  }
}

function setQEntradaPos(pos, btn) {
  strategyState.q.entradaPos = pos;
  document.querySelectorAll('#q-entrada-container .direction-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

// ── Voltar da fase de par (depende do modo/tipo) ──
function voltarDoPair() {
  // Testando uma carta/estratégia já existente: a definição (padrão, indicador,
  // figura, quadrante...) está travada — só pode editar timeframe/par/horário.
  // Por isso "Voltar" aqui não pode cair nas fases de edição da definição.
  if (strategyState.testandoExistente) {
    goToPhase('timeframe');
    return;
  }
  if (strategyState.mode === 'figura') {
    goToPhase('fig-escolher');
    return;
  }
  if (strategyState.mode === 'indicador') {
    goToPhase(strategyState.ind.tipo === 'montador' ? 'mont-builder' : 'ind-config');
    return;
  }
  if (strategyState.mode !== 'quadrante') {
    goToPhase('mirror');
    return;
  }
  const q = strategyState.q;
  if (q.approach === 'custom') {
    goToPhase('q-entrada');
  } else if (q.tipo === 'quadrante') {
    goToPhase('q-direction'); // preset Família 1: deixa trocar maioria/minoria
  } else {
    goToPhase('q-approach');  // presets de referência/confluência
  }
}

// ── TOAST ──
function showToast(title, message, type = 'default') {
  const toast = document.getElementById('toast');
  toast.innerHTML = `<strong>${title}</strong><br/>${message}`;
  toast.className = `toast show toast-${type}`;

  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

// ── INICIALIZAR ──
document.addEventListener('DOMContentLoaded', () => {
  updateMirrorPreview();

  const reproduzirId = localStorage.getItem('buildcraft_reproduzir_id');
  if (reproduzirId) {
    localStorage.removeItem('buildcraft_reproduzir_id');
    reproduzirCarta(reproduzirId);
  }
});

/* ============================================================
   REVELAÇÃO — o "momento" (suspense → flip da carta → confete)
   ------------------------------------------------------------
   Transforma a tela de resultado (antes uma planilha) num momento
   de descoberta. Tudo é frontend e HONESTO: a raridade/nota vêm do
   backtest real, e o "quase-acerto" usa os MESMOS limites do backend
   (função classificar() em backtest_api.py). Estilos e markup são
   injetados por JS pra manter o protótipo num arquivo só.
   ============================================================ */

const SUSPENSE_MIN_MS = 2300; // tempo mínimo de suspense, mesmo se a API for rápida
let _suspStart = 0, _suspInt = null, _suspTxtInt = null;

// Som (tocarTic, tocarRevelacao, somAtivo, alternarSom) vem de js/sound.js,
// carregado antes deste arquivo — compartilhado com o resto do site.

const _SUSP_STATUS = [
  'varrendo milhões de velas reais…',
  'procurando o seu padrão no histórico…',
  'contando acertos e erros…',
  'medindo a raridade da descoberta…',
  'quase lá…',
];

// Injeta os estilos da revelação uma única vez.
function garantirRevealStyles() {
  if (document.getElementById('reveal-fx-styles')) return;
  const s = document.createElement('style');
  s.id = 'reveal-fx-styles';
  s.textContent = `
  #reveal-suspense{position:fixed;inset:0;z-index:9500;display:none;align-items:center;justify-content:center;
    background:rgba(3,5,12,.86);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);}
  .reveal-susp-box{text-align:center;max-width:440px;padding:0 24px;animation:reveal-fade .3s var(--ease-out) both;}
  .reveal-susp-eyebrow{font-family:var(--font-hud);letter-spacing:3px;text-transform:uppercase;font-size:.8rem;
    color:var(--neon-cyan);text-shadow:0 0 12px rgba(0,234,255,.6);margin-bottom:22px;}
  .reveal-scan{display:flex;gap:8px;justify-content:center;margin-bottom:24px;}
  .reveal-scan-candle{width:16px;height:44px;border-radius:4px;border:1px solid var(--border-light);
    background:var(--bg-elevated);transition:background .12s,border-color .12s;}
  .reveal-scan-candle.green{background:rgba(34,197,94,.35);border-color:var(--success);box-shadow:0 0 10px rgba(34,197,94,.4);}
  .reveal-scan-candle.red{background:rgba(239,68,68,.35);border-color:var(--danger);box-shadow:0 0 10px rgba(239,68,68,.4);}
  .reveal-progress{width:100%;height:6px;border-radius:999px;background:var(--bg-base);overflow:hidden;margin-bottom:14px;}
  .reveal-progress-bar{height:100%;width:0;border-radius:999px;background:linear-gradient(90deg,#00eaff,#9d4edd);
    box-shadow:0 0 14px rgba(0,234,255,.6);}
  .reveal-susp-status{font-family:var(--font-hud);letter-spacing:1px;color:var(--text-secondary);font-size:.95rem;min-height:1.2em;}

  .reveal-hero{position:relative;margin-bottom:22px;text-align:center;}
  .reveal-hero-eyebrow{font-family:var(--font-hud);letter-spacing:4px;text-transform:uppercase;font-size:.72rem;
    color:var(--text-muted);margin-bottom:12px;}
  .reveal-card{position:relative;overflow:hidden;max-width:420px;margin:0 auto;padding:26px 22px;border-radius:16px;
    border:2px solid var(--rc);background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(0,0,0,.2));
    box-shadow:0 0 46px var(--rg),inset 0 0 34px rgba(0,0,0,.45);
    animation:reveal-pop .62s var(--ease-spring) both;}
  .reveal-card::before{content:'';position:absolute;top:0;left:-60%;width:55%;height:100%;
    background:linear-gradient(100deg,transparent,rgba(255,255,255,.18),transparent);
    transform:skewX(-18deg);animation:reveal-shine 1.05s ease-out .45s both;}
  .reveal-rar-badge{display:inline-block;padding:5px 18px;border-radius:999px;background:var(--rc);color:#04121a;
    font-family:var(--font-display);font-weight:800;font-size:.78rem;letter-spacing:.06em;text-transform:uppercase;
    box-shadow:0 0 18px var(--rg);}
  .reveal-grade{font-family:var(--font-display);font-weight:900;font-size:4.4rem;line-height:.95;color:var(--rc);
    text-shadow:0 0 26px var(--rg);margin:8px 0 2px;animation:reveal-grade-in .5s var(--ease-spring) .25s both;}
  .reveal-headline{font-family:var(--font-display);font-weight:800;font-size:1.05rem;letter-spacing:.04em;
    color:var(--text-primary);margin:6px 0 14px;text-transform:uppercase;}
  .reveal-pair{font-family:var(--font-hud);letter-spacing:1px;color:var(--text-secondary);font-size:.95rem;margin-bottom:16px;}
  .reveal-cenario{font-size:.8rem;color:var(--neon-gold);margin:-8px 0 14px;letter-spacing:.5px;}
  .reveal-ministats{display:flex;gap:12px;justify-content:center;}
  .reveal-ministat{flex:1;max-width:140px;padding:10px 6px;border-radius:10px;background:rgba(0,0,0,.28);
    border:1px solid var(--border);}
  .reveal-ministat .v{font-family:var(--font-display);font-weight:800;font-size:1.5rem;line-height:1;}
  .reveal-ministat .l{font-size:.66rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.05em;margin-top:4px;}
  .reveal-nearmiss{max-width:420px;margin:14px auto 0;padding:12px 16px;border-radius:10px;font-size:.86rem;line-height:1.5;
    text-align:left;color:#ffe6a8;background:rgba(245,158,11,.10);border:1px solid rgba(245,158,11,.35);}
  .reveal-nearmiss b{color:var(--neon-gold);}
  .reveal-genesis-msg{max-width:420px;margin:14px auto 0;padding:9px 20px;border-radius:999px;font-size:.84rem;
    font-weight:700;letter-spacing:.03em;text-align:center;color:var(--neon-cyan);
    background:rgba(0,234,255,.07);border:1px solid rgba(0,234,255,.32);
    text-shadow:0 0 10px rgba(0,234,255,.4);}
  .reveal-marco{display:inline-block;max-width:420px;margin:12px auto 0;padding:8px 18px;border-radius:999px;
    font-size:.84rem;color:var(--text-primary);background:rgba(255,255,255,.04);border:1px solid var(--rc);
    box-shadow:0 0 16px var(--rg);}
  .reveal-marco b{color:var(--rc);}

  .reveal-confete-layer{position:fixed;inset:0;pointer-events:none;z-index:9600;overflow:hidden;}
  .reveal-confete{position:absolute;top:-14px;width:9px;height:14px;border-radius:2px;animation:reveal-fall linear forwards;}

  @keyframes reveal-fade{from{opacity:0}to{opacity:1}}
  @keyframes reveal-pop{from{opacity:0;transform:perspective(900px) rotateY(82deg) scale(.86)}
    to{opacity:1;transform:perspective(900px) rotateY(0) scale(1)}}
  @keyframes reveal-grade-in{from{opacity:0;transform:scale(.4)}to{opacity:1;transform:scale(1)}}
  @keyframes reveal-shine{from{left:-60%}to{left:130%}}
  @keyframes reveal-fall{to{transform:translateY(112vh) rotate(540deg);opacity:.9}}
  @media(prefers-reduced-motion:reduce){
    .reveal-card,.reveal-card::before,.reveal-grade{animation:none}
  }`;
  document.head.appendChild(s);
}

// Espelho EXATO da função classificar() do backend (backtest_api.py) — é o que
// torna o "quase-acerto" honesto. breakeven ~53.5% pra payout 87%.
function classificarJS(winrate, entries) {
  let nota, rarity;
  if (winrate >= 58) { nota = 'S+'; rarity = 'legendary'; }
  else if (winrate >= 56) { nota = 'S'; rarity = 'epic'; }
  else if (winrate >= 54) { nota = 'A'; rarity = 'epic'; }
  else if (winrate >= 53.5) { nota = 'B'; rarity = 'rare'; }
  else if (winrate >= 51) { nota = 'C'; rarity = 'rare'; }
  else { nota = 'D'; rarity = 'common'; }
  if (entries != null) {
    const ordem = ['common', 'rare', 'epic', 'legendary'];
    const teto = entries < 30 ? 'rare' : entries < 1000 ? 'epic' : 'legendary';
    if (ordem.indexOf(rarity) > ordem.indexOf(teto)) rarity = teto;
  }
  return { nota, rarity };
}

const _RAR_LABEL = { common: 'Comum', rare: 'Rara', epic: 'Épica', legendary: 'Lendária' };
const _RAR_COR = {
  common: 'var(--rarity-common)', rare: 'var(--rarity-rare)',
  epic: 'var(--rarity-epic)', legendary: 'var(--rarity-legendary)',
};
const _RAR_GLOW = {
  common: 'var(--rarity-common-glow)', rare: 'var(--rarity-rare-glow)',
  epic: 'var(--rarity-epic-glow)', legendary: 'var(--rarity-legendary-glow)',
};

// "Passou perto" — só aparece quando é VERDADE. Dois casos honestos:
//  1) amostra: a taxa daria raridade maior, mas faltam operações (teto por entries)
//  2) winrate: faltou <=1.2% de acerto pro próximo limite de nota/raridade
function calcularQuaseAcerto(r) {
  const wr = r.winrate, entries = r.entries;
  const ordem = ['common', 'rare', 'epic', 'legendary'];
  const semCap = classificarJS(wr, null).rarity;
  const comCap = classificarJS(wr, entries).rarity;

  if (ordem.indexOf(semCap) > ordem.indexOf(comCap)) {
    const alvoOps = entries < 30 ? 30 : 1000;
    return `🔥 Passou perto: sua taxa de acerto daria <b>${_RAR_LABEL[semCap]}</b>, mas a amostra ainda é pequena ` +
           `(${entries.toLocaleString('pt-BR')} de ${alvoOps.toLocaleString('pt-BR')} operações). ` +
           `Teste um período maior ou um horário mais movimentado pra confirmar.`;
  }

  const limites = [
    { min: 51, grade: 'C', rar: 'rare' },
    { min: 53.5, grade: 'B', rar: 'rare' },
    { min: 54, grade: 'A', rar: 'epic' },
    { min: 56, grade: 'S', rar: 'epic' },
    { min: 58, grade: 'S+', rar: 'legendary' },
  ];
  const prox = limites.find(l => l.min > wr);
  if (prox) {
    const gap = Math.round((prox.min - wr) * 10) / 10;
    if (gap > 0 && gap <= 1.2) {
      const sobe = ordem.indexOf(prox.rar) > ordem.indexOf(comCap);
      const alvo = sobe ? `virar <b>${_RAR_LABEL[prox.rar]}</b> (nota ${prox.grade})` : `subir pra nota <b>${prox.grade}</b>`;
      return `🔥 Passou perto! Faltaram só <b>${gap}%</b> de acerto pra ${alvo}. Tenta outro horário ou outro par.`;
    }
  }
  return null;
}

// Botão "Otimizar" — só aparece quando faltou MUITO pouco (gap pequeno
// mesmo, diferente do aviso geral de "quase" acima) e só no modo "pintar"
// (é o único com filtro de dia da semana hoje, que é o que o otimizador usa).
// Some depois de uma otimização (não tem o que cortar de novo na hora).
const OTIMIZAR_GAP_MAX = 0.5; // % de acerto

function gapParaOtimizar(r) {
  if (strategyState.mode !== 'pintar' || strategyState.mirror) return null;
  if (strategyState.jaOtimizado) return null;
  const limites = [51, 53.5, 54, 56, 58];
  const prox = limites.find(l => l > r.winrate);
  if (prox == null) return null;
  const gap = Math.round((prox - r.winrate) * 100) / 100;
  return (gap > 0 && gap <= OTIMIZAR_GAP_MAX) ? gap : null;
}

// Marco de coleção — puxa do inventário REAL do usuário. Celebra a 1ª carta de
// cada raridade e mostra quantas já tem. Some pra Comum (não é alvo de caça).
function marcoColecao(r) {
  const rar = r.rarity || 'common';
  if (rar === 'common') return '';
  const lab = _RAR_LABEL[rar];
  let inv = [];
  try { inv = (typeof getInventario === 'function') ? getInventario() : []; } catch (e) { /* sem inventário */ }
  const jaTem = inv.filter(i => i && i.teste && i.teste.rarity === rar).length;
  let txt;
  if (jaTem === 0) {
    txt = `🏆 Sua 1ª carta <b>${lab}</b> — guarde pra começar a coleção!`;
  } else {
    const plural = jaTem === 1 ? lab : lab + 's';
    txt = `Você já tem <b>${jaTem}</b> ${plural} · esta seria a sua <b>${jaTem + 1}ª</b>.`;
  }
  return `<div class="reveal-marco">${txt}</div>`;
}

// Monta a carta "herói" que abre o resultado (o flip + a celebração).
function montarHeroReveal(r) {
  garantirRevealStyles();
  const rar = r.rarity || 'common';
  const cor = _RAR_COR[rar] || 'var(--text-secondary)';
  const glow = _RAR_GLOW[rar] || 'rgba(0,234,255,.3)';
  const lab = _RAR_LABEL[rar] || 'Comum';
  const acima = r.winrate >= 53.5;
  const headline = acima ? `Você descobriu uma carta ${lab}` : 'Carta descoberta';
  const corWr = acima ? 'var(--success)' : 'var(--danger)';
  const quase = calcularQuaseAcerto(r);
  const quaseHTML = quase ? `<div class="reveal-nearmiss">${quase}</div>` : '';

  const gapOtim = gapParaOtimizar(r);
  const otimizarHTML = gapOtim != null ? `
    <div class="reveal-nearmiss">
      🛠️ Faltam só <b>${gapOtim}%</b> de acerto. A gente pode otimizar tirando os
      dias da semana mais fracos do recorte — sem sortear de novo, só replicando
      o que já deu certo no seu teste.
      <div style="margin-top:10px;">
        <button class="btn btn-sm btn-accent" id="btn-otimizar-build" onclick="otimizarBuild()">⚙️ Otimizar</button>
      </div>
    </div>` : '';

  const isPrimeiraDescoberta = typeof getInventario === 'function'
    && getInventario().filter(e => !e.deletadoEm).length === 0;
  const primeiraHTML = isPrimeiraDescoberta
    ? '<div class="reveal-genesis-msg">✦ Sua primeira criatura. O início de tudo.</div>' : '';

  return `
  <div class="reveal-hero" style="--rc:${cor};--rg:${glow};">
    <div class="reveal-hero-eyebrow">⚡ Descoberta no histórico real</div>
    <div class="reveal-card">
      <div class="reveal-rar-badge">${lab}</div>
      <div class="reveal-grade">${r.grade || '—'}</div>
      <div class="reveal-headline">${headline}</div>
      <div class="reveal-pair">${r.pair} · ${r.timeframe}</div>
      ${strategyState.cenarioSorteado ? `<div class="reveal-cenario">🎲 Cenário sorteado: ${strategyState.cenarioSorteado}</div>` : ''}
      <div class="reveal-ministats">
        <div class="reveal-ministat"><div class="v" style="color:${corWr};">${r.winrate}%</div><div class="l">Taxa de acerto</div></div>
        <div class="reveal-ministat"><div class="v">${(r.entries || 0).toLocaleString('pt-BR')}</div><div class="l">Operações</div></div>
      </div>
    </div>
    ${primeiraHTML}
    ${marcoColecao(r)}
    ${quaseHTML}
    ${otimizarHTML}
  </div>`;
}

// Suspense: overlay com velas piscando + barra de progresso + status girando.
function mostrarSuspense() {
  garantirRevealStyles();
  let ov = document.getElementById('reveal-suspense');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'reveal-suspense';
    ov.innerHTML = `
      <button class="som-toggle-btn" onclick="alternarSom()" title="Ativar/desativar som"
              style="position:absolute;top:18px;right:18px;background:none;border:none;
              font-size:1.3rem;cursor:pointer;opacity:.75;">${somAtivo() ? '🔊' : '🔇'}</button>
      <div class="reveal-susp-box">
        <div class="reveal-susp-eyebrow">Testando contra o histórico real</div>
        <div class="reveal-scan" id="reveal-scan"></div>
        <div class="reveal-progress"><div class="reveal-progress-bar" id="reveal-progress-bar"></div></div>
        <div class="reveal-susp-status" id="reveal-susp-status">${_SUSP_STATUS[0]}</div>
      </div>`;
    document.body.appendChild(ov);
    const scan = ov.querySelector('#reveal-scan');
    for (let i = 0; i < 7; i++) {
      const c = document.createElement('div');
      c.className = 'reveal-scan-candle';
      scan.appendChild(c);
    }
  }
  ov.style.display = 'flex';
  _suspStart = Date.now();

  // Barra: 0 → 100% ao longo do tempo mínimo de suspense.
  const bar = ov.querySelector('#reveal-progress-bar');
  bar.style.transition = 'none';
  bar.style.width = '0%';
  void bar.offsetWidth; // força reflow pra a transição valer
  bar.style.transition = `width ${SUSPENSE_MIN_MS}ms linear`;
  bar.style.width = '100%';

  // Velas piscando.
  const candles = ov.querySelectorAll('.reveal-scan-candle');
  clearInterval(_suspInt);
  _suspInt = setInterval(() => {
    candles.forEach(c => {
      const x = Math.random();
      c.classList.remove('green', 'red');
      if (x < 0.42) c.classList.add('green');
      else if (x < 0.84) c.classList.add('red');
    });
    tocarTic((Date.now() - _suspStart) / SUSPENSE_MIN_MS);
  }, 110);

  // Status girando.
  const status = ov.querySelector('#reveal-susp-status');
  let si = 0;
  clearInterval(_suspTxtInt);
  _suspTxtInt = setInterval(() => {
    si = (si + 1) % _SUSP_STATUS.length;
    status.textContent = _SUSP_STATUS[si];
  }, 620);
}

// Fecha o suspense respeitando o tempo mínimo e então roda o callback (revelar).
function fecharSuspense(cb) {
  const restante = Math.max(0, SUSPENSE_MIN_MS - (Date.now() - _suspStart));
  setTimeout(() => {
    clearInterval(_suspInt); _suspInt = null;
    clearInterval(_suspTxtInt); _suspTxtInt = null;
    const ov = document.getElementById('reveal-suspense');
    if (ov) ov.style.display = 'none';
    if (typeof cb === 'function') cb();
  }, restante);
}

// Confete proporcional à raridade (Comum = sem chuva, Lendária = festa).
function dispararConfete(rarity) {
  const counts = { common: 0, rare: 18, epic: 42, legendary: 90 };
  const n = counts[rarity] || 0;
  if (!n) return;
  const cores = rarity === 'legendary'
    ? ['#ffc24b', '#fff0c8', '#f59e0b', '#ffd700']
    : ['#00eaff', '#ff2e8a', '#9d4edd', '#6ef5ff', '#22c55e'];
  const layer = document.createElement('div');
  layer.className = 'reveal-confete-layer';
  for (let i = 0; i < n; i++) {
    const p = document.createElement('span');
    p.className = 'reveal-confete';
    p.style.left = (Math.random() * 100) + 'vw';
    p.style.background = cores[Math.floor(Math.random() * cores.length)];
    p.style.animationDelay = (Math.random() * 0.5) + 's';
    p.style.animationDuration = (1.6 + Math.random() * 1.4) + 's';
    layer.appendChild(p);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 3300);
}

// ── SORTEIO DE CENÁRIO (Pilar 1) ────────────────────────────────────────────
// Mata o "determinístico": a MESMA pintura testada contra um cenário sorteado
// (par + janela de horário) dá uma carta diferente — RNG de gacha, mas honesto
// (dado real). Sorteia só entre pares OTC PERMITIDOS pelo plano: OTC tem dados
// 24/7, então a janela sempre tem velas (evita resultado vazio). Free sorteia
// entre os 3 OTC liberados; Premium entre os 12 — gradiente sem gating duro.
// Reusa todo o fluxo de teste/revelação (suspense → flip → confete).
const _SESSOES_SORTEIO = [
  { nome: 'Madrugada', ini: '00:00', fim: '05:59' },
  { nome: 'Manhã',     ini: '06:00', fim: '11:59' },
  { nome: 'Tarde',     ini: '12:00', fim: '17:59' },
  { nome: 'Noite',     ini: '18:00', fim: '23:59' },
];

function sortearCenario() {
  const pool = PARES_OTC.filter(p => !parBloqueado(p));
  if (!pool.length) {
    showToast('⚠️ Sem pares', 'Nenhum par disponível pra sortear no seu plano.', 'default');
    return;
  }
  const par = pool[Math.floor(Math.random() * pool.length)];
  const sess = _SESSOES_SORTEIO[Math.floor(Math.random() * _SESSOES_SORTEIO.length)];

  strategyState.pair = par;
  strategyState.pairFilter = 'otc';
  strategyState.scheduleStart = sess.ini;
  strategyState.scheduleEnd = sess.fim;
  strategyState.periodoModo = 'tudo';
  strategyState.periodoDataDe = null;
  strategyState.periodoDataAte = null;
  const fimH = sess.fim === '23:59' ? '24h' : sess.fim.slice(0, 2) + 'h';
  strategyState.cenarioSorteado = `${par} · ${sess.nome} (${sess.ini.slice(0, 2)}h–${fimH})`;

  testStrategy(); // dispara suspense → backtest real → revelação da carta
}

// ════════════════════════════════════════════════
// SIMULAÇÃO FINANCEIRA EDUCACIONAL
// Painel rápido abaixo do resultado do backtest: usuário informa banca,
// payout e entrada, clica num preset (Mão Fixa / Soros / Soros Agressivo)
// e vê o resultado simulado. Usa simularGerenciamentoComHistorico() de
// gerenciamento.js, que já está carregado na mesma página.
// Só aparece quando o backtest gerou uma sequência cronológica (r.sequencia).
// ════════════════════════════════════════════════

function montarPainelSimulacaoHTML(r) {
  // DESATIVADO temporariamente (pedido do Diego): a Simulação Financeira aqui
  // ficou obsoleta — já existe uma aba dedicada pra isso (Testar Gerenciamento).
  // Pra reativar: apagar este return.
  return '';
  if (!Array.isArray(r.sequencia) || !r.sequencia.length) return '';
  return `
    <div id="sim-financeira" style="margin-top:16px; border:2px solid var(--border); border-radius:12px; padding:24px;">
      <div style="font-size:15px; font-weight:700; margin-bottom:4px;">💰 Simulação Financeira</div>
      <div style="font-size:12px; color:var(--text-secondary); margin-bottom:18px;">Quanto teria resultado se você tivesse operado com esse histórico real de ${r.sequencia.length.toLocaleString('pt-BR')} entradas?</div>

      <div style="display:flex; gap:12px; flex-wrap:wrap; margin-bottom:16px; align-items:flex-end;">
        <div>
          <label style="font-size:11px; color:var(--text-secondary); display:block; margin-bottom:4px; text-transform:uppercase; letter-spacing:.05em;">Banca (R$)</label>
          <input id="sim-banca" type="number" value="100" min="1" step="10"
            style="width:90px; background:var(--bg); border:1px solid var(--border); border-radius:8px; padding:8px 10px; color:var(--text-primary); font-size:14px;">
        </div>
        <div>
          <label style="font-size:11px; color:var(--text-secondary); display:block; margin-bottom:4px; text-transform:uppercase; letter-spacing:.05em;">Payout (%)</label>
          <input id="sim-payout" type="number" value="85" min="1" max="100"
            style="width:72px; background:var(--bg); border:1px solid var(--border); border-radius:8px; padding:8px 10px; color:var(--text-primary); font-size:14px;">
        </div>
        <div>
          <label style="font-size:11px; color:var(--text-secondary); display:block; margin-bottom:4px; text-transform:uppercase; letter-spacing:.05em;">Entrada (R$)</label>
          <input id="sim-entrada" type="number" value="10" min="0.5" step="1"
            style="width:72px; background:var(--bg); border:1px solid var(--border); border-radius:8px; padding:8px 10px; color:var(--text-primary); font-size:14px;">
        </div>
      </div>

      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px;">
        <button onclick="rodarSimulacaoPreset('fixo')"
          style="padding:8px 16px; border-radius:8px; border:1px solid var(--border); background:var(--bg); color:var(--text-primary); cursor:pointer; font-size:13px; font-weight:600; transition:border-color .2s;"
          onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
          ✋ Mão Fixa
        </button>
        <button onclick="rodarSimulacaoPreset('soros2')"
          style="padding:8px 16px; border-radius:8px; border:1px solid var(--border); background:var(--bg); color:var(--text-primary); cursor:pointer; font-size:13px; font-weight:600; transition:border-color .2s;"
          onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
          📈 Soros Simples
        </button>
        <button onclick="rodarSimulacaoPreset('soros3')"
          style="padding:8px 16px; border-radius:8px; border:1px solid var(--border); background:var(--bg); color:var(--text-primary); cursor:pointer; font-size:13px; font-weight:600; transition:border-color .2s;"
          onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
          🚀 Soros Agressivo
        </button>
      </div>

      <div id="sim-resultado" style="display:none; margin-bottom:16px;"></div>

      <div style="font-size:11px; color:var(--text-muted); padding:10px 14px; background:rgba(224,78,74,.06); border:1px solid rgba(224,78,74,.25); border-radius:8px; line-height:1.55;">
        ⚠️ <strong>Simulação educacional</strong> com dados históricos. Não é recomendação de investimento e não garante resultados futuros. Opções binárias têm alto risco de perda total.
      </div>
    </div>
  `;
}

function rodarSimulacaoPreset(presetNome) {
  const r = strategyState.lastResult;
  if (!r || !Array.isArray(r.sequencia) || !r.sequencia.length) return;

  const bancaDisponivel = parseFloat(document.getElementById('sim-banca').value) || 100;
  const payout = parseFloat(document.getElementById('sim-payout').value) || 85;
  const valorEntrada = parseFloat(document.getElementById('sim-entrada').value) || 10;

  if (valorEntrada > bancaDisponivel) {
    const cont = document.getElementById('sim-resultado');
    if (cont) {
      cont.style.display = 'block';
      cont.innerHTML = '<div style="padding:12px; background:rgba(224,78,74,.1); border-radius:8px; color:var(--danger); font-size:13px;">⚠️ A entrada não pode ser maior que a banca disponível.</div>';
    }
    return;
  }

  const presets = {
    fixo:   { resultado: 'fixo',    valorEntrada, niveis: 0, momento: 'vela', nome: 'Mão Fixa',         icone: '✋' },
    soros2: { resultado: 'vitoria', valorEntrada, niveis: 2, baseSoros: 'lucro_total', percentualSoros: 100, momento: 'vela', nome: 'Soros Simples',    icone: '📈' },
    soros3: { resultado: 'vitoria', valorEntrada, niveis: 3, baseSoros: 'lucro_total', percentualSoros: 100, momento: 'vela', nome: 'Soros Agressivo', icone: '🚀' },
  };
  const g = presets[presetNome];
  if (!g) return;

  // Destaca botão ativo
  ['fixo', 'soros2', 'soros3'].forEach(k => {
    const presetLabels = { fixo: '✋ Mão Fixa', soros2: '📈 Soros Simples', soros3: '🚀 Soros Agressivo' };
    document.querySelectorAll('#sim-financeira button').forEach(btn => {
      const ativo = btn.textContent.trim() === presetLabels[presetNome];
      btn.style.borderColor = ativo ? 'var(--accent)' : 'var(--border)';
      btn.style.color = ativo ? 'var(--accent)' : 'var(--text-primary)';
    });
  });

  const sim = simularGerenciamentoComHistorico(g, r.sequencia, { bancaDisponivel, payout });
  renderSimulacaoResultado(sim, g.nome, g.icone, bancaDisponivel);
}

function renderSimulacaoResultado(sim, nomePreset, icone, bancaInicial) {
  const cont = document.getElementById('sim-resultado');
  if (!cont) return;

  const positivo = sim.lucroFinal >= 0;
  const corLucro = positivo ? 'var(--success)' : 'var(--danger)';
  const sinal = positivo ? '+' : '';
  const fmt = (n) => Math.abs(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const zeruHTML = sim.zerou
    ? `<div style="grid-column:1/-1; margin-top:4px; padding:10px 14px; background:rgba(224,78,74,.1); border-radius:8px; color:var(--danger); font-size:13px; font-weight:600;">
        ⚠️ Banca zerou na entrada ${sim.zerouNoIndex + 1} — a entrada pedida era maior que o saldo restante.
       </div>`
    : '';

  cont.style.display = 'block';
  cont.innerHTML = `
    <div style="border-radius:10px; padding:18px; background:var(--bg); border:1px solid var(--border);">
      <div style="font-size:12px; color:var(--text-secondary); margin-bottom:14px; text-transform:uppercase; letter-spacing:.05em;">
        ${icone} ${nomePreset} · ${sim.entradasTestadas.toLocaleString('pt-BR')} operações simuladas
      </div>
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(100px, 1fr)); gap:12px; text-align:center;">
        <div style="padding:12px; background:var(--bg-secondary, var(--bg)); border-radius:8px;">
          <div style="font-size:11px; color:var(--text-secondary); margin-bottom:4px;">Banca inicial</div>
          <div style="font-size:22px; font-weight:800;">R$ ${fmt(bancaInicial)}</div>
        </div>
        <div style="padding:12px; background:var(--bg-secondary, var(--bg)); border-radius:8px;">
          <div style="font-size:11px; color:var(--text-secondary); margin-bottom:4px;">Banca final</div>
          <div style="font-size:22px; font-weight:800; color:${corLucro};">R$ ${fmt(sim.bancaFinal)}</div>
        </div>
        <div style="padding:12px; background:var(--bg-secondary, var(--bg)); border-radius:8px;">
          <div style="font-size:11px; color:var(--text-secondary); margin-bottom:4px;">Resultado</div>
          <div style="font-size:22px; font-weight:800; color:${corLucro};">${sinal}R$ ${fmt(sim.lucroFinal)}</div>
        </div>
        <div style="padding:12px; background:var(--bg-secondary, var(--bg)); border-radius:8px;">
          <div style="font-size:11px; color:var(--text-secondary); margin-bottom:4px;">ROI</div>
          <div style="font-size:22px; font-weight:800; color:${corLucro};">${sinal}${Math.abs(sim.roiPct).toLocaleString('pt-BR', {minimumFractionDigits:1, maximumFractionDigits:1})}%</div>
        </div>
        <div style="padding:12px; background:var(--bg-secondary, var(--bg)); border-radius:8px;">
          <div style="font-size:11px; color:var(--text-secondary); margin-bottom:4px;">Drawdown máx.</div>
          <div style="font-size:22px; font-weight:800; color:var(--warning);">${sim.drawdownPct}%</div>
        </div>
        ${zeruHTML}
      </div>
    </div>
  `;
}
