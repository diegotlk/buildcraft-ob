/* ============================================================
   Binaryzando — Autenticação
   Sessão do usuário (token + e-mail) guardada no localStorage.
   Carregada em toda página que precisa saber se o usuário está
   logado (navbar) ou exigir login (Laboratório, Inventário...).
   ============================================================ */

const AUTH_API_BASE = 'https://api.binaryzando.com';
const SESSAO_KEY = 'buildcraft_sessao';

// "Lembrar de mim" decide ONDE a sessão fica: localStorage (sobrevive a
// fechar o navegador) ou sessionStorage (esquece ao fechar a aba/navegador).
// getSessao() olha as duas pra não importar qual delas o login usou.
function getSessao() {
  try {
    const raw = sessionStorage.getItem(SESSAO_KEY) || localStorage.getItem(SESSAO_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function salvarSessao(token, email, plano, lembrar, nome) {
  // Se plano/nome não vierem, preserva o que já estava salvo (ex.: ao trocar
  // o e-mail não queremos zerar o plano ou o nome da conta).
  const atual = getSessao();
  const planoFinal = plano !== undefined ? plano : (atual?.plano || 'free');
  const nomeFinal = nome !== undefined ? nome : (atual?.nome || '');
  const dados = JSON.stringify({ token, email, plano: planoFinal, nome: nomeFinal });

  // Sem "lembrar" explícito (chamadas internas, ex.: refresh do plano), mantém
  // o mesmo tipo de armazenamento que já estava em uso — não promove nem
  // rebaixa a sessão por engano.
  const usarSessionStorage = lembrar === undefined
    ? (!!sessionStorage.getItem(SESSAO_KEY) && !localStorage.getItem(SESSAO_KEY))
    : (lembrar === false);

  if (usarSessionStorage) {
    sessionStorage.setItem(SESSAO_KEY, dados);
    localStorage.removeItem(SESSAO_KEY);
  } else {
    localStorage.setItem(SESSAO_KEY, dados);
    sessionStorage.removeItem(SESSAO_KEY);
  }
}

function limparSessao() {
  localStorage.removeItem(SESSAO_KEY);
  sessionStorage.removeItem(SESSAO_KEY);
}

function estaLogado() {
  return !!getSessao()?.token;
}

// Plano premium? Fonte da verdade no servidor (coluna 'plano'); aqui é só o
// reflexo guardado na sessão, atualizado a cada /api/auth/me.
function ehPremium() {
  return getSessao()?.plano === 'premium';
}

function avisarConta(titulo, msg) {
  if (typeof showToast === 'function') showToast(titulo, msg, 'default');
  else alert(`${titulo}\n\n${msg}`);
}

// Inicia a compra do Premium. Precisa estar logado (a compra fica amarrada ao
// e-mail da conta). O formulário de Nome + CPF/CNPJ — o Asaas exige esses
// dados pra emitir a cobrança — vive na seção "Premium" da página de perfil.
function comprarPremium() {
  if (ehPremium()) {
    avisarConta('⭐ Você já é Premium', 'Sua conta já tem acesso a tudo. Aproveite!');
    return;
  }
  if (!estaLogado()) {
    window.location.href = 'login.html?redirect=planos.html';
    return;
  }
  window.location.href = 'perfil.html#premium';
}

async function enviarAssinatura() {
  const nome = (document.getElementById('pr-nome')?.value || '').trim();
  const cpf = (document.getElementById('pr-cpf')?.value || '').replace(/\D/g, '');
  if (nome.length < 3) { mostrarErroConta('Informe seu nome completo.'); return; }
  if (cpf.length !== 11 && cpf.length !== 14) {
    mostrarErroConta('Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.');
    return;
  }
  const btn = document.getElementById('pr-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Gerando cobrança...'; }
  try {
    const resp = await fetch(`${AUTH_API_BASE}/api/assinatura/criar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getSessao()?.token },
      body: JSON.stringify({ nome, cpf }),
    });
    const dados = await resp.json();
    if (!resp.ok || !dados.success || !dados.url) {
      mostrarErroConta(dados.message || 'Não foi possível iniciar o pagamento.');
      if (btn) { btn.disabled = false; btn.textContent = 'Ir para o pagamento'; }
      return;
    }
    window.location.href = dados.url;  // tela de pagamento do Asaas
  } catch (e) {
    mostrarErroConta('Não foi possível conectar à API.');
    if (btn) { btn.disabled = false; btn.textContent = 'Ir para o pagamento'; }
  }
}

function irParaPlanos() {
  window.location.href = 'planos.html';
}

// Chamado no topo de páginas que exigem login (antes do navbar renderizar,
// pra não dar nem um flash de conteúdo protegido).
function exigirLogin() {
  if (!estaLogado()) {
    const pagina = location.pathname.split('/').pop() || 'index.html';
    window.location.replace('login.html?redirect=' + encodeURIComponent(pagina));
  }
}

async function fazerLogout() {
  const sessao = getSessao();
  limparSessao();
  if (sessao?.token) {
    try {
      await fetch(`${AUTH_API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + sessao.token },
      });
    } catch (e) {
      // Já saiu localmente; falha de rede aqui não bloqueia o logout.
    }
  }
  window.location.href = 'index.html';
}

/* ============================================================
   Regras de senha forte — mesma política aplicada no servidor
   (validar_forca_senha em backtest_api.py). Única fonte no front,
   usada tanto no cadastro (login.html) quanto no modal "Mudar senha".
   ============================================================ */
function regrasSenha(senha) {
  return {
    tamanho:   senha.length >= 8,
    maiuscula: /[A-Z]/.test(senha),
    minuscula: /[a-z]/.test(senha),
    numero:    /[0-9]/.test(senha),
    especial:  /[^A-Za-z0-9]/.test(senha),
  };
}

function senhaForte(senha) {
  return Object.values(regrasSenha(senha)).every(Boolean);
}

// idPara: recebe a chave da regra ('tamanho', 'maiuscula'...) e devolve o id
// do elemento correspondente no checklist daquela tela (os ids mudam entre
// o formulário de cadastro e o modal de troca de senha).
function aplicarChecklistSenha(senha, idPara) {
  const regras = regrasSenha(senha);
  for (const chave in regras) {
    const el = document.getElementById(idPara(chave));
    if (!el) continue;
    el.classList.toggle('ok', regras[chave]);
    el.querySelector('.icone').textContent = regras[chave] ? '✓' : '○';
  }
}

// Ícones de olho (SVG simples, sem emoji) pro botão de mostrar/ocultar senha.
const ICONE_OLHO_ABERTO = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>';
const ICONE_OLHO_FECHADO = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A9.26 9.26 0 0 1 12 20c-7 0-11-8-11-8a18.42 18.42 0 0 1 4.16-5.42M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

// Olho de mostrar/ocultar senha — reutilizável em QUALQUER campo de senha do
// site (login, cadastro, perfil, redefinir-senha). Passa o id do input e o
// próprio botão clicado, então a mesma função serve pra vários campos na
// mesma página (ex.: perfil.html tem 4 campos de senha diferentes).
function alternarVisibilidadeSenha(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const oculta = input.type === 'password';
  input.type = oculta ? 'text' : 'password';
  if (btn) {
    btn.innerHTML = oculta ? ICONE_OLHO_FECHADO : ICONE_OLHO_ABERTO;
    btn.title = oculta ? 'Ocultar senha' : 'Mostrar senha';
    btn.setAttribute('aria-label', btn.title);
  }
}

/* ============================================================
   Avatar — emblemas dos títulos como imagem de perfil
   ============================================================ */
const AVATAR_KEY = 'binaryzando_avatar';
const AVATAR_OPCOES = [
  { id: 'genesis',         src: 'titulos_emblemas/genesis.svg'  },
  { id: 'explorador',      src: 'titulos_emblemas/bussola.png'  },
  { id: 'cacador_lendas',  src: 'titulos_emblemas/coroa.png'    },
  { id: 'fiel',            src: 'titulos_emblemas/escudo.png'   },
  { id: 'coruja',          src: 'titulos_emblemas/coruja.png'   },
  { id: 'lobo',            src: 'titulos_emblemas/lobo.png'     },
  { id: 'falcao',          src: 'titulos_emblemas/falcao.png'   },
  { id: 'galo',            src: 'titulos_emblemas/galo.png'     },
];

function getAvatar() {
  return localStorage.getItem(AVATAR_KEY) || null;
}

function aplicarAvatarNoNavbar() {
  const avatar = document.querySelector('.navbar-actions .navbar-avatar');
  if (!avatar) return;
  const id = getAvatar();
  const opcao = id ? AVATAR_OPCOES.find(o => o.id === id) : null;
  if (opcao) {
    avatar.style.backgroundImage = `url('${opcao.src}')`;
    avatar.style.backgroundSize = 'cover';
    avatar.style.backgroundPosition = 'center';
    avatar.textContent = '';
  }
}

/* ============================================================
   Bordas de avatar
   ============================================================ */
const BORDA_KEY = 'binaryzando_borda';
const BORDA_OPCOES = [
  { id: 'f1', src: 'bordas_avatar/f1.png' },
  { id: 'f2', src: 'bordas_avatar/f2.png' },
  { id: 'f3', src: 'bordas_avatar/f3.png' },
  { id: 'f4', src: 'bordas_avatar/f4.png' },
  { id: 'm1', src: 'bordas_avatar/m1.png' },
  { id: 'm2', src: 'bordas_avatar/m2.png' },
  { id: 'm3', src: 'bordas_avatar/m3.png' },
  { id: 'm4', src: 'bordas_avatar/m4.png' },
];

function getBorda() {
  return localStorage.getItem(BORDA_KEY) || null;
}

function aplicarBordaNoNavbar() {
  const avatar = document.querySelector('.navbar-actions .navbar-avatar');
  if (!avatar) return;
  const old = avatar.querySelector('.navbar-borda-img');
  if (old) old.remove();
  const id = getBorda();
  const opcao = id ? BORDA_OPCOES.find(o => o.id === id) : null;
  if (!opcao) return;
  // A borda precisa ser maior que o avatar para ficar AO REDOR dele.
  // O avatar tem 36px; a borda fica em 72px total (18px de margem em cada lado).
  // Os 18px de "sobra" formam o anel visível ao redor do círculo do avatar.
  avatar.style.position = 'relative';
  avatar.style.overflow = 'visible';
  const img = document.createElement('img');
  img.className = 'navbar-borda-img';
  img.src = opcao.src;
  img.style.cssText = 'position:absolute;top:-18px;left:-18px;width:72px;height:72px;pointer-events:none;z-index:2;display:block';
  avatar.appendChild(img);
}

/* ============================================================
   Conta: mudar nome, senha, e-mail — tudo em perfil.html.
   ============================================================ */
function erroContaHtml(elId) {
  return `<div class="auth-error" id="${elId || 'conta-erro'}"></div>`;
}

function mostrarErroConta(msg, elId) {
  const el = document.getElementById(elId || 'conta-erro');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}

function esconderErroConta(elId) {
  const el = document.getElementById(elId || 'conta-erro');
  if (el) el.style.display = 'none';
}

async function enviarMudarNome() {
  const nomeNovo = (document.getElementById('pf-nome')?.value || '').trim();
  esconderErroConta('pf-erro-nome');
  if (nomeNovo.length < 2) { mostrarErroConta('Informe um nome com pelo menos 2 caracteres.', 'pf-erro-nome'); return; }

  try {
    const resp = await fetch(`${AUTH_API_BASE}/api/auth/nome`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getSessao()?.token },
      body: JSON.stringify({ nome: nomeNovo }),
    });
    const dados = await resp.json();
    if (!resp.ok || !dados.success) {
      mostrarErroConta(dados.message || 'Não foi possível salvar o nome.', 'pf-erro-nome');
      return;
    }
    salvarSessao(getSessao().token, getSessao().email, undefined, undefined, nomeNovo);
    avisarConta('Nome salvo', 'Seu nome foi atualizado.');
  } catch (e) {
    mostrarErroConta('Não foi possível conectar à API.', 'pf-erro-nome');
  }
}

