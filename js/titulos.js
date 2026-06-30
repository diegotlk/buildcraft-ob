/* ============================================================
   Binaryzando — Títulos que Emergem do Comportamento
   (IDEIAS_CONSOLIDADAS, item 10): apelido automático baseado no
   que o jogador REALMENTE faz (horário e par mais usados, etc),
   não escolhido em menu nem sorteado. 100% comportamento real.

   Mesma filosofia da "Carta Viva" (resumo_v1.txt, sessão 27/06):
   só sobe, nunca tira o que a pessoa já conquistou — uma vez
   desbloqueado, o título fica permanente mesmo que o
   comportamento mude depois.
   ============================================================ */

const TITULOS_DESBLOQ_KEY = 'buildcraft_titulos_desbloqueados';
const TITULO_ATIVO_KEY = 'buildcraft_titulo_ativo';
const TITULO_DISPLAY_MODO_KEY = 'buildcraft_titulo_display_modo'; // 'nome' | 'emblema' | 'ambos'
const TITULO_RANKING_KEY = 'buildcraft_titulo_mostrar_ranking';

// ── ÍCONES (PNGs / SVGs em titulos_emblemas/) ──
const TITULO_ICONES = {
  genesis:       'titulos_emblemas/genesis.svg',
  coruja:        'titulos_emblemas/coruja.png',
  galo:          'titulos_emblemas/galo.png',
  falcao:        'titulos_emblemas/falcao.png',
  lobo:          'titulos_emblemas/lobo.png',
  fiel:          'titulos_emblemas/escudo.png',
  explorador:    'titulos_emblemas/bussola.png',
  cacador_lendas:'titulos_emblemas/coroa.png',
};

// ── DEFINIÇÕES (regra fixa por comportamento real, sem sorteio) ──
const TITULOS_DEFS = [
  {
    id: 'genesis', nome: 'Gênesis', cor: '#f0c040', icone: 'genesis',
    criterioTexto: 'Sua primeira carta de todos os tempos já era Lendária (S+). O começo de uma lenda.',
    condicao: (s) => {
      if (!s.primeiraCartaLendaria) return { desbloqueado: false };
      return { desbloqueado: true, detalhe: 'Primeira carta criada já era Lendária — o começo de uma lenda' };
    },
  },
  {
    id: 'coruja', nome: 'A Coruja', cor: '#818cf8', icone: 'coruja',
    criterioTexto: 'Teste pelo menos 3 estratégias com horário entre 00h e 05h59, sendo 60% ou mais dos seus testes nessa faixa.',
    condicao: (s) => avaliarHorario(s, 'madrugada', 'entre 00h e 05h59'),
  },
  {
    id: 'galo', nome: 'O Galo', cor: '#fb923c', icone: 'galo',
    criterioTexto: 'Teste pelo menos 3 estratégias com horário entre 06h e 11h59, sendo 60% ou mais dos seus testes nessa faixa.',
    condicao: (s) => avaliarHorario(s, 'manha', 'entre 06h e 11h59'),
  },
  {
    id: 'falcao', nome: 'O Falcão', cor: '#f43f5e', icone: 'falcao',
    criterioTexto: 'Teste pelo menos 3 estratégias com horário entre 12h e 17h59, sendo 60% ou mais dos seus testes nessa faixa.',
    condicao: (s) => avaliarHorario(s, 'tarde', 'entre 12h e 17h59'),
  },
  {
    id: 'lobo', nome: 'O Lobo', cor: '#38bdf8', icone: 'lobo',
    criterioTexto: 'Teste pelo menos 3 estratégias com horário entre 18h e 23h59, sendo 60% ou mais dos seus testes nessa faixa.',
    condicao: (s) => avaliarHorario(s, 'noite', 'entre 18h e 23h59'),
  },
  {
    id: 'fiel', nome: 'O Fiel', cor: '#34d399', icone: 'fiel',
    criterioTexto: 'Tenha pelo menos 5 estratégias salvas com par definido, sendo 70% ou mais delas no mesmo par.',
    condicao: (s) => {
      if (s.comPar < 5 || !s.parDominante) return { desbloqueado: false };
      const frac = s.parDominante[1] / s.comPar;
      if (frac < 0.7) return { desbloqueado: false };
      return { desbloqueado: true, detalhe: `${Math.round(frac * 100)}% das suas estratégias usam ${s.parDominante[0]}`, par: s.parDominante[0] };
    },
  },
  {
    id: 'explorador', nome: 'O Explorador', cor: '#2dd4bf', icone: 'explorador',
    criterioTexto: 'Teste estratégias em pelo menos 5 pares diferentes (mínimo de 8 estratégias salvas no total).',
    condicao: (s) => {
      if (s.comPar < 8 || s.paresDiferentes < 5) return { desbloqueado: false };
      return { desbloqueado: true, detalhe: `Você já testou ${s.paresDiferentes} pares diferentes` };
    },
  },
  {
    id: 'cacador_lendas', nome: 'Caçador de Lendas', cor: '#f59e0b', icone: 'cacador_lendas',
    criterioTexto: 'Descubra pelo menos 3 cartas Lendárias (S+).',
    condicao: (s) => {
      if (s.legendarias < 3) return { desbloqueado: false };
      return { desbloqueado: true, detalhe: `Você já caçou ${s.legendarias} cartas Lendárias` };
    },
  },
];

