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
  // Atualiza qualquer lista de histórico que esteja na tela: a de "Testar
  // Gerenciamento" (#historico-lista) e a de "Criar Histórico" (#ch-historico-lista).
  // Cada render null-checa o próprio container, então chamar as duas é seguro.
  renderHistoricos();
  if (typeof renderHistoricosCriados === 'function') renderHistoricosCriados();
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

/* ============================================================
   CRIAR HISTÓRICO — aba "Testar Estratégia" do Laboratório.
   Painel dedicado: escolhe uma estratégia salva (modo "pintar"),
   escolhe LIVREMENTE par + horário + período, e roda /api/test-build
   pra gerar uma sequência real de W/L salva nos históricos. Serve pra
   recuperar o histórico de uma carta perdida/comprada/excluída, ou pra
   criar quantos históricos novos quiser (outros pares/horários).

   Só modo "pintar": é o único que o motor roda respeitando recorte por
   par + hora + data (os demais modos rodam contra "as últimas N velas",
   sem recorte de calendário — daria um histórico enganoso pro período pedido).
   ============================================================ */
const criarHistState = { estrategiaId: null, pairFilter: 'otc', pair: null, periodoModo: 'tudo' };

// Entrada da aba (chamada por goToPhase('existente') em strategy-builder.js).
function abrirCriarHistorico() {
  const res = document.getElementById('ch-resultado');
  if (res) { res.style.display = 'none'; res.innerHTML = ''; }
  renderCriarHistEstrategias();
  renderCriarHistPares();
  renderHistoricosCriados();
  renderCriarHistCartaExata(getInventario().find(e => e.id === criarHistState.estrategiaId));
  atualizarBtnGerarHistorico();
}

function getEstrategiasParaCriarHistorico() {
  return getInventario().filter(e => !e.deletadoEm && e.mode === 'pintar');
}

function renderCriarHistEstrategias() {
  const cont = document.getElementById('ch-estrategia-lista');
  if (!cont) return;
  const lista = getEstrategiasParaCriarHistorico();
  // Se a estratégia selecionada foi excluída, cai a seleção junto.
  if (criarHistState.estrategiaId && !lista.find(e => e.id === criarHistState.estrategiaId)) {
    criarHistState.estrategiaId = null;
  }
  cont.innerHTML = lista.length
    ? lista.map(e => `
        <div class="build-card-pick ${criarHistState.estrategiaId === e.id ? 'selected' : ''}" onclick="setCriarHistEstrategia('${e.id}')">
          ${criarHistState.estrategiaId === e.id ? '<div class="build-card-pick-check">✓</div>' : ''}
          <div class="carta-flip-wrap" style="cursor:pointer;"><div class="carta-flip-inner">${renderCartaFront(e)}</div></div>
        </div>`).join('')
    : '<p class="ger-empty" style="grid-column:1/-1;">Você ainda não tem estratégias de padrão de velas (modo Pintar) salvas. Crie e salve uma em "Criar Estratégia" primeiro.</p>';
}

function setCriarHistEstrategia(id) {
  criarHistState.estrategiaId = id;
  // Pré-preenche o par com o que a carta já usou (só se o usuário ainda não
  // escolheu um) — ele pode trocar à vontade no fluxo de "novo cenário".
  const item = getInventario().find(e => e.id === id);
  if (item && item.teste && item.teste.pair && !criarHistState.pair) {
    criarHistState.pair = item.teste.pair;
    criarHistState.pairFilter = String(item.teste.pair).endsWith('-op') ? 'op' : 'otc';
    document.getElementById('ch-filtro-otc')?.classList.toggle('selected', criarHistState.pairFilter === 'otc');
    document.getElementById('ch-filtro-op')?.classList.toggle('selected', criarHistState.pairFilter === 'op');
  }
  renderCriarHistEstrategias();
  renderCriarHistPares();
  renderCriarHistCartaExata(item);
  atualizarBtnGerarHistorico();
}

