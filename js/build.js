/* ============================================================
   Binaryzando — Laboratório de Builds
   Uma Build = Estratégia salva + Gerenciamento salvo + banca/payout.
   Junta o histórico real de W/L da estratégia com o replay de banca
   do gerenciamento e gera uma carta de Build (raridade, nota, classe).
   ============================================================ */

const BUILD_API_URL = 'https://api.binaryzando.com';
const BUILD_STRATEGY_MODES = ['pintar', 'quadrante', 'indicador', 'figura'];

const buildState = {
  estrategiaId: null,
  gerenciamentoId: null,
  ultimoResultado: null,
  contexto: null,
};

// ── SELEÇÃO ──
// As duas listas vêm do mesmo lugar que o Inventário usa (cartas reais,
// já testadas) — assim qualquer exclusão (lixeira ou definitiva) some
// daqui automaticamente, sem precisar de uma limpeza separada.
function getEstrategiasSalvas() {
  return getInventario().filter(e => !e.deletadoEm && BUILD_STRATEGY_MODES.includes(e.mode));
}

function getGerenciamentosCartas() {
  return getInventario().filter(e => !e.deletadoEm && e.mode === 'gerenciamento');
}

function setBuildEstrategia(id) {
  buildState.estrategiaId = id;
  renderBuildPickers();
}

function setBuildGerenciamento(id) {
  buildState.gerenciamentoId = id;
  renderBuildPickers();
}

function renderBuildCardPick(item, selecionado, fnSelecao) {
  return `
    <div class="build-card-pick ${selecionado ? 'selected' : ''}" onclick="${fnSelecao}('${item.id}')">
      ${selecionado ? '<div class="build-card-pick-check">✓</div>' : ''}
      <div class="carta-flip-wrap" style="cursor:pointer;">
        <div class="carta-flip-inner">
          ${renderCartaFront(item)}
        </div>
      </div>
    </div>
  `;
}

function renderBuildPickers() {
  const estCont = document.getElementById('build-estrategias');
  const gerCont = document.getElementById('build-gerenciamentos');
  if (!estCont || !gerCont) return;

  const estrategias = getEstrategiasSalvas();
  // Se o item escolhido foi excluído (lixeira/etc.) enquanto estava
  // selecionado, a seleção cai junto — não pode sobrar uma carta fantasma.
  if (buildState.estrategiaId && !estrategias.find(e => e.id === buildState.estrategiaId)) {
    buildState.estrategiaId = null;
  }
  estCont.innerHTML = estrategias.length
    ? estrategias.map(e => renderBuildCardPick(e, buildState.estrategiaId === e.id, 'setBuildEstrategia')).join('')
    : '<p class="ger-empty">Nenhuma estratégia salva. Crie e salve uma na aba "Criar Estratégia".</p>';

  const gers = getGerenciamentosCartas();
  if (buildState.gerenciamentoId && !gers.find(g => g.id === buildState.gerenciamentoId)) {
    buildState.gerenciamentoId = null;
  }
  gerCont.innerHTML = gers.length
    ? gers.map(g => renderBuildCardPick(g, buildState.gerenciamentoId === g.id, 'setBuildGerenciamento')).join('')
    : '<p class="ger-empty">Nenhum gerenciamento testado ainda. Teste um na aba "Gerenciamento" e clique em "Salvar como carta".</p>';

  // Só libera testar a build com os dois escolhidos — não dá pra montar
  // uma build sem ter, de fato, uma estratégia E um gerenciamento.
  const btnTestar = document.getElementById('build-btn-testar');
  if (btnTestar) btnTestar.disabled = !(buildState.estrategiaId && buildState.gerenciamentoId);
}

// ── OBTER A SEQUÊNCIA REAL DA ESTRATÉGIA ──
// 1) usa um histórico já gerado dessa estratégia; 2) se for "pintar", gera na
// hora pela API; 3) caso contrário, orienta o usuário a gerar um histórico.
function obterSequenciaDaEstrategia(strat, onOk) {
  const hist = getHistoricos().find(h => h.estrategiaId === strat.id);
  if (hist) {
    onOk(hist.sequencia, {
      nome: hist.nome, pair: hist.pair, timeframe: hist.timeframe,
      winrate: hist.winrate, periodoDe: hist.periodoDe, periodoAte: hist.periodoAte,
    });
    return;
  }

  if (strat.mode !== 'pintar') {
    showToast('⚠️ Precisa de histórico', `Gere um histórico de "${strat.nome}" na aba Gerenciamento antes de montar a build.`, 'default');
    return;
  }

  const d = strat.definicao;
  const emojiParaNum = (c) => (c === '🟩' ? 1 : c === '🟥' ? -1 : null);
  const payload = {
    pattern: d.pattern.map(emojiParaNum),
    anchoring: d.anchoring,
    direction: d.direction,
    mirror: d.mirror,
    mirror_direction: d.mirrorDirection,
    pair: strat.teste.pair,
    timeframe: strat.teste.timeframeOperado || 'M1',
    periodo_modo: 'tudo',
  };

  showToast('🔬 Rodando estratégia', 'Gerando o histórico real de entradas...', 'default');
  fetch(`${BUILD_API_URL}/api/test-build`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  })
    .then(r => r.json().then(data => ({ ok: r.ok, data })))
    .then(({ ok, data }) => {
      if (!ok || !data.success || !data.resultado.sequencia) {
        showToast('⚠️ Falhou', (data && data.message) || 'Não foi possível gerar a sequência.', 'default');
        return;
      }
      const r = data.resultado;
      onOk(r.sequencia, {
        nome: `${strat.nome} (ao vivo)`, pair: r.pair, timeframe: r.timeframe,
        winrate: r.winrate, periodoDe: r.periodo_de, periodoAte: r.periodo_ate,
      });
    })
    .catch(() => showToast('❌ API offline', 'Inicie o backtest_api.py e tente de novo.', 'default'));
}

