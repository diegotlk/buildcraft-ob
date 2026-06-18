/* ============================================================
   BuildCraft OB — App Logic
   Card rendering, animations, interactions, navigation
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  initCardTilt();
  initTabs();
  initScrollAnimations();
  initMobileMenu();
  initLabSimulation();
  initBattleAnimation();
  initStatBars();
  initCountUp();
});

/* ==================== PARTICLES (Hero) ==================== */
function initParticles() {
  const container = document.querySelector('.hero-particles');
  if (!container) return;

  for (let i = 0; i < 30; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDuration = (6 + Math.random() * 8) + 's';
    particle.style.animationDelay = Math.random() * 6 + 's';
    particle.style.width = (2 + Math.random() * 3) + 'px';
    particle.style.height = particle.style.width;
    particle.style.opacity = (0.15 + Math.random() * 0.25);

    const colors = ['var(--accent)', 'var(--rarity-epic)', 'var(--rarity-legendary)', 'var(--rarity-rare)'];
    particle.style.background = colors[Math.floor(Math.random() * colors.length)];

    container.appendChild(particle);
  }
}

/* ==================== CARD TILT (3D hover effect) ==================== */
function initCardTilt() {
  document.querySelectorAll('.card-collectible').forEach(card => {
    const overlay = card.querySelector('.card-holo-overlay');

    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      const rotateX = (0.5 - y) * 12;
      const rotateY = (x - 0.5) * 12;

      card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px) scale(1.02)`;

      if (overlay) {
        overlay.style.setProperty('--mouse-x', (x * 100) + '%');
        overlay.style.setProperty('--mouse-y', (y * 100) + '%');
      }
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

/* ==================== TABS ==================== */
function initTabs() {
  document.querySelectorAll('.tabs').forEach(tabContainer => {
    const tabs = tabContainer.querySelectorAll('.tab-item');
    const parentSection = tabContainer.closest('.tab-section') || tabContainer.parentElement;
    const panels = parentSection.querySelectorAll('.tab-panel');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;

        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        panels.forEach(p => {
          p.classList.remove('active');
          if (p.dataset.tab === target) {
            p.classList.add('active');
          }
        });
      });
    });
  });
}

/* ==================== SCROLL ANIMATIONS ==================== */
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-slide-up');
        entry.target.style.opacity = '1';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.scroll-animate').forEach(el => {
    el.style.opacity = '0';
    observer.observe(el);
  });
}

/* ==================== MOBILE MENU ==================== */
function initMobileMenu() {
  const toggle = document.querySelector('.navbar-toggle');
  const sidebar = document.querySelector('.sidebar');

  if (!toggle || !sidebar) return;

  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && !toggle.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  });
}

/* ==================== LAB SIMULATION ==================== */
function initLabSimulation() {
  const testBtn = document.getElementById('btn-test-build');
  if (!testBtn) return;

  testBtn.addEventListener('click', () => {
    // Get form values
    const strategySelect = document.getElementById('select-strategy');
    const managementSelect = document.getElementById('select-management');
    const pairSelect = document.getElementById('select-pair');
    const scheduleSelect = document.getElementById('select-schedule');

    const strategyId = strategySelect?.value;
    const managementId = managementSelect?.value;
    const pair = pairSelect?.value;
    const schedule = scheduleSelect?.value;

    // Get filters
    const filters = Array.from(document.querySelectorAll('.filter-input:checked')).map(el => el.value);

    // Validate
    if (!strategyId || !managementId || !pair || !schedule) {
      showToast('⚠️ Preencha todos os campos', 'Estratégia, gerenciamento, par e horário são obrigatórios.', 'default');
      return;
    }

    const resultArea = document.getElementById('lab-result-area');
    const loadingArea = document.getElementById('lab-loading');
    const emptyArea = document.getElementById('lab-empty');

    if (emptyArea) emptyArea.style.display = 'none';
    if (resultArea) resultArea.style.display = 'none';
    if (loadingArea) loadingArea.style.display = 'flex';

    testBtn.disabled = true;
    testBtn.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px"></div> Processando...';

    // Simulate processing
    setTimeout(() => {
      if (loadingArea) loadingArea.style.display = 'none';
      if (resultArea) {
        resultArea.style.display = 'block';
        resultArea.classList.add('animate-slide-up');
      }

      // Generate result
      const strategy = MOCK.strategies.find(s => s.id === strategyId);
      const management = MOCK.managements.find(m => m.id === managementId);
      const result = generateBuildResult(strategy, management, pair, schedule, filters);

      // Fill result
      fillBuildResult(result);

      testBtn.disabled = false;
      testBtn.innerHTML = '⚡ Testar Build';

      // Animate stat bars
      resultArea?.querySelectorAll('.stat-bar-fill').forEach(bar => {
        const target = bar.dataset.width;
        setTimeout(() => {
          bar.style.width = target;
        }, 100);
      });

      // Show discovery toast based on rarity
      const rarityMessages = {
        common: ['📌 Build Comum criada', 'Você descobriu uma combinação básica.'],
        rare: ['🎯 Build Rara criada!', 'Sua combinação gerou uma carta Rara!'],
        epic: ['⭐ Build Épica descoberta!', 'Sua combinação gerou uma carta Épica com nota A!'],
        legendary: ['👑 Build Lendária descoberta!!!', 'Você encontrou uma das raras combinações Lendárias!'],
      };

      const msg = rarityMessages[result.rarity] || rarityMessages.common;
      showToast(msg[0], msg[1], 'discovery');
    }, 2500);
  });

  function generateBuildResult(strategy, management, pair, schedule, filters) {
    // Base values from strategy and management
    const baseWinrate = (strategy.winrate + management.rarity === 'legendary' ? 2 : management.rarity === 'epic' ? 1.5 : 0.5) * 0.98;
    const winrateVariance = (Math.random() - 0.5) * 2;
    const winrate = Math.max(50.1, Math.min(62, baseWinrate + winrateVariance));

    const baseEntries = Math.floor((strategy.entries + 1000) * (Math.random() * 0.5 + 0.7));
    const entries = Math.max(500, Math.floor(baseEntries + (filters.length > 0 ? -200 : 0)));

    // Determine rarity based on combination
    let rarity = 'common';
    if (strategy.rarity === 'legendary' || management.rarity === 'legendary') rarity = 'legendary';
    else if (strategy.rarity === 'epic' && management.rarity === 'epic') rarity = 'epic';
    else if ((strategy.rarity === 'epic' || strategy.rarity === 'rare') && (management.rarity === 'epic' || management.rarity === 'rare')) rarity = 'rare';

    // Randomize rarity a bit
    const rarityRoll = Math.random();
    if (rarityRoll > 0.85) rarity = 'epic';
    else if (rarityRoll > 0.65) rarity = 'rare';

    // Calculate grade based on winrate
    let grade = 'D';
    if (winrate >= 58) grade = 'S+';
    else if (winrate >= 56) grade = 'S';
    else if (winrate >= 54) grade = 'A';
    else if (winrate >= 52) grade = 'B';
    else if (winrate >= 51) grade = 'C';

    // Other metrics
    const payout = (1.5 + Math.random() * 1.0).toFixed(2);
    const drawdown = -Math.floor((3000 - winrate * 50) * Math.random());
    const avgProfit = (winrate - 50) * entries * 10 * (Math.random() * 0.8 + 0.6);

    // Insights
    const insights = generateInsights(strategy, management, pair, schedule, filters, winrate);

    return {
      name: `${strategy.name} + ${management.name}`,
      strategy: strategy.name,
      management: management.name,
      pair: pair,
      schedule: schedule,
      filters: filters,
      creator: 'Você',
      rarity: rarity,
      grade: grade,
      winrate: parseFloat(winrate.toFixed(1)),
      entries: entries,
      payout: parseFloat(payout),
      drawdown: drawdown,
      avgProfit: avgProfit,
      insights: insights,
    };
  }

  function generateInsights(strategy, management, pair, schedule, filters, winrate) {
    const insights = [];

    // Pair-specific
    const bestPairs = {
      'EURUSD': 'Esta build funciona melhor em EUR/USD',
      'GBPUSD': 'GBP/USD é o melhor par para esta combinação',
      'USDJPY': 'USD/JPY oferece resultados mais estáveis',
      'AUDUSD': 'AUD/USD tem boa volatilidade para esta estratégia',
      'USDCAD': 'USD/CAD é adequado para este gerenciamento',
    };
    if (bestPairs[pair]) insights.push('✓ ' + bestPairs[pair]);

    // Schedule-specific
    if (schedule.includes('06h-12h')) insights.push('✓ Melhor performance na sessão europeia');
    else if (schedule.includes('12h-18h')) insights.push('✓ Sessão de sobreposição é ideal');
    else if (schedule.includes('18h-00h')) insights.push('✓ Sessão americana mostra bons resultados');

    // Filters
    if (filters.includes('Sem Doji')) insights.push('✓ Filtro de Doji reduz ruído com sucesso');
    if (filters.includes('RSI > 70')) insights.push('✓ RSI alto confirma força do movimento');

    // Performance-based
    if (winrate >= 56) insights.push('⭐ Combinação acima da média');
    if (winrate <= 51.5) insights.push('💡 Adicionar filtro pode melhorar resultados');
    if (strategy.rarity === 'legendary') insights.push('👑 Estratégia lendária em uso');

    return insights.slice(0, 4);
  }

  function fillBuildResult(result) {
    const pairNames = {
      'EURUSD': 'EUR/USD',
      'GBPUSD': 'GBP/USD',
      'USDJPY': 'USD/JPY',
      'AUDUSD': 'AUD/USD',
      'USDCAD': 'USD/CAD',
    };

    // Fill header
    document.getElementById('result-name').textContent = `${result.strategy} + ${result.management}`;
    document.getElementById('result-creator').textContent = 'Criado por ' + result.creator;

    const rarityBadge = document.getElementById('result-rarity-badge');
    rarityBadge.className = `card-rarity-badge ${getRarityClass(result.rarity)}`;
    rarityBadge.textContent = getRarityLabel(result.rarity);

    // Fill components
    document.getElementById('result-strategy').textContent = result.strategy;
    document.getElementById('result-management').textContent = result.management;
    document.getElementById('result-pair').textContent = pairNames[result.pair] || result.pair;
    document.getElementById('result-schedule').textContent = result.schedule;

    // Fill stats
    document.getElementById('result-winrate').textContent = result.winrate + '%';
    document.getElementById('result-winrate').parentElement.querySelector('.stat-bar-fill').dataset.width = result.winrate + '%';

    document.getElementById('result-entries').textContent = result.entries.toLocaleString('pt-BR');

    const drawdownEl = document.getElementById('result-drawdown');
    drawdownEl.textContent = 'R$ ' + Math.abs(result.drawdown).toLocaleString('pt-BR');
    drawdownEl.className = 'stat-value ' + (result.drawdown < 0 ? 'negative' : 'positive');

    document.getElementById('result-payout').textContent = result.payout.toFixed(2) + 'x';

    // Fill insights
    const insightsList = document.getElementById('result-insights');
    insightsList.innerHTML = result.insights.map(insight => `
      <div class="insight-item">
        <span class="insight-icon">${insight.includes('✓') ? '✓' : (insight.includes('⭐') ? '⭐' : (insight.includes('💡') ? '💡' : '👑'))}</span>
        <span>${insight.replace(/^[✓⭐💡👑] /, '')}</span>
      </div>
    `).join('');
  }
}

/* ==================== BATTLE ANIMATION ==================== */
function initBattleAnimation() {
  const battleBtn = document.getElementById('btn-start-battle');
  if (!battleBtn) return;

  battleBtn.addEventListener('click', () => {
    const bars = document.querySelectorAll('.comparison-bar-left, .comparison-bar-right');
    bars.forEach(bar => {
      bar.style.width = '0%';
      setTimeout(() => {
        bar.style.width = bar.dataset.width;
      }, 300);
    });
  });
}

/* ==================== STAT BARS ==================== */
function initStatBars() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const bar = entry.target.querySelector('.stat-bar-fill');
        if (bar && bar.dataset.width) {
          setTimeout(() => {
            bar.style.width = bar.dataset.width;
          }, 200);
        }
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  document.querySelectorAll('.stat-bar').forEach(bar => observer.observe(bar));
}

/* ==================== COUNT UP ANIMATION ==================== */
function initCountUp() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseFloat(el.dataset.count);
        const suffix = el.dataset.suffix || '';
        const prefix = el.dataset.prefix || '';
        const decimals = el.dataset.decimals ? parseInt(el.dataset.decimals) : 0;
        const duration = 1500;
        const startTime = performance.now();

        function update(currentTime) {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          // Ease out
          const eased = 1 - Math.pow(1 - progress, 3);
          const current = target * eased;

          el.textContent = prefix + current.toFixed(decimals).replace('.', ',') + suffix;

          if (progress < 1) {
            requestAnimationFrame(update);
          }
        }
        requestAnimationFrame(update);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('[data-count]').forEach(el => observer.observe(el));
}

/* ==================== TOAST NOTIFICATIONS ==================== */
function showToast(title, message, type = 'default') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = {
    discovery: '🏆',
    ranking: '📊',
    sale: '💰',
    battle: '⚔️',
    anomaly: '✨',
    default: 'ℹ️',
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.default}</span>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100px)';
    toast.style.transition = 'all .3s';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

/* ==================== CARD RENDERER ==================== */
function renderCard(data, size = 'normal') {
  const rarityClass = getRarityClass(data.rarity);
  const rarityLabel = getRarityLabel(data.rarity);
  const gradeClass = getGradeClass(data.grade);

  if (size === 'mini') {
    return `
      <div class="card-mini" data-id="${data.id}">
        <div class="card-mini-info">
          <div class="card-mini-name">${data.name}</div>
          <div class="card-mini-meta">
            <span class="badge badge-${rarityClass}" style="font-size:.6rem;padding:2px 6px">${rarityLabel}</span>
            ${data.creator ? `<span style="margin-left:4px;color:var(--text-muted);font-size:.72rem">por ${data.creator}</span>` : ''}
          </div>
        </div>
        ${data.winrate ? `
          <div class="card-mini-stats">
            <div><div class="card-mini-stat-val" style="color:var(--success)">${formatPercent(data.winrate)}</div></div>
          </div>
        ` : ''}
        <div class="grade ${gradeClass}">${data.grade}</div>
      </div>
    `;
  }

  return `
    <div class="card-collectible card-${rarityClass}" data-id="${data.id}">
      <div class="card-holo-overlay"></div>
      <div class="card-header">
        <span class="card-type-tag">${data.type || 'Estratégia'}</span>
        <span class="card-rarity-badge ${rarityClass}">${rarityLabel}</span>
      </div>
      <div class="card-body">
        <div class="card-title">${data.name}</div>
        <div class="card-creator">por <span>${data.creator || 'Sistema'}</span></div>
        ${data.winrate !== undefined ? `
          <div class="card-stats">
            <div class="card-stat">
              <div class="card-stat-label">Winrate</div>
              <div class="card-stat-value positive">${formatPercent(data.winrate)}</div>
            </div>
            <div class="card-stat">
              <div class="card-stat-label">Entradas</div>
              <div class="card-stat-value neutral">${(data.entries || 0).toLocaleString('pt-BR')}</div>
            </div>
            ${data.profit !== undefined ? `
              <div class="card-stat">
                <div class="card-stat-label">Lucro Sim.</div>
                <div class="card-stat-value ${data.profit >= 0 ? 'positive' : 'negative'}">${formatCurrency(data.profit)}</div>
              </div>
            ` : ''}
            ${data.stability !== undefined ? `
              <div class="card-stat">
                <div class="card-stat-label">Estabilidade</div>
                <div class="card-stat-value neutral">${data.stability}%</div>
              </div>
            ` : ''}
          </div>
        ` : ''}
        ${data.className ? `
          <div class="card-class-icon">
            <span class="icon">${getClassIcon(data.className)}</span>
            ${data.className}
          </div>
        ` : ''}
      </div>
      <div class="card-footer">
        <div class="card-footer-stat">
          ${data.users ? `<strong>${data.users}</strong> usuários` : ''}
          ${data.sales ? ` · <strong>${data.sales}</strong> vendas` : ''}
        </div>
        <div class="grade ${gradeClass}">${data.grade}</div>
      </div>
    </div>
  `;
}

/* ==================== RENDER RANKING ROW ==================== */
function renderRankingRow(item, position) {
  const posClass = position === 1 ? 'gold' : position === 2 ? 'silver' : position === 3 ? 'bronze' : '';
  const rarityClass = getRarityClass(item.rarity);

  return `
    <tr>
      <td><span class="ranking-pos ${posClass}">#${position}</span></td>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div>
            <div style="font-weight:700">${item.name}</div>
            <div style="font-size:.75rem;color:var(--text-muted)">por ${item.creator}</div>
          </div>
        </div>
      </td>
      <td><span class="badge badge-${rarityClass}">${getRarityLabel(item.rarity)}</span></td>
      <td style="color:var(--success);font-weight:700;font-family:var(--font-display)">${formatPercent(item.winrate)}</td>
      <td style="font-family:var(--font-display)">${(item.entries || 0).toLocaleString('pt-BR')}</td>
      <td><span class="grade ${getGradeClass(item.grade)}">${item.grade}</span></td>
    </tr>
  `;
}

/* ==================== POPULATE SELECTS ==================== */
function populateSelect(selectId, items, labelKey) {
  const select = document.getElementById(selectId);
  if (!select) return;
  items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = typeof item === 'string' ? item : item.id;
    opt.textContent = typeof item === 'string' ? item : item[labelKey || 'name'];
    select.appendChild(opt);
  });
}

/* ==================== RARITY & GRADE HELPERS ==================== */
function getRarityClass(rarity) {
  const map = {
    'common': 'common',
    'rare': 'rare',
    'epic': 'epic',
    'legendary': 'legendary',
  };
  return map[rarity] || 'common';
}

function getRarityLabel(rarity) {
  const map = {
    'common': 'Comum',
    'rare': 'Rara',
    'epic': 'Épica',
    'legendary': 'Lendária',
  };
  return map[rarity] || 'Comum';
}

function getGradeClass(grade) {
  const classMap = {
    'D': 'grade-d',
    'C': 'grade-c',
    'B': 'grade-b',
    'A': 'grade-a',
    'S': 'grade-s',
    'S+': 'grade-s-plus',
  };
  return classMap[grade] || 'grade-b';
}

function getClassIcon(className) {
  const icons = {
    'Tendência': '📈',
    'Reversão': '📉',
    'Anti-meta': '⚡',
    'Padrão': '🔷',
    'Conservador': '🛡️',
    'Agressivo': '⚔️',
    'Progressivo': '📊',
    'Proteção': '🔒',
    'Híbrido': '🔄',
  };
  return icons[className] || '🎯';
}

function formatPercent(value) {
  return parseFloat(value).toFixed(1) + '%';
}

function formatCurrency(value) {
  return 'R$ ' + value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
