/* ============================================================
   BuildCraft OB — Mock Data
   Realistic demo data for all site features
   ============================================================ */

const MOCK = {
  // ==================== STRATEGIES ====================
  strategies: [
    { id: 'str-001', name: 'MHI 1', type: 'Estratégia', category: 'Tendência', creator: 'Sistema', rarity: 'common', grade: 'B', winrate: 52.1, entries: 2340, users: 812, sales: 0, public: true, description: 'Estratégia de maioria simples baseada em blocos de 3 velas.' },
    { id: 'str-002', name: 'MHI 2', type: 'Estratégia', category: 'Tendência', creator: 'Sistema', rarity: 'rare', grade: 'A', winrate: 54.3, entries: 1980, users: 654, sales: 0, public: true, description: 'MHI com bloco de análise 2, entrada na terceira vela.' },
    { id: 'str-003', name: 'MHI 3', type: 'Estratégia', category: 'Tendência', creator: 'Sistema', rarity: 'common', grade: 'C', winrate: 51.0, entries: 3120, users: 423, sales: 0, public: true, description: 'MHI com bloco de análise 3.' },
    { id: 'str-004', name: 'Torres Gêmeas', type: 'Estratégia', category: 'Reversão', creator: 'Sistema', rarity: 'epic', grade: 'A', winrate: 55.8, entries: 1450, users: 536, sales: 0, public: true, description: 'Duas velas iguais em sequência, entrada contra a tendência.' },
    { id: 'str-005', name: 'Stop 100', type: 'Estratégia', category: 'Reversão', creator: 'Diego', rarity: 'legendary', grade: 'S', winrate: 58.2, entries: 980, users: 423, sales: 89, public: true, description: 'Estratégia proprietária de reversão com filtros avançados.' },
    { id: 'str-006', name: 'Milhão', type: 'Estratégia', category: 'Tendência', creator: 'Sistema', rarity: 'rare', grade: 'B', winrate: 53.5, entries: 2100, users: 387, sales: 0, public: true, description: 'Estratégia de bloco com foco em continuidade de tendência.' },
    { id: 'str-007', name: 'R7', type: 'Estratégia', category: 'Reversão', creator: 'Carlos_OB', rarity: 'epic', grade: 'S', winrate: 56.9, entries: 870, users: 298, sales: 45, public: true, description: 'Reversão rápida com 7 regras combinadas.' },
    { id: 'str-008', name: 'Seven Flip', type: 'Estratégia', category: 'Anti-meta', creator: 'JoãoTrader', rarity: 'rare', grade: 'A', winrate: 54.1, entries: 1290, users: 215, sales: 23, public: true, description: 'Estratégia contrária ao fluxo principal.' },
    { id: 'str-009', name: 'Padrão 23', type: 'Estratégia', category: 'Padrão', creator: 'Ana_Builds', rarity: 'common', grade: 'B', winrate: 52.8, entries: 1780, users: 176, sales: 12, public: true, description: 'Padrão de 2 velas de análise, entrada na 3ª.' },
    { id: 'str-010', name: 'Healer Crítico', type: 'Estratégia', category: 'Anti-meta', creator: 'Diego', rarity: 'legendary', grade: 'S+', winrate: 59.4, entries: 640, users: 156, sales: 67, public: true, description: 'Combinação defensiva com surtos de agressividade.' },
  ],

  // ==================== MANAGEMENTS ====================
  managements: [
    { id: 'ger-001', name: 'Entrada Fixa', type: 'Gerenciamento', category: 'Conservador', rarity: 'common', grade: 'B', description: 'Valor fixo por entrada, sem progressão.' },
    { id: 'ger-002', name: 'Martingale 1', type: 'Gerenciamento', category: 'Agressivo', rarity: 'common', grade: 'C', description: 'Dobra o valor após cada perda (1 gale).' },
    { id: 'ger-003', name: 'Martingale 2', type: 'Gerenciamento', category: 'Agressivo', rarity: 'rare', grade: 'B', description: 'Dobra o valor após cada perda (até 2 gales).' },
    { id: 'ger-004', name: 'Soros 1', type: 'Gerenciamento', category: 'Progressivo', rarity: 'rare', grade: 'A', description: 'Reinveste lucro após ganho (1 soros).' },
    { id: 'ger-005', name: 'Soros 2', type: 'Gerenciamento', category: 'Progressivo', rarity: 'epic', grade: 'A', description: 'Reinveste lucro após ganho (até 2 soros).' },
    { id: 'ger-006', name: 'Soros Defensivo', type: 'Gerenciamento', category: 'Proteção', rarity: 'epic', grade: 'S', description: 'Soros com parada de perda automática e proteção de banca.' },
    { id: 'ger-007', name: 'Soros Gale', type: 'Gerenciamento', category: 'Híbrido', rarity: 'legendary', grade: 'S', description: 'Combina Soros em ganho com Martingale em perda.' },
  ],

  // ==================== BUILDS ====================
  builds: [
    {
      id: 'bld-001',
      name: 'Healer Crítico',
      strategy: 'Stop 100',
      management: 'Soros Defensivo',
      pair: 'USD/JPY',
      timeframe: 'M1',
      schedule: '08h-10h',
      filters: ['Sem Doji', 'RSI < 30'],
      creator: 'Diego',
      rarity: 'legendary',
      grade: 'S+',
      className: 'Anti-meta',
      winrate: 59.4,
      entries: 640,
      profit: 1847.50,
      drawdown: 180,
      payoutMin: 76,
      bestMonth: 'Janeiro',
      worstMonth: 'Abril',
      stability: 87,
      ranking: 1,
      hallOfFame: true,
      buyers: 67,
      variations: 12,
    },
    {
      id: 'bld-002',
      name: 'Tanque Reflexo',
      strategy: 'Torres Gêmeas',
      management: 'Entrada Fixa',
      pair: 'EUR/USD',
      timeframe: 'M1',
      schedule: '09h-11h',
      filters: ['Sem sexta-feira'],
      creator: 'Diego',
      rarity: 'epic',
      grade: 'S',
      className: 'Tanque',
      winrate: 56.2,
      entries: 1120,
      profit: 923.80,
      drawdown: 95,
      payoutMin: 80,
      bestMonth: 'Março',
      worstMonth: 'Junho',
      stability: 82,
      ranking: 3,
      hallOfFame: false,
      buyers: 34,
      variations: 5,
    },
    {
      id: 'bld-003',
      name: 'Sniper Noturno',
      strategy: 'MHI 2',
      management: 'Soros 2',
      pair: 'EUR/USD',
      timeframe: 'M1',
      schedule: '21h-23h',
      filters: ['EMA 9', 'Volume alto'],
      creator: 'Carlos_OB',
      rarity: 'epic',
      grade: 'A',
      className: 'Sniper',
      winrate: 55.7,
      entries: 890,
      profit: 712.30,
      drawdown: 210,
      payoutMin: 78,
      bestMonth: 'Fevereiro',
      worstMonth: 'Maio',
      stability: 74,
      ranking: 5,
      hallOfFame: false,
      buyers: 21,
      variations: 3,
    },
    {
      id: 'bld-004',
      name: 'Muralha de Gelo',
      strategy: 'R7',
      management: 'Soros Defensivo',
      pair: 'GBP/USD',
      timeframe: 'M1',
      schedule: '10h-12h',
      filters: ['Tendência por EMA', 'Sem Doji'],
      creator: 'Ana_Builds',
      rarity: 'rare',
      grade: 'A',
      className: 'Defensiva',
      winrate: 54.8,
      entries: 1340,
      profit: 534.20,
      drawdown: 120,
      payoutMin: 82,
      bestMonth: 'Janeiro',
      worstMonth: 'Julho',
      stability: 79,
      ranking: 8,
      hallOfFame: false,
      buyers: 15,
      variations: 2,
    },
    {
      id: 'bld-005',
      name: 'Fênix Caótica',
      strategy: 'Seven Flip',
      management: 'Martingale 1',
      pair: 'USD/JPY',
      timeframe: 'M1',
      schedule: '14h-16h',
      filters: ['RSI > 70'],
      creator: 'JoãoTrader',
      rarity: 'rare',
      grade: 'B',
      className: 'Agressiva',
      winrate: 53.1,
      entries: 1560,
      profit: 287.90,
      drawdown: 340,
      payoutMin: 75,
      bestMonth: 'Março',
      worstMonth: 'Junho',
      stability: 61,
      ranking: 14,
      hallOfFame: false,
      buyers: 8,
      variations: 1,
    },
    {
      id: 'bld-006',
      name: 'Tsunami Reverso',
      strategy: 'Milhão',
      management: 'Soros Gale',
      pair: 'EUR/JPY',
      timeframe: 'M1',
      schedule: '09h-11h',
      filters: ['Sem segunda-feira', 'Volatilidade alta'],
      creator: 'Diego',
      rarity: 'legendary',
      grade: 'S',
      className: 'Especialista',
      winrate: 57.8,
      entries: 720,
      profit: 2134.60,
      drawdown: 290,
      payoutMin: 74,
      bestMonth: 'Fevereiro',
      worstMonth: 'Maio',
      stability: 83,
      ranking: 2,
      hallOfFame: true,
      buyers: 52,
      variations: 8,
    },
  ],

  // ==================== CREATORS ====================
  creators: [
    { id: 'usr-001', name: 'Diego', title: 'Mestre das Builds Defensivas', level: 'Criador Lendário', cards: 32, legendary: 3, sales: 218, ranking: 1, rating: 4.9, specialty: 'Reversão + Defesa' },
    { id: 'usr-002', name: 'Carlos_OB', title: 'Caçador de Anomalias', level: 'Criador Épico', cards: 18, legendary: 1, sales: 87, ranking: 2, rating: 4.7, specialty: 'Snipers noturnos' },
    { id: 'usr-003', name: 'Ana_Builds', title: 'Arquiteta de Padrões', level: 'Mestre de Builds', cards: 24, legendary: 0, sales: 56, ranking: 3, rating: 4.6, specialty: 'Padrões + Defesa' },
    { id: 'usr-004', name: 'JoãoTrader', title: 'Explorador Anti-meta', level: 'Pesquisador', cards: 11, legendary: 0, sales: 23, ranking: 4, rating: 4.3, specialty: 'Anti-meta agressivo' },
    { id: 'usr-005', name: 'Lucas_FX', title: 'Novato Promissor', level: 'Explorador', cards: 5, legendary: 0, sales: 3, ranking: 12, rating: 4.1, specialty: 'MHI variações' },
  ],

  // ==================== PAIRS ====================
  pairs: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'EUR/JPY', 'AUD/USD', 'GBP/JPY'],

  // ==================== FILTERS ====================
  filters: ['Sem Doji', 'RSI < 30', 'RSI > 70', 'EMA 9', 'EMA 21', 'Tendência por EMA', 'Volume alto', 'Volatilidade alta', 'Sem segunda-feira', 'Sem sexta-feira', 'Payout > 80%', 'Payout > 75%'],

  // ==================== TIMEFRAMES ====================
  timeframes: ['M1', 'M5', 'M15'],

  // ==================== SCHEDULES ====================
  schedules: ['06h-08h', '08h-10h', '09h-11h', '10h-12h', '14h-16h', '16h-18h', '19h-21h', '21h-23h'],

  // ==================== ACHIEVEMENTS ====================
  achievements: [
    { id: 'ach-001', title: 'Primeira Build', desc: 'Criou sua primeira build', icon: '🏗️', color: 'blue' },
    { id: 'ach-002', title: 'Caçador de Raridades', desc: 'Encontrou uma build Rara', icon: '💎', color: 'blue' },
    { id: 'ach-003', title: 'Alquimista', desc: 'Encontrou uma build Épica', icon: '🔮', color: 'purple' },
    { id: 'ach-004', title: 'Lenda Viva', desc: 'Encontrou uma build Lendária', icon: '👑', color: 'gold' },
    { id: 'ach-005', title: 'Anti-meta', desc: 'Build positiva no pior cenário', icon: '⚡', color: 'gold' },
    { id: 'ach-006', title: 'Rainha de Janeiro', desc: 'Melhor build do mês', icon: '🏆', color: 'gold' },
    { id: 'ach-007', title: 'Primeiro Venda', desc: 'Vendeu uma carta', icon: '💰', color: 'green' },
    { id: 'ach-008', title: 'Top 10', desc: 'Entrou no top 10 do ranking', icon: '🌟', color: 'purple' },
    { id: 'ach-009', title: 'Explorador', desc: 'Testou 10 pares diferentes', icon: '🧭', color: 'blue' },
    { id: 'ach-010', title: 'Campeão da Copa', desc: 'Venceu a Copa das Estratégias', icon: '🏅', color: 'gold' },
  ],

  // ==================== NOTIFICATIONS ====================
  notifications: [
    { type: 'discovery', title: '🏆 Build Lendária!', message: 'Sua build "Healer Crítico" foi classificada como Lendária S+!', time: '2 min' },
    { type: 'ranking', title: '📊 Ranking atualizado', message: 'Sua estratégia "Stop 100" subiu para #1 no ranking mensal.', time: '15 min' },
    { type: 'sale', title: '💰 Venda realizada!', message: 'Carlos_OB comprou sua carta "Stop 100" por R$ 9,90.', time: '1h' },
    { type: 'battle', title: '⚔️ Batalha vencida!', message: '"Stop 100" derrotou "MHI 2" na batalha semanal.', time: '3h' },
    { type: 'anomaly', title: '✨ Anomalia detectada!', message: 'Build positiva encontrada no pior horário do USD/JPY.', time: '5h' },
  ],

  // ==================== BATTLE EXAMPLE ====================
  battleExample: {
    card1: {
      name: 'MHI 2',
      rarity: 'rare',
      grade: 'A',
      stats: { winrate: 54.3, entries: 1980, profit: 623.40, drawdown: 245, stability: 72, payoutMin: 78 }
    },
    card2: {
      name: 'Torres Gêmeas',
      rarity: 'epic',
      grade: 'A',
      stats: { winrate: 55.8, entries: 1450, profit: 847.20, drawdown: 165, stability: 82, payoutMin: 80 }
    },
    monthlyResults: [
      { month: 'Jan', winner: 'Torres Gêmeas' },
      { month: 'Fev', winner: 'MHI 2' },
      { month: 'Mar', winner: 'Torres Gêmeas' },
      { month: 'Abr', winner: 'empate' },
      { month: 'Mai', winner: 'Torres Gêmeas' },
      { month: 'Jun', winner: 'MHI 2' },
      { month: 'Jul', winner: 'Torres Gêmeas' },
      { month: 'Ago', winner: 'MHI 2' },
      { month: 'Set', winner: 'Torres Gêmeas' },
      { month: 'Out', winner: 'Torres Gêmeas' },
      { month: 'Nov', winner: 'MHI 2' },
      { month: 'Dez', winner: 'Torres Gêmeas' },
    ],
    overallWinner: 'Torres Gêmeas',
    score: '7 x 4 (1 empate)',
  },

  // ==================== BUILDDEX PROGRESS ====================
  buildDex: {
    strategiesDiscovered: 37,
    strategiesTotal: 500,
    buildsSaved: 12,
    legendaryFound: 2,
    managementsTested: 8,
    pairsExplored: 3,
    pairsTotal: 20,
  },

  // ==================== HALL OF FAME ====================
  hallOfFame: [
    { title: 'Primeira Build Lendária', holder: 'Diego', card: 'Healer Crítico', date: 'Jan 2026' },
    { title: 'Maior Lucro Simulado', holder: 'Diego', card: 'Tsunami Reverso', date: 'Fev 2026' },
    { title: 'Menor Drawdown', holder: 'Ana_Builds', card: 'Muralha de Gelo', date: 'Mar 2026' },
    { title: 'Melhor Anti-meta', holder: 'JoãoTrader', card: 'Fênix Caótica', date: 'Mar 2026' },
    { title: 'Campeão Copa Julho', holder: 'Diego', card: 'Stop 100', date: 'Jul 2026' },
  ],

  // ==================== MARKETPLACE ITEMS ====================
  marketplaceItems: [
    { id: 'mkt-001', cardId: 'str-005', name: 'Stop 100', type: 'Estratégia', creator: 'Diego', rarity: 'legendary', grade: 'S', priceSimple: 9.90, priceComplete: 99.90, sales: 89, rating: 4.8, reviews: 67 },
    { id: 'mkt-002', cardId: 'str-007', name: 'R7', type: 'Estratégia', creator: 'Carlos_OB', rarity: 'epic', grade: 'S', priceSimple: 7.90, priceComplete: 69.90, sales: 45, rating: 4.6, reviews: 32 },
    { id: 'mkt-003', cardId: 'str-010', name: 'Healer Crítico', type: 'Build', creator: 'Diego', rarity: 'legendary', grade: 'S+', priceSimple: 14.90, priceComplete: 149.90, sales: 67, rating: 4.9, reviews: 51 },
    { id: 'mkt-004', cardId: 'str-008', name: 'Seven Flip', type: 'Estratégia', creator: 'JoãoTrader', rarity: 'rare', grade: 'A', priceSimple: 4.90, priceComplete: 39.90, sales: 23, rating: 4.3, reviews: 18 },
    { id: 'mkt-005', cardId: 'ger-006', name: 'Soros Defensivo', type: 'Gerenciamento', creator: 'Diego', rarity: 'epic', grade: 'S', priceSimple: 6.90, priceComplete: 59.90, sales: 34, rating: 4.7, reviews: 28 },
    { id: 'mkt-006', cardId: 'ger-007', name: 'Soros Gale', type: 'Gerenciamento', creator: 'Carlos_OB', rarity: 'legendary', grade: 'S', priceSimple: 12.90, priceComplete: 119.90, sales: 41, rating: 4.5, reviews: 29 },
  ],
};