// ── CLASSE DESCRITIVA (seção 40 do documento mestre) ──
function classeDaBuild(r, winrate, entries) {
  const breakeven = 53.5;
  if (r.zerou || r.lucroFinal <= 0) return 'Frágil';
  const ganhoRel = r.lucroFinal / r.bancaDisponivel;
  if (entries < 50 && winrate >= 58) return 'Sniper';
  if (winrate < breakeven && r.lucroFinal > 0) return 'Anti-meta';
  if (r.drawdownPct <= 8) return ganhoRel >= 0.3 ? 'Tanque' : 'Defensiva';
  if (r.drawdownPct >= 35) return 'Agressiva';
  return 'Especialista';
}

// ── TESTAR BUILD JÁ SALVA ──
// Lista builds salvas no inventário; clicar numa carrega a mesma estratégia,
// gerenciamento, banca e payout na aba "Criar Build" pra rodar de novo.
function renderListaTestarBuild() {
  const cont = document.getElementById('testar-build-lista');
  if (!cont) return;

  const lista = getInventario().filter(e => !e.deletadoEm && e.mode === 'build');
  if (lista.length === 0) {
    cont.innerHTML = '<p style="text-align:center;color:var(--text-secondary);grid-column:1/-1;">Você ainda não tem nenhuma build salva. Crie uma primeiro em "Criar Build".</p>';
    return;
  }

  cont.innerHTML = lista.map(item => `
    <div class="carta-flip-wrap" onclick="carregarBuildParaTeste('${item.id}')">
      <div class="carta-flip-inner">
        ${renderCartaFront(item)}
      </div>
    </div>
  `).join('');
}

function carregarBuildParaTeste(id) {
  const item = getInventario().find(e => e.id === id);
  if (!item || item.mode !== 'build') return;

  const d = item.definicao;
  if (!getEstrategiasSalvas().find(e => e.id === d.estrategiaId) || !getGerenciamentosCartas().find(g => g.id === d.gerenciamentoId)) {
    showToast('⚠️ Estratégia ou gerenciamento ausente', 'A estratégia ou o gerenciamento dessa build não existe mais no seu inventário.', 'default');
    return;
  }

  buildState.estrategiaId = d.estrategiaId;
  buildState.gerenciamentoId = d.gerenciamentoId;

  trocarAbaLab('criar-build');
  document.getElementById('build-banca').value = item.teste.bancaDisponivel;
  document.getElementById('build-payout').value = item.teste.payout;
  renderBuildPickers();
  showToast('♻️ Build carregada', `"${item.nome}" carregada. Ajuste o que quiser e clique em "Testar Build".`, 'default');
}

// ── TESTAR A BUILD ──
function testarBuild() {
  const strat = getInventario().find(e => e.id === buildState.estrategiaId);
  const ger = getGerenciamentosCartas().find(g => g.id === buildState.gerenciamentoId);
  if (!strat) { showToast('⚠️ Escolha a estratégia', 'Selecione uma estratégia salva.', 'default'); return; }
  if (!ger) { showToast('⚠️ Escolha o gerenciamento', 'Selecione um gerenciamento.', 'default'); return; }

  const bancaDisponivel = parseFloat(document.getElementById('build-banca').value);
  const payout = parseFloat(document.getElementById('build-payout').value);
  if (!bancaDisponivel || bancaDisponivel <= 0) { showToast('⚠️ Banca inválida', 'Informe a banca disponível.', 'default'); return; }
  if (!payout || payout <= 0 || payout > 100) { showToast('⚠️ Payout inválido', 'Informe um payout entre 1 e 100%.', 'default'); return; }

  obterSequenciaDaEstrategia(strat, (sequencia, meta) => {
    const r = simularGerenciamentoComHistorico(ger.definicao, sequencia, { bancaDisponivel, payout });
    const wins = sequencia.filter(x => x !== 'L').length;
    const losses = sequencia.length - wins;
    const winrate = sequencia.length ? arred(wins / sequencia.length * 100, 1) : 0;
    const classe = classeDaBuild(r, winrate, sequencia.length);

    buildState.ultimoResultado = { ...r, winrate, wins, losses, entries: sequencia.length, classe };
    buildState.contexto = { strat, ger, meta };
    renderResultadoBuild();
  });
}

