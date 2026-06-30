/* ============================================================
   Binaryzando — Catalogador (Item 1: Grade de cores por período)
   ============================================================
   Busca as velas reais de um par num período FECHADO (dia/semana/mês,
   nunca "todo o histórico") e pinta cada uma como um "tijolo" verde/
   vermelho/cinza (doji), igual a parede de velas do Catalogador OB.
   Período longo (semana/mês) vem agregado por hora do dia — o backend
   decide isso (campo "modo": "velas" ou "horas"). Sem RNG, sem invenção
   — é o dado puro de velas.db. */

const CATALOGADOR_API_URL = 'https://api.binaryzando.com';

function popularSelectParesCatalogador() {
  const sel = document.getElementById('cat-par');
  if (!sel || typeof TODOS_OS_PARES === 'undefined') return;
  // Liberados primeiro (em ciano), trancados depois — senão fica difícil de
  // achar os liberados no meio da lista alfabética toda.
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

function aoTrocarPeriodoCatalogador() {
  const aviso = document.getElementById('cat-aviso-premium');
  if (aviso) aviso.style.display = 'none';
}

function renderTotaisCatalogador(totais) {
  const el = document.getElementById('cat-totais');
  if (!el) return;
  el.innerHTML = `
    <div class="cat-total-item verde">
      <span class="num">${totais.verde.n} · ${totais.verde.pct}%</span>
      <span class="lbl">Verde</span>
    </div>
    <div class="cat-total-item vermelha">
      <span class="num">${totais.vermelha.n} · ${totais.vermelha.pct}%</span>
      <span class="lbl">Vermelha</span>
    </div>
    <div class="cat-total-item doji">
      <span class="num">${totais.doji.n} · ${totais.doji.pct}%</span>
      <span class="lbl">Doji</span>
    </div>
  `;
}

// Quando uma carta está ativa, os totais mostram WIN/LOSS/EMPATE da carta em
// vez da cor crua da vela — é a pergunta que a carta responde.
function renderTotaisCarta(wins, losses, empates) {
  const el = document.getElementById('cat-totais');
  if (!el) return;
  const total = wins + losses + empates;
  const pct = (n) => total ? Math.round(n / total * 1000) / 10 : 0;
  el.innerHTML = `
    <div class="cat-total-item verde">
      <span class="num">${wins} · ${pct(wins)}%</span>
      <span class="lbl">Win</span>
    </div>
    <div class="cat-total-item vermelha">
      <span class="num">${losses} · ${pct(losses)}%</span>
      <span class="lbl">Loss</span>
    </div>
    <div class="cat-total-item doji">
      <span class="num">${empates} · ${pct(empates)}%</span>
      <span class="lbl">Empate</span>
    </div>
  `;
}

// ============================================================
// TESTAR CARTA NO CATALOGADOR
// ============================================================
// Reaproveita uma estratégia salva no inventário e mostra, na própria grade
// de velas reais, onde ela teria ganhado (verde), perdido (vermelha) ou
// empatado (cinza) — em vez da cor crua da vela. Funciona com qualquer modo
// re-testável (pintar, quadrante, indicador, figura — ver
// montarPayloadEstrategia); só cartas com espelho (CALL+PUT combinados)
// ficam de fora, porque a ordem cronológica se perde ao combinar os dois
// backtests.
// Mesmo padrão visual de seleção da aba Refinar (grade de cartas reais +
// tique no card escolhido) — null = nenhuma carta (mostra a cor crua da vela).
let catalogadorCartaId = null;

function renderCatalogadorEstrategias() {
  const cont = document.getElementById('cat-estrategias');
  if (!cont || typeof getEstrategiasSalvas !== 'function') return;

  const cartas = getEstrategiasSalvas().filter(item => !(item.mode === 'pintar' && item.definicao?.mirror));
  if (catalogadorCartaId && !cartas.some(c => c.id === catalogadorCartaId)) {
    catalogadorCartaId = null;
  }

  const semCartaSelecionada = !catalogadorCartaId;
  const tileSemCarta = `
    <div class="build-card-pick ${semCartaSelecionada ? 'selected' : ''}" onclick="setCatalogadorCarta(null)">
      ${semCartaSelecionada ? '<div class="build-card-pick-check">✓</div>' : ''}
      <div class="cat-sem-carta-tile">🚫<br>Sem carta<br><span>cor da vela</span></div>
    </div>
  `;
  cont.innerHTML = tileSemCarta + cartas.map(c =>
    renderBuildCardPick(c, catalogadorCartaId === c.id, 'setCatalogadorCarta')
  ).join('');
}

function setCatalogadorCarta(id) {
  catalogadorCartaId = id || null;
  renderCatalogadorEstrategias();
  if (typeof carregarCatalogador === 'function') carregarCatalogador();
}

// Replica em JS o mesmo cálculo de intervalo que o backend do Catalogador
// usa pro período fechado (dia/semana/mês) — pra mandar pro /api/test-build
// exatamente o mesmo recorte que a grade de velas está mostrando.
const CAT_PERIODO_DIAS = { dia: 1, semana: 7, mes: 30 };

function calcularIntervaloPeriodoCatalogador(periodo, dataStr) {
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const fim = dataStr ? new Date(dataStr + 'T00:00:00') : new Date();
  const ini = new Date(fim);
  ini.setDate(ini.getDate() - (CAT_PERIODO_DIAS[periodo] - 1));
  return { data_de: fmt(ini), data_ate: fmt(fim) };
}

// O padrão salvo na carta vem em emoji (🟩/🟥/⬜ — é como o canvas de desenho
// guarda), igual ao COLORS de strategy-builder.js. O backend espera número
// (1/-1/null); essa conversão normalmente só acontece no momento de testar
// (testStrategy() faz isso ali), e quem reaproveita uma carta salva precisa
// repetir aqui.
function catEmojiParaNum(c) {
  return c === '🟩' ? 1 : c === '🟥' ? -1 : null;
}

// Monta o payload de POST /api/test-build pra QUALQUER carta re-testável
// (pintar, quadrante — maioria/minoria/referência/flip —, indicador, montador,
// figura), a partir da definição salva + os parâmetros que o usuário escolheu
// na tela (par/timeframe/período/dias da semana/fuso). Usado pelo Catalogador
// ("testar carta") e pela aba Refinar — mesma regra genérica nos dois: o
// usuário decide onde rodar a estratégia, igual decidiria ao criar uma carta
// nova do zero. Cartas com espelho não são suportadas (a ordem cronológica
// se perde ao combinar os dois backtests).
function montarPayloadEstrategia(carta, { par, tf, data_de, data_ate, dias_semana, timezone }) {
  const def = carta.definicao || {};
  const base = {
    pair: par, periodo_modo: 'personalizado', data_de, data_ate,
    dias_semana, timezone,
  };

  if (carta.mode === 'figura') {
    return { ...base, mode: 'figura', figura: def.fig.tipo, timeframe: tf };
  }
  if (carta.mode === 'indicador' && def.ind?.tipo === 'montador') {
    const m = def.mont || {};
    return { ...base, mode: 'montador', condicoes: m.condicoes, combinador: m.combinador, direcao: m.direcao, timeframe: tf };
  }
  if (carta.mode === 'indicador') {
    return { ...base, mode: 'indicador', indicador: def.ind.tipo, params: def.ind.params, timeframe: tf };
  }
  if (carta.mode === 'quadrante' && def.q?.tipo === 'referencia') {
    const ref = def.q.ref;
    return {
      ...base, mode: 'referencia', nome: ref.nome, bloco_velas: ref.blocoVelas,
      ref_pos: ref.refPos, entry_pos: ref.entryPos, relacao: ref.relacao,
      ref_bloco: ref.refBloco, cond_posicoes: ref.condPosicoes, tf_entrada: tf,
    };
  }
  if (carta.mode === 'quadrante' && def.q?.tipo === 'confluencia') {
    const conf = def.q.conf;
    return { ...base, mode: 'confluencia', nome: conf.nome, spec_a: conf.specA, spec_b: conf.specB, tf_entrada: tf };
  }
  if (carta.mode === 'quadrante') {
    const q = def.q;
    return {
      ...base, mode: 'quadrante', tf_entrada: tf, bloco: q.bloco,
      analise_modo: q.analiseModo,
      analise_padrao: q.analiseModo === 'editar' ? (q.analisePadrao || []).map(catEmojiParaNum) : null,
      posicoes_analise: q.analiseModo === 'contar' ? q.posicoes : null,
      entrada_modo: q.entradaModo, entrada_pos: q.entradaPos,
    };
  }
  // 'pintar' (default)
  return {
    ...base,
    pattern: (def.pattern || []).map(catEmojiParaNum),
    anchoring: def.anchoring, direction: def.direction,
    mirror: !!def.mirror, mirror_direction: def.mirrorDirection,
    timeframe: tf,
    // sem filtro vindo de quem chamou, respeita o recorte de dias que a
    // própria carta já tinha quando foi salva (ex.: "Otimizar" achou que ela
    // só funciona de seg-sex) — isso é parte da regra da estratégia.
    dias_semana: dias_semana ?? def.diasSemana,
  };
}

// par/tf vêm do que está selecionado NA TELA do Catalogador — não da carta.
async function buscarOverlayCarta(carta, par, tf, periodo, dataStr, tz) {
  const { data_de, data_ate } = calcularIntervaloPeriodoCatalogador(periodo, dataStr);
  const payload = montarPayloadEstrategia(carta, { par, tf, data_de, data_ate, dias_semana: undefined, timezone: tz });
  const resp = await fetch(`${CATALOGADOR_API_URL}/api/test-build`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const dados = await resp.json();
  if (!resp.ok || !dados.success) {
    throw new Error(dados.message || 'Não foi possível testar a carta nesse período.');
  }
  return dados.resultado;
}

// Modo "velas": cada vela individual do período, igual a parede de tijolos.
// O horário SEMPRE aparece escrito dentro da célula — sem isso vira um monte
// de pontinho colorido sem significado nenhum. Período com muitas velas
// (semana) só fica "denso": célula menor e sem animação por célula (custaria
// caro em milhares de elementos), nunca sem o texto.
const CAT_LIMITE_DENSA = 300;

function renderGradeVelas(velas) {
  const el = document.getElementById('cat-grade');
  if (!el) return;
  const densa = velas.length > CAT_LIMITE_DENSA;
  el.classList.toggle('cat-grade-densa', densa);
  el.innerHTML = velas.map((v, i) => {
    const cor = v.cor;
    const titulo = `${v.hora} · ${v.cor}`;
    return densa
      ? `<div class="cat-vela ${cor}" title="${titulo}">${v.hora}</div>`
      : `<div class="cat-vela ${cor}" style="animation-delay:${Math.min(i * 6, 600)}ms" title="${titulo}">${v.hora}</div>`;
  }).join('');
}

// Overlay "testar carta": mostra SÓ as entradas (não a grade inteira de
// velas do período) — sem isso, com 1 entrada a cada hora ou mais, a grade
// fica 99% de células quase invisíveis e o pouco que importa vira pontinho
// espalhado. Compacta tudo junto, em ordem cronológica.
const CAT_COR_OVERLAY = { W: 'verde', L: 'vermelha', E: 'doji' };

function formatarDataHoraCatalogador(tsSegundos, tz) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: tz, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date(tsSegundos * 1000));
}

