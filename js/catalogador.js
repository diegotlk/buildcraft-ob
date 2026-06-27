/* ============================================================
   Binaryzando — Catalogador (Item 1: Grade de cores por horário)
   ============================================================
   Busca as últimas N velas reais de um par no backend e pinta cada uma
   como um "tijolo" verde/vermelho/cinza (doji), igual a parede de velas
   do Catalogador OB. Sem RNG, sem invenção — é o dado puro de velas.db. */

const CATALOGADOR_API_URL = 'https://api.binaryzando.com';

function popularSelectParesCatalogador() {
  const sel = document.getElementById('cat-par');
  if (!sel || typeof TODOS_OS_PARES === 'undefined') return;
  sel.innerHTML = TODOS_OS_PARES.map(par => {
    const bloqueado = typeof parBloqueado === 'function' && parBloqueado(par);
    return `<option value="${par}" ${bloqueado ? 'disabled' : ''}>${par}${bloqueado ? ' 🔒' : ''}</option>`;
  }).join('');
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

function renderGradeCatalogador(velas) {
  const el = document.getElementById('cat-grade');
  if (!el) return;
  el.innerHTML = velas.map((v, i) => `
    <div class="cat-vela ${v.cor}" style="animation-delay:${Math.min(i * 6, 600)}ms" title="${v.hora} · ${v.cor}">
      ${v.hora}
    </div>
  `).join('');
}

async function carregarCatalogador() {
  const par = document.getElementById('cat-par')?.value;
  const limite = document.getElementById('cat-limite')?.value || 100;
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

  try {
    const resp = await fetch(
      `${CATALOGADOR_API_URL}/api/catalogador/grade?par=${encodeURIComponent(par)}&tf=M1&limite=${limite}&plano=${plano}&tz=${encodeURIComponent(tz)}`
    );
    const dados = await resp.json();

    if (!resp.ok || !dados.success) {
      estado.textContent = dados.message || 'Não foi possível carregar a grade desse par.';
      return;
    }

    estado.textContent = '';
    renderTotaisCatalogador(dados.totais);
    renderGradeCatalogador(dados.velas);
  } catch (e) {
    estado.textContent = 'Erro de conexão com o servidor. Tenta de novo em alguns segundos.';
    console.error('[catalogador] falha ao buscar grade:', e);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  popularSelectParesCatalogador();
  carregarCatalogador();
});
