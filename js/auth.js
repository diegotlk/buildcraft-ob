/* ============================================================
   Binaryzando — Autenticação
   Sessão do usuário (token + e-mail) guardada no localStorage.
   Carregada em toda página que precisa saber se o usuário está
   logado (navbar) ou exigir login (Laboratório, Inventário...).
   ============================================================ */

const AUTH_API_BASE = 'https://api.binaryzando.com';
const SESSAO_KEY = 'buildcraft_sessao';

function getSessao() {
  try {
    return JSON.parse(localStorage.getItem(SESSAO_KEY));
  } catch (e) {
    return null;
  }
}

function salvarSessao(token, email, plano) {
  // Se plano não vier, preserva o que já estava salvo (ex.: ao trocar o e-mail
  // não queremos zerar o plano da conta).
  const atual = getSessao();
  const planoFinal = plano !== undefined ? plano : (atual?.plano || 'free');
  localStorage.setItem(SESSAO_KEY, JSON.stringify({ token, email, plano: planoFinal }));
}

function limparSessao() {
  localStorage.removeItem(SESSAO_KEY);
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
// e-mail da conta). Abre um modal pedindo Nome + CPF/CNPJ — o Asaas exige esses
// dados pra emitir a cobrança — e depois leva pra tela de pagamento do Asaas.
function comprarPremium() {
  if (ehPremium()) {
    avisarConta('⭐ Você já é Premium', 'Sua conta já tem acesso a tudo. Aproveite!');
    return;
  }
  if (!estaLogado()) {
    window.location.href = 'login.html?redirect=planos.html';
    return;
  }
  abrirModalPremium();
}

function abrirModalPremium() {
  // O modal genérico de conta só existe quando a navbar logada já renderizou.
  if (typeof abrirModalConta !== 'function') {
    avisarConta('💎 Premium', 'Recarregue a página e tente novamente.');
    return;
  }
  abrirModalConta('💎 Assinar Premium', `
    ${erroContaHtml()}
    <p style="color:var(--text-muted);font-size:.85rem;margin:0 0 14px">
      Premium por R$ 9,90/mês. Precisamos destes dados pra emitir a cobrança.
      Você escolhe a forma de pagamento (Pix ou cartão) na próxima tela.
    </p>
    <div class="form-group">
      <label class="form-label">Nome completo</label>
      <input type="text" id="pr-nome" class="form-input" autocomplete="name">
    </div>
    <div class="form-group">
      <label class="form-label">CPF ou CNPJ</label>
      <input type="text" id="pr-cpf" class="form-input" inputmode="numeric" placeholder="Somente números">
    </div>
    <button class="btn btn-primary" style="width:100%" id="pr-btn" onclick="enviarAssinatura()">Ir para o pagamento</button>
  `);
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

/* ============================================================
   Menu da conta (dropdown do avatar): mudar senha, e-mail e foto.
   Montado uma vez por página, na primeira vez que o usuário aparece
   logado (renderNavbarAuth chama montarMenuConta).
   ============================================================ */
let fotoSelecionadaBase64 = null;

function montarMenuConta(avatar) {
  if (document.getElementById('conta-menu')) return; // já montado nesta página

  const wrap = document.createElement('div');
  wrap.className = 'account-menu-wrap';
  avatar.replaceWith(wrap);
  wrap.appendChild(avatar);

  const menu = document.createElement('div');
  menu.className = 'account-menu';
  menu.id = 'conta-menu';
  menu.innerHTML = `
    <div class="account-menu-email" id="conta-menu-email"></div>
    <div class="account-menu-plano" id="conta-menu-plano"></div>
    <div class="account-menu-item destaque" id="conta-menu-comprar" onclick="comprarPremium()">💎 Comprar Premium</div>
    <div class="account-menu-item" onclick="abrirModalSenha()">🔒 Mudar senha</div>
    <div class="account-menu-item" onclick="abrirModalEmail()">📧 Mudar e-mail</div>
    <div class="account-menu-item" onclick="abrirModalFoto()">🖼️ Mudar foto de perfil</div>
    <div class="account-menu-item" id="conta-menu-cancelar" onclick="abrirModalCancelar()">🚫 Cancelar assinatura</div>
    <div class="account-menu-item" onclick="abrirModalExcluir()">🗑️ Excluir minha conta</div>
  `;
  wrap.appendChild(menu);

  avatar.removeAttribute('href');
  avatar.style.cursor = 'pointer';
  avatar.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    menu.classList.toggle('open');
  };

  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) menu.classList.remove('open');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { fecharModalConta(); menu.classList.remove('open'); }
  });

  // Modal genérico: as 3 opções acima só trocam o título e o corpo dele.
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'conta-modal-overlay';
  modal.innerHTML = `
    <div class="modal-content" style="max-width:420px">
      <div class="modal-header">
        <span class="modal-title" id="conta-modal-title">Conta</span>
        <button class="modal-close" onclick="fecharModalConta()">×</button>
      </div>
      <div id="conta-modal-body"></div>
    </div>
  `;
  modal.addEventListener('click', (e) => { if (e.target === modal) fecharModalConta(); });
  document.body.appendChild(modal);
}

