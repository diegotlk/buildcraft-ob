/* ============================================================
   Binaryzando — Refinar
   ============================================================
   Pega uma estratégia salva, roda ela de novo contra um período
   (dia/semana/mês, igual ao Catalogador) e quebra a assertividade por
   DIA DA SEMANA e por HORÁRIO — comparando cada um com a média geral da
   própria estratégia nesse período, pra achar quando ela realmente vale
   a pena usar. Reaproveita montarPayloadEstrategia() (catalogador.js) e
   getEstrategiasSalvas() (build.js) — roda só 1 vez contra a API; toda a
   quebra por dia/hora é feita aqui em cima do sequencia_completa (ts+W/L/E).
   */

const REFINAR_API_URL = 'https://api.binaryzando.com';
const REFINAR_MIN_AMOSTRA = 5;
const REFINAR_DIAS_LABEL = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

const refinarState = {
  estrategiaId: null,
  visao: 'dia',           // 'dia' | 'hora'
  diasSemanaFiltro: new Set([0, 1, 2, 3, 4, 5, 6]),
  horasExcluidas: new Set(), // horas (0-23) que o usuário desmarcou na visão "Por Horário"
  resultado: null,        // { seq, tz } depois de rodar
};

// Mesmas estratégias re-testáveis do Build (pintar/quadrante/indicador/figura,
// sem espelho — ordem cronológica se perde ao combinar CALL+PUT).
function getEstrategiasRefináveis() {
  if (typeof getEstrategiasSalvas !== 'function') return [];
  return getEstrategiasSalvas().filter(item => !(item.mode === 'pintar' && item.definicao?.mirror));
}

function renderRefinarEstrategias() {
  const cont = document.getElementById('refinar-estrategias');
  if (!cont) return;

  const lista = getEstrategiasRefináveis();
  if (refinarState.estrategiaId && !lista.find(e => e.id === refinarState.estrategiaId)) {
    refinarState.estrategiaId = null;
  }
  cont.innerHTML = lista.length
    ? lista.map(e => renderBuildCardPick(e, refinarState.estrategiaId === e.id, 'setRefinarEstrategia')).join('')
    : '<p class="ger-empty">Nenhuma estratégia disponível pra refinar ainda. Salve uma em "Criar Estratégia" (cartas com espelho não entram aqui).</p>';

  const btn = document.getElementById('refinar-btn-rodar');
  if (btn) btn.disabled = !refinarState.estrategiaId;
}

function setRefinarEstrategia(id) {
  refinarState.estrategiaId = id;
  // Pré-seleciona o par/tf que a carta usou no teste original — o usuário
  // ainda pode trocar livremente antes de rodar.
  const carta = getInventario().find(e => e.id === id);
  if (carta) {
    const selPar = document.getElementById('refinar-par');
    const selTf = document.getElementById('refinar-tf');
    if (selPar && carta.teste?.pair) selPar.value = carta.teste.pair;
    if (selTf && carta.teste?.timeframeOperado) selTf.value = carta.teste.timeframeOperado;
  }
  renderRefinarEstrategias();
}

// Mesma ordenação (liberados primeiro) do seletor de pares do Catalogador.
function popularSelectParRefinar() {
  const sel = document.getElementById('refinar-par');
  if (!sel || typeof TODOS_OS_PARES === 'undefined') return;
  const pares = [...TODOS_OS_PARES].sort((a, b) => {
    const bloqA = typeof parBloqueado === 'function' && parBloqueado(a);
    const bloqB = typeof parBloqueado === 'function' && parBloqueado(b);
    if (bloqA !== bloqB) return bloqA ? 1 : -1;
    return a < b ? -1 : a > b ? 1 : 0;
  });
  sel.innerHTML = pares.map(par => {
    const bloqueado = typeof parBloqueado === 'function' && parBloqueado(par);
    const estilo = bloqueado ? '' : ' style="color:#00eaff;font-weight:700"';
    return `<option value="${par}" ${bloqueado ? 'disabled' : ''}${estilo}>${par}${bloqueado ? ' 🔒' : ''}</option>`;
  }).join('');
}

function aoTrocarPeriodoRefinar() {
  const aviso = document.getElementById('refinar-aviso-premium');
  if (aviso) aviso.style.display = 'none';
}