function renderGradeEntradas(entradas, tz) {
  const el = document.getElementById('cat-grade');
  if (!el) return;
  const densa = entradas.length > CAT_LIMITE_DENSA;
  el.classList.toggle('cat-grade-densa', densa);
  el.innerHTML = entradas.map(([ts, r], i) => {
    const cor = CAT_COR_OVERLAY[r];
    const label = formatarDataHoraCatalogador(ts, tz);
    const titulo = `${label} · ${r === 'W' ? 'WIN' : r === 'L' ? 'LOSS' : 'EMPATE'}`;
    return densa
      ? `<div class="cat-vela ${cor}" title="${titulo}">${label}</div>`
      : `<div class="cat-vela ${cor}" style="animation-delay:${Math.min(i * 6, 600)}ms" title="${titulo}">${label}</div>`;
  }).join('');
}

// Modo "horas": período longo (semana/mês) agregado em 24 células — uma
// por hora do dia, mostrando a cor dominante e a % verde/vermelha daquele
// horário ao longo de todo o período.
function renderGradeHoras(horas) {
  const el = document.getElementById('cat-grade');
  if (!el) return;
  el.classList.remove('cat-grade-densa');
  el.innerHTML = horas.map((h, i) => `
    <div class="cat-vela cat-vela-hora ${h.cor}" style="animation-delay:${Math.min(i * 20, 600)}ms"
         title="${h.hora} · ${h.total} velas · ${h.pct_verde}% verde / ${h.pct_vermelha}% vermelha">
      ${h.hora}
      <span class="cat-vela-pct">${h.cor === 'verde' ? h.pct_verde : h.pct_vermelha}%</span>
    </div>
  `).join('');
}

