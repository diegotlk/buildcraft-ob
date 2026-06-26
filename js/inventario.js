/* ============================================================
   Binaryzando — Inventário
   Armazenamento das estratégias salvas, transformação em carta
   e geração automática de descrição/arte por categoria.
   ============================================================ */

const INVENTARIO_KEY = 'buildcraft_inventario';
const LEGADO_KEY = 'buildcraft_estrategias';
const CARTA_SEQ_KEY = 'buildcraft_carta_seq';
const LIXEIRA_DIAS = 30;
const LIXEIRA_LIMITE = 50; // capacidade máxima da lixeira — mais antigos saem primeiro

// ── ARMAZENAMENTO ──
function getInventario() {
  let lista;
  try {
    lista = JSON.parse(localStorage.getItem(INVENTARIO_KEY));
  } catch (e) { /* ignora JSON inválido */ }

  if (!lista) {
    // Migra o "leque" antigo (sem contexto completo de teste), se existir.
    try {
      const legado = JSON.parse(localStorage.getItem(LEGADO_KEY));
      lista = (legado && legado.length) ? legado : [];
    } catch (e) {
      lista = [];
    }
  }

  const limpa = limparLixeiraExpirada(lista);
  if (limpa.mudou) salvarInventario(limpa.lista);
  return limpa.lista;
}

function salvarInventario(lista) {
  localStorage.setItem(INVENTARIO_KEY, JSON.stringify(lista));
  enviarInventarioServidor(lista);
}