const BUILD_RARITY_LABEL = { common: 'Comum', rare: 'Rara', epic: 'Épica', legendary: 'Lendária' };
const BUILD_RARITY_COR = {
  common: 'var(--text-secondary)', rare: 'var(--rarity-rare)',
  epic: 'var(--rarity-epic)', legendary: 'var(--rarity-legendary)',
};

function renderResultadoBuild() {
  const r = buildState.ultimoResultado;
  const { strat, ger, meta } = buildState.contexto;
  const cor = BUILD_RARITY_COR[r.rarity];

  document.getElementById('build-resultado').style.display = 'block';
  document.getElementById('build-resultado').innerHTML = `
    <div style="border:2px solid ${cor}; border-radius:14px; padding:24px; background:rgba(99,102,241,0.04); margin-top:20px;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px; margin-bottom:18px;">
        <div>
          <div style="font-size:12px; color:var(--text-secondary); text-transform:uppercase; letter-spacing:.05em;">Resultado da Build</div>
          <div style="font-family:var(--font-display); font-size:1.25rem; font-weight:800;">${strat.nome} + ${ger.nome}</div>
          <div style="margin-top:6px;"><span class="badge badge-${r.rarity}">${BUILD_RARITY_LABEL[r.rarity]}</span>
            <span class="ger-chip" style="background:rgba(99,102,241,.14); color:var(--accent-hover);">${r.classe}</span></div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:42px; font-weight:900; color:${cor}; line-height:1;">${r.grade}</div>
        </div>
      </div>
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(110px, 1fr)); gap:14px;">
        ${cardStat(r.winrate + '%', 'Winrate', r.winrate >= 53.5 ? 'var(--success)' : 'var(--danger)')}
        ${cardStat(r.entries.toLocaleString('pt-BR'), 'Entradas')}
        ${cardStat(r.lucroFinal, 'Lucro/perda', r.lucroFinal >= 0 ? 'var(--success)' : 'var(--danger)')}
        ${cardStat(r.drawdownPct + '%', 'Maior queda')}
        ${cardStat(r.maxStakeAtingido, 'Maior entrada')}
      </div>
      ${r.zerou ? '<div style="margin-top:14px;font-size:13px;color:var(--danger);">⚠️ A banca zerou no meio do histórico — essa combinação não sobrevive a esse cenário.</div>' : ''}
      <div style="margin-top:12px; font-size:12px; color:var(--text-muted); text-align:center;">
        ${meta.pair} · ${meta.timeframe} · ${meta.periodoDe} a ${meta.periodoAte}
      </div>
      <div style="margin-top:18px; text-align:center;">
        <button class="btn btn-accent" onclick="salvarBuildNoInventario()">📥 Salvar Build no Inventário</button>
      </div>
    </div>
  `;
  document.getElementById('build-resultado').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function cardStat(valor, label, cor) {
  return `
    <div style="text-align:center; padding:12px; background:var(--bg); border-radius:8px;">
      <div style="font-size:22px; font-weight:800; ${cor ? `color:${cor};` : ''}">${valor}</div>
      <div style="font-size:11px; color:var(--text-secondary);">${label}</div>
    </div>`;
}

function salvarBuildNoInventario() {
  const r = buildState.ultimoResultado;
  const { strat, ger, meta } = buildState.contexto;
  if (!r) return;

  const item = {
    id: 'build_' + Date.now(),
    nome: `${strat.nome} + ${ger.nome}`,
    mode: 'build',
    criadaEm: new Date().toISOString(),
    definicao: {
      estrategiaId: strat.id, estrategiaNome: strat.nome,
      gerenciamentoId: ger.id, gerenciamentoNome: ger.nome,
      gerResultado: ger.definicao.resultado, gerMomento: ger.definicao.momento,
    },
    teste: {
      rarity: r.rarity, grade: r.grade, classe: r.classe,
      winrate: r.winrate, entries: r.entries, wins: r.wins, losses: r.losses,
      lucroFinal: r.lucroFinal, drawdownPct: r.drawdownPct, maxStakeAtingido: r.maxStakeAtingido,
      bancaDisponivel: r.bancaDisponivel, payout: r.payout, zerou: r.zerou,
      pair: meta.pair, timeframe: meta.timeframe, periodoDe: meta.periodoDe, periodoAte: meta.periodoAte,
    },
    carta: criarMetaCarta(),
  };

  const lista = getInventario();
  lista.push(item);
  if (!salvarInventario(lista)) return;
  showToast('🃏 Carta criada!', `"${item.nome}" agora é a carta #${String(item.carta.numero).padStart(3, '0')} do seu inventário.`, 'discovery');
  avisarShinySeAplicavel(item);
}
