/* ============================================================
   Binaryzando — Simulação Financeira Educacional
   Aba própria no laboratório. Simula gerenciamentos (Mão Fixa,
   Soros, Martingale) sobre qualquer histórico salvo de W/L,
   exibindo o resultado operação por operação numa tabela.
   ============================================================ */

const SIMF_MIN_ENTRADA = 1.0;
const SIMF_HIST_PADRAO_ID = '__padrao__';

// ── TIPO ATIVO ──
let simfTipoAtual = 'mf';

function simfTipo(tipo) {
  simfTipoAtual = tipo;
  ['mf', 'soros', 'mg'].forEach(t => {
    document.getElementById(`simf-tab-${t}`)?.classList.toggle('active', t === tipo);
    const cfg = document.getElementById(`simf-config-${t}`);
    if (cfg) cfg.style.display = t === tipo ? 'block' : 'none';
  });
}

// ── ENTRADA DA ABA ──
function renderSimulacaoFinanceira() {
  simfPopularHistoricos();
}

function simfPopularHistoricos() {
  const sel = document.getElementById('simf-historico-select');
  if (!sel) return;
  const historicos = (typeof getHistoricos === 'function') ? getHistoricos() : [];
  sel.innerHTML =
    `<option value="${SIMF_HIST_PADRAO_ID}">⭐ Histórico Padrão — EURUSD · Entrada no Verde</option>` +
    historicos.map(h => `<option value="${h.id}">${h.nome} (${h.sequencia.length} entradas)</option>`).join('');
}

// ── TOGGLES DE VISIBILIDADE ──
function simfToggle(radioGroupName, mapaIdModo) {
  const val = document.querySelector(`input[name="${radioGroupName}"]:checked`)?.value;
  Object.entries(mapaIdModo).forEach(([modo, idEl]) => {
    const el = document.getElementById(idEl);
    if (el) el.style.display = val === modo ? 'block' : 'none';
  });
}
function simfToggleMfModo()         { simfToggle('simf-mf-modo',         { valor: 'simf-mf-c-valor',         porcentagem: 'simf-mf-c-pct' }); }
function simfToggleSorosBaseModo()  { simfToggle('simf-soros-base-modo', { valor: 'simf-soros-c-bvalor',      porcentagem: 'simf-soros-c-bpct' }); }
function simfToggleSorosLucroModo() { simfToggle('simf-soros-lucro-modo',{ total: 'simf-soros-c-hidden',      porcentagem: 'simf-soros-c-lucropct' }); }
function simfToggleMgBaseModo()     { simfToggle('simf-mg-base-modo',    { valor: 'simf-mg-c-bvalor',         porcentagem: 'simf-mg-c-bpct' }); }
function simfToggleMgModo()         { simfToggle('simf-mg-modo',         { dobrar: 'simf-mg-c-hidden',        porcentagem: 'simf-mg-c-multpct' }); }

// ── LEITURA DE CONFIG ──
function simfLerConfigMf() {
  const modo = document.querySelector('input[name="simf-mf-modo"]:checked')?.value || 'valor';
  return {
    modo,
    valor: parseFloat(document.getElementById('simf-mf-valor')?.value) || 10,
    pct:   parseFloat(document.getElementById('simf-mf-pct')?.value)   || 5,
  };
}

function simfLerConfigSoros() {
  const base_modo = document.querySelector('input[name="simf-soros-base-modo"]:checked')?.value || 'valor';
  const lucro_modo = document.querySelector('input[name="simf-soros-lucro-modo"]:checked')?.value || 'total';
  return {
    base_modo,
    base_valor: parseFloat(document.getElementById('simf-soros-base-valor')?.value) || 10,
    base_pct:   parseFloat(document.getElementById('simf-soros-base-pct')?.value)   || 5,
    niveis:     Math.min(10, Math.max(1, parseInt(document.getElementById('simf-soros-niveis')?.value) || 3)),
    lucro_modo,
    lucro_pct:  parseFloat(document.getElementById('simf-soros-lucro-pct')?.value) || 100,
  };
}

function simfLerConfigMg() {
  const base_modo = document.querySelector('input[name="simf-mg-base-modo"]:checked')?.value || 'valor';
  const mg_modo   = document.querySelector('input[name="simf-mg-modo"]:checked')?.value || 'dobrar';
  return {
    base_modo,
    base_valor: parseFloat(document.getElementById('simf-mg-base-valor')?.value) || 10,
    base_pct:   parseFloat(document.getElementById('simf-mg-base-pct')?.value)   || 5,
    niveis:     Math.min(10, Math.max(1, parseInt(document.getElementById('simf-mg-niveis')?.value) || 3)),
    mg_modo,
    mg_pct:     parseFloat(document.getElementById('simf-mg-pct')?.value) || 200,
  };
}

