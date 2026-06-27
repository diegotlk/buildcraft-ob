/* ============================================================
   Binaryzando — Histórico de Entradas
   Sequências reais de W/L (vindas do motor_backtest, via
   backtest_api.py) usadas para testar Gerenciamentos de verdade,
   em vez de uma simulação abstrata de pior/melhor caso.
   ============================================================ */

const HISTORICO_KEY = 'buildcraft_historicos';
const HISTORICO_API_URL = 'https://api.binaryzando.com';

// ── ARMAZENAMENTO ──
function getHistoricos() {
  try {
    return JSON.parse(localStorage.getItem(HISTORICO_KEY)) || [];
  } catch (e) {
    return [];
  }
}

// Devolve true se salvou de verdade, false se o navegador bloqueou (cota
// cheia, modo privado) — mesmo cuidado de inventario.js: sem o try/catch,
// isso quebrava silenciosamente o fluxo de quem chamou (ex.: salvar uma
// estratégia já guarda o histórico dela em seguida).
function salvarHistoricos(lista) {
  try {
    localStorage.setItem(HISTORICO_KEY, JSON.stringify(lista));
  } catch (e) {
    console.error('[historico] falha ao salvar no localStorage:', e);
    if (typeof showToast === 'function') {
      showToast('⚠️ Não consegui salvar o histórico',
        'O navegador bloqueou o armazenamento local (modo privado/anônimo ou sem espaço livre).',
        'default');
    }
    return false;
  }
  return true;
}

function excluirHistorico(id) {
  salvarHistoricos(getHistoricos().filter(h => h.id !== id));
  renderHistoricos();
}

// ── GERAR A PARTIR DO HISTÓRICO PADRÃO (entrada no verde, EURUSD) ──
const HISTORICO_PRESETS_INFO = {
  verde_eurusd_1000: { nome: 'Entrada no Verde — EURUSD · M1 · 1000 velas', timeframe: 'M1' },
};

function gerarHistoricoPadrao(presetId) {
  // O padrão "verde" já tem par fixo (EURUSD) no backend; o campo de par é só
  // um override opcional. Sem digitar nada, gera o EURUSD direto.
  const inputPar = document.getElementById('historico-padrao-par');
  const par = (inputPar && inputPar.value.trim()) || 'EURUSD-OTC';

  showToast('🔬 Gerando histórico', 'Pegando as últimas 1000 velas reais e marcando verde = ganho...', 'default');

  fetch(`${HISTORICO_API_URL}/api/historico-padrao`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ preset: presetId, pair: par }),
  })
    .then(response => response.json().then(data => ({ ok: response.ok, data })))
    .then(({ ok, data }) => {
      if (!ok || !data.success) {
        showToast('⚠️ Falhou', data.message || 'Tente outro par.', 'default');
        return;
      }
      const r = data.resultado;
      const item = {
        id: 'hist_' + Date.now(),
        nome: r.nome,
        origem: 'padrao',
        pair: r.pair,
        timeframe: r.timeframe,
        winrate: r.winrate,
        entries: r.entries,
        periodoDe: r.periodo_de,
        periodoAte: r.periodo_ate,
        velasUsadas: r.velas_usadas,
        sequencia: r.sequencia,
        criadoEm: new Date().toISOString(),
      };
      const lista = getHistoricos();
      lista.push(item);
      if (!salvarHistoricos(lista)) return;
      renderHistoricos();
      showToast('✅ Histórico gerado', `"${item.nome}" tem ${item.sequencia.length} entradas reais prontas para testar.`, 'discovery');
    })
    .catch(() => {
      showToast('❌ API offline', 'Inicie o backtest_api.py e tente de novo.', 'default');
    });
}

// ── GERAR A PARTIR DE UMA ESTRATÉGIA SALVA (inventário) ──
function listarEstrategiasParaHistorico() {
  // Só estratégias "pintar" (padrão de velas) carregam sequência real por
  // enquanto — os outros modos ainda não devolvem a sequência W/L da API.
  return getInventario().filter(e => !e.deletadoEm && e.mode === 'pintar');
}

