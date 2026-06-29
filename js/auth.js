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

/* ============================================================
   Conta: mudar nome, senha, e-mail, foto — agora tudo em perfil.html
   (não mais num dropdown/modal). Estas funções são chamadas pelos
   formulários inline daquela página.
   ============================================================ */
let fotoSelecionadaBase64 = null;

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

async function enviarMudarSenha() {
  const senhaAtual = document.getElementById('cs-atual').value;
  const senhaNova = document.getElementById('cs-nova').value;
  esconderErroConta('pf-erro-senha');

  if (!senhaForte(senhaNova)) {
    mostrarErroConta('Sua nova senha ainda não cumpre todos os requisitos acima.', 'pf-erro-senha');
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
      mostrarErroConta(dados.message || 'Não foi possível trocar a senha.', 'pf-erro-senha');
      return;
    }
    document.getElementById('cs-atual').value = '';
    document.getElementById('cs-nova').value = '';
    avisarConta('Senha atualizada', 'Sua senha foi trocada com sucesso.');
  } catch (e) {
    mostrarErroConta('Não foi possível conectar à API.', 'pf-erro-senha');
  }
}

async function enviarMudarEmail() {
  const senhaAtual = document.getElementById('ce-senha').value;
  const emailNovo = document.getElementById('ce-email').value.trim();
  esconderErroConta('pf-erro-email');

  try {
    const resp = await fetch(`${AUTH_API_BASE}/api/auth/email`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getSessao()?.token },
      body: JSON.stringify({ senha_atual: senhaAtual, email_novo: emailNovo }),
    });
    const dados = await resp.json();
    if (!resp.ok || !dados.success) {
      mostrarErroConta(dados.message || 'Não foi possível trocar o e-mail.', 'pf-erro-email');
      return;
    }
    salvarSessao(getSessao().token, dados.email);
    avisarConta('E-mail atualizado', 'Seu e-mail foi trocado com sucesso.');
    renderNavbarAuth();
  } catch (e) {
    mostrarErroConta('Não foi possível conectar à API.', 'pf-erro-email');
  }
}

function previewFoto(event) {
  const arquivo = event.target.files[0];
  if (!arquivo) return;

  esconderErroConta('pf-erro-foto');

  if (arquivo.size > 1500000) {
    mostrarErroConta('Imagem muito grande. Escolha uma foto com menos de 1.5MB.', 'pf-erro-foto');
    event.target.value = '';
    return;
  }

  const leitor = new FileReader();
  leitor.onload = () => {
    // Redimensiona pra no máximo 256×256 antes de enviar — menor payload,
    // mesma qualidade visual no avatar circular.
    const img = new Image();
    img.onload = () => {
      const MAX = 256;
      const escala = Math.min(MAX / img.width, MAX / img.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * escala);
      canvas.height = Math.round(img.height * escala);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      fotoSelecionadaBase64 = canvas.toDataURL('image/jpeg', 0.85);
      const preview = document.getElementById('cf-preview');
      preview.style.backgroundImage = `url('${fotoSelecionadaBase64}')`;
      preview.textContent = '';
      document.getElementById('cf-salvar').disabled = false;
    };
    img.src = leitor.result;
  };
  leitor.readAsDataURL(arquivo);
}

async function enviarMudarFoto() {
  if (!fotoSelecionadaBase64) return;
  esconderErroConta('pf-erro-foto');

  try {
    const resp = await fetch(`${AUTH_API_BASE}/api/auth/foto`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getSessao()?.token },
      body: JSON.stringify({ foto_base64: fotoSelecionadaBase64 }),
    });
    const dados = await resp.json();
    if (!resp.ok || !dados.success) {
      mostrarErroConta(dados.message || 'Não foi possível salvar a foto.', 'pf-erro-foto');
      return;
    }
    aplicarFotoNoAvatar(dados.foto_url);
    avisarConta('Foto atualizada', 'Sua nova foto de perfil foi salva.');
  } catch (e) {
    mostrarErroConta('Não foi possível conectar à API.', 'pf-erro-foto');
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
  try {
    const resp = await fetch(`${AUTH_API_BASE}/api/auth/excluir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getSessao()?.token },
      body: JSON.stringify({ senha_atual: senha }),
    });
    const dados = await resp.json();
    if (!resp.ok || !dados.success) {
      mostrarErroConta(dados.message || 'Não foi possível excluir a conta.', 'pf-erro-excluir');
      return;
    }
    limparSessao();
    window.location.href = 'index.html';
  } catch (e) {
    mostrarErroConta('Não foi possível conectar à API.', 'pf-erro-excluir');
  }
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

      try {
        const resp = await fetch(`${AUTH_API_BASE}/api/auth/me`, {
          headers: { 'Authorization': 'Bearer ' + sessao.token },
        });
        const dados = await resp.json();
        if (dados.success) {
          // Reflete o plano/nome atuais do servidor (pode ter virado premium
          // após uma compra, ou o nome ter sido salvo em outra sessão).
          salvarSessao(sessao.token, sessao.email, dados.plano || 'free', undefined, dados.nome);
          if (dados.foto_url) aplicarFotoNoAvatar(dados.foto_url);
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