// ── ENTRADA PRINCIPAL ──
function rodarSimulacaoCompleta() {
  const banca  = parseFloat(document.getElementById('simf-banca')?.value)  || 0;
  const payout = parseFloat(document.getElementById('simf-payout')?.value) || 0;
  const histId = document.getElementById('simf-historico-select')?.value || SIMF_HIST_PADRAO_ID;

  if (banca <= 0)              { showToast('⚠️ Banca inválida',  'Informe uma banca inicial maior que zero.', 'default'); return; }
  if (payout <= 0 || payout > 100) { showToast('⚠️ Payout inválido', 'Payout deve estar entre 1 e 100%.', 'default'); return; }

  const obterSeq = (cb) => {
    if (histId === SIMF_HIST_PADRAO_ID) {
      if (typeof obterHistoricoPadrao === 'function') {
        obterHistoricoPadrao(h => cb(h.sequencia, h.nome, null));
      } else {
        showToast('⚠️ Indisponível', 'Histórico padrão requer conexão com o servidor.', 'default');
      }
      return;
    }
    const h = (typeof getHistoricos === 'function' ? getHistoricos() : []).find(x => x.id === histId);
    if (!h) { showToast('⚠️ Histórico não encontrado', 'Selecione um histórico válido.', 'default'); return; }
    cb(h.sequencia, h.nome, h.sequencia_rica || null);
  };

  obterSeq((sequencia, nomeHistorico, sequenciaRica) => {
    if (!sequencia?.length) { showToast('⚠️ Histórico vazio', 'O histórico não tem entradas.', 'default'); return; }

    let ops;
    if      (simfTipoAtual === 'mf')    ops = simfSimularMaoFixa(simfLerConfigMf(),    sequencia, banca, payout, sequenciaRica);
    else if (simfTipoAtual === 'soros') ops = simfSimularSoros(simfLerConfigSoros(),   sequencia, banca, payout, sequenciaRica);
    else                                ops = simfSimularMartingale(simfLerConfigMg(), sequencia, banca, payout, sequenciaRica);

    simfRenderTabela(ops, banca, nomeHistorico);
  });
}

// ── HELPER: entrada base ──
function simfBaseEntry(config, saldo) {
  if (config.base_modo === 'porcentagem') {
    return Math.max(SIMF_MIN_ENTRADA, saldo * (config.base_pct / 100));
  }
  return Math.max(SIMF_MIN_ENTRADA, config.base_valor || config.valor || 10);
}

// ── MOTOR MÃO FIXA ──
function simfSimularMaoFixa(cfg, sequencia, banca, payout, sequenciaRica) {
  const fp = payout / 100;
  let saldo = banca;
  const ops = [];

  for (let i = 0; i < sequencia.length; i++) {
    if (saldo < SIMF_MIN_ENTRADA) { ops.push({ zerou: true, num: i + 1 }); break; }

    let entrada = cfg.modo === 'porcentagem'
      ? Math.max(SIMF_MIN_ENTRADA, saldo * (cfg.pct / 100))
      : Math.max(SIMF_MIN_ENTRADA, cfg.valor);
    if (entrada > saldo) entrada = saldo;

    const rica = sequenciaRica ? sequenciaRica[i] : null;
    const wl = rica ? rica[1] : sequencia[i];
    const ts  = rica ? rica[0] : null;
    const cor = rica ? rica[2] : null;
    const resultado = wl === 'W' ? +(entrada * fp).toFixed(2) : -entrada;
    saldo = +(saldo + resultado).toFixed(2);
    ops.push({ num: i + 1, tipo: 'Mão Fixa', entrada: +entrada.toFixed(2), wl, resultado, saldo, ts, cor });
  }
  return ops;
}