function abrirGeradorHistoricoDeEstrategia() {
  const lista = listarEstrategiasParaHistorico();
  const cont = document.getElementById('historico-estrategia-lista');

  if (!lista.length) {
    cont.innerHTML = '<p style="text-align:center;color:var(--text-secondary);grid-column:1/-1;">Você ainda não tem estratégias de padrão de velas salvas no inventário. Crie e salve uma em "Criar Estratégia" primeiro.</p>';
  } else {
    cont.innerHTML = lista.map(e => `
      <div class="anchoring-card" onclick="gerarHistoricoDeEstrategia('${e.id}')">
        <div class="anchoring-title">📋 ${e.nome}</div>
        <div class="anchoring-desc">${e.teste.pair} · ${e.teste.winrate}% winrate na amostra salva</div>
      </div>
    `).join('');
  }

  document.getElementById('historico-estrategia-painel').style.display = 'block';
  document.getElementById('historico-estrategia-painel').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function fecharGeradorHistoricoDeEstrategia() {
  document.getElementById('historico-estrategia-painel').style.display = 'none';
}

function gerarHistoricoDeEstrategia(itemId) {
  const item = getInventario().find(e => e.id === itemId);
  if (!item) return;

  const periodoModo = document.querySelector('#historico-periodo-grid .selected').dataset.periodo;
  const dataDe = document.getElementById('historico-data-de').value;
  const dataAte = document.getElementById('historico-data-ate').value;

  if (periodoModo === 'personalizado' && (!dataDe || !dataAte)) {
    showToast('⚠️ Escolha as datas', 'Defina a data de início e fim do período.', 'default');
    return;
  }

  const d = item.definicao;
  const emojiParaNum = (c) => (c === '🟩' ? 1 : c === '🟥' ? -1 : null);
  const payload = {
    pattern: d.pattern.map(emojiParaNum),
    anchoring: d.anchoring,
    direction: d.direction,
    mirror: d.mirror,
    mirror_direction: d.mirrorDirection,
    pair: item.teste.pair,
    timeframe: item.teste.timeframeOperado || 'M1',
    periodo_modo: periodoModo,
    data_de: periodoModo === 'personalizado' ? dataDe : null,
    data_ate: periodoModo === 'personalizado' ? dataAte : null,
    timezone: typeof getFusoHorario === 'function' ? getFusoHorario() : null,
  };

  showToast('🔬 Gerando histórico', `Rodando "${item.nome}" contra o histórico real...`, 'default');

  fetch(`${HISTORICO_API_URL}/api/test-build`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
    .then(response => response.json().then(data => ({ ok: response.ok, data })))
    .then(({ ok, data }) => {
      if (!ok || !data.success) {
        showToast('⚠️ Falhou', data.message || 'Tente novamente.', 'default');
        return;
      }
      const r = data.resultado;
      if (!r.sequencia) {
        showToast('⚠️ Sem sequência', 'Essa combinação (com espelho ativado) não gera uma sequência cronológica utilizável.', 'default');
        return;
      }
      const novo = {
        id: 'hist_' + Date.now(),
        nome: `${item.nome} (histórico)`,
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
      };
      const lista = getHistoricos();
      lista.push(novo);
      if (!salvarHistoricos(lista)) return;
      fecharGeradorHistoricoDeEstrategia();
      renderHistoricos();
      showToast('✅ Histórico gerado', `"${novo.nome}" tem ${novo.sequencia.length} entradas reais prontas para testar.`, 'discovery');
    })
    .catch(() => {
      showToast('❌ API offline', 'Inicie o backtest_api.py e tente de novo.', 'default');
    });
}

function setHistoricoPeriodo(modo, el) {
  document.querySelectorAll('#historico-periodo-grid .direction-btn').forEach(b => b.classList.remove('selected'));
  if (el) el.classList.add('selected');
  document.getElementById('historico-periodo-datas').style.display = modo === 'personalizado' ? 'flex' : 'none';
}

function setHistoricoPeriodoRapido(dias, el) {
  const hoje = new Date();
  const fim = new Date(hoje);
  const inicio = new Date(hoje);
  inicio.setDate(inicio.getDate() - dias);

  const fmt = (d) => d.toISOString().slice(0, 10);
  document.getElementById('historico-data-de').value = fmt(inicio);
  document.getElementById('historico-data-ate').value = fmt(fim);
  setHistoricoPeriodo('personalizado', document.querySelector('#historico-periodo-grid [data-periodo="personalizado"]'));
  marcarAtalhoPeriodo(el); // destaca o atalho clicado (definido em strategy-builder.js)
}

// ── RENDERIZAÇÃO ──
function renderHistoricos() {
  const cont = document.getElementById('historico-lista');
  if (!cont) return;

  const lista = getHistoricos();
  cont.innerHTML = lista.length
    ? lista.slice().reverse().map(renderCardHistorico).join('')
    : '<p class="ger-empty">Nenhum histórico ainda. Gere um padrão ou a partir de uma estratégia salva.</p>';
}

function renderCardHistorico(h) {
  const tagOrigem = h.origem === 'padrao' ? '⭐ Padrão' : '📋 Da sua estratégia';
  return `
    <div class="glass-card ger-mini-card">
      <div>
        <div style="font-weight:700">📊 ${h.nome}</div>
        <div class="ger-mini-info">${tagOrigem} · ${h.pair} · ${h.timeframe} · ${h.sequencia.length} entradas · ${h.winrate}% winrate</div>
      </div>
      <button class="btn btn-sm btn-outline" onclick="excluirHistorico('${h.id}')">🗑️ Excluir</button>
    </div>
  `;
}
