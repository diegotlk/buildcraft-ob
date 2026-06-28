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
  sel.innerHTML = TODOS_OS_PARES.map(par => {
    const bloqueado = typeof parBloqueado === 'function' && parBloqueado(par);
    return `<option value="${par}" ${bloqueado ? 'disabled' : ''}>${par}${bloqueado ? ' 🔒' : ''}</option>`;
  }).join('');
}

function aoTrocarPeriodoCatalogador() {
  const periodo = document.getElementById('cat-periodo')?.value;
  const aviso = document.getElementById('cat-aviso-premium');
  const souPremium = typeof ehPremium === 'function' && ehPremium();
  if (aviso) aviso.style.display = (periodo === 'mes' && !souPremium) ? 'block' : 'none';
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
// empatado (cinza) — em vez da cor crua da vela. Por ora só funciona com
// cartas do modo "pintar" (padrão de velas desenhado): os outros modos
// (quadrante, indicador, figura...) ainda não aceitam recorte por período
// fechado no backend.
function popularSelectCartasCatalogador() {
  const sel = document.getElementById('cat-carta');
  if (!sel || typeof getInventario !== 'function') return;
  const valorAtual = sel.value;
  const cartas = getInventario().filter(item => !item.deletadoEm && item.mode === 'pintar');
  sel.innerHTML = '<option value="">— Cor da vela (sem carta) —</option>' + cartas.map(c =>
    `<option value="${c.id}">${c.nome} (${c.teste.pair} · ${c.teste.timeframeOperado})</option>`
  ).join('');
  if (cartas.some(c => c.id === valorAtual)) sel.value = valorAtual;
}

function aoTrocarCartaCatalogador() {
  const cartaId = document.getElementById('cat-carta')?.value;
  const selPar = document.getElementById('cat-par');
  const selTf = document.getElementById('cat-tf');
  const aviso = document.getElementById('cat-carta-aviso');
  if (!cartaId) {
    selPar.disabled = false;
    selTf.disabled = false;
    aviso.style.display = 'none';
    return;
  }
  const carta = getInventario().find(c => c.id === cartaId);
  if (!carta) return;
  // A entrada da carta só faz sentido no par/timeframe em que ela foi
  // desenhada — trava os dois pra evitar comparar ts de mercados diferentes.
  selPar.value = carta.teste.pair;
  selTf.value = carta.teste.timeframeOperado;
  selPar.disabled = true;
  selTf.disabled = true;
  if (carta.definicao?.mirror) {
    aviso.textContent = '⚠️ Essa carta usa espelho (CALL+PUT combinados) — a ordem cronológica se perde ao combinar, então o overlay de entradas não fica disponível pra ela ainda.';
    aviso.style.display = 'block';
  } else {
    aviso.style.display = 'none';
  }
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
// (testStrategy() faz isso ali), e o Catalogador precisa repetir aqui.
function catEmojiParaNum(c) {
  return c === '🟩' ? 1 : c === '🟥' ? -1 : null;
}

async function buscarOverlayCarta(carta, periodo, dataStr, tz) {
  const def = carta.definicao || {};
  const { data_de, data_ate } = calcularIntervaloPeriodoCatalogador(periodo, dataStr);
  const payload = {
    pattern: (def.pattern || []).map(catEmojiParaNum), anchoring: def.anchoring, direction: def.direction,
    mirror: !!def.mirror, mirror_direction: def.mirrorDirection,
    pair: carta.teste.pair, timeframe: carta.teste.timeframeOperado,
    periodo_modo: 'personalizado', data_de, data_ate,
    dias_semana: def.diasSemana, timezone: tz,
  };
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

// overlayCarta: Map opcional ts -> 'W'/'L'/'E' (resultado da carta naquela
// vela). Quando presente, sobrepõe a cor crua da vela: W=verde, L=vermelha,
// E=cinza (empate) — vela sem entrada da carta fica quase invisível, pra só
// os pontos de entrada chamarem atenção.
const CAT_COR_OVERLAY = { W: 'verde', L: 'vermelha', E: 'doji' };

function renderGradeVelas(velas, overlayCarta) {
  const el = document.getElementById('cat-grade');
  if (!el) return;
  const densa = velas.length > CAT_LIMITE_DENSA;
  el.classList.toggle('cat-grade-densa', densa);
  el.innerHTML = velas.map((v, i) => {
    let cor = v.cor;
    let titulo = `${v.hora} · ${v.cor}`;
    if (overlayCarta) {
      const r = overlayCarta.get(v.ts);
      if (r) {
        cor = CAT_COR_OVERLAY[r];
        titulo = `${v.hora} · ${r === 'W' ? 'WIN' : r === 'L' ? 'LOSS' : 'EMPATE'}`;
      } else {
        cor = 'sem-entrada';
        titulo = `${v.hora} · sem entrada da carta`;
      }
    }
    return densa
      ? `<div class="cat-vela ${cor}" title="${titulo}">${v.hora}</div>`
      : `<div class="cat-vela ${cor}" style="animation-delay:${Math.min(i * 6, 600)}ms" title="${titulo}">${v.hora}</div>`;
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

    const cartaId = document.getElementById('cat-carta')?.value;
    const carta = cartaId && typeof getInventario === 'function'
      ? getInventario().find(c => c.id === cartaId) : null;

    if (carta && dados.modo === 'horas') {
      // Overlay de entradas só faz sentido vela a vela — período agregado
      // por hora (mês) não tem ts individual pra casar com a entrada.
      estado.textContent = 'Testar carta só funciona em "1 dia" ou "1 semana" (o mês agrega por hora e perde o timestamp de cada vela).';
      return;
    }

    if (carta && carta.definicao?.mirror) {
      renderTotaisCatalogador(dados.totais);
      renderGradeVelas(dados.velas);
      estado.textContent = '⚠️ Essa carta usa espelho — mostrando a cor crua da vela (overlay de entradas indisponível pra cartas com espelho).';
      return;
    }

    if (carta) {
      try {
        const resultado = await buscarOverlayCarta(carta, periodo, data, tz);
        const seq = resultado.sequencia_completa || [];
        const overlay = new Map(seq.map(([ts, r]) => [ts, r]));
        const wins = seq.filter(([, r]) => r === 'W').length;
        const losses = seq.filter(([, r]) => r === 'L').length;
        const empates = seq.filter(([, r]) => r === 'E').length;
        renderTotaisCarta(wins, losses, empates);
        renderGradeVelas(dados.velas, overlay);
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
  popularSelectCartasCatalogador();
  aoTrocarPeriodoCatalogador();
  carregarCatalogador();
});

// Inventário sincroniza com o servidor de forma assíncrona (pode trazer
// cartas que não estavam no localStorage ainda) — repopula o seletor quando
// isso terminar, sem precisar recarregar a página.
document.addEventListener('inventarioSincronizado', popularSelectCartasCatalogador);