function abrirModalConta(titulo, corpoHtml) {
  document.getElementById('conta-modal-title').textContent = titulo;
  document.getElementById('conta-modal-body').innerHTML = corpoHtml;
  document.getElementById('conta-modal-overlay').classList.add('open');
  document.getElementById('conta-menu')?.classList.remove('open');
}

function fecharModalConta() {
  document.getElementById('conta-modal-overlay')?.classList.remove('open');
  fotoSelecionadaBase64 = null;
}

function erroContaHtml() {
  return '<div class="auth-error" id="conta-erro"></div>';
}

function mostrarErroConta(msg) {
  const el = document.getElementById('conta-erro');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}

function abrirModalSenha() {
  abrirModalConta('🔒 Mudar senha', `
    ${erroContaHtml()}
    <div class="form-group">
      <label class="form-label">Senha atual</label>
      <input type="password" id="cs-atual" class="form-input" autocomplete="current-password">
    </div>
    <div class="form-group">
      <label class="form-label">Nova senha</label>
      <input type="password" id="cs-nova" class="form-input" autocomplete="new-password"
             oninput="aplicarChecklistSenha(this.value, c => 'cs-req-' + c)">
    </div>
    <div class="auth-reqs show">
      <div class="auth-reqs-titulo">Sua nova senha precisa ter:</div>
      <div class="auth-req" id="cs-req-tamanho"><span class="icone">○</span> Pelo menos 8 caracteres</div>
      <div class="auth-req" id="cs-req-maiuscula"><span class="icone">○</span> Uma letra maiúscula (A-Z)</div>
      <div class="auth-req" id="cs-req-minuscula"><span class="icone">○</span> Uma letra minúscula (a-z)</div>
      <div class="auth-req" id="cs-req-numero"><span class="icone">○</span> Um número (0-9)</div>
      <div class="auth-req" id="cs-req-especial"><span class="icone">○</span> Um caractere especial (!@#$%...)</div>
    </div>
    <button class="btn btn-primary" style="width:100%" onclick="enviarMudarSenha()">Salvar nova senha</button>
  `);
}

async function enviarMudarSenha() {
  const senhaAtual = document.getElementById('cs-atual').value;
  const senhaNova = document.getElementById('cs-nova').value;

  if (!senhaForte(senhaNova)) {
    mostrarErroConta('Sua nova senha ainda não cumpre todos os requisitos acima.');
    return;
  }

  try {
    const resp = await fetch(`${AUTH_API_BASE}/api/auth/senha`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getSessao()?.token },
      body: JSON.stringify({ senha_atual: senhaAtual, senha_nova: senhaNova }),
    });
    const dados = await resp.json();
    if (!resp.ok || !dados.success) {
      mostrarErroConta(dados.message || 'Não foi possível trocar a senha.');
      return;
    }
    fecharModalConta();
  } catch (e) {
    mostrarErroConta('Não foi possível conectar à API.');
  }
}

function abrirModalEmail() {
  const sessao = getSessao();
  abrirModalConta('📧 Mudar e-mail', `
    ${erroContaHtml()}
    <div class="form-group">
      <label class="form-label">Senha atual</label>
      <input type="password" id="ce-senha" class="form-input" autocomplete="current-password">
    </div>
    <div class="form-group">
      <label class="form-label">Novo e-mail</label>
      <input type="email" id="ce-email" class="form-input" autocomplete="email" placeholder="${sessao?.email || 'novo@email.com'}">
    </div>
    <button class="btn btn-primary" style="width:100%" onclick="enviarMudarEmail()">Salvar novo e-mail</button>
  `);
}

