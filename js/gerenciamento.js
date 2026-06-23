/* ============================================================
   BuildCraft OB — Gerenciamento
   Só existem dois gerenciamentos-base: Soros (avança após vitória)
   e Martingale (avança após derrota). Ao clicar em um deles, um
   assistente pergunta, em sequência: próxima vela ou próxima
   entrada → quantas vezes repetir → valor da entrada base. Depois
   do limite de repetições, volta pra entrada base.
   ============================================================ */

const GERENCIAMENTO_KEY = 'buildcraft_gerenciamentos';

const GERENCIAMENTO_PADRAO_VALOR_ENTRADA = 1;
const GERENCIAMENTO_PADRAO_MULTIPLICADOR = 2;
const GERENCIAMENTO_NIVEIS_MAX = 20;

// Os dois gerenciamentos-base — não são configurações prontas, são o
// ponto de partida do assistente (clicar neles pergunta o resto).
const GERENCIAMENTOS_BASE = [
  { resultado: 'vitoria', nome: 'Soros', icone: '📈', desc: 'Avança a entrada só depois de uma vitória, somando o lucro (ou um percentual dele) à entrada base.', ativo: true },
  { resultado: 'derrota', nome: 'Martingale', icone: '♻️', desc: 'Avança a entrada só depois de uma derrota, multiplicando a entrada anterior.', ativo: true },
  { resultado: 'fixo', nome: 'Mão Fixa', icone: '✋', desc: 'Sempre entra com o mesmo valor, vença ou perca — sem progressão nenhuma.', ativo: true },
  // MVP: criação de gerenciamento personalizado temporariamente DESATIVADA
  // (não remover — só tirar o `ativo: false` quando for reabilitar).
  { resultado: 'custom', nome: 'Personalizado', icone: '🛠️', desc: 'Você define passo a passo o que fazer após cada vitória ou derrota, com a sua própria fórmula.', ativo: false },
];

// ── ARMAZENAMENTO (gerenciamentos já configurados pelo usuário) ──
function getGerenciamentosCustom() {
  try {
    const lista = JSON.parse(localStorage.getItem(GERENCIAMENTO_KEY));
    return lista || [];
  } catch (e) {
    return [];
  }
}

function salvarGerenciamentosCustom(lista) {
  localStorage.setItem(GERENCIAMENTO_KEY, JSON.stringify(lista));
}

function getTodosGerenciamentos() {
  return getGerenciamentosCustom();
}

// ── ASSISTENTE (perguntas em sequência) ──
const gerenciamentoWizard = {
  editandoId: null,
  resultado: null,
  passos: [],
  passoAtual: 0,
};

function passosDoWizard(resultado) {
  if (resultado === 'custom') {
    return ['momento', 'valor-entrada', 'custom', 'nome'];
  }
  if (resultado === 'fixo') {
    return ['momento', 'valor-entrada', 'nome'];
  }
  const base = ['momento', 'niveis', 'valor-entrada'];
  base.push(resultado === 'vitoria' ? 'soros' : 'martingale');
  base.push('nome');
  return base;
}