// ── MOTOR SOROS ──
// Progressão na VITÓRIA.
// nivel=0: entrada base. Após vitória, nivel++.
// nivel>0: entrada = base + lucroAcum × (lucro_pct/100).
// lucroAcum acumula TODOS os lucros desde o início do ciclo atual.
// Reset (nivel=0, lucroAcum=0) em: derrota OU após completar todos os níveis.
function simfSimularSoros(cfg, sequencia, banca, payout, sequenciaRica) {
  const fp = payout / 100;
  let saldo = banca;
  let nivel = 0;
  let lucroAcum = 0;
  const ops = [];

  for (let i = 0; i < sequencia.length; i++) {
    if (saldo < SIMF_MIN_ENTRADA) { ops.push({ zerou: true, num: i + 1 }); break; }

    const base = simfBaseEntry(cfg, saldo);
    let entrada;
    if (nivel === 0) {
      entrada = base;
    } else {
      const fatorLucro = cfg.lucro_modo === 'porcentagem' ? cfg.lucro_pct / 100 : 1;
      entrada = base + lucroAcum * fatorLucro;
    }
    entrada = Math.max(SIMF_MIN_ENTRADA, +entrada.toFixed(2));
    if (entrada > saldo) entrada = saldo;

    const tipoLabel = nivel === 0 ? 'Base' : `Soros ${nivel}`;
    const rica = sequenciaRica ? sequenciaRica[i] : null;
    const wl  = rica ? rica[1] : sequencia[i];
    const ts  = rica ? rica[0] : null;
    const cor = rica ? rica[2] : null;
    const resultado = wl === 'W' ? +(entrada * fp).toFixed(2) : -entrada;
    saldo = +(saldo + resultado).toFixed(2);
    ops.push({ num: i + 1, tipo: tipoLabel, entrada, wl, resultado, saldo, ts, cor });

    if (wl === 'W') {
      lucroAcum = +(lucroAcum + resultado).toFixed(2);
      if (nivel < cfg.niveis) nivel++;
      else { nivel = 0; lucroAcum = 0; }
    } else {
      nivel = 0; lucroAcum = 0;
    }
  }
  return ops;
}

// ── MOTOR MARTINGALE ──
// Progressão na DERROTA.
// nivel=0: entrada base. Após derrota, nivel++.
// nivel>0: entrada = entradaAnterior × multiplicador (2 por padrão).
// Reset (nivel=0) em: vitória OU após completar todos os níveis.
function simfSimularMartingale(cfg, sequencia, banca, payout, sequenciaRica) {
  const fp = payout / 100;
  let saldo = banca;
  let nivel = 0;
  let entradaAnterior = 0;
  const ops = [];

  for (let i = 0; i < sequencia.length; i++) {
    if (saldo < SIMF_MIN_ENTRADA) { ops.push({ zerou: true, num: i + 1 }); break; }

    const base = simfBaseEntry(cfg, saldo);
    let entrada;
    if (nivel === 0) {
      entrada = base;
    } else {
      const mult = cfg.mg_modo === 'dobrar' ? 2 : (cfg.mg_pct / 100);
      entrada = entradaAnterior * mult;
    }
    entrada = Math.max(SIMF_MIN_ENTRADA, +entrada.toFixed(2));
    if (entrada > saldo) entrada = saldo;

    const tipoLabel = nivel === 0 ? 'Base' : `Gale ${nivel}`;
    const rica = sequenciaRica ? sequenciaRica[i] : null;
    const wl  = rica ? rica[1] : sequencia[i];
    const ts  = rica ? rica[0] : null;
    const cor = rica ? rica[2] : null;
    const resultado = wl === 'W' ? +(entrada * fp).toFixed(2) : -entrada;
    saldo = +(saldo + resultado).toFixed(2);
    ops.push({ num: i + 1, tipo: tipoLabel, entrada, wl, resultado, saldo, ts, cor });

    entradaAnterior = entrada;
    if (wl === 'L') {
      if (nivel < cfg.niveis) nivel++;
      else { nivel = 0; }
    } else {
      nivel = 0;
    }
  }
  return ops;
}

// ── RENDER DA TABELA ──
const SIMF_POR_ABA = 150;
window._simfOps = [];