async function enviarMudarEmail() {
  const senhaAtual = document.getElementById('ce-senha').value;
  const emailNovo = document.getElementById('ce-email').value.trim();

  try {
    const resp = await fetch(`${AUTH_API_BASE}/api/auth/email`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getSessao()?.token },
      body: JSON.stringify({ senha_atual: senhaAtual, email_novo: emailNovo }),
    });
    const dados = await resp.json();
    if (!resp.ok || !dados.success) {
      mostrarErroConta(dados.message || 'Não foi possível trocar o e-mail.');
      return;
    }
    salvarSessao(getSessao().token, dados.email);
    fecharModalConta();
    renderNavbarAuth();
  } catch (e) {
    mostrarErroConta('Não foi possível conectar à API.');
  }
}

function abrirModalFoto() {
  const sessao = getSessao();
  const avatarAtual = document.querySelector('.navbar-actions .navbar-avatar');
  const fotoAtual = avatarAtual?.style.backgroundImage;
  const temFotoAtual = !!fotoAtual && fotoAtual !== 'none';

  abrirModalConta('🖼️ Mudar foto de perfil', `
    ${erroContaHtml()}
    <div class="foto-preview-wrap">
      <div class="foto-preview" id="cf-preview" style="${temFotoAtual ? `background-image:${fotoAtual}` : ''}">${temFotoAtual ? '' : (sessao?.email || '?').charAt(0).toUpperCase()}</div>
    </div>
    <input type="file" id="cf-arquivo" accept="image/*" class="form-input" style="margin-bottom:16px" onchange="previewFoto(event)">
    <button class="btn btn-primary" style="width:100%" id="cf-salvar" onclick="enviarMudarFoto()" disabled>Salvar foto</button>
  `);
}

function previewFoto(event) {
  const arquivo = event.target.files[0];
  if (!arquivo) return;

  if (arquivo.size > 1500000) {
    mostrarErroConta('Imagem muito grande. Escolha uma foto com menos de 1.5MB.');
    return;
  }

  const leitor = new FileReader();
  leitor.onload = () => {
    fotoSelecionadaBase64 = leitor.result;
    const preview = document.getElementById('cf-preview');
    preview.style.backgroundImage = `url('${fotoSelecionadaBase64}')`;
    preview.textContent = '';
    document.getElementById('cf-salvar').disabled = false;
  };
  leitor.readAsDataURL(arquivo);
}

async function enviarMudarFoto() {
  if (!fotoSelecionadaBase64) return;

  try {
    const resp = await fetch(`${AUTH_API_BASE}/api/auth/foto`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getSessao()?.token },
      body: JSON.stringify({ foto_base64: fotoSelecionadaBase64 }),
    });
    const dados = await resp.json();
    if (!resp.ok || !dados.success) {
      mostrarErroConta(dados.message || 'Não foi possível salvar a foto.');
      return;
    }
    fecharModalConta();
    aplicarFotoNoAvatar(dados.foto_url);
  } catch (e) {
    mostrarErroConta('Não foi possível conectar à API.');
  }
}

function aplicarFotoNoAvatar(fotoUrl) {
  const avatar = document.querySelector('.navbar-actions .navbar-avatar');
  if (!avatar || !fotoUrl) return;
  avatar.style.backgroundImage = `url('${fotoUrl}')`;
  avatar.style.backgroundSize = 'cover';
  avatar.style.backgroundPosition = 'center';
  avatar.textContent = '';
}

/* ============================================================
   Cancelar assinatura e excluir conta (reusam o modal genérico).
   ============================================================ */
function abrirModalCancelar() {
  abrirModalConta('🚫 Cancelar assinatura', `
    ${erroContaHtml()}
    <p style="color:var(--text-muted);font-size:.85rem;margin:0 0 14px">
      Você deixa de ser cobrado nos próximos meses. Seu acesso Premium continua
      <strong>até o fim do período já pago</strong> — depois disso a conta volta a ser Free.
    </p>
    <button class="btn btn-primary" style="width:100%" id="cc-btn" onclick="enviarCancelamento()">Confirmar cancelamento</button>
  `);
}

async function enviarCancelamento() {
  const btn = document.getElementById('cc-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Cancelando...'; }
  try {
    const resp = await fetch(`${AUTH_API_BASE}/api/assinatura/cancelar`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + getSessao()?.token },
    });
    const dados = await resp.json();
    if (!resp.ok || !dados.success) {
      mostrarErroConta(dados.message || 'Não foi possível cancelar.');
      if (btn) { btn.disabled = false; btn.textContent = 'Confirmar cancelamento'; }
      return;
    }
    fecharModalConta();
    const ate = dados.acesso_ate ? ` Seu Premium continua até ${dados.acesso_ate}.` : '';
    avisarConta('Assinatura cancelada', 'Você não será mais cobrado.' + ate);
  } catch (e) {
    mostrarErroConta('Não foi possível conectar à API.');
    if (btn) { btn.disabled = false; btn.textContent = 'Confirmar cancelamento'; }
  }
}