function iniciarWizardGerenciamento(resultado, idParaEditar) {
  gerenciamentoWizard.resultado = resultado;
  gerenciamentoWizard.editandoId = idParaEditar || null;
  gerenciamentoWizard.passos = passosDoWizard(resultado);
  gerenciamentoWizard.passoAtual = 0;

  let dados = {
    nome: '', momento: 'vela', niveis: 3,
    valorEntrada: GERENCIAMENTO_PADRAO_VALOR_ENTRADA, multiplicador: GERENCIAMENTO_PADRAO_MULTIPLICADOR,
    baseSoros: 'lucro_total', percentualSoros: 100, customSteps: null,
  };
  if (idParaEditar) {
    const existente = getGerenciamentosCustom().find(g => g.id === idParaEditar);
    if (existente) dados = existente;
  }

  document.getElementById('gerenciamento-nome').value = dados.nome;
  document.getElementById('gerenciamento-niveis').value = dados.niveis;
  document.getElementById('gerenciamento-valor-entrada').value = dados.valorEntrada;
  document.getElementById('gerenciamento-multiplicador').value = dados.multiplicador;
  document.getElementById('gerenciamento-percentual-soros').value = dados.percentualSoros;
  setGerenciamentoMomento(dados.momento);
  setGerenciamentoBaseSoros(dados.baseSoros);

  // Estado do builder personalizado (clona pra não mexer no salvo até confirmar)
  gerenciamentoWizard.customSteps = (resultado === 'custom')
    ? (dados.customSteps && dados.customSteps.length
        ? dados.customSteps.map(s => ({ ...s }))
        : [{ trigger: 'derrota', base: 'anterior', op: 'multiplicar', factor: 2 }])
    : [];
  renderCustomSteps();

  const labels = { vitoria: ['📈', 'Soros'], derrota: ['♻️', 'Martingale'], fixo: ['✋', 'Mão Fixa'], custom: ['🛠️', 'Personalizado'] };
  const [ic, nm] = labels[resultado] || ['', ''];
  document.getElementById('gerenciamento-form-titulo').textContent =
    `${ic} ${idParaEditar ? 'Editar' : 'Configurar'} ${nm}`;

  document.getElementById('gerenciamento-form').style.display = 'block';
  renderPassoWizard();
  document.getElementById('gerenciamento-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function renderPassoWizard() {
  const passos = gerenciamentoWizard.passos;
  const atual = passos[gerenciamentoWizard.passoAtual];

  ['momento', 'niveis', 'valor-entrada', 'soros', 'martingale', 'custom', 'nome'].forEach(p => {
    const el = document.getElementById(`gerenciamento-passo-${p}`);
    if (el) el.style.display = p === atual ? 'block' : 'none';
  });

  document.getElementById('gerenciamento-wizard-progress').innerHTML = passos
    .map((_, i) => `<div class="seg${i <= gerenciamentoWizard.passoAtual ? ' done' : ''}"></div>`)
    .join('');

  document.getElementById('gerenciamento-btn-voltar-passo').style.display =
    gerenciamentoWizard.passoAtual === 0 ? 'none' : 'inline-block';
  document.getElementById('gerenciamento-btn-proximo-passo').style.display =
    gerenciamentoWizard.passoAtual === passos.length - 1 ? 'none' : 'inline-block';
  document.getElementById('gerenciamento-btn-salvar-passo').style.display =
    gerenciamentoWizard.passoAtual === passos.length - 1 ? 'inline-block' : 'none';
}

function proximoPassoWizard() {
  const atual = gerenciamentoWizard.passos[gerenciamentoWizard.passoAtual];

  if (atual === 'niveis') {
    const niveis = parseInt(document.getElementById('gerenciamento-niveis').value, 10);
    if (!niveis || niveis < 1 || niveis > GERENCIAMENTO_NIVEIS_MAX) {
      showToast('⚠️ Quantidade inválida', `Escolha entre 1 e ${GERENCIAMENTO_NIVEIS_MAX} vezes.`, 'default');
      return;
    }
  }
  if (atual === 'valor-entrada') {
    const valorEntrada = parseFloat(document.getElementById('gerenciamento-valor-entrada').value);
    if (!valorEntrada || valorEntrada < GERENCIAMENTO_PADRAO_VALOR_ENTRADA) {
      showToast('⚠️ Valor inválido', `O valor mínimo de entrada é ${GERENCIAMENTO_PADRAO_VALOR_ENTRADA}.`, 'default');
      return;
    }
  }
  if (atual === 'martingale') {
    const multiplicador = parseFloat(document.getElementById('gerenciamento-multiplicador').value);
    if (!multiplicador || multiplicador <= 1) {
      showToast('⚠️ Multiplicador inválido', 'O valor de multiplicação precisa ser maior que 1.', 'default');
      return;
    }
  }
  if (atual === 'soros' && gerenciamentoWizard.baseSorosAtual === 'percentual') {
    const percentualSoros = parseFloat(document.getElementById('gerenciamento-percentual-soros').value);
    if (!percentualSoros || percentualSoros <= 0) {
      showToast('⚠️ Percentual inválido', 'Informe um percentual maior que 0.', 'default');
      return;
    }
  }
  if (atual === 'custom') {
    if (!gerenciamentoWizard.customSteps.length) {
      showToast('⚠️ Sem passos', 'Adicione pelo menos um passo na sua sequência.', 'default');
      return;
    }
    if (gerenciamentoWizard.customSteps.some(s => !s.factor || s.factor <= 0)) {
      showToast('⚠️ Fator inválido', 'Todos os passos precisam de um número maior que 0.', 'default');
      return;
    }
  }

  gerenciamentoWizard.passoAtual++;
  renderPassoWizard();
}

function voltarPassoWizard() {
  gerenciamentoWizard.passoAtual--;
  renderPassoWizard();
}

function cancelarFormGerenciamento() {
  document.getElementById('gerenciamento-form').style.display = 'none';
  gerenciamentoWizard.editandoId = null;
}

function setGerenciamentoMomento(momento) {
  document.querySelectorAll('#gerenciamento-momento-grid .direction-btn').forEach(b => {
    b.classList.toggle('selected', b.dataset.momento === momento);
  });
}

function setGerenciamentoBaseSoros(base) {
  gerenciamentoWizard.baseSorosAtual = base;
  document.querySelectorAll('#gerenciamento-base-soros-grid .direction-btn').forEach(b => {
    b.classList.toggle('selected', b.dataset.base === base);
  });
  document.getElementById('gerenciamento-percentual-soros-wrap').style.display = base === 'percentual' ? 'block' : 'none';
}

// ── BUILDER PERSONALIZADO ──
const CUSTOM_MAX_STEPS = 20;

function addCustomStep() {
  if (gerenciamentoWizard.customSteps.length >= CUSTOM_MAX_STEPS) {
    showToast('⚠️ Limite', `Máximo de ${CUSTOM_MAX_STEPS} passos.`, 'default');
    return;
  }
  gerenciamentoWizard.customSteps.push({ trigger: 'derrota', base: 'anterior', op: 'multiplicar', factor: 2 });
  renderCustomSteps();
}

function removeCustomStep(idx) {
  gerenciamentoWizard.customSteps.splice(idx, 1);
  renderCustomSteps();
}

function updateCustomStep(idx, campo, valor) {
  const s = gerenciamentoWizard.customSteps[idx];
  if (!s) return;
  s[campo] = campo === 'factor' ? parseFloat(valor) : valor;
  renderCustomSteps();
}

function textoFormulaStep(s) {
  const baseTxt = s.base === 'base' ? 'entrada base' : 'entrada anterior';
  const opTxt = s.op === 'dividir' ? '÷' : '×';
  const gatilho = s.trigger === 'vitoria' ? 'vitória' : 'derrota';
  return `Após ${gatilho}: ${baseTxt} ${opTxt} ${s.factor || '?'}`;
}

function renderCustomSteps() {
  const cont = document.getElementById('gerenciamento-custom-steps');
  if (!cont) return;
  cont.innerHTML = gerenciamentoWizard.customSteps.map((s, i) => `
    <div class="ger-step-row">
      <div class="ger-step-head">
        <span>Passo ${i + 1}</span>
        <span class="ger-step-del" onclick="removeCustomStep(${i})">✕ remover</span>
      </div>
      <div class="ger-step-grid" style="margin-bottom:8px;">
        <select onchange="updateCustomStep(${i},'trigger',this.value)">
          <option value="derrota" ${s.trigger === 'derrota' ? 'selected' : ''}>Após derrota</option>
          <option value="vitoria" ${s.trigger === 'vitoria' ? 'selected' : ''}>Após vitória</option>
        </select>
        <select onchange="updateCustomStep(${i},'base',this.value)">
          <option value="anterior" ${s.base === 'anterior' ? 'selected' : ''}>Entrada anterior</option>
          <option value="base" ${s.base === 'base' ? 'selected' : ''}>Entrada base</option>
        </select>
      </div>
      <div class="ger-step-grid">
        <select onchange="updateCustomStep(${i},'op',this.value)">
          <option value="multiplicar" ${s.op === 'multiplicar' ? 'selected' : ''}>Multiplicar ×</option>
          <option value="dividir" ${s.op === 'dividir' ? 'selected' : ''}>Dividir ÷</option>
        </select>
        <input type="number" min="0.1" step="0.1" value="${s.factor}" placeholder="fator"
               onchange="updateCustomStep(${i},'factor',this.value)">
      </div>
      <div class="ger-step-formula">${textoFormulaStep(s)}</div>
    </div>
  `).join('') || '<p style="text-align:center;color:var(--text-muted);font-size:13px;padding:8px;">Nenhum passo ainda.</p>';
}

// Existe pelo menos um histórico vindo de uma estratégia criada pelo usuário?
// (origem 'estrategia'). É o pré-requisito pra criar um gerenciamento. Lê a
// chave direto pra não depender da ordem de carregamento dos scripts.
function temHistoricoDeEstrategia() {
  try {
    const lista = JSON.parse(localStorage.getItem('buildcraft_historicos')) || [];
    return lista.some(h => h.origem === 'estrategia');
  } catch (e) {
    return false;
  }
}

// Config do assistente em construção. Fica SÓ na memória (não vai pra
// localStorage) — o gerenciamento "de verdade" é a carta que nasce ao salvar
// no inventário. Assim não sobram configs-fantasma que reaparecem ou bloqueiam
// nomes. É o que `resolverGerenciamento` lê durante o fluxo de criar→testar.
let _gerenciamentoEmCriacao = null;

// Monta a config do assistente em memória (sem testar, sem toast). Devolve o
// id, ou null se a validação falhar.
function persistirGerenciamentoDoWizard() {
  const nome = document.getElementById('gerenciamento-nome').value.trim();
  if (!nome) {
    showToast('⚠️ Dê um nome', 'Escolha um nome para identificar seu gerenciamento.', 'default');
    return null;
  }

  // Nome único entre as CARTAS de gerenciamento que existem de fato (não
  // deletadas). Carta na lixeira/excluída libera o nome — "deletado = nunca
  // existiu". Não há mais store de config pra deixar nome-fantasma travando.
  const cartas = getInventario().filter(e => !e.deletadoEm && e.mode === 'gerenciamento');
  if (cartas.some(c => c.nome.toLowerCase() === nome.toLowerCase())) {
    showToast('⚠️ Nome já existe', 'Você já tem uma carta de gerenciamento com esse nome.', 'default');
    return null;
  }

  // Sem trava de "precisa ter estratégia": o gerenciamento é testado contra o
  // histórico padrão (entrada no verde, EURUSD), liberado pra todo mundo.
  // O usuário pode usar esse padrão, o histórico de uma estratégia sua, ou
  // gerar um novo testando uma carta.
  const momentoEl = document.querySelector('#gerenciamento-momento-grid .selected');
  const id = 'ger_' + Date.now();
  _gerenciamentoEmCriacao = {
    id,
    nome,
    resultado: gerenciamentoWizard.resultado,
    momento: momentoEl ? momentoEl.dataset.momento : 'vela',
    niveis: parseInt(document.getElementById('gerenciamento-niveis').value, 10),
    valorEntrada: parseFloat(document.getElementById('gerenciamento-valor-entrada').value),
    multiplicador: parseFloat(document.getElementById('gerenciamento-multiplicador').value),
    baseSoros: gerenciamentoWizard.baseSorosAtual,
    percentualSoros: parseFloat(document.getElementById('gerenciamento-percentual-soros').value),
    customSteps: gerenciamentoWizard.resultado === 'custom'
      ? gerenciamentoWizard.customSteps.map(s => ({ ...s }))
      : null,
  };
  return id;
}

// Fluxo padronizado (igual ao da estratégia): ao terminar o assistente, o
// gerenciamento é testado contra um histórico padrão e o resultado vira uma
// carta que o usuário salva no inventário ou descarta.
function testarGerenciamentoNovo() {
  const id = persistirGerenciamentoDoWizard();
  if (!id) return;

  cancelarFormGerenciamento();
  renderGerenciamentos();
  gerenciamentoTesteState.id = id;

  obterHistoricoPadrao((historico) => {
    rodarTesteGerenciamento(id, historico, GERENCIAMENTO_TESTE_BANCA, GERENCIAMENTO_TESTE_PAYOUT,
                            'gerenciamento-criar-resultado', true);
  });
}

function editarGerenciamento(id) {
  const g = getGerenciamentosCustom().find(x => x.id === id);
  if (!g) return;
  iniciarWizardGerenciamento(g.resultado, id);
}

function excluirGerenciamento(id) {
  salvarGerenciamentosCustom(getGerenciamentosCustom().filter(g => g.id !== id));
  renderGerenciamentos();
}

// ── TESTE CONTRA HISTÓRICO REAL ──
// Em vez de simular um cenário abstrato de pior/melhor caso, o gerenciamento
// é testado contra a sequência real de W/L de um histórico (padrão ou de
// uma estratégia salva) — replay entrada por entrada, com banca de verdade.
const gerenciamentoTesteState = { id: null, ultimoResultado: null, contexto: null };

// Banca/payout padrão usados no teste automático ao criar um gerenciamento.
const GERENCIAMENTO_TESTE_BANCA = 200;
const GERENCIAMENTO_TESTE_PAYOUT = 87;

// Histórico padrão liberado pra todo mundo — uma sequência real de W/L gerada
// rodando um preset clássico contra o histórico de velas. Fica em cache na
// memória pra não bater na API toda hora.
const GERENCIAMENTO_HISTORICO_PADRAO = {
  id: 'hist_padrao',
  preset: 'verde_eurusd_1000',
  pair: 'EURUSD-OTC',
  nome: 'Histórico padrão · Entrada no Verde · EURUSD · 1000 velas',
};
let _gerHistoricoPadraoCache = null;

function obterHistoricoPadrao(onOk) {
  if (_gerHistoricoPadraoCache) { onOk(_gerHistoricoPadraoCache); return; }

  showToast('🔬 Gerando histórico padrão', 'Rodando o preset contra o histórico real de velas...', 'default');
  fetch(`${HISTORICO_API_URL}/api/historico-padrao`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ preset: GERENCIAMENTO_HISTORICO_PADRAO.preset, pair: GERENCIAMENTO_HISTORICO_PADRAO.pair }),
  })
    .then(resp => resp.json().then(data => ({ ok: resp.ok, data })))
    .then(({ ok, data }) => {
      if (!ok || !data.success || !data.resultado || !data.resultado.sequencia) {
        showToast('⚠️ Falhou', (data && data.message) || 'Não foi possível gerar o histórico padrão.', 'default');
        return;
      }
      const r = data.resultado;
      _gerHistoricoPadraoCache = {
        id: GERENCIAMENTO_HISTORICO_PADRAO.id,
        nome: GERENCIAMENTO_HISTORICO_PADRAO.nome,
        sequencia: r.sequencia,
        pair: r.pair, timeframe: r.timeframe, winrate: r.winrate,
      };
      onOk(_gerHistoricoPadraoCache);
    })
    .catch(() => showToast('❌ API offline', 'Inicie o backtest_api.py e tente de novo.', 'default'));
}