// ── SINCRONIZAÇÃO ENTRE APARELHOS ──
// Antes disto, o inventário vivia só no localStorage: cada navegador/aparelho
// tinha o seu, então criar uma carta no celular não aparecia no computador
// (e vice-versa), mesmo sendo a mesma conta. Agora a conta também guarda uma
// cópia no servidor (/api/inventario) e cada aparelho mescla com ela.
async function enviarInventarioServidor(lista) {
  if (typeof estaLogado !== 'function' || !estaLogado()) return;
  try {
    await fetch(`${AUTH_API_BASE}/api/inventario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getSessao().token },
      body: JSON.stringify({ lista }),
    });
  } catch (e) {
    // Offline ou API fora do ar: fica só no localStorage por enquanto e tenta
    // de novo no próximo salvarInventario().
  }
}

// Une o inventário local com o que está salvo no servidor (ex.: cartas
// criadas em outro aparelho). Mesclagem por id: se um item foi apagado
// (deletadoEm) em QUALQUER um dos dois lados, o apagado vence — assim uma
// exclusão feita no celular não "ressuscita" ao sincronizar com o
// computador. Fora isso, mantém a versão já existente.
function mesclarInventarios(local, servidor) {
  const porId = new Map();
  [...local, ...(servidor || [])].forEach(item => {
    const existente = porId.get(item.id);
    if (!existente) { porId.set(item.id, item); return; }
    if (item.deletadoEm && !existente.deletadoEm) porId.set(item.id, item);
  });
  return [...porId.values()];
}

// Roda uma vez por carregamento de página (ver DOMContentLoaded no fim do
// arquivo): busca o que está salvo no servidor, mescla com o local e
// devolve pro servidor a versão já mesclada (cobre tanto "servidor estava
// vazio" quanto "outro aparelho tinha cartas novas").
async function sincronizarInventarioServidor() {
  if (typeof estaLogado !== 'function' || !estaLogado()) return;
  try {
    const resp = await fetch(`${AUTH_API_BASE}/api/inventario`, {
      headers: { 'Authorization': 'Bearer ' + getSessao().token },
    });
    const dados = await resp.json();
    if (!dados.success) return;

    const local = getInventario();
    const mesclada = mesclarInventarios(local, dados.lista || []);

    const mudou = mesclada.length !== local.length
      || mesclada.some(item => !local.find(l => l.id === item.id && l.deletadoEm === item.deletadoEm));

    if (mudou) {
      localStorage.setItem(INVENTARIO_KEY, JSON.stringify(mesclada));
      // Avisa as telas que já tinham renderizado a lista antes da sincronização
      // terminar (ex.: Inventário, "Testar Estratégia") pra atualizar a tela.
      document.dispatchEvent(new CustomEvent('inventarioSincronizado'));
    }
    await enviarInventarioServidor(mesclada);
  } catch (e) {
    // Sem internet/API fora do ar: segue só com o que já tinha local.
  }
}

document.addEventListener('DOMContentLoaded', sincronizarInventarioServidor);

// Manda o usuário pro Laboratório e pede pra reproduzir essa carta exata
// (mesma definição, mesmo par/horário, mesmo período travado nas datas
// salvas) em vez de "todo o histórico", que desliza conforme o banco cresce.
function reproduzirItem(id) {
  localStorage.setItem('buildcraft_reproduzir_id', id);
  window.location.href = 'criar_estrategia.html';
}

// ── LIXEIRA ──
// Itens deletados ganham `deletadoEm` em vez de serem removidos na hora.
// Cada item tem seu próprio prazo de 30 dias contado a partir da exclusão.
function moverParaLixeira(id) {
  const lista = getInventario();
  const item = lista.find(e => e.id === id);
  if (!item) return;
  item.deletadoEm = new Date().toISOString();
  salvarInventario(lista);
}

function restaurarDaLixeira(id) {
  const lista = getInventario();
  const item = lista.find(e => e.id === id);
  if (!item) return;
  delete item.deletadoEm;
  salvarInventario(lista);
}

function excluirPermanente(id) {
  salvarInventario(getInventario().filter(e => e.id !== id));
  removerVestigios([id]);
}

function esvaziarLixeira() {
  const idsApagados = getInventario().filter(e => e.deletadoEm).map(e => e.id);
  salvarInventario(getInventario().filter(e => !e.deletadoEm));
  removerVestigios(idsApagados);
}

// Quando uma estratégia é apagada de vez, qualquer vestígio dela em OUTRO
// armazenamento também precisa sumir — senão o nome continua "existindo" pelo
// sistema (ex.: bloqueando recriação). Hoje o vestígio é o histórico de backtest
// gerado a partir da estratégia (chave buildcraft_historicos), que guarda o
// estrategiaId. Mexe direto na chave pra funcionar mesmo nas páginas que não
// carregam historico.js.
function removerVestigios(ids) {
  if (!ids || !ids.length) return;
  const alvo = new Set(ids);
  try {
    const historicos = JSON.parse(localStorage.getItem('buildcraft_historicos')) || [];
    const limpos = historicos.filter(h => !alvo.has(h.estrategiaId));
    if (limpos.length !== historicos.length) {
      localStorage.setItem('buildcraft_historicos', JSON.stringify(limpos));
    }
  } catch (e) { /* histórico inválido/ausente — nada a limpar */ }
}

function getLixeira() {
  return getInventario()
    .filter(e => e.deletadoEm)
    .sort((a, b) => new Date(b.deletadoEm) - new Date(a.deletadoEm));
}

function diasRestantesLixeira(item) {
  if (!item.deletadoEm) return null;
  const passados = Math.floor((Date.now() - new Date(item.deletadoEm)) / 86400000);
  return Math.max(0, LIXEIRA_DIAS - passados);
}

// Remove da lixeira quem passou de 30 dias, e se a lixeira passar do limite
// de capacidade, descarta os mais antigos primeiro pra abrir espaço.
function limparLixeiraExpirada(lista) {
  let mudou = false;

  let restante = lista.filter(item => {
    if (!item.deletadoEm) return true;
    if (diasRestantesLixeira(item) <= 0) { mudou = true; return false; }
    return true;
  });

  const naLixeira = restante.filter(e => e.deletadoEm).sort((a, b) => new Date(a.deletadoEm) - new Date(b.deletadoEm));
  if (naLixeira.length > LIXEIRA_LIMITE) {
    const excesso = naLixeira.slice(0, naLixeira.length - LIXEIRA_LIMITE);
    const idsExcesso = new Set(excesso.map(e => e.id));
    restante = restante.filter(e => !idsExcesso.has(e.id));
    mudou = true;
  }

  return { lista: restante, mudou };
}

// ── PERÍODO TESTADO ──
function diasEntrePeriodo(de, ate) {
  if (!de || !ate || de === '—' || ate === '—') return null;
  const d1 = new Date(de + 'T00:00:00Z');
  const d2 = new Date(ate + 'T00:00:00Z');
  const dias = Math.round((d2 - d1) / 86400000) + 1;
  return dias > 0 ? dias : 1;
}

function formatDataBR(iso) {
  if (!iso || iso === '—') return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// ── TRANSFORMAR EM CARTA ──
function proximoNumeroDescoberta() {
  const atual = parseInt(localStorage.getItem(CARTA_SEQ_KEY) || '0', 10);
  const proximo = atual + 1;
  localStorage.setItem(CARTA_SEQ_KEY, String(proximo));
  return proximo;
}

function transformarEmCarta(id) {
  const lista = getInventario();
  const item = lista.find(e => e.id === id);
  if (!item) return null;

  if (!item.carta) {
    item.carta = {
      numero: proximoNumeroDescoberta(),
      transformadaEm: new Date().toISOString(),
    };
    salvarInventario(lista);
  }
  return item;
}

// ── CATEGORIA E DESCRIÇÃO AUTOMÁTICA ──
const ORDINAIS = ['1ª', '2ª', '3ª', '4ª', '5ª', '6ª', '7ª', '8ª', '9ª', '10ª'];

const FIGURAS_INFO = {
  engolfo_alta: { nome: 'Engolfo de Alta', dir: 'CALL', desc: 'a vela verde engole o corpo da vermelha anterior' },
  engolfo_baixa: { nome: 'Engolfo de Baixa', dir: 'PUT', desc: 'a vela vermelha engole o corpo da verde anterior' },
  martelo: { nome: 'Martelo', dir: 'CALL', desc: 'um pavio inferior longo indica rejeição de baixa' },
  estrela_cadente: { nome: 'Estrela Cadente', dir: 'PUT', desc: 'um pavio superior longo indica rejeição de alta' },
  tres_soldados: { nome: 'Três Soldados Brancos', dir: 'CALL', desc: 'três velas verdes consecutivas confirmam força de alta' },
  tres_corvos: { nome: 'Três Corvos', dir: 'PUT', desc: 'três velas vermelhas consecutivas confirmam força de baixa' },
};

const INDICADOR_INFO = {
  media: { nome: 'Média Móvel', categoria: 'Tendência' },
  rsi: { nome: 'RSI', categoria: 'Reversão' },
  macd: { nome: 'MACD', categoria: 'Tendência' },
  bollinger: { nome: 'Bandas de Bollinger', categoria: 'Reversão' },
};

// Peça de xadrez fixa por raridade — não escolhida pelo usuário.
// Rainha (♕) e Rei (♔) reservados para um tier futuro, ainda acima de Lendária.
const PECA_POR_RARIDADE = {
  common: '♙',    // Peão
  rare: '♗',      // Bispo
  epic: '♖',      // Torre
  legendary: '♛', // Rainha
};

const GERENCIAMENTO_RESULTADO_LABEL_INV = { vitoria: 'Soros', derrota: 'Martingale', fixo: 'Mão Fixa', custom: 'Personalizado' };
const GERENCIAMENTO_MOMENTO_LABEL_INV = { vela: 'Próxima Vela', entrada: 'Próxima Entrada' };

function categoriaDaEstrategia(item) {
  const d = item.definicao || {};
  switch (item.mode) {
    case 'build':
      return item.teste && item.teste.classe ? `Build · ${item.teste.classe}` : 'Build';
    case 'gerenciamento':
      return `Gerenciamento · ${GERENCIAMENTO_RESULTADO_LABEL_INV[d.resultado] || d.resultado}`;
    case 'pintar':
    case 'figura':
      return 'Padrão de Velas';
    case 'quadrante': {
      const q = d.q || {};
      if (q.tipo === 'confluencia') return 'Confluência';
      if (q.tipo === 'referencia') return (q.ref && q.ref.relacao === 'flip') ? 'Reversão' : 'Repetição';
      return 'Quadrante';
    }
    case 'indicador': {
      if (d.ind && d.ind.tipo === 'montador') return 'Personalizado';
      const info = d.ind && INDICADOR_INFO[d.ind.tipo];
      return info ? info.categoria : 'Indicador';
    }
    default:
      return 'Estratégia';
  }
}

function descricaoAutomatica(item) {
  const d = item.definicao || {};

  if (item.mode === 'build') {
    const t = item.teste || {};
    return `Build combinando a estratégia "${d.estrategiaNome}" com o gerenciamento "${d.gerenciamentoNome}". Classe ${t.classe}: ${t.winrate}% de winrate em ${t.entries} entradas, lucro/perda de ${t.lucroFinal} com banca de ${t.bancaDisponivel} (payout ${t.payout}%).`;
  }

  if (item.mode === 'gerenciamento') {
    const tipoTxt = GERENCIAMENTO_RESULTADO_LABEL_INV[d.resultado] || d.resultado;
    const momentoTxt = GERENCIAMENTO_MOMENTO_LABEL_INV[d.momento] || d.momento;

    if (d.resultado === 'custom') {
      const passos = (d.customSteps || []).map((s, i) => {
        const baseTxt = s.base === 'base' ? 'entrada base' : 'entrada anterior';
        const opTxt = s.op === 'dividir' ? '÷' : '×';
        const gat = s.trigger === 'vitoria' ? 'vitória' : 'derrota';
        return `${i + 1}) após ${gat}: ${baseTxt} ${opTxt} ${s.factor}`;
      }).join('; ');
      return `Gerenciamento personalizado com entrada base de ${d.valorEntrada}, avançando por ${momentoTxt.toLowerCase()}. Sequência: ${passos}.`;
    }

    if (d.resultado === 'fixo') {
      return `Gerenciamento Mão Fixa: entrada sempre igual a ${d.valorEntrada}, sem progressão depois de vitória ou derrota, avançando por ${momentoTxt.toLowerCase()}.`;
    }

    const mecanica = d.resultado === 'derrota'
      ? `multiplica a entrada anterior por ${d.multiplicador}x após cada derrota`
      : (d.baseSoros === 'percentual'
        ? `soma ${d.percentualSoros}% da entrada anterior à entrada padrão após cada vitória`
        : `soma todo o lucro da entrada anterior à entrada padrão após cada vitória`);
    return `Gerenciamento ${tipoTxt} com entrada padrão de ${d.valorEntrada} que ${mecanica}, avançando por ${momentoTxt.toLowerCase()}, repetindo por até ${d.niveis}x.`;
  }

  if (item.mode === 'pintar') {
    const dirTxt = { call: 'CALL (vela verde)', put: 'PUT (vela vermelha)', both: 'CALL ou PUT, testando os dois lados' }[d.direction] || d.direction;
    const ancTxt = d.anchoring === 'exato'
      ? 'a vela imediatamente anterior precisa ter cor diferente do início do padrão'
      : 'a vela anterior pode ter qualquer cor';
    let txt = `Procura o padrão ${d.pattern.join('')} no gráfico e, quando encontra, aposta que a próxima vela será ${dirTxt}. Ancoragem: ${ancTxt}.`;
    if (d.mirror) txt += ' Também opera o padrão espelhado, invertendo as cores.';
    return txt;
  }

  if (item.mode === 'figura') {
    const f = FIGURAS_INFO[d.fig && d.fig.tipo];
    if (!f) return 'Entra com base em uma figura de candlestick clássica.';
    return `Identifica a figura "${f.nome}" no timeframe ${item.teste.timeframeOperado || 'M1'}: ${f.desc}. Quando aparece, entra em ${f.dir}.`;
  }

  if (item.mode === 'quadrante') {
    const q = d.q || {};
    if (q.tipo === 'confluencia' && q.conf) {
      return `Só entra quando duas leituras diferentes do mercado concordam na mesma direção (confluência "${q.conf.nome}"). Reduz a quantidade de sinais, mas busca mais precisão.`;
    }
    if (q.tipo === 'referencia' && q.ref) {
      const r = q.ref;
      const refTxt = r.condPosicoes
        ? `as velas ${r.condPosicoes.map(p => ORDINAIS[p]).join(' e ')} do ciclo`
        : `a ${ORDINAIS[r.refPos]} vela ${r.refBloco === 'anterior' ? 'do ciclo anterior' : 'do ciclo atual'}`;
      const relTxt = r.relacao === 'repete' ? 'repete a mesma cor' : 'inverte a cor (flip)';
      return `Observa ${refTxt} e entra na ${ORDINAIS[r.entryPos]} vela apostando que ela ${relTxt}. Ciclo de ${r.blocoVelas} velas de 1 minuto.`;
    }
    const posTxt = q.analiseModo === 'editar' ? 'um padrão de cores pintado manualmente' : `as ${q.posicoesLabel || 'velas'} do quadrante`;
    const dirTxt = q.entradaModo === 'minoria' ? 'a cor que menos apareceu (minoria)' : (q.entradaModo === 'ambas' ? 'a melhor entre maioria e minoria' : 'a cor que mais apareceu (maioria)');
    return `Analisa ${posTxt} em um quadrante de ${q.bloco === 'M15' ? '15' : '5'} minutos e entra na ${ORDINAIS[q.entradaPos] || (q.entradaPos + 1) + 'ª'} vela do próximo quadrante, a favor de ${dirTxt}.`;
  }

  if (item.mode === 'indicador') {
    const ind = d.ind || {};
    if (ind.tipo === 'montador' && d.mont) {
      const m = d.mont;
      const nomeBloco = (o) => {
        if (o.tipo === 'numero') return o.valor;
        if (o.tipo === 'preco') return 'o preço';
        if (o.tipo === 'rsi') return `RSI(${o.periodo})`;
        if (o.tipo === 'media') return `${o.matipo}(${o.periodo})`;
        if (o.tipo === 'macd') return 'MACD';
        if (o.tipo === 'macd_sinal') return 'a linha de sinal do MACD';
        return o.tipo;
      };
      const opTxt = { '<': 'menor que', '>': 'maior que', cruza_cima: 'cruza para cima de', cruza_baixo: 'cruza para baixo de' };
      const ligacao = m.combinador === 'E' ? ' e ' : ' ou ';
      const frases = m.condicoes.map(c => `${nomeBloco(c.esq)} ${opTxt[c.op]} ${nomeBloco(c.dir)}`);
      return `Entra em ${m.direcao} quando ${frases.join(ligacao)}, no timeframe ${item.teste.timeframeOperado || 'M1'}.`;
    }
    if (ind.tipo === 'rsi') {
      return `Usa o RSI(${ind.params.periodo}) e entra na reversão: CALL quando cai abaixo de ${ind.params.sobrevenda} (sobrevenda), PUT quando passa de ${ind.params.sobrecompra} (sobrecompra).`;
    }
    if (ind.tipo === 'media') {
      return `Acompanha a ${ind.params.tipo}(${ind.params.periodo}) e entra na direção do cruzamento do preço com a média.`;
    }
    if (ind.tipo === 'macd') {
      return `Usa o MACD (${ind.params.rapida}/${ind.params.lenta}/${ind.params.sinal}) e entra no cruzamento da linha MACD com a linha de sinal.`;
    }
    if (ind.tipo === 'bollinger') {
      return `Usa as Bandas de Bollinger (${ind.params.periodo}, ${ind.params.desvios}σ) e entra na reversão quando o preço toca a banda inferior ou superior.`;
    }
    const info = INDICADOR_INFO[ind.tipo];
    return info ? `Baseada no indicador ${info.nome}.` : 'Baseada em um indicador técnico.';
  }

  return 'Estratégia testada contra o histórico real de velas.';
}

// ── RENDERIZAÇÃO DA CARTA (frente / verso) ──
const RARITY_LABEL = { common: 'Comum', rare: 'Rara', epic: 'Épica', legendary: 'Lendária' };

function renderEstrelas(n) {
  const cheias = Math.max(0, Math.min(5, n || 0));
  let html = '';
  for (let i = 0; i < 5; i++) {
    html += `<span style="color:${i < cheias ? 'var(--rarity-legendary)' : 'var(--border-light)'}">★</span>`;
  }
  return html;
}

// ── Seta de desempenho vs a carta-mãe ──
function renderSetaPerformance(item) {
  if (!item.linhagem || item.linhagem.deltaWinrate == null) return '';
  const delta = item.linhagem.deltaWinrate;
  if (delta > 0) return `<span style="color:var(--success);font-weight:700;font-size:.72rem">▲ +${delta}%</span>`;
  if (delta < 0) return `<span style="color:var(--danger);font-weight:700;font-size:.72rem">▼ ${delta}%</span>`;
  return `<span style="color:var(--text-muted);font-weight:700;font-size:.72rem">= 0%</span>`;
}

// Clicar leva até a carta/ficha de origem (rola a página e vira a carta, se for o caso)
function irParaOrigem(id) {
  const el = document.querySelector(`[data-carta-id="${id}"]`);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.add('is-flipped', 'carta-destaque');
  setTimeout(() => el.classList.remove('carta-destaque'), 1400);
}

function renderLinhagem(item) {
  if (!item.linhagem || !item.linhagem.origemId) return '';
  const seta = renderSetaPerformance(item);
  return `
    <div onclick="event.stopPropagation(); irParaOrigem('${item.linhagem.origemId}')"
         style="cursor:pointer;font-size:.7rem;color:var(--text-muted);margin-top:6px;padding:5px 8px;background:rgba(99,102,241,.08);border-radius:6px;">
      ♻️ Baseada em: <span style="color:var(--accent-hover);font-weight:600;text-decoration:underline">${item.linhagem.origemNome}</span>
      · geração ${item.linhagem.geracao} ${seta}
    </div>
  `;
}

// ── Barra de confiança da amostra (zonas <30 / 30-1.000 / >1.000) ──
// Vive aqui (não em strategy-builder.js) porque é a carta — não só o painel
// de resultado da criação — que precisa dela, e inventario.js é o único
// arquivo carregado em toda página que renderiza carta.
function renderConfidenceBar(n) {
  let frac;
  if (n < 30) frac = (n / 30) * 0.22;
  else if (n < 1000) frac = 0.22 + ((n - 30) / (1000 - 30)) * 0.50;
  else frac = Math.min(0.72 + ((n - 1000) / 9000) * 0.28, 0.985);

  return `
    <div class="confidence-bar-wrap">
      <div class="confidence-bar-header">
        <span class="confidence-bar-label">Confiança da amostra</span>
        <span class="confidence-bar-count">${n.toLocaleString('pt-BR')} <small>ocorrências</small></span>
      </div>
      <div class="confidence-bar-track">
        <div class="zone zone-low"></div>
        <div class="zone zone-mid"></div>
        <div class="zone zone-high"></div>
        <div class="confidence-bar-marker" style="left:${(frac * 100).toFixed(1)}%"></div>
      </div>
      <div class="confidence-bar-ticks">
        <span class="tick-low">&lt;30</span>
        <span class="tick-mid">30-1.000</span>
        <span class="tick-high">&gt;1.000</span>
      </div>
    </div>
  `;
}

// ── Carta dupla face (frente / verso) ──
function renderCartaFront(item) {
  const categoria = categoriaDaEstrategia(item);
  const glifo = PECA_POR_RARIDADE[item.teste.rarity] || '♙';
  const pecaArt = (typeof pecaXadrezSVG === 'function')
    ? `<span class="carta-art-peca">${pecaXadrezSVG(item.teste.rarity)}</span>`
    : `<span class="carta-art-glyph">${glifo}</span>`;
  const t = item.teste;
  const numero = item.carta ? '#' + String(item.carta.numero).padStart(3, '0') : '—';

  const isGerenciamento = item.mode === 'gerenciamento';
  const isBuild = item.mode === 'build';
  let statsHTML;
  if (isBuild) {
    statsHTML = `
        <div class="card-stat">
          <div class="card-stat-label">Winrate</div>
          <div class="card-stat-value ${t.winrate >= 53.5 ? 'positive' : 'negative'}">${t.winrate}%</div>
        </div>
        <div class="card-stat">
          <div class="card-stat-label">Lucro/perda</div>
          <div class="card-stat-value ${t.lucroFinal >= 0 ? 'positive' : 'negative'}">${t.lucroFinal}</div>
        </div>
    `;
  } else if (isGerenciamento) {
    statsHTML = `
        <div class="card-stat">
          <div class="card-stat-label">Lucro/perda</div>
          <div class="card-stat-value ${t.lucroFinal >= 0 ? 'positive' : 'negative'}">${t.lucroFinal}</div>
        </div>
        <div class="card-stat">
          <div class="card-stat-label">Maior queda</div>
          <div class="card-stat-value neutral">${t.drawdownPct}%</div>
        </div>
    `;
  } else {
    statsHTML = `
        <div class="card-stat">
          <div class="card-stat-label">Winrate</div>
          <div class="card-stat-value positive">${t.winrate}%</div>
        </div>
        <div class="card-stat">
          <div class="card-stat-label">Entradas/dia</div>
          <div class="card-stat-value neutral">${t.entradasPorDia != null ? '~' + t.entradasPorDia : '—'}</div>
        </div>
    `;
  }
  const tipoTag = isBuild ? 'BUILD' : (isGerenciamento ? 'GERENCIAMENTO' : 'ESTRATÉGIA');
  const tipoTagClasse = isBuild ? 'card-type-tag-build' : (isGerenciamento ? 'card-type-tag-gerenciamento' : 'card-type-tag-estrategia');

  return `
    <div class="carta-face carta-face-front rarity-${t.rarity}">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px 8px">
        <span class="card-type-tag ${tipoTagClasse}">${tipoTag}</span>
        <span class="card-rarity-badge ${t.rarity}">${RARITY_LABEL[t.rarity] || 'Comum'}</span>
      </div>
      <div class="carta-art">
        <span class="carta-art-numero">${numero}</span>
        ${pecaArt}
        <span class="carta-art-categoria">${categoria}</span>
      </div>
      <div style="padding:10px 14px 0">
        <div class="card-title">${item.nome}</div>
        <div class="card-creator">por <span>Você</span></div>
      </div>
      <div class="card-stats" style="padding:10px 14px 0;margin-bottom:0">
        ${statsHTML}
      </div>
      <div style="padding:0 14px;font-size:.85rem;letter-spacing:1px;display:flex;align-items:center;gap:8px">
        ${renderEstrelas(item.estrelas)} ${renderSetaPerformance(item)}
      </div>
      <div class="carta-footer">
        <div class="card-footer-stat"><strong>1</strong> usuário</div>
        <div class="grade ${getGradeClass(t.grade)}">${t.grade}</div>
      </div>
    </div>
  `;
}

function renderCartaBack(item) {
  const categoria = categoriaDaEstrategia(item);
  const t = item.teste;
  const criadaEmFmt = new Date(item.criadaEm).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  const periodoTxt = (t.periodoDe && t.periodoDe !== '—') ? `${formatDataBR(t.periodoDe)} a ${formatDataBR(t.periodoAte)}` : '—';
  const isGerenciamento = item.mode === 'gerenciamento';
  const isBuild = item.mode === 'build';
  const d = item.definicao || {};
  let metaHTML;
  if (isBuild) {
    metaHTML = `
        <div class="carta-back-meta-row"><span>Estratégia</span><span>${d.estrategiaNome || '—'}</span></div>
        <div class="carta-back-meta-row"><span>Gerenciamento</span><span>${d.gerenciamentoNome || '—'}</span></div>
        <div class="carta-back-meta-row"><span>Classe</span><span>${t.classe || '—'}</span></div>
        <div class="carta-back-meta-row"><span>Par / TF</span><span>${t.pair} · ${t.timeframe}</span></div>
        <div class="carta-back-meta-row"><span>Winrate</span><span>${t.winrate}%</span></div>
        <div class="carta-back-meta-row"><span>Entradas</span><span>${t.entries}</span></div>
        <div class="carta-back-meta-row"><span>Lucro/perda</span><span>${t.lucroFinal}</span></div>
        <div class="carta-back-meta-row"><span>Maior queda</span><span>${t.drawdownPct}%</span></div>
        <div class="carta-back-meta-row"><span>Banca / payout</span><span>${t.bancaDisponivel} · ${t.payout}%</span></div>
        ${t.zerou ? '<div class="carta-back-meta-row"><span>⚠️ Zerou a banca</span><span>sim</span></div>' : ''}
  `;
  } else if (isGerenciamento) {
    metaHTML = `
        <div class="carta-back-meta-row"><span>Histórico testado</span><span>${t.historicoNome || '—'}</span></div>
        <div class="carta-back-meta-row"><span>Entradas replay</span><span>${t.entradasTestadas}</span></div>
        <div class="carta-back-meta-row"><span>Lucro/perda final</span><span>${t.lucroFinal}</span></div>
        <div class="carta-back-meta-row"><span>Maior queda da banca</span><span>${t.drawdownPct}%</span></div>
        <div class="carta-back-meta-row"><span>Maior entrada exigida</span><span>${t.maxStakeAtingido}</span></div>
        <div class="carta-back-meta-row"><span>Banca usada no teste</span><span>${t.bancaDisponivel}</span></div>
        <div class="carta-back-meta-row"><span>Payout usado</span><span>${t.payout}%</span></div>
        ${t.zerou ? '<div class="carta-back-meta-row"><span>⚠️ Zerou a banca</span><span>sim</span></div>' : ''}
  `;
  } else {
    metaHTML = `
        <div class="carta-back-meta-row"><span>Par</span><span>${t.pair}</span></div>
        <div class="carta-back-meta-row"><span>Horário</span><span>${t.scheduleStart}–${t.scheduleEnd}</span></div>
        <div class="carta-back-meta-row"><span>Período testado</span><span>${periodoTxt}</span></div>
        <div class="carta-back-meta-row"><span>Dias testados</span><span>${t.diasTestados ?? '—'}</span></div>
        <div class="carta-back-meta-row"><span>Winrate</span><span>${t.winrate}%</span></div>
        <div class="carta-back-meta-row"><span>Entradas/dia</span><span>${t.entradasPorDia != null ? '~' + t.entradasPorDia : '—'}</span></div>
  `;
  }

  return `
    <div class="carta-face carta-face-back rarity-${t.rarity}">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div class="card-title" style="font-size:1.05rem">${item.nome}</div>
        <span class="card-rarity-badge ${t.rarity}">${RARITY_LABEL[t.rarity] || 'Comum'}</span>
      </div>
      <div style="font-size:.7rem;color:var(--text-muted);margin-top:2px">por <span style="color:var(--accent-hover);font-weight:600">Você</span> · ${categoria}</div>
      ${renderLinhagem(item)}
      ${t.entries != null ? renderConfidenceBar(t.entries) : ''}

      <div class="carta-back-desc-label">Como funciona</div>
      <div class="carta-back-desc">${descricaoAutomatica(item)}</div>

      <div class="carta-back-meta">
        ${metaHTML}
      </div>
      <div style="margin-top:10px;display:flex;gap:8px">
        <button class="btn btn-sm btn-outline" style="flex:1" onclick="event.stopPropagation(); excluirDoInventario('${item.id}')">🗑️ Remover</button>
      </div>
      <div class="carta-footer" style="margin:8px -16px -14px;padding:9px 16px">
        <div class="card-footer-stat"><strong>1</strong> usuário</div>
        <div class="grade ${getGradeClass(t.grade)}">${t.grade}</div>
      </div>
    </div>
  `;
}

function renderCartaFlip(item) {
  return `
    <div class="carta-flip-wrap" data-carta-id="${item.id}" onclick="this.classList.toggle('is-flipped')">
      <button class="carta-excluir-rapido" title="Mover para a lixeira" onclick="event.stopPropagation(); excluirDoInventario('${item.id}')">🗑️</button>
      <div class="carta-flip-inner">
        ${renderCartaFront(item)}
        ${renderCartaBack(item)}
      </div>
    </div>
  `;
}
