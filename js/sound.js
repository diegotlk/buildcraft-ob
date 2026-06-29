/* ============================================================
   SOM DO SITE (Web Audio sintetizado, sem arquivo de áudio):
   - clique em qualquer botão/link/aba do site inteiro;
   - tic-tic-tic crescente no suspense do backtest;
   - nota de revelação por raridade (Comum/Rara/Épica/Lendária);
   - musiquinha ambiente cyberpunk só na home (index.html).
   Tudo controlado por 1 preferência só (localStorage), com botão
   de mudo acessível no Perfil. Carregar este arquivo ANTES de
   qualquer outro JS que toque som (strategy-builder.js etc).
   ============================================================ */

const SOM_KEY = 'buildcraft_som_ativo';
let _audioCtx = null;

function somAtivo() {
  return localStorage.getItem(SOM_KEY) !== '0';
}

function definirSom(ativo) {
  localStorage.setItem(SOM_KEY, ativo ? '1' : '0');
  document.querySelectorAll('.som-toggle-btn').forEach(b => b.textContent = ativo ? '🔊' : '🔇');
  document.querySelectorAll('.som-toggle-check').forEach(c => { c.checked = ativo; });
  if (!ativo) pararMusicaAmbiente();
  else if (document.body.dataset.musicaAmbiente === 'home') iniciarMusicaAmbiente();
}

function alternarSom() {
  definirSom(!somAtivo());
}

function garantirAudioCtx() {
  if (!_audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    _audioCtx = new Ctx();
  }
  if (_audioCtx.state === 'suspended') _audioCtx.resume();
  return _audioCtx;
}

function _tocarNota(ctx, tStart, freq, tipo, vol, dur, detune) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = tipo;
  o.frequency.value = freq;
  if (detune) o.detune.value = detune;
  g.gain.setValueAtTime(0.0001, tStart);
  g.gain.exponentialRampToValueAtTime(vol, tStart + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, tStart + dur);
  o.connect(g); g.connect(ctx.destination);
  o.start(tStart);
  o.stop(tStart + dur + 0.05);
}

// Clique curtinho e discreto — usado em todo botão/link/aba do site.
function tocarClique() {
  if (!somAtivo()) return;
  const ctx = garantirAudioCtx();
  if (!ctx) return;
  _tocarNota(ctx, ctx.currentTime, 720, 'triangle', 0.06, 0.045, 0);
}

// 1 tic curto, com o tom subindo conforme o suspense se aproxima do fim
// (progresso 0→1) — é o "caça-níquel" crescente.
function tocarTic(progresso) {
  if (!somAtivo()) return;
  const ctx = garantirAudioCtx();
  if (!ctx) return;
  const freq = 320 + Math.max(0, Math.min(1, progresso)) * 420;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'square';
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.05, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
  o.connect(g); g.connect(ctx.destination);
  o.start();
  o.stop(ctx.currentTime + 0.06);
}

// Som do reveal, diferente por raridade: Comum = "tum" seco e curto;
// Rara/Épica = chime curto subindo; Lendária = acorde tipo coral (várias
// notas detunadas) + nota aguda por cima, mais sustentado.
function tocarRevelacao(rarity) {
  if (!somAtivo()) return;
  const ctx = garantirAudioCtx();
  if (!ctx) return;
  const t0 = ctx.currentTime;
  if (rarity === 'rare') {
    _tocarNota(ctx, t0, 440, 'triangle', 0.22, 0.14, 0);
    _tocarNota(ctx, t0 + 0.1, 660, 'triangle', 0.22, 0.2, 0);
  } else if (rarity === 'epic') {
    _tocarNota(ctx, t0, 440, 'triangle', 0.2, 0.12, 0);
    _tocarNota(ctx, t0 + 0.09, 554.37, 'triangle', 0.2, 0.12, 0);
    _tocarNota(ctx, t0 + 0.18, 880, 'triangle', 0.26, 0.22, 0);
  } else if (rarity === 'legendary') {
    [523.25, 659.25, 784, 1046.5].forEach((freq, i) => _tocarNota(ctx, t0, freq, 'sine', 0.14, 0.9, i * 5));
    _tocarNota(ctx, t0 + 0.06, 1046.5, 'triangle', 0.2, 0.6, 0);
  } else {
    _tocarNota(ctx, t0, 110, 'sine', 0.35, 0.18, 0);
  }
}