function arred(n, casas = 2) {
  const f = Math.pow(10, casas);
  return Math.round(n * f) / f;
}

function simularGerenciamentoComHistorico(g, sequencia, { bancaDisponivel, payout }) {
  const fatorPayout = payout / 100;
  let banca = bancaDisponivel;
  let bancaMin = banca;
  let stakeAtual = g.valorEntrada;
  let nivelAtual = 0;
  let zerou = false;
  let zerouNoIndex = -1;
  let maxStakeAtingido = stakeAtual;

  for (let i = 0; i < sequencia.length; i++) {
    if (banca < stakeAtual) {
      zerou = true;
      zerouNoIndex = i;
      break;
    }

    const venceu = sequencia[i] !== 'L';
    const stakeAnterior = stakeAtual;

    // Liquida a banca com o resultado da entrada atual
    if (venceu) banca = arred(banca + stakeAtual * fatorPayout);
    else banca = arred(banca - stakeAtual);

    // Calcula a próxima entrada conforme o tipo de gerenciamento
    if (g.resultado === 'custom') {
      const outcome = venceu ? 'vitoria' : 'derrota';
      const step = (g.customSteps || [])[nivelAtual];
      if (step && step.trigger === outcome) {
        const src = step.base === 'base' ? g.valorEntrada : stakeAnterior;
        stakeAtual = arred(step.op === 'dividir' ? src / step.factor : src * step.factor);
        if (stakeAtual < GERENCIAMENTO_PADRAO_VALOR_ENTRADA) stakeAtual = GERENCIAMENTO_PADRAO_VALOR_ENTRADA;
        nivelAtual++;
      } else {
        nivelAtual = 0;
        stakeAtual = g.valorEntrada;
      }
    } else if (!venceu) {
      if (g.resultado === 'derrota' && nivelAtual < g.niveis) {
        nivelAtual++;
        stakeAtual = arred(stakeAnterior * g.multiplicador);
      } else {
        nivelAtual = 0;
        stakeAtual = g.valorEntrada;
      }
    } else {
      if (g.resultado === 'vitoria' && nivelAtual < g.niveis) {
        nivelAtual++;
        const ganho = arred(stakeAnterior * fatorPayout);
        const incremento = g.baseSoros === 'percentual'
          ? arred(stakeAnterior * (g.percentualSoros / 100))
          : ganho;
        stakeAtual = arred(g.valorEntrada + incremento);
      } else {
        nivelAtual = 0;
        stakeAtual = g.valorEntrada;
      }
    }

    maxStakeAtingido = Math.max(maxStakeAtingido, stakeAtual);
    bancaMin = Math.min(bancaMin, banca);
  }

  if (bancaMin <= 0) zerou = true;

  const lucroFinal = arred(banca - bancaDisponivel);
  const drawdownPct = arred(Math.max(0, (bancaDisponivel - bancaMin) / bancaDisponivel * 100), 1);
  const roiPct = bancaDisponivel ? arred(lucroFinal / bancaDisponivel * 100, 1) : 0;
  const [grade, rarity] = classificarGerenciamento({ zerou, lucroFinal, drawdownPct, roiPct });

  return {
    bancaFinal: banca, bancaMin: arred(bancaMin), lucroFinal, drawdownPct, roiPct, zerou, zerouNoIndex,
    maxStakeAtingido: arred(maxStakeAtingido), entradasTestadas: zerou ? zerouNoIndex + 1 : sequencia.length,
    grade, rarity, payout, bancaDisponivel,
  };
}