function renderRefinarDiasChips() {
  const cont = document.getElementById('refinar-dias-chips');
  if (!cont) return;
  const labels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  cont.innerHTML = labels.map((l, d) => `
    <button type="button" class="dia-chip${refinarState.diasSemanaFiltro.has(d) ? ' selected' : ''}"
            data-dia="${d}" onclick="toggleRefinarDiaSemana(${d}, this)">${l}</button>
  `).join('');
}

function toggleRefinarDiaSemana(d, el) {
  if (refinarState.diasSemanaFiltro.has(d) && refinarState.diasSemanaFiltro.size <= 1) {
    showToast('⚠️ Pelo menos 1 dia', 'Deixe ao menos um dia da semana marcado.', 'default');
    return;
  }
  if (refinarState.diasSemanaFiltro.has(d)) refinarState.diasSemanaFiltro.delete(d);
  else refinarState.diasSemanaFiltro.add(d);
  el.classList.toggle('selected');
  renderRefinarPorHora();
}

function setRefinarVisao(visao, btn) {
  refinarState.visao = visao;
  document.querySelectorAll('#refinar-visao-tabs .lab-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const filtro = document.getElementById('refinar-filtro-dias');
  if (filtro) filtro.style.display = visao === 'hora' ? 'block' : 'none';
  if (visao === 'dia') renderRefinarPorDia();
  else renderRefinarPorHora();
}

// ── RODAR ──
async function rodarRefinar() {
  const carta = getInventario().find(e => e.id === refinarState.estrategiaId);
  if (!carta) {
    showToast('⚠️ Escolha uma estratégia', 'Selecione uma carta antes de rodar.', 'default');
    return;
  }
  const par = document.getElementById('refinar-par')?.value;
  const tf = document.getElementById('refinar-tf')?.value || 'M1';
  const periodo = document.getElementById('refinar-periodo')?.value || 'semana';
  const dataStr = document.getElementById('refinar-data')?.value || '';
  if (!par) {
    showToast('⚠️ Escolha o par', 'Selecione um par pra rodar a análise.', 'default');
    return;
  }

  const estado = document.getElementById('refinar-estado');
  const resultadoBox = document.getElementById('refinar-resultado');
  if (estado) estado.textContent = '⏳ Rodando contra o histórico real...';
  if (resultadoBox) resultadoBox.style.display = 'none';

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';
  const { data_de, data_ate } = calcularIntervaloPeriodoCatalogador(periodo, dataStr);

  try {
    const payload = montarPayloadEstrategia(carta, { par, tf, data_de, data_ate, dias_semana: undefined, timezone: tz });
    const resp = await fetch(`${REFINAR_API_URL}/api/test-build`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const dados = await resp.json();
    if (!resp.ok || !dados.success) {
      if (estado) estado.textContent = dados.message || 'Não foi possível rodar a análise nesse período.';
      return;
    }
    const seq = dados.resultado.sequencia_completa || [];
    if (!seq.length) {
      if (estado) estado.textContent = 'Nenhuma entrada nesse período. Tenta um período maior ou outro par.';
      return;
    }

    refinarState.resultado = { seq, tz };
    refinarState.diasSemanaFiltro = new Set([0, 1, 2, 3, 4, 5, 6]);
    refinarState.horasExcluidas = new Set();
    if (estado) estado.textContent = '';
    if (resultadoBox) resultadoBox.style.display = 'block';
    renderRefinarDiasChips();
    setRefinarVisao('dia', document.querySelector('#refinar-visao-tabs .lab-tab'));
  } catch (e) {
    if (estado) estado.textContent = 'Erro de conexão com o servidor. Tenta de novo em alguns segundos.';
    console.error('[refinar] falha ao rodar:', e);
  }
}

// ── AGRUPAMENTO (dia da semana / hora, no fuso do usuário) ──
function refinarDiaSemanaTZ(ts, tz) {
  const wd = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(new Date(ts * 1000));
  return { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }[wd];
}

function refinarHoraTZ(ts, tz) {
  const h = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hour12: false }).format(new Date(ts * 1000));
  return parseInt(h, 10) % 24;
}

