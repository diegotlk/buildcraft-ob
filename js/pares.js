/* ============================================================
   Binaryzando — Real Pairs from velas.db
   ============================================================ */

// MVP: lista restrita aos pares mais usados, 3 OTC + 3 de mercado aberto.
const PARES_OTC = [
  'EURUSD-OTC', 'GBPUSD-OTC', 'USDJPY-OTC',
];

const PARES_OP = [
  'EURUSD-op', 'GBPUSD-op', 'USDJPY-op',
];

// Todas os pares combinados
const TODOS_OS_PARES = [...PARES_OTC, ...PARES_OP].sort();