/* ============================================================
   Código de confirmação por e-mail — segunda camada além da senha atual
   pra excluir conta / trocar e-mail / trocar senha. Cobre o cenário de
   sessão sequestrada: mesmo com o token de sessão E a senha em mãos
   (ex.: sessão esquecida logada, senha salva no navegador), essas 3 ações
   só completam com um código que só chega na caixa de e-mail cadastrada.
   Um modal genérico (perfil.html) é reaproveitado pelas 3.
   ============================================================ */
const CODIGO_CONFIRMACAO_LABELS = {
  excluir: 'excluir sua conta',
  email: 'trocar seu e-mail',
  senha: 'trocar sua senha',
};
let codigoConfirmacaoPendente = null; // { tipo, executar: async (codigo) => {ok, message?} }

async function solicitarCodigoConfirmacao(tipo) {
  try {
    const resp = await fetch(`${AUTH_API_BASE}/api/auth/solicitar-codigo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getSessao()?.token },
      body: JSON.stringify({ tipo }),
    });
    const dados = await resp.json();
    return { ok: resp.ok && dados.success, message: dados.message };
  } catch (e) {
    return { ok: false, message: 'Não foi possível conectar à API.' };
  }
}

// Pede o código por e-mail e, se enviou com sucesso, abre o modal pra
// digitar. `executar(codigo)` é chamado quando a pessoa clica Confirmar —
// deve devolver {ok:true} ou {ok:false, message}.
async function abrirModalCodigo(tipo, executar) {
  const { ok, message } = await solicitarCodigoConfirmacao(tipo);
  if (!ok) return { ok: false, message: message || 'Não foi possível enviar o código.' };

  codigoConfirmacaoPendente = { tipo, executar };
  document.getElementById('cc-modal-titulo').textContent =
    `Confirme por e-mail: ${CODIGO_CONFIRMACAO_LABELS[tipo] || 'ação'}`;
  document.getElementById('cc-modal-erro').textContent = '';
  document.getElementById('cc-modal-codigo').value = '';
  document.getElementById('modal-codigo-confirmacao').classList.add('open');
  document.getElementById('cc-modal-codigo').focus();
  return { ok: true };
}

function fecharModalCodigo() {
  document.getElementById('modal-codigo-confirmacao')?.classList.remove('open');
  codigoConfirmacaoPendente = null;
}

async function reenviarCodigoConfirmacao() {
  if (!codigoConfirmacaoPendente) return;
  const btn = document.getElementById('cc-modal-reenviar');
  const erroEl = document.getElementById('cc-modal-erro');
  if (btn) btn.disabled = true;
  const { ok, message } = await solicitarCodigoConfirmacao(codigoConfirmacaoPendente.tipo);
  if (erroEl) erroEl.textContent = ok ? 'Novo código enviado.' : (message || 'Não foi possível reenviar.');
  setTimeout(() => { if (btn) btn.disabled = false; }, 5000);
}

async function confirmarCodigoModal() {
  const codigo = (document.getElementById('cc-modal-codigo')?.value || '').trim();
  const erroEl = document.getElementById('cc-modal-erro');
  if (!codigo) { if (erroEl) erroEl.textContent = 'Digite o código recebido por e-mail.'; return; }
  if (!codigoConfirmacaoPendente) return;

  const btn = document.getElementById('cc-modal-confirmar');
  if (btn) { btn.disabled = true; btn.textContent = 'Confirmando...'; }
  try {
    const resultado = await codigoConfirmacaoPendente.executar(codigo);
    if (!resultado || !resultado.ok) {
      if (erroEl) erroEl.textContent = (resultado && resultado.message) || 'Código incorreto.';
      return;
    }
    fecharModalCodigo();
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Confirmar'; }
  }
}

async function enviarMudarSenha() {
  const senhaAtual = document.getElementById('cs-atual').value;
  const senhaNova = document.getElementById('cs-nova').value;
  esconderErroConta('pf-erro-senha');

  if (!senhaAtual) { mostrarErroConta('Digite sua senha atual.', 'pf-erro-senha'); return; }
  if (!senhaForte(senhaNova)) {
    mostrarErroConta('Sua nova senha ainda não cumpre todos os requisitos acima.', 'pf-erro-senha');
    return;
  }

  const { ok, message } = await abrirModalCodigo('senha', async (codigo) => {
    try {
      const resp = await fetch(`${AUTH_API_BASE}/api/auth/senha`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getSessao()?.token },
        body: JSON.stringify({ senha_atual: senhaAtual, senha_nova: senhaNova, codigo }),
      });
      const dados = await resp.json();
      if (!resp.ok || !dados.success) {
        return { ok: false, message: dados.message || 'Não foi possível trocar a senha.' };
      }
      document.getElementById('cs-atual').value = '';
      document.getElementById('cs-nova').value = '';
      avisarConta('Senha atualizada', 'Sua senha foi trocada e as outras sessões abertas foram encerradas.');
      return { ok: true };
    } catch (e) {
      return { ok: false, message: 'Não foi possível conectar à API.' };
    }
  });
  if (!ok) mostrarErroConta(message, 'pf-erro-senha');
}

async function enviarMudarEmail() {
  const senhaAtual = document.getElementById('ce-senha').value;
  const emailNovo = document.getElementById('ce-email').value.trim();
  esconderErroConta('pf-erro-email');

  if (!senhaAtual) { mostrarErroConta('Digite sua senha atual.', 'pf-erro-email'); return; }
  if (!emailNovo) { mostrarErroConta('Digite o novo e-mail.', 'pf-erro-email'); return; }

  const { ok, message } = await abrirModalCodigo('email', async (codigo) => {
    try {
      const resp = await fetch(`${AUTH_API_BASE}/api/auth/email`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getSessao()?.token },
        body: JSON.stringify({ senha_atual: senhaAtual, email_novo: emailNovo, codigo }),
      });
      const dados = await resp.json();
      if (!resp.ok || !dados.success) {
        return { ok: false, message: dados.message || 'Não foi possível trocar o e-mail.' };
      }
      salvarSessao(getSessao().token, dados.email);
      avisarConta('E-mail atualizado', 'Seu e-mail foi trocado com sucesso.');
      renderNavbarAuth();
      return { ok: true };
    } catch (e) {
      return { ok: false, message: 'Não foi possível conectar à API.' };
    }
  });
  if (!ok) mostrarErroConta(message, 'pf-erro-email');
}

/* ============================================================
   Cancelar assinatura e excluir conta (formulários inline em perfil.html).
   ============================================================ */
async function enviarCancelamento() {
  const btn = document.getElementById('cc-btn');
  esconderErroConta('pf-erro-cancelar');
  if (btn) { btn.disabled = true; btn.textContent = 'Cancelando...'; }
  try {
    const resp = await fetch(`${AUTH_API_BASE}/api/assinatura/cancelar`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + getSessao()?.token },
    });
    const dados = await resp.json();
    if (!resp.ok || !dados.success) {
      mostrarErroConta(dados.message || 'Não foi possível cancelar.', 'pf-erro-cancelar');
      if (btn) { btn.disabled = false; btn.textContent = 'Confirmar cancelamento'; }
      return;
    }
    const ate = dados.acesso_ate ? ` Seu Premium continua até ${dados.acesso_ate}.` : '';
    avisarConta('Assinatura cancelada', 'Você não será mais cobrado.' + ate);
    if (typeof atualizarSecaoPlano === 'function') atualizarSecaoPlano();
  } catch (e) {
    mostrarErroConta('Não foi possível conectar à API.', 'pf-erro-cancelar');
    if (btn) { btn.disabled = false; btn.textContent = 'Confirmar cancelamento'; }
  }
}

async function enviarExclusao() {
  const senha = document.getElementById('ex-senha')?.value || '';
  esconderErroConta('pf-erro-excluir');
  if (!senha) { mostrarErroConta('Digite sua senha para confirmar.', 'pf-erro-excluir'); return; }

  const { ok, message } = await abrirModalCodigo('excluir', async (codigo) => {
    try {
      const resp = await fetch(`${AUTH_API_BASE}/api/auth/excluir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getSessao()?.token },
        body: JSON.stringify({ senha_atual: senha, codigo }),
      });
      const dados = await resp.json();
      if (!resp.ok || !dados.success) {
        return { ok: false, message: dados.message || 'Não foi possível excluir a conta.' };
      }
      limparSessao();
      window.location.href = 'index.html';
      return { ok: true };
    } catch (e) {
      return { ok: false, message: 'Não foi possível conectar à API.' };
    }
  });
  if (!ok) mostrarErroConta(message, 'pf-erro-excluir');
}