function simfRenderTabela(ops, bancaInicial, nomeHistorico) {
  const cont = document.getElementById('simf-resultado');
  if (!cont) return;
  cont.style.display = 'block';
  cont.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const opsValidas = ops.filter(op => !op.zerou);
  const zerou      = ops.some(op => op.zerou);
  const saldoFinal = opsValidas.length ? opsValidas[opsValidas.length - 1].saldo : bancaInicial;
  const lucroFinal = +(saldoFinal - bancaInicial).toFixed(2);
  const positivo   = lucroFinal >= 0;
  const corLucro   = positivo ? 'var(--success)' : 'var(--danger)';
  const sinal      = positivo ? '+' : '-';
  const fmt    = n => Math.abs(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtRoi = n => Math.abs(n).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  const roiPct = bancaInicial ? +(lucroFinal / bancaInicial * 100).toFixed(1) : 0;
  const wins   = opsValidas.filter(o => o.wl === 'W').length;
  const losses = opsValidas.filter(o => o.wl === 'L').length;

  // Drawdown máximo
  let pico = bancaInicial, drawdownMax = 0;
  for (const op of opsValidas) {
    if (op.saldo > pico) pico = op.saldo;
    const dd = pico > 0 ? (pico - op.saldo) / pico * 100 : 0;
    if (dd > drawdownMax) drawdownMax = dd;
  }

  const summaryHTML = `
    <div style="margin-bottom:6px; font-size:12px; color:var(--text-secondary);">
      Histórico: <strong>${nomeHistorico}</strong>
    </div>
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(110px, 1fr)); gap:10px; margin-bottom:18px; text-align:center;">
      <div style="padding:14px 8px; background:var(--bg); border-radius:10px;">
        <div style="font-size:11px; color:var(--text-secondary); margin-bottom:4px;">Banca final</div>
        <div style="font-size:20px; font-weight:800; color:${corLucro};">R$ ${fmt(saldoFinal)}</div>
      </div>
      <div style="padding:14px 8px; background:var(--bg); border-radius:10px;">
        <div style="font-size:11px; color:var(--text-secondary); margin-bottom:4px;">Resultado</div>
        <div style="font-size:20px; font-weight:800; color:${corLucro};">${sinal}R$ ${fmt(Math.abs(lucroFinal))}</div>
      </div>
      <div style="padding:14px 8px; background:var(--bg); border-radius:10px;">
        <div style="font-size:11px; color:var(--text-secondary); margin-bottom:4px;">ROI</div>
        <div style="font-size:20px; font-weight:800; color:${corLucro};">${sinal}${fmtRoi(roiPct)}%</div>
      </div>
      <div style="padding:14px 8px; background:var(--bg); border-radius:10px;">
        <div style="font-size:11px; color:var(--text-secondary); margin-bottom:4px;">Operações</div>
        <div style="font-size:20px; font-weight:800;">${opsValidas.length}</div>
      </div>
      <div style="padding:14px 8px; background:var(--bg); border-radius:10px;">
        <div style="font-size:11px; color:var(--text-secondary); margin-bottom:4px;">Ganhos</div>
        <div style="font-size:20px; font-weight:800; color:var(--success);">${wins}</div>
      </div>
      <div style="padding:14px 8px; background:var(--bg); border-radius:10px;">
        <div style="font-size:11px; color:var(--text-secondary); margin-bottom:4px;">Perdas</div>
        <div style="font-size:20px; font-weight:800; color:var(--danger);">${losses}</div>
      </div>
      <div style="padding:14px 8px; background:var(--bg); border-radius:10px;">
        <div style="font-size:11px; color:var(--text-secondary); margin-bottom:4px;">Drawdown máx.</div>
        <div style="font-size:20px; font-weight:800; color:var(--warning);">${drawdownMax.toFixed(1)}%</div>
      </div>
    </div>
    ${zerou ? `<div style="padding:12px 16px; background:rgba(224,78,74,.1); border-radius:8px; color:var(--danger); font-size:13px; font-weight:600; margin-bottom:16px;">⚠️ Banca zerou — saldo abaixo da entrada mínima de R$1,00 na operação ${ops.find(o => o.zerou)?.num}.</div>` : ''}
  `;

  // Armazena ops para paginação
  window._simfOps = opsValidas;
  const totalAbas = Math.ceil(opsValidas.length / SIMF_POR_ABA);

  // Abas de paginação (só mostra se houver mais de uma aba)
  const abasHTML = totalAbas > 1
    ? `<div id="simf-pag-tabs" style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px;">
        ${Array.from({ length: totalAbas }, (_, k) => {
          const ini = k * SIMF_POR_ABA + 1;
          const fim = Math.min((k + 1) * SIMF_POR_ABA, opsValidas.length);
          return `<button onclick="simfMostrarPagina(${k})" id="simf-pag-btn-${k}"
            style="padding:5px 12px; border-radius:6px; border:1px solid var(--border);
            background:${k === 0 ? 'var(--accent)' : 'var(--bg)'}; color:${k === 0 ? '#000' : 'var(--text-primary)'};
            font-size:12px; cursor:pointer; font-weight:600; white-space:nowrap;">
            Aba ${k + 1} (${ini}–${fim})
          </button>`;
        }).join('')}
      </div>`
    : '';

  const tabelaHTML = `
    ${abasHTML}
    <div style="overflow-x:auto; border-radius:10px; border:1px solid var(--border);">
      <table style="width:100%; border-collapse:collapse; font-size:13px;">
        <thead>
          <tr style="background:var(--bg-card, var(--bg)); border-bottom:2px solid var(--border);">
            <th style="padding:10px; text-align:center; color:var(--text-secondary); font-weight:600; white-space:nowrap;">#</th>
            <th style="padding:10px; text-align:left; color:var(--text-secondary); font-weight:600; white-space:nowrap;">Horário</th>
            <th style="padding:10px; text-align:center; color:var(--text-secondary); font-weight:600;">Vela</th>
            <th style="padding:10px; text-align:left; color:var(--text-secondary); font-weight:600;">Tipo</th>
            <th style="padding:10px; text-align:right; color:var(--text-secondary); font-weight:600; white-space:nowrap;">Entrada</th>
            <th style="padding:10px; text-align:center; color:var(--text-secondary); font-weight:600;">W/L</th>
            <th style="padding:10px; text-align:right; color:var(--text-secondary); font-weight:600;">Resultado</th>
            <th style="padding:10px; text-align:right; color:var(--text-secondary); font-weight:600;">Saldo</th>
          </tr>
        </thead>
        <tbody id="simf-tabela-body"></tbody>
      </table>
    </div>
  `;

  cont.innerHTML = summaryHTML + tabelaHTML;
  simfMostrarPagina(0);
}

// ── PAGINAÇÃO DA TABELA ──
function simfMostrarPagina(pagIdx) {
  const opsValidas = window._simfOps || [];
  const totalAbas  = Math.ceil(opsValidas.length / SIMF_POR_ABA);
  const tbody = document.getElementById('simf-tabela-body');
  if (!tbody) return;

  // Atualiza estado visual dos botões
  for (let k = 0; k < totalAbas; k++) {
    const btn = document.getElementById(`simf-pag-btn-${k}`);
    if (btn) {
      btn.style.background = k === pagIdx ? 'var(--accent)' : 'var(--bg)';
      btn.style.color      = k === pagIdx ? '#000' : 'var(--text-primary)';
    }
  }

  const fmt = n => Math.abs(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtTs = ts => {
    if (ts == null) return '—';
    const d = new Date(ts * 1000);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  };
  const fmtCor = cor => {
    if (cor === 1)  return '<span title="Verde"    style="display:inline-block;width:11px;height:11px;border-radius:50%;background:#22c55e;vertical-align:middle;"></span>';
    if (cor === -1) return '<span title="Vermelha" style="display:inline-block;width:11px;height:11px;border-radius:50%;background:#ef4444;vertical-align:middle;"></span>';
    if (cor === 0)  return '<span title="Doji"     style="display:inline-block;width:11px;height:11px;border-radius:50%;background:#9ca3af;vertical-align:middle;"></span>';
    return '<span style="color:var(--text-muted)">—</span>';
  };

  const fatia = opsValidas.slice(pagIdx * SIMF_POR_ABA, (pagIdx + 1) * SIMF_POR_ABA);
  tbody.innerHTML = fatia.map((op, idx) => {
    const corWL  = op.wl === 'W' ? 'var(--success)' : 'var(--danger)';
    const corRes = op.resultado >= 0 ? 'var(--success)' : 'var(--danger)';
    const sinRes = op.resultado >= 0 ? '+' : '';
    const bg     = idx % 2 === 0 ? '' : 'background:rgba(255,255,255,.025);';
    return `
      <tr style="${bg}">
        <td style="padding:7px 10px; text-align:center; color:var(--text-muted); font-size:12px;">${op.num}</td>
        <td style="padding:7px 10px; font-size:11px; color:var(--text-secondary); white-space:nowrap;">${fmtTs(op.ts)}</td>
        <td style="padding:7px 10px; text-align:center;">${fmtCor(op.cor)}</td>
        <td style="padding:7px 10px; font-size:12px; font-weight:600;">${op.tipo}</td>
        <td style="padding:7px 10px; text-align:right;">R$ ${fmt(op.entrada)}</td>
        <td style="padding:7px 10px; text-align:center; font-weight:800; color:${corWL};">${op.wl}</td>
        <td style="padding:7px 10px; text-align:right; font-weight:700; color:${corRes};">${sinRes}R$ ${fmt(Math.abs(op.resultado))}</td>
        <td style="padding:7px 10px; text-align:right; font-weight:700;">R$ ${fmt(op.saldo)}</td>
      </tr>
    `;
  }).join('');
}
