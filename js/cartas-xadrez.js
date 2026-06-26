/* ============================================================
   Binaryzando — Cartas Neon + Peças de Xadrez (Fase 1)
   ------------------------------------------------------------
   Motor reutilizável e ISOLADO (não toca no código antigo):
     - pecaXadrezSVG(rarity)  -> SVG da peça de neon (Peão/Bispo/Torre/Rainha)
     - renderCartaNeon(data)  -> SVG da carta colecionável completa

   Mapa de peça por raridade (combinado com o Diego):
     Comum=Peão · Rara=Bispo · Épica=Torre · Lendária=Rainha
     (Rei fica reservado pra cartas especiais/evento)
   ============================================================ */
(function (global) {
  'use strict';

  var _uid = 0;

  var RAR_LABEL = { common: 'Comum', rare: 'Rara', epic: 'Épica', legendary: 'Lendária' };

  var PECA = {
    common:    { tipo: 'peao',   nome: 'Peão' },
    rare:      { tipo: 'bispo',  nome: 'Bispo' },
    epic:      { tipo: 'torre',  nome: 'Torre' },
    legendary: { tipo: 'rainha', nome: 'Rainha' },
  };

  /* Paleta neon por raridade (ciano domina; ouro só na Lendária) */
  var PALETA = {
    common:    { pieceTop: '#9fd0e6', pieceBot: '#3f7e9a', glow: '#18e0ff', aura: 56, auraOp: 0.14, ball: '#bfe8f5', frame: '#5f86ad', badgeBg: '#16233a', badgeTx: '#9fb6c8', accentTx: '#8fb6da', gold: false },
    rare:      { pieceTop: '#aef0ff', pieceBot: '#2f8fc8', glow: '#37b6ff', aura: 58, auraOp: 0.26, ball: '#7ac0ff', frame: '#378add', badgeBg: '#0e2238', badgeTx: '#7ac0ff', accentTx: '#8fb6da', gold: false },
    epic:      { pieceTop: '#cfe9ff', pieceBot: '#6a4fd0', glow: '#8b5cf6', aura: 60, auraOp: 0.32, ball: '#c9b6ff', frame: '#8b5cf6', badgeBg: '#1b1430', badgeTx: '#c9b6ff', accentTx: '#8fb6da', gold: false },
    legendary: { pieceTop: '#ffe89a', pieceBot: '#00b4e6', glow: '#ffd24a', aura: 62, auraOp: 0.42, ball: '#ffd24a', frame: '#ffd24a', badgeBg: '#1b1430', badgeTx: '#ffd24a', accentTx: '#8fb6da', gold: true },
  };

  var CUT = '#0a1422'; /* cor dos "vazios" (fenda do bispo / ameias da torre) */

  /* ---------- corpo da peça (centro x=80, base y=140, viewBox 160x160) ---------- */
  function _pecaInner(tipo, gid, pal) {
    var fill = 'fill="url(#' + gid + ')"';
    var base = '<polygon points="52,140 108,140 100,126 60,126" ' + fill + '/>' +
               '<rect x="56" y="120" width="48" height="7" rx="2" ' + fill + '/>';

    if (tipo === 'peao') {
      return base +
        '<path d="M62,124 C60,108 66,99 70,93 L90,93 C94,99 100,108 98,124 Z" ' + fill + '/>' +
        '<rect x="65" y="88" width="30" height="7" rx="2" ' + fill + '/>' +
        '<path d="M70,88 C72,80 73,74 74,70 L86,70 C87,74 88,80 90,88 Z" ' + fill + '/>' +
        '<circle cx="80" cy="58" r="12" ' + fill + '/>';
    }
    if (tipo === 'bispo') {
      return base +
        '<path d="M62,124 C60,104 68,93 72,84 L88,84 C92,93 100,104 98,124 Z" ' + fill + '/>' +
        '<rect x="65" y="79" width="30" height="7" rx="2" ' + fill + '/>' +
        '<path d="M74,79 C72,64 76,52 80,42 C84,52 88,64 86,79 Z" ' + fill + '/>' +
        '<line x1="80" y1="49" x2="80" y2="63" stroke="' + CUT + '" stroke-width="3" stroke-linecap="round"/>' +
        '<circle cx="80" cy="38" r="4.5" fill="' + pal.ball + '"/>';
    }
    if (tipo === 'torre') {
      return base +
        '<path d="M60,124 C60,109 64,99 66,92 L94,92 C96,99 100,109 100,124 Z" ' + fill + '/>' +
        '<rect x="62" y="86" width="36" height="7" rx="2" ' + fill + '/>' +
        '<rect x="64" y="62" width="32" height="26" ' + fill + '/>' +
        '<rect x="61" y="52" width="38" height="12" ' + fill + '/>' +
        '<rect x="70" y="51" width="6" height="8" fill="' + CUT + '"/>' +
        '<rect x="84" y="51" width="6" height="8" fill="' + CUT + '"/>';
    }
    /* rainha */
    return base +
      '<path d="M60,124 C58,104 66,93 70,83 L90,83 C94,93 102,104 100,124 Z" ' + fill + '/>' +
      '<rect x="64" y="78" width="32" height="7" rx="2" ' + fill + '/>' +
      '<path d="M70,78 C72,62 74,52 75,46 L85,46 C86,52 88,62 90,78 Z" ' + fill + '/>' +
      '<rect x="63" y="40" width="34" height="9" rx="2" ' + fill + '/>' +
      '<polygon points="63,42 69,24 75,38 80,20 85,38 91,24 97,42" ' + fill + '/>' +
      '<circle cx="69" cy="23" r="3.2" fill="' + pal.ball + '"/>' +
      '<circle cx="80" cy="19" r="3.6" fill="' + pal.ball + '"/>' +
      '<circle cx="91" cy="23" r="3.2" fill="' + pal.ball + '"/>' +
      '<circle cx="80" cy="60" r="5" fill="' + pal.ball + '"/>';
  }

  /* ---------- peça de xadrez em SVG (aura + brilho + corpo) ---------- */
  function _pecaSVG(rarity, attrs) {
    var pal = PALETA[rarity] || PALETA.common;
    var tipo = (PECA[rarity] || PECA.common).tipo;
    var uid = 'pc' + (_uid++);
    return '<svg ' + (attrs || 'width="100%" height="100%"') + ' viewBox="0 0 160 160" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">' +
      '<defs>' +
        '<linearGradient id="g' + uid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + pal.pieceTop + '"/><stop offset="1" stop-color="' + pal.pieceBot + '"/></linearGradient>' +
        '<radialGradient id="c' + uid + '" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffffff" stop-opacity="0.5"/><stop offset="0.5" stop-color="' + pal.glow + '" stop-opacity="0.26"/><stop offset="1" stop-color="' + pal.glow + '" stop-opacity="0"/></radialGradient>' +
      '</defs>' +
      '<circle cx="80" cy="86" r="' + pal.aura + '" fill="none" stroke="' + pal.glow + '" stroke-width="1" opacity="' + pal.auraOp + '"/>' +
      '<circle cx="80" cy="92" r="48" fill="url(#c' + uid + ')"/>' +
      _pecaInner(tipo, 'g' + uid, pal) +
      '</svg>';
  }

  function pecaXadrezSVG(rarity) {
    return _pecaSVG(rarity, 'width="100%" height="100%"');
  }

  /* ---------- monta até 4 células de stat a partir do que a carta tiver ---------- */
  function _fmtPct(v) { return (Math.round(v * 10) / 10).toString().replace('.', ',') + '%'; }
  function _fmtNum(v) { return Number(v).toLocaleString('pt-BR'); }
  function _fmtBRL(v) { return 'R$ ' + Math.round(v).toLocaleString('pt-BR'); }

  function _buildStats(d) {
    var out = [];
    if (d.winrate != null) out.push(['WINRATE', _fmtPct(d.winrate), '#3df0d0']);
    if (d.entries != null) out.push(['ENTRADAS', _fmtNum(d.entries), '#eaf6ff']);
    if (d.profit != null) out.push(['LUCRO', _fmtBRL(d.profit), d.profit >= 0 ? '#3df0d0' : '#ff6b6b']);
    if (d.drawdown != null) out.push(['DRAWDOWN', _fmtBRL(d.drawdown), '#ffb03a']);
    if (d.stability != null) out.push(['ESTAB.', Math.round(d.stability) + '%', '#3df0d0']);
    if (out.length < 4 && d.users != null) out.push(['USUÁRIOS', _fmtNum(d.users), '#eaf6ff']);
    return out.slice(0, 4);
  }

  /* ---------- carta colecionável completa ---------- */
  function renderCartaNeon(data) {
    data = data || {};
    var rarity = PALETA[data.rarity] ? data.rarity : 'common';
    var pal = PALETA[rarity];
    var uid = 'cd' + (_uid++);
    var label = RAR_LABEL[rarity];
    var nome = data.name || 'Sem nome';
    var criador = data.creator || 'Sistema';
    var sub = ((data.category || data.type || 'Estratégia') + ' · por ' + criador).toUpperCase();
    var classe = (data.className || data.category || '').toUpperCase();
    var numero = data.numero || '#001';
    var subNum = data.subNumero || ('1ª ' + label.toUpperCase() + ' DA TEMPORADA');
    var grade = data.grade || 'C';
    var tipoTag = (data.type || 'Estratégia').toUpperCase();

    var frameStroke = pal.gold ? 'url(#fr' + uid + ')' : pal.frame;
    var stats = _buildStats(data);
    var sx = [24, 103, 182, 261];
    var statsSVG = stats.map(function (s, i) {
      var x = sx[i], cx = x + 35.5;
      return '<rect x="' + x + '" y="384" width="71" height="46" rx="10" fill="#0e1d31" stroke="#18e0ff" stroke-width="1" opacity="0.95"/>' +
        '<text x="' + cx + '" y="401" font-size="9" font-weight="700" letter-spacing="1" fill="#5f86ad" text-anchor="middle">' + s[0] + '</text>' +
        '<text x="' + cx + '" y="420" font-size="16" font-weight="800" fill="' + s[2] + '" text-anchor="middle">' + s[1] + '</text>';
    }).join('');

    var gradeBadge = pal.gold
      ? '<circle cx="314" cy="472" r="25" fill="none" stroke="#ffd24a" stroke-width="1.5" opacity="0.4"/>' +
        '<circle cx="314" cy="472" r="21" fill="url(#gr' + uid + ')"/>' +
        '<text x="314" y="479" font-size="19" font-weight="800" fill="#3a2606" text-anchor="middle">' + grade + '</text>'
      : '<circle cx="314" cy="472" r="22" fill="' + pal.badgeBg + '" stroke="' + pal.frame + '" stroke-width="1.4"/>' +
        '<text x="314" y="478" font-size="17" font-weight="800" fill="' + pal.badgeTx + '" text-anchor="middle">' + grade + '</text>';

    var classChip = classe
      ? '<rect x="102" y="346" width="156" height="26" rx="13" fill="#121f38" stroke="' + pal.frame + '" stroke-width="1"/>' +
        '<text x="180" y="363" font-size="12" font-weight="700" letter-spacing="1.5" fill="' + pal.badgeTx + '" text-anchor="middle">' + classe + '</text>'
      : '';

    return '<svg class="carta-neon" viewBox="0 0 360 520" width="100%" xmlns="http://www.w3.org/2000/svg" style="font-family:\'Orbitron\',\'Trebuchet MS\',\'Segoe UI\',sans-serif">' +
      '<defs>' +
        '<linearGradient id="bd' + uid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0e1728"/><stop offset="1" stop-color="#070c16"/></linearGradient>' +
        '<radialGradient id="ar' + uid + '" cx="0.5" cy="0.42" r="0.75"><stop offset="0" stop-color="#15324a"/><stop offset="1" stop-color="#060c16"/></radialGradient>' +
        '<linearGradient id="fr' + uid + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#00d4ff"/><stop offset="0.5" stop-color="#8b5cf6"/><stop offset="1" stop-color="#ffd24a"/></linearGradient>' +
        '<linearGradient id="ho' + uid + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#00e5ff" stop-opacity="0"/><stop offset="0.3" stop-color="#18e0ff" stop-opacity="0.08"/><stop offset="0.55" stop-color="#8b5cf6" stop-opacity="0.08"/><stop offset="0.8" stop-color="#ffd24a" stop-opacity="0.08"/><stop offset="1" stop-color="#00e5ff" stop-opacity="0"/></linearGradient>' +
        '<radialGradient id="gr' + uid + '" cx="0.5" cy="0.4" r="0.6"><stop offset="0" stop-color="#fff0b8"/><stop offset="0.55" stop-color="#ffd24a"/><stop offset="1" stop-color="#f59e0b"/></radialGradient>' +
        '<pattern id="sc' + uid + '" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1.4" fill="#9fe9ff" opacity="0.035"/></pattern>' +
        '<clipPath id="cl' + uid + '"><rect x="4" y="4" width="352" height="512" rx="18"/></clipPath>' +
      '</defs>' +
      '<rect x="2" y="2" width="356" height="516" rx="20" fill="none" stroke="' + pal.glow + '" stroke-width="2" opacity="0.16"/>' +
      '<rect x="4" y="4" width="352" height="512" rx="18" fill="url(#bd' + uid + ')" stroke="' + frameStroke + '" stroke-width="2.5"/>' +
      '<rect x="20" y="52" width="320" height="208" rx="14" fill="url(#ar' + uid + ')" stroke="#18e0ff" stroke-width="1" opacity="0.9"/>' +
      _pecaSVG(rarity, 'x="90" y="58" width="180" height="196"') +
      '<rect x="4" y="4" width="352" height="512" fill="url(#sc' + uid + ')" clip-path="url(#cl' + uid + ')"/>' +
      '<rect x="4" y="4" width="352" height="512" fill="url(#ho' + uid + ')" clip-path="url(#cl' + uid + ')"/>' +
      '<rect x="10" y="10" width="340" height="500" rx="14" fill="none" stroke="#18e0ff" stroke-width="1" opacity="0.20"/>' +
      '<text x="24" y="33" font-size="11" font-weight="700" letter-spacing="2" fill="#7af7ff">' + tipoTag + '</text>' +
      '<rect x="262" y="18" width="82" height="22" rx="11" fill="' + pal.badgeBg + '" stroke="' + pal.frame + '" stroke-width="1"/>' +
      '<text x="303" y="33" font-size="11" font-weight="700" letter-spacing="1" fill="' + pal.badgeTx + '" text-anchor="middle">' + label.toUpperCase() + '</text>' +
      '<line x1="24" y1="278" x2="336" y2="278" stroke="' + pal.frame + '" stroke-width="1" opacity="0.4"/>' +
      '<text x="180" y="313" font-size="30" font-weight="800" letter-spacing="3" fill="#ffffff" text-anchor="middle" stroke="#18e0ff" stroke-width="0.4">' + nome + '</text>' +
      '<text x="180" y="333" font-size="11" font-weight="600" letter-spacing="1.2" fill="' + pal.accentTx + '" text-anchor="middle">' + sub + '</text>' +
      classChip +
      statsSVG +
      '<line x1="24" y1="446" x2="336" y2="446" stroke="#18e0ff" stroke-width="1" opacity="0.2"/>' +
      '<text x="24" y="468" font-size="13" font-weight="800" letter-spacing="1" fill="' + (pal.gold ? '#ffd24a' : pal.frame) + '" font-family="monospace">' + numero + '</text>' +
      '<text x="24" y="484" font-size="9" font-weight="600" letter-spacing="1" fill="#5f86ad">' + subNum + '</text>' +
      gradeBadge +
      '</svg>';
  }

  global.pecaXadrezSVG = pecaXadrezSVG;
  global.renderCartaNeon = renderCartaNeon;
  global.PECA_POR_RARIDADE_XADREZ = PECA;
})(window);
