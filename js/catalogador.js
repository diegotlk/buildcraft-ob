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
  el.innerHTML = velas.map((v, i) => densa
    ? `<div class="cat-vela ${v.cor}" title="${v.hora} · ${v.cor}">${v.hora}</div>`
    : `<div class="cat-vela ${v.cor}" style="animation-delay:${Math.min(i * 6, 600)}ms" title="${v.hora} · ${v.cor}">${v.hora}</div>`
  ).join('');
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

  const params = new URLSearchParams({ par, tf: 'M1', periodo, plano, tz });
  if (data) params.set('data', data);

  try {
    const resp = await fetch(`${CATALOGADOR_API_URL}/api/catalogador/grade?${params.toString()}`);
    const dados = await resp.json();

    if (!resp.ok || !dados.success) {
      estado.textContent = dados.message || 'Não foi possível carregar a grade desse par/período.';
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
  aoTrocarPeriodoCatalogador();
  carregarCatalogador();
});