async function carregarCatalogador() {
  const par = document.getElementById('cat-par')?.value;
  const tf = document.getElementById('cat-tf')?.value || 'M1';
  const periodo = document.getElementById('cat-periodo')?.value || 'dia';
  const data = document.getElementById('cat-data')?.value || '';
  const estado = document.getElementById('cat-estado');
  const grade = document.getElementById('cat-grade');
  const totais = document.getElementById('cat-totais');

  if (!par) {
    estado.textContent = 'Escolha um par.';
    return;
  }

  estado.textContent = '⏳ Carregando velas reais...';
  grade.innerHTML = '';
  totais.innerHTML = '';

  const plano = (typeof ehPremium === 'function' && ehPremium()) ? 'premium' : 'free';
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';

  const params = new URLSearchParams({ par, tf, periodo, plano, tz });
  if (data) params.set('data', data);

  try {
    const resp = await fetch(`${CATALOGADOR_API_URL}/api/catalogador/grade?${params.toString()}`);
    const dados = await resp.json();

    if (!resp.ok || !dados.success) {
      estado.textContent = dados.message || 'Não foi possível carregar a grade desse par/período.';
      return;
    }

    const carta = catalogadorCartaId && typeof getInventario === 'function'
      ? getInventario().find(c => c.id === catalogadorCartaId) : null;

    if (carta && dados.modo === 'horas') {
      // Overlay de entradas só faz sentido vela a vela — período agregado
      // por hora (mês) não tem ts individual pra casar com a entrada.
      estado.textContent = 'Testar carta só funciona em "1 dia" ou "1 semana" (o mês agrega por hora e perde o timestamp de cada vela).';
      return;
    }

    if (carta) {
      try {
        const resultado = await buscarOverlayCarta(carta, par, tf, periodo, data, tz);
        const seq = resultado.sequencia_completa || [];
        const wins = seq.filter(([, r]) => r === 'W').length;
        const losses = seq.filter(([, r]) => r === 'L').length;
        const empates = seq.filter(([, r]) => r === 'E').length;
        renderTotaisCarta(wins, losses, empates);
        renderGradeEntradas(seq, tz);
        estado.textContent = seq.length ? '' : 'A carta não teve nenhuma entrada nesse período.';
      } catch (e) {
        estado.textContent = e.message || 'Não foi possível testar a carta nesse período.';
        console.error('[catalogador] falha ao testar carta:', e);
      }
      return;
    }

    estado.textContent = '';
    renderTotaisCatalogador(dados.totais);
    if (dados.modo === 'horas') {
      renderGradeHoras(dados.horas);
    } else {
      renderGradeVelas(dados.velas);
    }
  } catch (e) {
    estado.textContent = 'Erro de conexão com o servidor. Tenta de novo em alguns segundos.';
    console.error('[catalogador] falha ao buscar grade:', e);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  popularSelectParesCatalogador();
  renderCatalogadorEstrategias();
  aoTrocarPeriodoCatalogador();
  // Quando o Catalogador é a própria página (catalogador.html standalone),
  // a fase já nasce visível e busca a grade direto. Quando ele está embutido
  // como aba dentro do Laboratório (#phase-catalogador escondido por padrão),
  // só busca quando o usuário de fato abrir essa aba — trocarGrupoLab() faz
  // essa chamada nesse caso.
  const fase = document.getElementById('phase-catalogador');
  if (!fase || fase.classList.contains('active')) {
    carregarCatalogador();
  }
});

// Inventário sincroniza com o servidor de forma assíncrona (pode trazer
// cartas que não estavam no localStorage ainda) — repopula a grade quando
// isso terminar, sem precisar recarregar a página.
document.addEventListener('inventarioSincronizado', renderCatalogadorEstrategias);