// Helper functions
function getRarityClass(rarity) {
  const map = { common: 'common', rare: 'rare', epic: 'epic', legendary: 'legendary' };
  return map[rarity] || 'common';
}

function getRarityLabel(rarity) {
  const map = { common: 'Comum', rare: 'Rara', epic: 'Épica', legendary: 'Lendária' };
  return map[rarity] || 'Comum';
}

function getRarityColor(rarity) {
  const map = {
    common: 'var(--rarity-common)',
    rare: 'var(--rarity-rare)',
    epic: 'var(--rarity-epic)',
    legendary: 'var(--rarity-legendary)',
  };
  return map[rarity] || 'var(--rarity-common)';
}

function getGradeClass(grade) {
  const map = { 'D': 'grade-d', 'C': 'grade-c', 'B': 'grade-b', 'A': 'grade-a', 'S': 'grade-s', 'S+': 'grade-sp' };
  return map[grade] || 'grade-d';
}

function formatCurrency(value) {
  return 'R$ ' + value.toFixed(2).replace('.', ',');
}

function formatPercent(value) {
  return value.toFixed(1).replace('.', ',') + '%';
}

function getClassIcon(className) {
  const icons = {
    'Anti-meta': '⚡',
    'Tanque': '🛡️',
    'Sniper': '🎯',
    'Defensiva': '🏰',
    'Agressiva': '🔥',
    'Especialista': '🧪',
    'Suporte': '💚',
    'Reflexo': '🪞',
    'Anomalia': '✨',
    'Meme': '😂',
  };
  return icons[className] || '⚙️';
}
