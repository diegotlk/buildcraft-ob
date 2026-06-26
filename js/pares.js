/* ============================================================
   Binaryzando — Real Pairs from velas.db
   ============================================================ */

// Os 3 primeiros de cada lista são os liberados no Free (mesmo padrão das
// estratégias MHI 1/Milhão). O resto aparece na tela, mas trancado — só
// quem é Premium consegue testar (ver PARES_FREE / parBloqueado() abaixo).
const PARES_OTC = [
  'EURUSD-OTC', 'GBPUSD-OTC', 'USDJPY-OTC',
  'EURJPY-OTC', 'GBPJPY-OTC', 'AUDUSD-OTC', 'USDCAD-OTC', 'USDCHF-OTC',
  'NZDUSD-OTC', 'EURGBP-OTC', 'EURAUD-OTC', 'CHFJPY-OTC',
];

const PARES_OP = [
  'EURUSD-op', 'GBPUSD-op', 'USDJPY-op',
  'EURJPY-op', 'GBPJPY-op', 'AUDUSD-op', 'USDCAD-op', 'USDCHF-op',
  'NZDUSD-op', 'EURGBP-op', 'EURAUD-op', 'CHFJPY-op',
];

// Todas os pares combinados
const TODOS_OS_PARES = [...PARES_OTC, ...PARES_OP].sort();

// ── PLANO ──────────────────────────────────────────────────────────────
// No Free só liberamos os 3 primeiros de cada lista (EUR/GBP/USDJPY).
// Todo o resto é Premium — mesma lógica de PRESETS_FREE em strategy-builder.js.
const PARES_FREE = [...PARES_OTC.slice(0, 3), ...PARES_OP.slice(0, 3)];

function parBloqueado(par) {
  return !ehPremium() && !PARES_FREE.includes(par);
}