const TITULO_HORARIO_LABEL = { madrugada: 'madrugada', manha: 'manhã', tarde: 'tarde', noite: 'noite' };

function avaliarHorario(s, chave, faixaTexto) {
  if (s.comHorario < 3) return { desbloqueado: false };
  const qtd = s.buckets[chave];
  const frac = qtd / s.comHorario;
  if (frac < 0.6) return { desbloqueado: false };
  return { desbloqueado: true, detalhe: `${Math.round(frac * 100)}% das suas estratégias testadas ${faixaTexto}` };
}

// ── ANÁLISE DO COMPORTAMENTO (lê o inventário real, igual o resto do site) ──
function calcularStatsComportamento() {
  const itens = getInventario().filter(e => !e.deletadoEm && e.teste);

  const buckets = { madrugada: 0, manha: 0, tarde: 0, noite: 0 };
  let comHorario = 0;
  itens.forEach((it) => {
    const ini = it.teste.scheduleStart;
    if (!ini) return;
    const hora = parseInt(String(ini).split(':')[0], 10);
    if (isNaN(hora)) return;
    comHorario++;
    if (hora <= 5) buckets.madrugada++;
    else if (hora <= 11) buckets.manha++;
    else if (hora <= 17) buckets.tarde++;
    else buckets.noite++;
  });

  const contagemPares = {};
  let comPar = 0;
  itens.forEach((it) => {
    const p = it.teste.pair;
    if (!p) return;
    comPar++;
    contagemPares[p] = (contagemPares[p] || 0) + 1;
  });
  const paresOrdenados = Object.entries(contagemPares).sort((a, b) => b[1] - a[1]);

  const legendarias = itens.filter((it) => it.teste.rarity === 'legendary' && it.carta).length;

  // Gênesis: primeira carta criada (menor criadoEm) deve ser lendária
  const comCarta = itens.filter(it => it.carta);
  comCarta.sort((a, b) => new Date(a.criadoEm || 0) - new Date(b.criadoEm || 0));
  const primeiraCartaLendaria = comCarta.length > 0 && comCarta[0].teste?.rarity === 'legendary';

  return {
    totalItens: itens.length,
    buckets,
    comHorario,
    comPar,
    paresDiferentes: paresOrdenados.length,
    parDominante: paresOrdenados[0] || null,
    legendarias,
    primeiraCartaLendaria,
  };
}

