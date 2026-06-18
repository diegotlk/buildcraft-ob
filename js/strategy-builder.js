/* ============================================================
   BuildCraft OB — Strategy Builder Logic (Fixed)
   ============================================================ */

let strategyState = {
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
};

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

// Tornar inputs de horário clicáveis
document.addEventListener('DOMContentLoaded', () => {
  const startInput = document.getElementById('schedule-start');
  const endInput = document.getElementById('schedule-end');

  if (startInput) startInput.addEventListener('focus', (e) => e.target.click());
  if (endInput) endInput.addEventListener('focus', (e) => e.target.click());
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

// ── TESTAR CONTRA API ──
function testStrategy() {
  if (!strategyState.pair) {
    showToast('⚠️ Erro', 'Volte e selecione um par.', 'default');
    return;
  }

  showToast('🔬 Iniciando backtest', 'Testando sua estratégia contra velas.db...', 'default');

  // Preparar dados para API
  const payload = {
    strategy_id: 'personalizada',
    pattern: strategyState.pattern.map(c => {
      if (c === '🟩') return 1;
      if (c === '🟥') return -1;
      return null;
    }),
    anchoring: strategyState.anchoring, // 'exato' ou 'minimo'
    direction: strategyState.direction, // 'call', 'put' ou 'both'
    mirror: strategyState.mirror,
    mirror_direction: strategyState.mirrorDirection,
    pair: strategyState.pair,
    schedule_start: strategyState.scheduleStart,
    schedule_end: strategyState.scheduleEnd,
  };

  // Chamar API Flask
  callBacktestAPI(payload);
}

function callBacktestAPI(payload) {
  fetch('http://localhost:5000/api/test-build', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (data.success) {
        showToast('✅ Backtest concluído!', 'Estratégia testada com sucesso.', 'discovery');
        console.log('Resultado do backtest:', data);
        // TODO: Mostrar resultado visual (cartão)
      } else {
        showToast('⚠️ Backtest falhou', data.message || 'Tente novamente.', 'default');
      }
    })
    .catch(error => {
      console.error('Erro na API:', error);
      showToast('❌ Erro de conexão', 'A API não está disponível. Certifique-se de que backtest_api.py está rodando.', 'default');
    });
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