// ── CLIQUE GLOBAL: qualquer botão/link/aba do site toca o clique ──
// Delegação no document (1 listener só, funciona pra elementos que
// nascem depois via JS também). Ignora cliques em inputs de texto.
document.addEventListener('click', (e) => {
  const alvo = e.target.closest('button, .btn, a, .rk-tab, .auth-tab, [role="button"]');
  if (alvo) tocarClique();
}, { capture: true });

// ── MÚSICA AMBIENTE (só na home) ──
// Pad cyberpunk simples: 3 osciladores detunados + filtro com LFO lento.
// Autoplay é bloqueado pelo navegador sem gesto do usuário — por isso só
// começa no primeiro clique/toque na página (e nunca se o som estiver mudo).
let _musicaNodes = null;

function iniciarMusicaAmbiente() {
  if (!somAtivo() || _musicaNodes) return;
  const ctx = garantirAudioCtx();
  if (!ctx) return;

  const master = ctx.createGain();
  master.gain.value = 0.0001;
  master.connect(ctx.destination);
  master.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 2.5);

  const filtro = ctx.createBiquadFilter();
  filtro.type = 'lowpass';
  filtro.frequency.value = 800;
  filtro.connect(master);

  // Acorde sustentado (Am9-ish), bem grave e etéreo.
  const freqs = [110, 164.81, 220, 277.18];
  const oscs = freqs.map((freq, i) => {
    const o = ctx.createOscillator();
    o.type = i % 2 === 0 ? 'sawtooth' : 'sine';
    o.frequency.value = freq;
    o.detune.value = (i - 1.5) * 6;
    o.connect(filtro);
    o.start();
    return o;
  });

  // LFO bem lento varrendo o filtro — dá a sensação de "respirar".
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.06;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 380;
  lfo.connect(lfoGain);
  lfoGain.connect(filtro.frequency);
  lfo.start();

  _musicaNodes = { master, filtro, oscs, lfo, lfoGain };
}

function pararMusicaAmbiente() {
  if (!_musicaNodes) return;
  const ctx = garantirAudioCtx();
  const { master, oscs, lfo } = _musicaNodes;
  if (ctx && master) {
    master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1);
    setTimeout(() => {
      oscs.forEach(o => { try { o.stop(); } catch (e) {} });
      try { lfo.stop(); } catch (e) {}
    }, 1100);
  }
  _musicaNodes = null;
}

// Marca a home e arma o início no 1º gesto do usuário.
function ativarMusicaAmbienteNaHome() {
  document.body.dataset.musicaAmbiente = 'home';
  const iniciarUmaVez = () => {
    iniciarMusicaAmbiente();
    document.removeEventListener('click', iniciarUmaVez);
    document.removeEventListener('keydown', iniciarUmaVez);
  };
  document.addEventListener('click', iniciarUmaVez);
  document.addEventListener('keydown', iniciarUmaVez);
}

// ── WIDGET DE MUDO REUTILIZÁVEL ──
// injetarBotaoSom(seletorOndeColocar) cria um botão 🔊/🔇 dentro do elemento.
function injetarBotaoSom(containerId) {
  const cont = document.getElementById(containerId);
  if (!cont) return;
  const btn = document.createElement('button');
  btn.className = 'btn btn-outline som-toggle-btn';
  btn.style.fontSize = '1.1rem';
  btn.title = 'Ativar/desativar som do site';
  btn.textContent = somAtivo() ? '🔊' : '🔇';
  btn.onclick = (e) => { e.stopPropagation(); alternarSom(); };
  cont.appendChild(btn);
}