// ── PERSISTÊNCIA (uma vez desbloqueado, fica pra sempre — mesma lógica da Carta Viva) ──
function getTitulosDesbloqueados() {
  try {
    return JSON.parse(localStorage.getItem(TITULOS_DESBLOQ_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function salvarTitulosDesbloqueados(mapa) {
  try {
    localStorage.setItem(TITULOS_DESBLOQ_KEY, JSON.stringify(mapa));
  } catch (e) {
    console.error('[titulos] falha ao salvar:', e);
  }
}

// Recalcula com base no inventário atual; quem já tinha desbloqueado continua
// tendo, mesmo se o comportamento mudar depois. Retorna o mapa atualizado.
function atualizarTitulosDesbloqueados() {
  const stats = calcularStatsComportamento();
  const atuais = getTitulosDesbloqueados();
  let mudou = false;

  TITULOS_DEFS.forEach((def) => {
    const r = def.condicao(stats);
    if (r.desbloqueado) {
      if (!atuais[def.id]) {
        atuais[def.id] = { desde: new Date().toISOString(), detalhe: r.detalhe };
        mudou = true;
      } else if (atuais[def.id].detalhe !== r.detalhe) {
        atuais[def.id].detalhe = r.detalhe;
        mudou = true;
      }
    }
  });

  if (mudou) salvarTitulosDesbloqueados(atuais);
  return atuais;
}

function getTituloAtivo() {
  return localStorage.getItem(TITULO_ATIVO_KEY) || null;
}

function setTituloAtivo(id) {
  const desbloqueados = getTitulosDesbloqueados();
  if (id && !desbloqueados[id]) return false; // não deixa ativar o que não foi conquistado
  if (id) localStorage.setItem(TITULO_ATIVO_KEY, id);
  else localStorage.removeItem(TITULO_ATIVO_KEY);
  return true;
}

function getTituloDisplayModo() {
  return localStorage.getItem(TITULO_DISPLAY_MODO_KEY) || 'ambos';
}

function setTituloDisplayModo(modo) {
  localStorage.setItem(TITULO_DISPLAY_MODO_KEY, modo);
}

// Preferência guardada já agora, mesmo sem o Ranking ainda lê esse campo —
// fica pronta pra quando a publicação no ranking (e a "vitrine" do vendedor
// no marketplace) passar a exibir o título junto do apelido.
function getTituloMostrarRanking() {
  return localStorage.getItem(TITULO_RANKING_KEY) !== 'nao'; // default: sim
}

function setTituloMostrarRanking(valor) {
  localStorage.setItem(TITULO_RANKING_KEY, valor ? 'sim' : 'nao');
}

function getTituloDef(id) {
  return TITULOS_DEFS.find((d) => d.id === id) || null;
}

// ── RENDERIZAÇÃO ──
function renderEmblemaSVG(iconeId, cor, size) {
  const px = size || 40;
  const src = TITULO_ICONES[iconeId] || '';
  return `<img src="${src}" width="${px}" height="${px}" style="filter:drop-shadow(0 0 6px ${cor}99);border-radius:50%;display:block" alt="">`;
}

// Linha curta "Nome · 🦉 A Coruja" pra usar em qualquer lugar (perfil, e no
// futuro navbar/ranking) — respeita o modo de exibição escolhido pela pessoa.
function renderTituloAtivoPreview(nomeUsuario) {
  const ativoId = getTituloAtivo();
  if (!ativoId) return nomeUsuario || '';
  const def = getTituloDef(ativoId);
  if (!def) return nomeUsuario || '';

  const modo = getTituloDisplayModo();
  const emblema = renderEmblemaSVG(def.icone, def.cor, 22);
  const nomeTxt = `<span style="color:${def.cor};font-weight:700">${def.nome}</span>`;

  let parteTitulo;
  if (modo === 'emblema') parteTitulo = `<span style="display:inline-flex;vertical-align:middle">${emblema}</span>`;
  else if (modo === 'nome') parteTitulo = nomeTxt;
  // emblema fica à DIREITA do nome do título
  else parteTitulo = `<span style="display:inline-flex;align-items:center;gap:6px;vertical-align:middle">${nomeTxt}${emblema}</span>`;

  return `${nomeUsuario ? nomeUsuario + ' <span style="color:var(--text-muted)">·</span> ' : ''}${parteTitulo}`;
}

// ── SEÇÃO COMPLETA PRO PERFIL ──
function renderSecaoTitulos() {
  const desbloqueados = atualizarTitulosDesbloqueados();
  const ativoId = getTituloAtivo();

  const cards = TITULOS_DEFS.map((def) => {
    const info = desbloqueados[def.id];
    const desbloqueado = !!info;
    const ativo = ativoId === def.id;

    if (!desbloqueado) {
      return `
        <div class="titulo-card titulo-bloqueado" title="${def.criterioTexto}">
          <div class="titulo-emblema-wrap">${renderEmblemaSVG(def.icone, '#4a4a55', 40)}</div>
          <div class="titulo-card-nome">${def.nome}</div>
          <div class="titulo-card-criterio">🔒 ${def.criterioTexto}</div>
        </div>
      `;
    }

    return `
      <div class="titulo-card titulo-desbloqueado${ativo ? ' titulo-ativo' : ''}" style="--titulo-cor:${def.cor}" onclick="selecionarTituloAtivo('${def.id}')">
        <div class="titulo-emblema-wrap">${renderEmblemaSVG(def.icone, def.cor, 40)}</div>
        <div class="titulo-card-nome" style="color:${def.cor}">${def.nome}</div>
        <div class="titulo-card-criterio">${info.detalhe || ''}</div>
        ${ativo ? '<div class="titulo-card-badge-ativo">✓ Ativo</div>' : ''}
      </div>
    `;
  }).join('');

  const modoAtual = getTituloDisplayModo();
  const mostrarRankingAtual = getTituloMostrarRanking();

  return `
    <div class="titulo-preview-linha">Pré-visualização: <strong>${renderTituloAtivoPreview(document.getElementById('pf-nome')?.value || 'Você')}</strong></div>

    <div class="titulo-grid">${cards}</div>

    <div class="titulo-config">
      <div class="form-group" style="margin-bottom:14px">
        <label class="form-label">Como mostrar seu título</label>
        <select id="tit-display-modo" class="form-input" onchange="mudarTituloDisplayModo(this.value)">
          <option value="ambos" ${modoAtual === 'ambos' ? 'selected' : ''}>Emblema + nome do título</option>
          <option value="emblema" ${modoAtual === 'emblema' ? 'selected' : ''}>Só o emblema</option>
          <option value="nome" ${modoAtual === 'nome' ? 'selected' : ''}>Só o nome do título</option>
        </select>
      </div>
      <label class="auth-lembrar" style="cursor:pointer">
        <input type="checkbox" id="tit-mostrar-ranking" ${mostrarRankingAtual ? 'checked' : ''} onchange="mudarTituloMostrarRanking(this.checked)">
        <span>Mostrar este título quando eu publicar no Ranking (em breve)</span>
      </label>
    </div>
  `;
}

function montarESalvarSecaoTitulos() {
  const cont = document.getElementById('secao-titulos');
  if (!cont) return;
  cont.innerHTML = renderSecaoTitulos();
}

function selecionarTituloAtivo(id) {
  const ativoId = getTituloAtivo();
  setTituloAtivo(ativoId === id ? null : id); // clicar de novo no ativo desativa
  montarESalvarSecaoTitulos();
}

function mudarTituloDisplayModo(modo) {
  setTituloDisplayModo(modo);
  montarESalvarSecaoTitulos();
}

function mudarTituloMostrarRanking(valor) {
  setTituloMostrarRanking(valor);
}
