/* ============================================================
   BuildCraft OB — Strategy Builder Logic (Fixed)
   ============================================================ */

let strategyState = {
  mode: 'pintar', // 'pintar' (colorir velas) ou 'quadrante'
  patternLength: null,
  pattern: [],
  direction: null,
  anchoring: null,
  mirror: false,
  mirrorDirection: null,
  pairFilter: 'otc', // 'otc' ou 'op'
  pair: null,
  scheduleStart: '00:00',
  scheduleEnd: '23:59',
  // ── Campos do modo quadrante ──
  q: {
    tipo: 'quadrante',     // 'quadrante' (Família 1) ou 'referencia' (Famílias 2/3)
    ref: null,             // params da estratégia de referência (quando tipo='referencia')
    approach: null,        // 'preset' ou 'custom'
    presetNome: null,      // nome do preset escolhido (ex: 'MHI 1')
    bloco: 'M5',           // quadrante: 'M5' (5 velas) ou 'M15' (15 velas)
    analiseModo: 'contar', // 'contar' (maioria/minoria) ou 'editar' (pintar)
    analisePadrao: [],     // se editar: cores das velas do bloco
    posicoes: null,        // se contar: quais velas olhar (null=todas)
    posicoesLabel: 'todas',
    entradaModo: 'minoria', // 'maioria' (a favor) ou 'minoria' (contra)
    entradaPos: 0,          // 1ª=0, 2ª=1, 3ª=2... do próximo bloco
    entradaCor: 1,          // se direção por cor fixa (1=verde, -1=vermelha)
  },
};