// Ajusta a navbar conforme a sessão: troca "Começar Grátis" -> "Sair", troca
// o avatar genérico pela inicial (ou foto) do usuário, e faz o avatar levar
// pra página de perfil (perfil.html) em vez de um dropdown.
async function renderNavbarAuth() {
  const sessao = getSessao();
  const btnGratis = document.querySelector('.navbar-actions .btn-primary');
  const avatar = document.querySelector('.navbar-actions .navbar-avatar');

  if (sessao?.token) {
    if (btnGratis) {
      // Atualiza também o data-i18n (não só o texto): js/i18n.js roda seu
      // próprio DOMContentLoaded e RE-aplica a tradução em qualquer elemento
      // com esse atributo — sem isso, ele sobrescrevia "Sair" de volta para
      // "Começar Grátis" (o texto mudava, mas onclick/href ficavam os de
      // logout, daí clicar em "Começar Grátis" deslogava o usuário).
      btnGratis.setAttribute('data-i18n', 'nav.sair');
      btnGratis.textContent = typeof t === 'function' ? t('nav.sair') : 'Sair';
      btnGratis.href = '#';
      btnGratis.onclick = (e) => { e.preventDefault(); fazerLogout(); };
    }
    if (avatar) {
      avatar.textContent = sessao.email.charAt(0).toUpperCase();
      avatar.title = sessao.email;
      avatar.href = 'perfil.html';
      avatar.onclick = null;
      aplicarAvatarNoNavbar();
      aplicarBordaNoNavbar();

      try {
        const resp = await fetch(`${AUTH_API_BASE}/api/auth/me`, {
          headers: { 'Authorization': 'Bearer ' + sessao.token },
        });
        const dados = await resp.json();
        if (dados.success) {
          // Reflete o plano/nome atuais do servidor (pode ter virado premium
          // após uma compra, ou o nome ter sido salvo em outra sessão).
          salvarSessao(sessao.token, sessao.email, dados.plano || 'free', undefined, dados.nome);
        }
      } catch (e) {
        // API fora do ar: mantém a inicial no avatar, sem travar a página.
      }
    }
  } else {
    if (btnGratis) {
      btnGratis.setAttribute('data-i18n', 'nav.comecargratis');
      btnGratis.textContent = typeof t === 'function' ? t('nav.comecargratis') : 'Começar Grátis';
      btnGratis.href = 'login.html';
      btnGratis.onclick = null;
    }
    if (avatar) {
      avatar.textContent = '?';
      avatar.href = 'login.html';
      avatar.title = 'Entrar';
    }
  }
}

document.addEventListener('DOMContentLoaded', renderNavbarAuth);