// Bloco "🔁 Histórico desta carta" — mostra o cenário EXATO salvo na carta
// (par, timeframe, horário, período) e habilita o botão de gerar idêntico.
// Sem periodoDe salvo (carta antiga ou vinda de outro fluxo), não dá pra
// travar num período exato — some o bloco e sobra só o "novo cenário".
function renderCriarHistCartaExata(item) {
  const bloco = document.getElementById('ch-carta-exata');
  const resumo = document.getElementById('ch-carta-exata-resumo');
  if (!bloco || !resumo) return;

  const t = item?.teste;
  const temPeriodoExato = t && t.periodoDe && t.periodoDe !== '—' && t.periodoAte && t.periodoAte !== '—';
  if (!item || !temPeriodoExato) {
    bloco.style.display = 'none';
    return;
  }

  bloco.style.display = 'block';
  resumo.innerHTML = `
    <div><strong>Par:</strong> ${t.pair}</div>
    <div><strong>Timeframe:</strong> ${t.timeframeOperado || 'M1'}</div>
    <div><strong>Horário:</strong> ${t.scheduleStart}–${t.scheduleEnd}</div>
    <div><strong>Período:</strong> ${t.periodoDe} a ${t.periodoAte}</div>
    <div style="margin-top:6px; color:var(--text-secondary);">Resultado salvo na carta: <strong>${t.winrate}%</strong> · ${(t.entries || 0).toLocaleString('pt-BR')} entradas</div>
  `;
}

function gerarHistoricoDaCarta() {
  const item = getInventario().find(e => e.id === criarHistState.estrategiaId);
  if (!item) { showToast('⚠️ Escolha a estratégia', 'Selecione uma estratégia salva primeiro.', 'default'); return; }
  const t = item.teste;
  if (!t || !t.periodoDe || t.periodoDe === '—' || !t.periodoAte || t.periodoAte === '—') {
    showToast('⚠️ Sem período salvo', 'Essa carta não tem um período exato salvo pra reproduzir. Use "criar um histórico novo" abaixo.', 'default');
    return;
  }

  const d = item.definicao || {};
  const emojiParaNum = (c) => (c === '🟩' ? 1 : c === '🟥' ? -1 : null);
  const payload = {
    pattern: (d.pattern || []).map(emojiParaNum),
    anchoring: d.anchoring,
    direction: d.direction,
    mirror: d.mirror,
    mirror_direction: d.mirrorDirection,
    timeframe: t.timeframeOperado || 'M1',
    pair: t.pair,
    schedule_start: t.scheduleStart,
    schedule_end: t.scheduleEnd,
    periodo_modo: 'personalizado',
    data_de: t.periodoDe,
    data_ate: t.periodoAte,
    dias_semana: (Array.isArray(d.diasSemana) && d.diasSemana.length && d.diasSemana.length < 7) ? d.diasSemana : null,
    timezone: typeof getFusoHorario === 'function' ? getFusoHorario() : null,
  };

  const btn = document.getElementById('ch-btn-gerar-exato');
  const txtOriginal = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:middle;"></span> Gerando...';
  }
  showToast('🔬 Gerando histórico', `Reproduzindo "${item.nome}" exatamente como foi salva...`, 'default');

  fetch(`${HISTORICO_API_URL}/api/test-build`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
    .then(response => response.json().then(data => ({ ok: response.ok, data })))
    .then(({ ok, data }) => {
      if (!ok || !data.success) {
        showToast('⚠️ Falhou', (data && data.message) || 'Tente novamente.', 'default');
        return;
      }
      const r = data.resultado;
      if (!Array.isArray(r.sequencia) || !r.sequencia.length) {
        showToast('⚠️ Sem entradas', 'Estratégias com espelho ativado não geram uma sequência cronológica utilizável.', 'default');
        return;
      }

      // Alerta se, por alguma razão (janela de velas mudou, TZ diferente etc.),
      // o resultado reproduzido não bater com o que a carta mostra — o usuário
      // pediu explicitamente que isso NUNCA passe batido.
      const bateWinrate = Math.abs(r.winrate - t.winrate) < 0.05;
      const bateEntries = r.entries === t.entries;
      if (!bateWinrate || !bateEntries) {
        showToast('⚠️ Resultado não bateu exatamente',
          `Carta: ${t.winrate}% (${t.entries} ops) · Reproduzido: ${r.winrate}% (${r.entries} ops). Salvo mesmo assim, mas vale conferir.`,
          'default');
      }

      const novo = {
        id: 'hist_' + Date.now(),
        nome: `${item.nome} (idêntico)`,
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
        sequencia_rica: r.sequencia_rica || null,
        criadoEm: new Date().toISOString(),
      };
      const lista = getHistoricos();
      lista.push(novo);
      if (!salvarHistoricos(lista)) return;
      renderHistoricosCriados();

      const res = document.getElementById('ch-resultado');
      if (res) {
        res.style.display = 'block';
        res.innerHTML = `
          <div class="glass-card" style="padding:18px; text-align:center; border:1px solid var(--accent);">
            <div style="font-weight:800; margin-bottom:6px;">✅ Histórico idêntico gerado</div>
            <div style="font-size:13px; color:var(--text-secondary); margin-bottom:12px;">"${novo.nome}"</div>
            <div style="display:flex; gap:16px; justify-content:center; flex-wrap:wrap;">
              <div><div style="font-size:22px; font-weight:800;">${r.entries.toLocaleString('pt-BR')}</div><div style="font-size:11px; color:var(--text-secondary);">Entradas</div></div>
              <div><div style="font-size:22px; font-weight:800; color:${bateWinrate ? 'var(--success)' : 'var(--warning)'};">${r.winrate}%</div><div style="font-size:11px; color:var(--text-secondary);">Winrate</div></div>
            </div>
            <div style="font-size:12px; color:var(--text-muted); margin-top:12px;">Já disponível em <strong>Criar/Testar Gerenciamento</strong> e no Inventário → Históricos.</div>
          </div>`;
      }
      showToast('✅ Histórico gerado', `"${novo.nome}" — ${novo.sequencia.length} entradas, ${bateWinrate ? 'mesmo resultado da carta' : 'confira a diferença acima'}.`, 'discovery');
    })
    .catch(() => {
      showToast('❌ API offline', 'Não consegui falar com o servidor agora. Tente de novo em um instante.', 'default');
    })
    .finally(() => {
      if (btn) btn.innerHTML = txtOriginal;
      const btn2 = document.getElementById('ch-btn-gerar-exato');
      if (btn2) btn2.disabled = false;
    });
}