// Presets clássicos de quadrante — Família 1 (Maioria/Minoria).
// entradaModo: 'minoria' (contra a maioria) ou 'maioria' (a favor).
const PRESETS_QUADRANTE = [
  { nome: 'MHI 1', bloco: 'M5', posicoes: [2, 3, 4], posicoesLabel: '3 últimas', entradaPos: 0, entradaModo: 'minoria', desc: '3 últimas velas; entra na 1ª do próximo, na minoria.' },
  { nome: 'MHI 2', bloco: 'M5', posicoes: [2, 3, 4], posicoesLabel: '3 últimas', entradaPos: 1, entradaModo: 'minoria', desc: '3 últimas velas; entra na 2ª do próximo, na minoria.' },
  { nome: 'MHI 3', bloco: 'M5', posicoes: [2, 3, 4], posicoesLabel: '3 últimas', entradaPos: 2, entradaModo: 'minoria', desc: '3 últimas velas; entra na 3ª do próximo, na minoria.' },
  { nome: 'MHI Maioria', bloco: 'M5', posicoes: [2, 3, 4], posicoesLabel: '3 últimas', entradaPos: 0, entradaModo: 'maioria', desc: '3 últimas velas; entra na 1ª do próximo, na maioria.' },
  { nome: 'Milhão Minoria', bloco: 'M5', posicoes: null, posicoesLabel: 'todas (5)', entradaPos: 0, entradaModo: 'minoria', desc: '5 velas do bloco; entra na 1ª do próximo, na minoria.' },
  { nome: 'Milhão Maioria', bloco: 'M5', posicoes: null, posicoesLabel: 'todas (5)', entradaPos: 0, entradaModo: 'maioria', desc: '5 velas do bloco; entra na 1ª do próximo, na maioria.' },
  { nome: 'Vituxo 2.0', bloco: 'M5', posicoes: [0, 1, 2], posicoesLabel: '3 primeiras', entradaPos: 2, entradaModo: 'maioria', desc: '3 primeiras velas; entra na 3ª do próximo, na maioria.' },
  { nome: 'D21', bloco: 'M5', posicoes: [0, 2, 3], posicoesLabel: 'velas 1, 3 e 4', entradaPos: 0, entradaModo: 'minoria', desc: 'Velas 1, 3 e 4; entra na 1ª do próximo, na minoria.' },
  { nome: 'Padrão 3x1', bloco: 'M5', posicoes: [0, 1, 2], posicoesLabel: '3 primeiras', entradaPos: 0, entradaModo: 'minoria', desc: '3 primeiras velas; entra na 1ª do próximo, na minoria.' },
];

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
    const btn = document.createElement('button');
    btn.className = 'direction-btn';
    btn.textContent = pair;
    btn.onclick = () => setPair(pair);
    if (strategyState.pair === pair) {
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
  return true;
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

  if (phase === 'pair' && strategyState.mirror && !strategyState.mirrorDirection) {
    showToast('⚠️ Escolha a direção do espelho', 'CALL ou PUT?', 'default');
    return;
  }

  if (phase === 'schedule' && !strategyState.pair) {
    showToast('⚠️ Escolha um par', 'Selecione qual par você quer testar.', 'default');
    return;
  }

  if (phase === 'review') {
    if (!setSchedule()) {
      return;
    }
    updateReviewContent();
  }

  // Inicializar pares na fase 5
  if (phase === 'pair') {
    setPairFilter('otc');
  }

  // Renderizar botões de vela de entrada ao chegar na fase Q5
  if (phase === 'q-entrada') {
    renderEntradaPos();
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

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 14px;">
      <div>
        <p><strong>Par:</strong></p>
        <p><code style="background: rgba(99, 102, 241, 0.1); padding: 4px 8px; border-radius: 4px;">${strategyState.pair}</code></p>
      </div>
      <div>
        <p><strong>Horário:</strong></p>
        <p>${strategyState.scheduleStart} - ${strategyState.scheduleEnd}</p>
      </div>
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
  const entradaTxt = q.entradaModo === 'maioria' ? '➡️ A favor da maioria' : '🔄 Contra (minoria)';

  let analiseTxt;
  if (q.analiseModo === 'editar') {
    analiseTxt = `🎨 Bloco pintado: <span style="font-size:20px;">${q.analisePadrao.join('')}</span>`;
  } else {
    analiseTxt = `🔢 Maioria/minoria · olhando ${q.posicoesLabel}`;
  }

  let content = `
    <div style="margin-bottom: 16px;">
      <p style="margin-bottom: 8px;"><strong>🔲 Estratégia de Quadrante${q.presetNome ? ' — ' + q.presetNome : ''}</strong></p>
      <p style="color: var(--text-secondary); font-size: 14px;">Quadrante de ${q.bloco === 'M15' ? '15' : '5'} min (${velasPorBloco()} velas de 1 min)</p>
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

// ── TESTAR CONTRA API ──
const API_URL = 'http://127.0.0.1:5000';

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

  showToast('🔬 Iniciando backtest', 'Testando sua estratégia contra o histórico real...', 'default');

  const emojiParaNum = (c) => (c === '🟩' ? 1 : c === '🟥' ? -1 : null);
  let payload;

  if (strategyState.mode === 'quadrante' && strategyState.q.tipo === 'referencia') {
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
      pair: strategyState.pair,
      schedule_start: strategyState.scheduleStart,
      schedule_end: strategyState.scheduleEnd,
    };
  } else if (strategyState.mode === 'quadrante') {
    const q = strategyState.q;
    payload = {
      mode: 'quadrante',
      tf_entrada: 'M1',
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
      pair: strategyState.pair,
      schedule_start: strategyState.scheduleStart,
      schedule_end: strategyState.scheduleEnd,
    };
  }

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
        showToast('✅ Backtest concluído!', 'Veja o resultado abaixo.', 'discovery');
        renderResult(data.resultado);
      } else {
        showToast('⚠️ Backtest falhou', data.message || 'Tente novamente.', 'default');
      }
    })
    .catch(error => {
      console.error('Erro na API:', error);
      showToast('❌ API offline', 'Inicie o backtest_api.py (clique em start_api.bat) e tente de novo.', 'default');
    })
    .finally(() => {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = textoOriginal;
      }
    });
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

  const html = `
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

      <div style="font-size:13px; color:var(--text-secondary); margin-bottom:16px; padding:12px; background:var(--bg); border-radius:8px;">
        📅 Período testado: <strong>${r.periodo_de}</strong> até <strong>${r.periodo_ate}</strong>
        &nbsp;·&nbsp; ${r.velas_usadas.toLocaleString('pt-BR')} velas reais analisadas
      </div>

      <div style="padding:16px; background:rgba(99,102,241,0.06); border-radius:8px; border-left:3px solid ${cor};">
        <div style="font-weight:600; margin-bottom:8px;">📊 Análise</div>
        <ul style="list-style:none; padding:0; margin:0; font-size:13px;">${insightsHTML}</ul>
      </div>
    </div>
  `;

  // Guarda o último resultado para poder salvar junto com a estratégia
  strategyState.lastResult = r;

  const container = document.getElementById('test-result');
  container.innerHTML = html;
  container.style.display = 'block';

  // Mostra o botão de criar nova estratégia agora que há um resultado
  const btnNova = document.getElementById('btn-nova-estrategia');
  if (btnNova) btnNova.style.display = 'inline-flex';

  container.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ── CRIAR NOVA ESTRATÉGIA (recomeçar do zero) ──
function resetStrategy() {
  // Zera todo o estado
  strategyState = {
    mode: 'pintar',
    patternLength: null,
    pattern: [],
    direction: null,
    anchoring: null,
    mirror: false,
    mirrorDirection: null,
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

  // Atualiza o preview do espelho (vazio) e volta para a escolha de modo
  updateMirrorPreview();
  goToPhase('mode');

  showToast('🆕 Nova estratégia', 'Tudo limpo. Escolha como montar a próxima!', 'default');
}

// ── SALVAR ESTRATÉGIA (leque de estratégias do usuário) ──
const STORAGE_KEY = 'buildcraft_estrategias';

function getEstrategiasSalvas() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function salvarEstrategias(lista) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
}

function showSaveForm() {
  // Validações: precisa de padrão, direção e ancoragem definidos
  if (!strategyState.pattern || strategyState.pattern.length === 0) {
    showToast('⚠️ Nada para salvar', 'Monte um padrão antes de salvar.', 'default');
    return;
  }
  if (!strategyState.direction || !strategyState.anchoring) {
    showToast('⚠️ Estratégia incompleta', 'Defina a direção e a ancoragem antes de salvar.', 'default');
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

  const lista = getEstrategiasSalvas();

  // Evita nomes duplicados
  if (lista.some(e => e.nome.toLowerCase() === nome.toLowerCase())) {
    showToast('⚠️ Nome já existe', 'Você já tem uma estratégia com esse nome.', 'default');
    input.focus();
    return;
  }

  // Salva apenas a DEFINIÇÃO da estratégia (sem par/horário, que variam).
  // O último resultado fica como referência do par em que foi testada.
  const estrategia = {
    id: 'est_' + Date.now(),
    nome: nome,
    pattern: [...strategyState.pattern],
    direction: strategyState.direction,
    anchoring: strategyState.anchoring,
    mirror: strategyState.mirror,
    mirrorDirection: strategyState.mirrorDirection,
    criadaEm: new Date().toISOString(),
    ultimoTeste: strategyState.lastResult
      ? {
          pair: strategyState.lastResult.pair,
          winrate: strategyState.lastResult.winrate,
          grade: strategyState.lastResult.grade,
        }
      : null,
  };

  lista.push(estrategia);
  salvarEstrategias(lista);

  document.getElementById('save-form').style.display = 'none';
  showToast('✅ Estratégia salva!', `"${nome}" foi adicionada ao seu leque (${lista.length} no total).`, 'discovery');
}

// ════════════════════════════════════════════════
// MODO QUADRANTE
// ════════════════════════════════════════════════
const Q_CORES = ['⬜', '🟩', '🟥'];

function velasPorBloco() {
  return strategyState.q.bloco === 'M15' ? 15 : 5;
}

// ── Escolha de modo (pintar vs quadrante) ──
function setMode(mode) {
  strategyState.mode = mode;
  if (mode === 'quadrante') {
    goToPhase('q-approach');
  } else {
    goToPhase('pattern');
  }
}

// ── Q1: presets ou custom ──
function setQApproach(approach, el) {
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
    const card = document.createElement('div');
    card.className = 'anchoring-card';
    card.onclick = () => loadPreset(p.nome);
    card.innerHTML = `
      <div class="anchoring-title">${p.nome}</div>
      <div class="anchoring-desc">${p.desc}</div>
      <div style="margin-top:8px; font-size:11px; color:var(--accent-hover);">Quadrante ${p.bloco} · ${p.posicoesLabel}</div>
    `;
    container.appendChild(card);
  });

  const refRepete = PRESETS_REFERENCIA.filter(p => p.familia === 'Repetição');
  const refFlip = PRESETS_REFERENCIA.filter(p => p.familia === 'Flip');

  const renderRef = p => {
    const card = document.createElement('div');
    card.className = 'anchoring-card';
    card.onclick = () => loadPreset(p.nome);
    card.innerHTML = `
      <div class="anchoring-title">${p.nome}</div>
      <div class="anchoring-desc">${p.desc}</div>
      <div style="margin-top:8px; font-size:11px; color:var(--accent-hover);">Ciclo de ${p.blocoVelas} velas</div>
    `;
    container.appendChild(card);
  };

  addGrupo('Repetição de posição', refRepete, renderRef);
  addGrupo('Reversão / Flip', refFlip, renderRef);
}

function loadPreset(nome) {
  // Procura nas duas listas
  const pQ = PRESETS_QUADRANTE.find(x => x.nome === nome);
  const pR = PRESETS_REFERENCIA.find(x => x.nome === nome);
  strategyState.q.approach = 'preset';
  strategyState.q.presetNome = nome;

  if (pQ) {
    strategyState.q.tipo = 'quadrante';
    strategyState.q.ref = null;
    strategyState.q.bloco = pQ.bloco;
    strategyState.q.analiseModo = 'contar';
    strategyState.q.posicoes = pQ.posicoes;
    strategyState.q.posicoesLabel = pQ.posicoesLabel;
    strategyState.q.entradaModo = pQ.entradaModo || 'minoria';
    strategyState.q.entradaPos = pQ.entradaPos;
    const dirTxt = strategyState.q.entradaModo === 'maioria' ? 'maioria' : 'minoria';
    showToast('⚡ Preset carregado', `${pQ.nome} · entra na ${dirTxt}. Agora escolha o par.`, 'default');
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

// ── Q2: bloco ──
function setQBloco(bloco, el) {
  strategyState.q.bloco = bloco;
  document.querySelectorAll('#phase-q-bloco .anchoring-card').forEach(c => c.classList.remove('selected'));
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
  document.getElementById('q-dir-maioria').classList.toggle('selected', modo === 'maioria');
  document.getElementById('q-dir-minoria').classList.toggle('selected', modo === 'minoria');
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

// ── Voltar da fase de par (depende do modo) ──
function voltarDoPair() {
  if (strategyState.mode === 'quadrante') {
    goToPhase(strategyState.q.approach === 'preset' ? 'q-approach' : 'q-entrada');
  } else {
    goToPhase('mirror');
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
});