function refinarAgrupar(seq, chaveFn) {
  const buckets = new Map();
  for (const [ts, r] of seq) {
    const chave = chaveFn(ts);
    if (!buckets.has(chave)) buckets.set(chave, { wins: 0, losses: 0, empates: 0 });
    const b = buckets.get(chave);
    if (r === 'W') b.wins++;
    else if (r === 'L') b.losses++;
    else b.empates++;
  }
  return buckets;
}

function refinarWinrateBucket(b) {
  const decididas = b.wins + b.losses;
  return decididas ? (b.wins / decididas) * 100 : null;
}

function refinarWinrateGeral(seq) {
  let wins = 0, losses = 0;
  for (const [, r] of seq) {
    if (r === 'W') wins++;
    else if (r === 'L') losses++;
  }
  return (wins + losses) ? (wins / (wins + losses)) * 100 : 0;
}

function renderRefinarPorDia() {
  const { seq, tz } = refinarState.resultado;
  const buckets = refinarAgrupar(seq, ts => refinarDiaSemanaTZ(ts, tz));
  const geral = refinarWinrateGeral(seq);
  const linhas = [];
  for (let d = 0; d < 7; d++) {
    const b = buckets.get(d) || { wins: 0, losses: 0, empates: 0 };
    linhas.push({ label: REFINAR_DIAS_LABEL[d], wr: refinarWinrateBucket(b), n: b.wins + b.losses, total: b.wins + b.losses + b.empates });
  }
  renderRefinarLista(linhas, geral);
}

function renderRefinarPorHora() {
  const { seq, tz } = refinarState.resultado;
  const seqFiltrada = seq.filter(([ts]) => refinarState.diasSemanaFiltro.has(refinarDiaSemanaTZ(ts, tz)));
  const buckets = refinarAgrupar(seqFiltrada, ts => refinarHoraTZ(ts, tz));
  const geral = refinarWinrateGeral(seqFiltrada);
  const linhas = [];
  for (let h = 0; h < 24; h++) {
    const b = buckets.get(h) || { wins: 0, losses: 0, empates: 0 };
    linhas.push({ label: `${String(h).padStart(2, '0')}h`, chave: h, wr: refinarWinrateBucket(b), n: b.wins + b.losses, total: b.wins + b.losses + b.empates });
  }
  // Por horário, a ordem certa é cronológica (00h → 23h) — ordenar por
  // assertividade aqui embaralha a leitura de "quando" a estratégia funciona.
  renderRefinarLista(linhas, geral, { ordenarPorChave: true, toggleable: true, excluidas: refinarState.horasExcluidas, onToggle: 'toggleRefinarHora' });
}

function renderRefinarLista(linhas, geral, opts = {}) {
  const cont = document.getElementById('refinar-lista');
  if (!cont) return;
  const ordenadas = opts.ordenarPorChave
    ? [...linhas].sort((a, b) => a.chave - b.chave)
    : [...linhas].sort((a, b) => (b.wr ?? -1) - (a.wr ?? -1));
  const linhasHtml = ordenadas.map(l => {
    const excluida = opts.toggleable && opts.excluidas?.has(l.chave);
    const classesRow = ['refinar-row'];
    if (opts.toggleable) classesRow.push('refinar-row-com-check');
    if (excluida) classesRow.push('refinar-row-excluida');
    const checkHTML = opts.toggleable
      ? `<span class="refinar-row-check">${excluida ? '' : '✓'}</span>`
      : '';
    const onclickAttr = opts.toggleable ? ` onclick="${opts.onToggle}(${l.chave})"` : '';

    if (l.n === 0) {
      return `<div class="${classesRow.join(' ')}"${onclickAttr}>${checkHTML}<span class="refinar-row-label">${l.label}</span><span class="refinar-row-vazio">sem entradas</span></div>`;
    }
    const pequena = l.n < REFINAR_MIN_AMOSTRA;
    const acima = l.wr > geral;
    const classeCor = pequena ? 'neutro' : (acima ? 'acima' : 'abaixo');
    classesRow.push(`refinar-row-${classeCor}`);
    return `
      <div class="${classesRow.join(' ')}"${onclickAttr}>
        ${checkHTML}
        <span class="refinar-row-label">${l.label}</span>
        <span class="refinar-row-bar"><span class="refinar-row-fill" style="width:${Math.min(100, l.wr)}%"></span></span>
        <span class="refinar-row-wr">${l.wr.toFixed(1)}%</span>
        <span class="refinar-row-n">${l.n} entrada${l.n === 1 ? '' : 's'}${pequena ? ' · amostra pequena' : ''}</span>
      </div>`;
  }).join('');
  cont.innerHTML = `<div class="refinar-media">Média geral da estratégia nesse período: <strong>${geral.toFixed(1)}%</strong></div>${linhasHtml}`;
}

