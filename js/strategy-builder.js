/* ============================================================
   BuildCraft OB — Strategy Builder Logic
   ============================================================ */

let strategyState = {
  patternLength: null,
  pattern: [],
  direction: null,
  anchoring: null,
  mirror: false,
  mirrorDirection: null,
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

  // Mostrar container de padrão
  document.getElementById('pattern-container-wrapper').style.display = 'block';
  renderPattern();

  // Scroll para o padrão
  setTimeout(() => {
    document.getElementById('pattern-container').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 100);
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

  // Atualizar botões
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
  // Padrão original
  const original = document.getElementById('original-mirror');
  original.innerHTML = '';
  strategyState.pattern.forEach(color => {
    const candle = document.createElement('div');
    candle.className = 'mirror-candle ' + getColorClass(color);
    candle.textContent = color;
    original.appendChild(candle);
  });

  // Padrão espelho
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

  // Mostrar seleção de direção para espelho
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

// ── NAVEGAÇÃO ENTRE FASES ──
function goToPhase(phase) {
  // Validações
  if (phase === 'direction' && !strategyState.patternLength) {
    showToast('⚠️ Escolha a quantidade de velas', 'Selecione 3, 5, 10 ou 20 velas.', 'default');
    return;
  }

  if (phase === 'anchoring' && !strategyState.direction) {
    showToast('⚠️ Escolha a direção', 'Você quer CALL, PUT ou OS DOIS?', 'default');
    return;
  }

  if (phase === 'mirror' && !strategyState.anchoring) {
    showToast('⚠️ Escolha a ancoragem', 'Exato ou No Mínimo?', 'default');
    return;
  }

  if (phase === 'review' && strategyState.mirror && !strategyState.mirrorDirection) {
    showToast('⚠️ Escolha a direção do espelho', 'CALL ou PUT para o padrão espelho?', 'default');
    return;
  }

  if (phase === 'review') {
    updateReviewContent();
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

// ── FASE 5: REVISÃO ──
function updateReviewContent() {
  const directionText = {
    call: '📈 CALL (Vela Verde)',
    put: '📉 PUT (Vela Vermelha)',
    both: '⚖️ OS DOIS (CALL + PUT)',
  };

  const anchoringText = {
    exato: '📌 Exato (vela anterior deve ser cor diferente)',
    minimo: '➡️ No Mínimo (vela anterior pode ser qualquer cor)',
  };

  let content = `
    <div style="margin-bottom: 20px;">
      <p style="margin-bottom: 12px;"><strong>🎯 Padrão:</strong></p>
      <div style="display: flex; gap: 4px; justify-content: center; font-size: 24px; margin-bottom: 16px;">
        ${strategyState.pattern.join('')}
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 14px;">
      <div>
        <p><strong>Direção:</strong></p>
        <p>${directionText[strategyState.direction]}</p>
      </div>
      <div>
        <p><strong>Ancoragem:</strong></p>
        <p>${anchoringText[strategyState.anchoring]}</p>
      </div>
    </div>
  `;

  if (strategyState.mirror) {
    const mirrorPattern = getMirrorPattern();
    const mirrorDirectionText = {
      call: '📈 CALL',
      put: '📉 PUT',
    };

    content += `
      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border-color);">
        <p style="margin-bottom: 12px;"><strong>🔀 Padrão Espelho:</strong></p>
        <div style="display: flex; gap: 4px; justify-content: center; font-size: 24px; margin-bottom: 12px;">
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

// ── TESTAR ESTRATÉGIA ──
function testStrategy() {
  // Validação final
  if (!strategyState.patternLength || !strategyState.direction || !strategyState.anchoring) {
    showToast('⚠️ Informação incompleta', 'Volte e preencha todos os campos.', 'default');
    return;
  }

  // TODO: Conectar com API de backtest
  showToast('🔬 Iniciando backtest', 'Testando sua estratégia contra o histórico real...', 'default');

  // Por enquanto, só mostra um toast
  console.log('Strategy para testar:', strategyState);
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
  // Renderizar preview do espelho de entrada
  updateMirrorPreview();
});