function abrirModalExcluir() {
  abrirModalConta('🗑️ Excluir minha conta', `
    ${erroContaHtml()}
    <p style="color:var(--text-muted);font-size:.85rem;margin:0 0 14px">
      Essa ação é <strong>permanente</strong>: sua conta, estratégias e cartas serão apagadas
      e a assinatura (se houver) é cancelada. Confirme sua senha para continuar.
    </p>
    <div class="form-group">
      <label class="form-label">Senha</label>
      <input type="password" id="ex-senha" class="form-input" autocomplete="current-password">
    </div>
    <button class="btn btn-primary" style="width:100%;background:var(--danger,#e04e4a);border-color:var(--danger,#e04e4a)" onclick="enviarExclusao()">Excluir para sempre</button>
  `);
}

async function enviarExclusao() {
  const senha = document.getElementById('ex-senha')?.value || '';
  if (!senha) { mostrarErroConta('Digite sua senha para confirmar.'); return; }
  try {
    const resp = await fetch(`${AUTH_API_BASE}/api/auth/excluir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getSessao()?.token },
      body: JSON.stringify({ senha_atual: senha }),
    });
    const dados = await resp.json();
    if (!resp.ok || !dados.success) {
      mostrarErroConta(dados.message || 'Não foi possível excluir a conta.');
      return;
    }
    limparSessao();
    window.location.href = 'index.html';
  } catch (e) {
    mostrarErroConta('Não foi possível conectar à API.');
  }
}

// Atualiza o selo de plano no menu da conta conforme a sessão atual e mostra/
// esconde o "Comprar Premium" (quem já é premium não precisa dele).
function atualizarMenuPlano() {
  const el = document.getElementById('conta-menu-plano');
  if (el) {
    if (ehPremium()) {
      el.textContent = '⭐ Premium';
      el.className = 'account-menu-plano premium';
    } else {
      el.textContent = 'Plano Free';
      el.className = 'account-menu-plano';
    }
  }
  const comprar = document.getElementById('conta-menu-comprar');
  if (comprar) comprar.style.display = ehPremium() ? 'none' : 'flex';
  // Cancelar assinatura só faz sentido pra quem é premium.
  const cancelar = document.getElementById('conta-menu-cancelar');
  if (cancelar) cancelar.style.display = ehPremium() ? 'flex' : 'none';
}

// Ajusta a navbar conforme a sessão: troca "Começar Grátis" -> "Sair", troca
// o avatar genérico pela inicial (ou foto) do usuário, e liga o menu da conta.
async function renderNavbarAuth() {
  const sessao = getSessao();
  const btnGratis = document.querySelector('.navbar-actions .btn-primary');
  const avatar = document.querySelector('.navbar-actions .navbar-avatar');

  if (sessao?.token) {
    if (btnGratis) {
      btnGratis.textContent = 'Sair';
      btnGratis.href = '#';
      btnGratis.onclick = (e) => { e.preventDefault(); fazerLogout(); };
    }
    if (avatar) {
      avatar.textContent = sessao.email.charAt(0).toUpperCase();
      avatar.title = sessao.email;
      montarMenuConta(avatar);
      const emailEl = document.getElementById('conta-menu-email');
      if (emailEl) emailEl.textContent = sessao.email;
      atualizarMenuPlano(); // mostra logo o plano que já está na sessão

      try {
        const resp = await fetch(`${AUTH_API_BASE}/api/auth/me`, {
          headers: { 'Authorization': 'Bearer ' + sessao.token },
        });
        const dados = await resp.json();
        if (dados.success) {
          // Reflete o plano atual do servidor (pode ter virado premium após
          // uma compra) e atualiza o selo do menu.
          salvarSessao(sessao.token, sessao.email, dados.plano || 'free');
          atualizarMenuPlano();
          if (dados.foto_url) aplicarFotoNoAvatar(dados.foto_url);
        }
      } catch (e) {
        // API fora do ar: mantém a inicial no avatar, sem travar a página.
      }
    }
  } else {
    if (btnGratis) {
      btnGratis.textContent = 'Começar Grátis';
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