function setCriarHistPairFilter(f) {
  criarHistState.pairFilter = f;
  document.getElementById('ch-filtro-otc')?.classList.toggle('selected', f === 'otc');
  document.getElementById('ch-filtro-op')?.classList.toggle('selected', f === 'op');
  renderCriarHistPares();
}

function renderCriarHistPares() {
  const cont = document.getElementById('ch-pares');
  if (!cont) return;
  const pares = criarHistState.pairFilter === 'otc' ? PARES_OTC : PARES_OP;
  cont.innerHTML = pares.map(p =>
    `<button class="direction-btn ${criarHistState.pair === p ? 'selected' : ''}" onclick="setCriarHistPair('${p}')">${p}</button>`
  ).join('');
}

function setCriarHistPair(p) {
  criarHistState.pair = p;
  renderCriarHistPares();
  atualizarBtnGerarHistorico();
}

function setCriarHistPeriodo(modo, el) {
  criarHistState.periodoModo = modo;
  document.querySelectorAll('#ch-periodo-grid .direction-btn').forEach(b => b.classList.remove('selected'));
  if (el) el.classList.add('selected');
  document.getElementById('ch-periodo-datas').style.display = modo === 'personalizado' ? 'block' : 'none';
}

function setCriarHistPeriodoRapido(dias, el) {
  const hoje = new Date();
  const fim = new Date(hoje);
  const inicio = new Date(hoje);
  inicio.setDate(inicio.getDate() - dias);
  const fmt = (d) => d.toISOString().slice(0, 10);
  document.getElementById('ch-data-de').value = fmt(inicio);
  document.getElementById('ch-data-ate').value = fmt(fim);
  setCriarHistPeriodo('personalizado', document.querySelector('#ch-periodo-grid [data-periodo="personalizado"]'));
  marcarAtalhoPeriodo(el); // destaca o atalho clicado (definido em strategy-builder.js)
}

function atualizarBtnGerarHistorico() {
  const btn = document.getElementById('ch-btn-gerar');
  if (!btn) return;
  btn.disabled = !(criarHistState.estrategiaId && criarHistState.pair);
}

function renderHistoricosCriados() {
  const cont = document.getElementById('ch-historico-lista');
  if (!cont) return;
  const lista = getHistoricos();
  cont.innerHTML = lista.length
    ? lista.slice().reverse().map(renderCardHistorico).join('')
    : '<p class="ger-empty">Nenhum histórico ainda. Escolha uma estratégia acima e gere o primeiro.</p>';
}