// Raridade pelo RETORNO sobre a banca (ROI), cruzado com a queda máxima.
// Antes era só drawdown — o que tornava tudo S+ trivialmente, porque com
// entrada pequena numa banca grande o drawdown é sempre ~0. Agora pra ser
// raro o gerenciamento precisa LUCRAR de verdade sobre a banca arriscada,
// sem afundar no caminho. (Num histórico ~breakeven, ganhar muito é difícil
// — e é exatamente esse o ponto: gerenciamento não cria edge do nada.)
function classificarGerenciamento({ zerou, lucroFinal, drawdownPct, roiPct }) {
  if (zerou || lucroFinal <= 0) return ['D', 'common'];
  if (roiPct >= 25 && drawdownPct <= 10) return ['S+', 'legendary'];
  if (roiPct >= 15 && drawdownPct <= 20) return ['S', 'epic'];
  if (roiPct >= 8 && drawdownPct <= 35) return ['A', 'epic'];
  if (roiPct >= 3) return ['B', 'rare'];
  return ['C', 'rare']; // lucro positivo, mas pequeno (ROI < 3%)
}

const GERENCIAMENTO_RARITY_LABEL = { common: 'Comum', rare: 'Rara', epic: 'Épica', legendary: 'Lendária' };
const GERENCIAMENTO_RARITY_COR = {
  common: 'var(--text-secondary)', rare: 'var(--rarity-rare)',
  epic: 'var(--rarity-epic)', legendary: 'var(--rarity-legendary)',
};