// Desmarca/remarca uma hora específica na visão "Por Horário" — mesmo
// espírito do toggle de dia da semana (fundo cinza + riscado quando fora).
function toggleRefinarHora(h) {
  if (refinarState.horasExcluidas.has(h)) refinarState.horasExcluidas.delete(h);
  else refinarState.horasExcluidas.add(h);
  renderRefinarPorHora();
}

// ── CRIAR NOVA CARTA A PARTIR DO REFINO ──
// Carrega a definição da estratégia-base na aba Criar, já com os dias da
// semana refinados aqui aplicados (isso o backend respeita de verdade —
// ver dias_semana em rodar_backtest/rodar_quadrante). O horário (Das/Até)
// vem pré-preenchido com o intervalo das horas mantidas, mas é só ponto de
// partida: o backend ainda não filtra por hora individual (schedule_start/
// schedule_end não são lidos hoje), só o recorte contínuo Das–Até quando
// isso for implementado. Revise o horário antes de testar.
function criarCartaRefinada() {
  const carta = getInventario().find(e => e.id === refinarState.estrategiaId);
  if (!carta) {
    showToast('⚠️ Escolha uma estratégia', 'Selecione e rode uma análise antes de criar a nova carta.', 'default');
    return;
  }
  if (typeof carregarDefinicaoExistente !== 'function') return;
  carregarDefinicaoExistente(carta.id);

  // Dias da semana: os que o usuário manteve marcados na visão "Por Horário".
  const diasKeep = [...refinarState.diasSemanaFiltro];
  if (typeof aplicarDiasSemanaUI === 'function') aplicarDiasSemanaUI(diasKeep);

  // Horário: envelope (min–max) das horas não excluídas.
  const horasKeep = Array.from({ length: 24 }, (_, h) => h).filter(h => !refinarState.horasExcluidas.has(h));
  let avisoHorario = '';
  if (horasKeep.length && horasKeep.length < 24) {
    const min = Math.min(...horasKeep);
    const max = Math.max(...horasKeep);
    const startInput = document.getElementById('schedule-start');
    const endInput = document.getElementById('schedule-end');
    const de = `${String(min).padStart(2, '0')}:00`;
    const ate = `${String(max).padStart(2, '0')}:59`;
    if (startInput) startInput.value = de;
    if (endInput) endInput.value = ate;
    strategyState.scheduleStart = de;
    strategyState.scheduleEnd = ate;
    avisoHorario = ` Horário pré-preenchido ${de}–${ate} (revise antes de testar).`;
  }

  // Troca pro grupo "Criar" sem passar por trocarAbaLab/trocarGrupoLab —
  // aquelas funções zeram strategyState.testandoExistente, que a gente
  // PRECISA manter (é o vínculo de linhagem "baseada em X" da nova carta).
  document.getElementById('lab-grupo-criar')?.classList.add('active');
  document.getElementById('lab-grupo-testar')?.classList.remove('active');
  document.getElementById('lab-grupo-catalogador')?.classList.remove('active');
  document.getElementById('lab-grupo-refinar')?.classList.remove('active');
  document.getElementById('lab-grupo-simulacao')?.classList.remove('active');
  document.getElementById('lab-grupo-personalizar')?.classList.remove('active');
  document.getElementById('lab-subtabs-criar').style.display = 'flex';
  document.getElementById('lab-subtabs-testar').style.display = 'none';
  document.getElementById('lab-tab-criar-estrategia')?.classList.add('active');

  showToast('➕ Nova carta a partir do refino', `"${carta.nome}" carregada com os dias refinados.${avisoHorario}`, 'default');
}

document.addEventListener('DOMContentLoaded', () => {
  popularSelectParRefinar();
  renderRefinarEstrategias();
  aoTrocarPeriodoRefinar();
});

// Inventário sincroniza com o servidor de forma assíncrona — repopula o
// seletor de estratégias quando isso terminar.
document.addEventListener('inventarioSincronizado', renderRefinarEstrategias);