function gerarHistoricoCriar() {
  const item = getInventario().find(e => e.id === criarHistState.estrategiaId);
  if (!item) { showToast('⚠️ Escolha a estratégia', 'Selecione uma estratégia salva primeiro.', 'default'); return; }
  if (!criarHistState.pair) { showToast('⚠️ Escolha o par', 'Selecione o par pra rodar a estratégia.', 'default'); return; }

  const horaDe = document.getElementById('ch-hora-de').value || '00:00';
  const horaAte = document.getElementById('ch-hora-ate').value || '23:59';
  const periodoModo = criarHistState.periodoModo;
  const dataDe = document.getElementById('ch-data-de').value;
  const dataAte = document.getElementById('ch-data-ate').value;
  if (periodoModo === 'personalizado' && (!dataDe || !dataAte)) {
    showToast('⚠️ Escolha as datas', 'Defina a data de início e fim do período.', 'default');
    return;
  }

  const d = item.definicao || {};
  const emojiParaNum = (c) => (c === '🟩' ? 1 : c === '🟥' ? -1 : null);
  const payload = {
    pattern: (d.pattern || []).map(emojiParaNum),
    anchoring: d.anchoring,
    direction: d.direction,
    mirror: d.mirror,
    mirror_direction: d.mirrorDirection,
    timeframe: item.teste?.timeframeOperado || 'M1',
    pair: criarHistState.pair,
    schedule_start: horaDe,
    schedule_end: horaAte,
    periodo_modo: periodoModo,
    data_de: periodoModo === 'personalizado' ? dataDe : null,
    data_ate: periodoModo === 'personalizado' ? dataAte : null,
    dias_semana: (Array.isArray(d.diasSemana) && d.diasSemana.length && d.diasSemana.length < 7) ? d.diasSemana : null,
    timezone: typeof getFusoHorario === 'function' ? getFusoHorario() : null,
  };

  const btn = document.getElementById('ch-btn-gerar');
  const txtOriginal = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:middle;"></span> Gerando...';
  }
  showToast('🔬 Gerando histórico', `Rodando "${item.nome}" em ${criarHistState.pair}...`, 'default');

  fetch(`${HISTORICO_API_URL}/api/test-build`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
    .then(response => response.json().then(data => ({ ok: response.ok, data })))
    .then(({ ok, data }) => {
      if (!ok || !data.success) {
        showToast('⚠️ Falhou', (data && data.message) || 'Tente novamente.', 'default');
        return;
      }
      const r = data.resultado;
      if (!Array.isArray(r.sequencia) || !r.sequencia.length) {
        showToast('⚠️ Sem entradas',
          d.mirror ? 'Estratégias com espelho ativado não geram uma sequência cronológica utilizável.'
                   : 'Essa estratégia não gerou nenhuma entrada nesse par/horário/período. Tente outro par, horário mais amplo ou período maior.',
          'default');
        return;
      }
      const nomeData = (r.periodo_de && r.periodo_ate) ? `${r.periodo_de} a ${r.periodo_ate}` : new Date().toLocaleDateString('pt-BR');
      const novo = {
        id: 'hist_' + Date.now(),
        nome: `${item.nome} · ${r.pair} (${nomeData})`,
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
        sequencia_rica: r.sequencia_rica || null,
        criadoEm: new Date().toISOString(),
      };
      const lista = getHistoricos();
      lista.push(novo);
      if (!salvarHistoricos(lista)) return;
      renderHistoricosCriados();

      const res = document.getElementById('ch-resultado');
      if (res) {
        const acima = r.winrate >= 53.5;
        res.style.display = 'block';
        res.innerHTML = `
          <div class="glass-card" style="padding:18px; text-align:center; border:1px solid var(--accent);">
            <div style="font-weight:800; margin-bottom:6px;">✅ Histórico gerado</div>
            <div style="font-size:13px; color:var(--text-secondary); margin-bottom:12px;">"${novo.nome}"</div>
            <div style="display:flex; gap:16px; justify-content:center; flex-wrap:wrap;">
              <div><div style="font-size:22px; font-weight:800;">${r.entries.toLocaleString('pt-BR')}</div><div style="font-size:11px; color:var(--text-secondary);">Entradas</div></div>
              <div><div style="font-size:22px; font-weight:800; color:${acima ? 'var(--success)' : 'var(--danger)'};">${r.winrate}%</div><div style="font-size:11px; color:var(--text-secondary);">Winrate</div></div>
            </div>
            <div style="font-size:12px; color:var(--text-muted); margin-top:12px;">Já disponível em <strong>Criar/Testar Gerenciamento</strong> e no Inventário → Históricos.</div>
          </div>`;
      }
      showToast('✅ Histórico gerado', `"${novo.nome}" — ${novo.sequencia.length} entradas reais prontas pra usar em Gerenciamentos.`, 'discovery');
    })
    .catch(() => {
      showToast('❌ API offline', 'Não consegui falar com o servidor agora. Tente de novo em um instante.', 'default');
    })
    .finally(() => {
      if (btn) btn.innerHTML = txtOriginal;
      atualizarBtnGerarHistorico();
    });
}