// Acha um gerenciamento pelo id, seja uma config salva (lista custom) ou uma
// CARTA de gerenciamento do inventário (reconstrói a config a partir do
// definicao da carta). Assim "Testar Gerenciamento" trabalha com as cartas,
// no mesmo padrão de "Testar Estratégia".
function resolverGerenciamento(id) {
  // Primeiro a config em construção (fluxo Criar, ainda virando carta)...
  if (_gerenciamentoEmCriacao && _gerenciamentoEmCriacao.id === id) return _gerenciamentoEmCriacao;
  // ...senão, uma carta de gerenciamento do inventário (fluxo Testar).
  const card = getInventario().find(e => e.id === id && e.mode === 'gerenciamento' && !e.deletadoEm);
  if (card) return { id: card.id, nome: card.nome, ...card.definicao };
  return null;
}

// Aba "Testar Gerenciamento": abre o painel de teste para uma carta de
// gerenciamento, com o histórico padrão + os históricos gerados de estratégias.
function abrirTesteGerenciamento(id) {
  const g = resolverGerenciamento(id);
  if (!g) return;

  gerenciamentoTesteState.id = id;
  gerenciamentoTesteState.ultimoResultado = null;

  document.getElementById('gerenciamento-teste-nome').textContent = `🧪 Testar: ${g.nome}`;
  document.getElementById('gerenciamento-teste-banca').value = GERENCIAMENTO_TESTE_BANCA;
  document.getElementById('gerenciamento-teste-payout').value = GERENCIAMENTO_TESTE_PAYOUT;
  document.getElementById('gerenciamento-teste-resultado').style.display = 'none';
  document.getElementById('gerenciamento-teste-resultado').innerHTML = '';

  const historicos = getHistoricos();
  const select = document.getElementById('gerenciamento-teste-historico');
  select.innerHTML = `<option value="${GERENCIAMENTO_HISTORICO_PADRAO.id}">⭐ ${GERENCIAMENTO_HISTORICO_PADRAO.nome}</option>`
    + historicos.map(h => `<option value="${h.id}">${h.nome} (${h.sequencia.length} entradas)</option>`).join('');

  const form = document.getElementById('gerenciamento-teste-form');
  form.style.display = 'block';
  form.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function fecharTesteGerenciamento() {
  document.getElementById('gerenciamento-teste-form').style.display = 'none';
  gerenciamentoTesteState.id = null;
  gerenciamentoTesteState.ultimoResultado = null;
}

// Botão "Testar" da aba Testar Gerenciamento.
function rodarSimulacaoGerenciamento() {
  const id = gerenciamentoTesteState.id;
  if (!resolverGerenciamento(id)) return;

  const bancaDisponivel = parseFloat(document.getElementById('gerenciamento-teste-banca').value);
  const payout = parseFloat(document.getElementById('gerenciamento-teste-payout').value);
  if (!bancaDisponivel || bancaDisponivel <= 0) {
    showToast('⚠️ Banca inválida', 'Informe quanto você tem disponível para operar.', 'default');
    return;
  }
  if (!payout || payout <= 0 || payout > 100) {
    showToast('⚠️ Payout inválido', 'Informe um payout entre 1 e 100%.', 'default');
    return;
  }

  const historicoId = document.getElementById('gerenciamento-teste-historico').value;
  if (historicoId === GERENCIAMENTO_HISTORICO_PADRAO.id) {
    obterHistoricoPadrao((hist) => rodarTesteGerenciamento(id, hist, bancaDisponivel, payout, 'gerenciamento-teste-resultado', false));
    return;
  }
  const historico = getHistoricos().find(h => h.id === historicoId);
  if (!historico) {
    showToast('⚠️ Escolha um histórico', 'Selecione um histórico de entradas reais para testar.', 'default');
    return;
  }
  rodarTesteGerenciamento(id, historico, bancaDisponivel, payout, 'gerenciamento-teste-resultado', false);
}

// Núcleo compartilhado: roda o replay e renderiza a carta de resultado no
// container indicado. `mostrarDescartar` controla o botão extra (fluxo Criar).
function rodarTesteGerenciamento(id, historico, bancaDisponivel, payout, containerId, mostrarDescartar) {
  const g = resolverGerenciamento(id);
  if (!g) return;

  const r = simularGerenciamentoComHistorico(g, historico.sequencia, { bancaDisponivel, payout });
  gerenciamentoTesteState.id = id;
  gerenciamentoTesteState.ultimoResultado = r;
  gerenciamentoTesteState.historicoUsado = { id: historico.id, nome: historico.nome, total: historico.sequencia.length };
  gerenciamentoTesteState.contexto = containerId;

  const cont = document.getElementById(containerId);
  cont.style.display = 'block';
  cont.innerHTML = htmlResultadoGerenciamento(r, historico, mostrarDescartar);
  cont.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function htmlResultadoGerenciamento(r, historico, mostrarDescartar) {
  const cor = GERENCIAMENTO_RARITY_COR[r.rarity];
  const botaoDescartar = mostrarDescartar
    ? '<button class="btn btn-outline" onclick="descartarResultadoGerenciamento()">🗑️ Descartar</button>'
    : '';
  return `
    <div style="border:2px solid ${cor}; border-radius:12px; padding:20px; background:rgba(99,102,241,0.04);">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px;">
        <div style="font-size:13px;color:var(--text-secondary)">Replay de ${r.entradasTestadas} entradas reais de "${historico.nome}"</div>
        <div style="text-align:center;">
          <div style="display:inline-block; padding:4px 16px; border-radius:999px; background:${cor}; color:#fff; font-size:12px; font-weight:700;">${GERENCIAMENTO_RARITY_LABEL[r.rarity]}</div>
          <div style="font-size:32px; font-weight:900; color:${cor}; line-height:1;">${r.grade}</div>
        </div>
      </div>
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(120px, 1fr)); gap:14px;">
        <div style="text-align:center; padding:12px; background:var(--bg); border-radius:8px;">
          <div style="font-size:22px; font-weight:800; color:${r.lucroFinal >= 0 ? 'var(--success)' : 'var(--danger)'};">${r.lucroFinal}</div>
          <div style="font-size:11px; color:var(--text-secondary);">Lucro/perda final</div>
        </div>
        <div style="text-align:center; padding:12px; background:var(--bg); border-radius:8px;">
          <div style="font-size:22px; font-weight:800;">${r.drawdownPct}%</div>
          <div style="font-size:11px; color:var(--text-secondary);">Maior queda da banca</div>
        </div>
        <div style="text-align:center; padding:12px; background:var(--bg); border-radius:8px;">
          <div style="font-size:22px; font-weight:800;">${r.maxStakeAtingido}</div>
          <div style="font-size:11px; color:var(--text-secondary);">Maior entrada exigida</div>
        </div>
      </div>
      ${r.zerou ? `<div style="margin-top:14px;font-size:13px;color:var(--danger);">⚠️ A banca zerou na entrada ${r.zerouNoIndex + 1} de ${historico.sequencia.length} — esse gerenciamento não sobrevive a esse histórico com essa banca.</div>` : ''}
      <div style="margin-top:18px; text-align:center; display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
        <button class="btn btn-accent" onclick="salvarTesteGerenciamentoNoInventario()">📥 Salvar como carta</button>
        ${botaoDescartar}
      </div>
    </div>
  `;
}

function descartarResultadoGerenciamento() {
  const cont = document.getElementById(gerenciamentoTesteState.contexto || 'gerenciamento-criar-resultado');
  if (cont) { cont.style.display = 'none'; cont.innerHTML = ''; }
  gerenciamentoTesteState.ultimoResultado = null;
}

function salvarTesteGerenciamentoNoInventario() {
  const g = resolverGerenciamento(gerenciamentoTesteState.id);
  const r = gerenciamentoTesteState.ultimoResultado;
  const h = gerenciamentoTesteState.historicoUsado;
  if (!g || !r) return;

  const item = {
    id: 'ger_inv_' + Date.now(),
    nome: g.nome,
    mode: 'gerenciamento',
    criadaEm: new Date().toISOString(),
    definicao: {
      resultado: g.resultado,
      momento: g.momento,
      niveis: g.niveis,
      valorEntrada: g.valorEntrada,
      multiplicador: g.multiplicador,
      baseSoros: g.baseSoros,
      percentualSoros: g.percentualSoros,
      customSteps: g.customSteps || null,
      origemId: g.id,
    },
    teste: {
      rarity: r.rarity,
      grade: r.grade,
      historicoNome: h.nome,
      entradasTestadas: r.entradasTestadas,
      lucroFinal: r.lucroFinal,
      drawdownPct: r.drawdownPct,
      maxStakeAtingido: r.maxStakeAtingido,
      bancaDisponivel: r.bancaDisponivel,
      payout: r.payout,
      zerou: r.zerou,
    },
    carta: { numero: proximoNumeroDescoberta(), transformadaEm: new Date().toISOString() },
  };

  const lista = getInventario();
  lista.push(item);
  salvarInventario(lista);

  // Limpa os dois possíveis containers de resultado (Criar e Testar)
  ['gerenciamento-criar-resultado', 'gerenciamento-teste-resultado'].forEach(cid => {
    const c = document.getElementById(cid);
    if (c) { c.style.display = 'none'; c.innerHTML = ''; }
  });
  fecharTesteGerenciamento();
  showToast('🃏 Carta criada!', `"${item.nome}" agora é a carta #${String(item.carta.numero).padStart(3, '0')} do seu inventário.`, 'discovery');
}

// ── RENDERIZAÇÃO ──
const GERENCIAMENTO_RESULTADO_LABEL = { vitoria: 'Soros', derrota: 'Martingale', fixo: 'Mão Fixa', custom: 'Personalizado' };
const GERENCIAMENTO_MOMENTO_LABEL = { vela: 'Próxima Vela', entrada: 'Próxima Entrada' };
const GERENCIAMENTO_CLASSE = { vitoria: 'soros', derrota: 'martingale', fixo: 'fixo', custom: 'custom' };
const GERENCIAMENTO_ICONE = { vitoria: '📈', derrota: '♻️', fixo: '✋', custom: '🛠️' };

function resumoRegraGerenciamento(g) {
  if (g.resultado === 'vitoria') {
    return g.baseSoros === 'percentual'
      ? `+${g.percentualSoros}% da anterior, até ${g.niveis}x`
      : `+lucro da anterior, até ${g.niveis}x`;
  }
  if (g.resultado === 'derrota') {
    return `×${g.multiplicador} a cada derrota, até ${g.niveis}x`;
  }
  if (g.resultado === 'fixo') {
    return `entrada fixa de ${g.valorEntrada}, sempre`;
  }
  return `${(g.customSteps || []).length} passos personalizados`;
}

function renderCardBaseGerenciamento(base) {
  const classe = GERENCIAMENTO_CLASSE[base.resultado];
  const tag = { vitoria: 'Após vitória', derrota: 'Após derrota', fixo: 'Sempre igual', custom: 'Você no controle' }[base.resultado];
  return `
    <div class="ger-base-card ${classe}" onclick="iniciarWizardGerenciamento('${base.resultado}')">
      <div class="ger-base-icon">${base.icone}</div>
      <div class="ger-base-name">${base.nome}</div>
      <div class="ger-base-tag">${tag}</div>
      <div class="ger-base-desc">${base.desc}</div>
      <div class="ger-base-cta">Configurar <span>→</span></div>
    </div>
  `;
}

function renderCardGerenciamentoCustom(g) {
  const classe = GERENCIAMENTO_CLASSE[g.resultado];
  return `
    <div class="glass-card ger-mini-card ${classe}">
      <div>
        <div class="ger-mini-title">${GERENCIAMENTO_ICONE[g.resultado]} ${g.nome}
          <span class="ger-chip">${GERENCIAMENTO_RESULTADO_LABEL[g.resultado]}</span>
        </div>
        <div class="ger-mini-info">${GERENCIAMENTO_MOMENTO_LABEL[g.momento]} · entrada base ${g.valorEntrada} · ${resumoRegraGerenciamento(g)}</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-sm btn-outline" onclick="editarGerenciamento('${g.id}')">✏️ Editar</button>
        <button class="btn btn-sm btn-outline" onclick="excluirGerenciamento('${g.id}')">🗑️ Excluir</button>
      </div>
    </div>
  `;
}

function renderGerenciamentos() {
  const defaultsCont = document.getElementById('gerenciamento-defaults');
  if (!defaultsCont) return;

  // O store antigo de configs (buildcraft_gerenciamentos) foi aposentado: os
  // gerenciamentos agora vivem só como cartas no inventário. Apaga qualquer
  // resquício pra não reaparecer nem travar nomes ("deletado = nunca existiu").
  if (localStorage.getItem(GERENCIAMENTO_KEY)) localStorage.removeItem(GERENCIAMENTO_KEY);

  defaultsCont.innerHTML = GERENCIAMENTOS_BASE.filter(g => g.ativo).map(renderCardBaseGerenciamento).join('');
}

// Aba "Testar Gerenciamento": lista as CARTAS de gerenciamento do inventário
// (mesmo padrão de "Testar Estratégia", que lista as cartas de estratégia).
// Clicar numa carta abre o painel de teste contra um histórico.
function renderGerenciamentosTestar() {
  const cont = document.getElementById('gerenciamento-testar-lista');
  if (!cont) return;

  const cartas = getInventario().filter(e => !e.deletadoEm && e.mode === 'gerenciamento');
  if (cartas.length) {
    cont.style.display = 'grid';
    cont.style.gridTemplateColumns = 'repeat(auto-fill, minmax(220px, 1fr))';
    cont.style.gap = '28px';
  } else {
    cont.style.display = 'block';
  }
  cont.innerHTML = cartas.length
    ? cartas.map(item => `
        <div class="carta-flip-wrap" onclick="abrirTesteGerenciamento('${item.id}')">
          <div class="carta-flip-inner">
            ${renderCartaFront(item)}
          </div>
        </div>
      `).join('')
    : '<p class="ger-empty">Você ainda não tem cartas de gerenciamento. Crie uma em "Criar Gerenciamento" primeiro.</p>';
}
