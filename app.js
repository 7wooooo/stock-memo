// === StockVentura Core Interactivity & Dashboard Engine ===

const STORAGE_KEYS = {
  TRADES: 'stockventura_trades_v3',
  THEME: 'stockventura_theme_mode'
};

// Initial Sample Trades for Review
const DEFAULT_TRADES = [
  {
    id: 'trade_sample_1',
    date: '2026-10-12',
    exitDate: '2026-10-15',
    stock: '대한전선',
    type: '스윙',
    strategy: '주도주 눌림목',
    buyPrice: 22800,
    qty: 100,
    targetPrice: 28000,
    stopPrice: 21450,
    sellPrice: 26500,
    discipline: '원칙준수',
    notes: '진입: 런던 400kV 초고압 전력망 수주 및 20일선 눌림목 지지 확인 후 진입.\n청산/복기: 단기 저항대에서 분할 익절 완료 (+16.2%). 손익비 2.5:1 준수 성공.'
  },
  {
    id: 'trade_sample_2',
    date: '2026-10-06',
    exitDate: '2026-10-07',
    stock: '삼천당제약',
    type: '단타',
    strategy: '신고가 돌파',
    buyPrice: 142000,
    qty: 25,
    targetPrice: 155000,
    stopPrice: 138000,
    sellPrice: 137800,
    discipline: '원칙준수',
    notes: '진입: 전고점 거래량 돌파 시도에 진입.\n청산/복기: 가짜 돌파 확인 후 손절선(138,000원) 이탈 즉시 칼손절 처리하여 계좌 보호.'
  },
  {
    id: 'trade_sample_3',
    date: '2026-09-28',
    exitDate: '2026-09-29',
    stock: '테마급등주X',
    type: '단타',
    strategy: '기타',
    buyPrice: 32000,
    qty: 100,
    targetPrice: 35000,
    stopPrice: 30500,
    sellPrice: 28800,
    discipline: '뇌동매매',
    notes: '진입: 장중 +18% 급등 시 추격매수함.\n청산/복기: 물타기하다가 -10.0% 손실에 투매. 교훈: 계획에 없는 장중 급등주 추격매수는 절대 금지.'
  }
];

document.addEventListener('DOMContentLoaded', () => {
  initStorage();
  initTheme();
  initNavigation();
  initTradeJournal();
  initRiskCalculator();
  updateAllStats();
});

// Storage
function initStorage() {
  if (!localStorage.getItem(STORAGE_KEYS.TRADES)) {
    localStorage.setItem(STORAGE_KEYS.TRADES, JSON.stringify(DEFAULT_TRADES));
  }
}

function getTrades() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.TRADES)) || [];
  } catch (e) {
    return [];
  }
}

function saveTrades(trades) {
  localStorage.setItem(STORAGE_KEYS.TRADES, JSON.stringify(trades));
  updateAllStats();
  renderTradeList();
}

// Theme Toggle (Light / Dark)
function initTheme() {
  const lightBtn = document.getElementById('themeToggleLight');
  const darkBtn = document.getElementById('themeToggleDark');
  const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'light';

  function setTheme(theme) {
    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
      if (darkBtn) darkBtn.classList.add('active');
      if (lightBtn) lightBtn.classList.remove('active');
    } else {
      document.body.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
      if (lightBtn) lightBtn.classList.add('active');
      if (darkBtn) darkBtn.classList.remove('active');
    }
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }

  setTheme(savedTheme);

  if (lightBtn) lightBtn.addEventListener('click', () => setTheme('light'));
  if (darkBtn) darkBtn.addEventListener('click', () => setTheme('dark'));
}

// Unified Tab Navigation
window.switchTab = function(tabId) {
  const sideBtns = document.querySelectorAll('.side-nav-btn');
  const topLinks = document.querySelectorAll('.topbar-link');
  const mobTabs = document.querySelectorAll('.mob-tab');
  const panes = document.querySelectorAll('.tab-pane');

  sideBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === tabId));
  topLinks.forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === tabId));
  mobTabs.forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === tabId));
  panes.forEach(p => p.classList.toggle('active', p.id === tabId));

  window.scrollTo({ top: 0, behavior: 'smooth' });
};

function initNavigation() {
  document.querySelectorAll('.side-nav-btn, .topbar-link, .mob-tab').forEach(el => {
    el.addEventListener('click', () => {
      const target = el.getAttribute('data-tab');
      if (target) window.switchTab(target);
    });
  });
}

// Modal Global Helper
window.openNewTradeModal = function() {
  const modal = document.getElementById('tradeModal');
  const form = document.getElementById('tradeForm');
  const btnDeleteTrade = document.getElementById('btnDeleteTrade');

  if (form) form.reset();
  const idEl = document.getElementById('tradeId');
  if (idEl) idEl.value = '';

  const titleEl = document.getElementById('modalTitle');
  if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-pen-nib"></i> 새로운 매매 기록 작성';
  if (btnDeleteTrade) btnDeleteTrade.style.display = 'none';

  const today = new Date().toISOString().split('T')[0];
  const dateEl = document.getElementById('tradeDate');
  const exitEl = document.getElementById('tradeExitDate');
  if (dateEl) dateEl.value = today;
  if (exitEl) exitEl.value = today;

  updateFormPreview();
  if (modal) modal.classList.add('open');
};

// Trade Journal Functionality
let currentFilter = 'all';

function initTradeJournal() {
  const modal = document.getElementById('tradeModal');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const btnCancelModal = document.getElementById('btnCancelModal');
  const form = document.getElementById('tradeForm');
  const btnDeleteTrade = document.getElementById('btnDeleteTrade');

  function closeModal() {
    if (modal) modal.classList.remove('open');
  }
  if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
  if (btnCancelModal) btnCancelModal.addEventListener('click', closeModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  ['tradeBuyPrice', 'tradeQty', 'tradeSellPrice', 'tradeTargetPrice', 'tradeStopPrice'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateFormPreview);
  });

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const tradeId = document.getElementById('tradeId').value || 'trade_' + Date.now();
      const buyPrice = parseFloat(document.getElementById('tradeBuyPrice').value) || 0;
      const qty = parseFloat(document.getElementById('tradeQty').value) || 0;
      const sellPrice = parseFloat(document.getElementById('tradeSellPrice').value) || 0;
      const targetPrice = parseFloat(document.getElementById('tradeTargetPrice').value) || 0;
      const stopPrice = parseFloat(document.getElementById('tradeStopPrice').value) || 0;

      const disciplineEl = document.querySelector('input[name="disciplineRadio"]:checked');

      const tradeData = {
        id: tradeId,
        date: document.getElementById('tradeDate').value,
        exitDate: document.getElementById('tradeExitDate').value || document.getElementById('tradeDate').value,
        stock: document.getElementById('tradeStock').value.trim(),
        type: document.getElementById('tradeType').value,
        strategy: document.getElementById('tradeStrategy').value,
        buyPrice,
        qty,
        targetPrice,
        stopPrice,
        sellPrice,
        discipline: disciplineEl ? disciplineEl.value : '원칙준수',
        notes: document.getElementById('tradeNotes').value.trim()
      };

      let trades = getTrades();
      const existingIndex = trades.findIndex(t => t.id === tradeId);
      if (existingIndex >= 0) {
        trades[existingIndex] = tradeData;
      } else {
        trades.unshift(tradeData);
      }

      saveTrades(trades);
      closeModal();
    });
  }

  if (btnDeleteTrade) {
    btnDeleteTrade.addEventListener('click', () => {
      const tradeId = document.getElementById('tradeId').value;
      if (!tradeId) return;
      if (confirm('이 매매 기록을 정말 삭제하시겠습니까?')) {
        let trades = getTrades().filter(t => t.id !== tradeId);
        saveTrades(trades);
        closeModal();
      }
    });
  }

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.getAttribute('data-filter');
      renderTradeList();
    });
  });

  const expCsv = document.getElementById('btnExportCsv');
  const expJson = document.getElementById('btnExportJson');
  const sidebarBackup = document.getElementById('btnSidebarBackup');

  if (expCsv) expCsv.addEventListener('click', exportToCsv);
  if (expJson) expJson.addEventListener('click', exportToJson);
  if (sidebarBackup) sidebarBackup.addEventListener('click', exportToJson);

  renderTradeList();
}

function updateFormPreview() {
  const buyEl = document.getElementById('tradeBuyPrice');
  const qtyEl = document.getElementById('tradeQty');
  const sellEl = document.getElementById('tradeSellPrice');
  const targetEl = document.getElementById('tradeTargetPrice');
  const stopEl = document.getElementById('tradeStopPrice');

  if (!buyEl || !qtyEl || !sellEl) return;

  const buyPrice = parseFloat(buyEl.value) || 0;
  const qty = parseFloat(qtyEl.value) || 0;
  const sellPrice = parseFloat(sellEl.value) || 0;
  const targetPrice = parseFloat(targetEl?.value) || 0;
  const stopPrice = parseFloat(stopEl?.value) || 0;

  const totalBuy = buyPrice * qty;
  const pnl = (sellPrice - buyPrice) * qty;
  const rate = buyPrice > 0 ? ((sellPrice - buyPrice) / buyPrice) * 100 : 0;

  let rrRatio = '0.0 : 1';
  if (buyPrice > 0 && stopPrice > 0 && buyPrice > stopPrice && targetPrice > buyPrice) {
    const risk = buyPrice - stopPrice;
    const reward = targetPrice - buyPrice;
    const ratio = (reward / risk).toFixed(1);
    rrRatio = `${ratio} : 1`;
  }

  const prevBuy = document.getElementById('previewBuyTotal');
  const pnlEl = document.getElementById('previewPnl');
  const rrEl = document.getElementById('previewRR');

  if (prevBuy) prevBuy.textContent = formatCurrency(totalBuy);
  if (pnlEl) {
    pnlEl.textContent = `${formatCurrency(pnl)} (${rate >= 0 ? '+' : ''}${rate.toFixed(2)}%)`;
    pnlEl.className = pnl >= 0 ? 'text-profit' : 'text-loss';
  }
  if (rrEl) rrEl.textContent = rrRatio;
}

function renderTradeList() {
  const container = document.getElementById('tradeListContainer');
  if (!container) return;
  const trades = getTrades();

  let filtered = trades.filter(t => {
    const pnl = (t.sellPrice - t.buyPrice) * t.qty;
    if (currentFilter === 'win') return pnl > 0;
    if (currentFilter === 'loss') return pnl <= 0;
    if (currentFilter === 'impulse') return t.discipline === '뇌동매매' || t.discipline === '손절지연';
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding:40px; text-align:center; color:#94a3b8; background:var(--bg-card); border-radius:16px; border:1px dashed var(--border-subtle);">
        <i class="fa-solid fa-folder-open" style="font-size:2rem; margin-bottom:10px;"></i>
        <p>표시할 매매 기록이 없습니다.</p>
        <p style="font-size:0.8rem; margin-top:4px;">상단의 [새 매매 기록] 버튼을 눌러 오늘 진행한 매매를 기록해보세요.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(t => {
    const totalBuy = t.buyPrice * t.qty;
    const pnl = (t.sellPrice - t.buyPrice) * t.qty;
    const rate = t.buyPrice > 0 ? ((t.sellPrice - t.buyPrice) / t.buyPrice) * 100 : 0;
    const isWin = pnl >= 0;

    return `
      <div class="rec-row-item" style="border-left: 4px solid ${isWin ? 'var(--profit)' : 'var(--loss)'};">
        <div class="rec-thumb-icon" style="background:${isWin ? 'var(--profit-light)' : 'var(--loss-light)'}; color:${isWin ? 'var(--profit)' : 'var(--loss)'};">
          <i class="fa-solid ${isWin ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}"></i>
        </div>
        <div class="rec-main-info">
          <div class="rec-title-wrap">
            <strong class="rec-name">${escapeHtml(t.stock)}</strong>
            <span class="badge ${t.discipline === '뇌동매매' ? 'badge-danger' : 'badge-discipline'}">${escapeHtml(t.discipline)}</span>
          </div>
          <span class="rec-catalyst">${escapeHtml(t.notes || '메모 없음')}</span>
        </div>
        <div class="rec-price-info">
          <span class="rec-curr-price ${isWin ? 'text-profit' : 'text-loss'}">
            ${isWin ? '+' : ''}${formatCurrency(pnl)}
          </span>
          <span class="rec-target-price ${isWin ? 'text-profit' : 'text-loss'}">
            수익률: ${isWin ? '+' : ''}${rate.toFixed(2)}%
          </span>
        </div>
        <div class="rec-action-info">
          <button class="btn btn-sm btn-outline" onclick="editTrade('${t.id}')">수정</button>
        </div>
      </div>
    `;
  }).join('');
}

window.editTrade = function(id) {
  const trades = getTrades();
  const t = trades.find(item => item.id === id);
  if (!t) return;

  document.getElementById('tradeId').value = t.id;
  document.getElementById('tradeDate').value = t.date;
  document.getElementById('tradeExitDate').value = t.exitDate || t.date;
  document.getElementById('tradeStock').value = t.stock;
  document.getElementById('tradeType').value = t.type || '스윙';
  document.getElementById('tradeStrategy').value = t.strategy || '기타';
  document.getElementById('tradeBuyPrice').value = t.buyPrice;
  document.getElementById('tradeQty').value = t.qty;
  document.getElementById('tradeTargetPrice').value = t.targetPrice || '';
  document.getElementById('tradeStopPrice').value = t.stopPrice || '';
  document.getElementById('tradeSellPrice').value = t.sellPrice;
  document.getElementById('tradeNotes').value = t.notes || '';

  const radios = document.querySelectorAll('input[name="disciplineRadio"]');
  radios.forEach(r => {
    r.checked = (r.value === t.discipline);
  });

  const titleEl = document.getElementById('modalTitle');
  if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> 매매 기록 수정';
  const delBtn = document.getElementById('btnDeleteTrade');
  if (delBtn) delBtn.style.display = 'inline-flex';

  updateFormPreview();
  const modal = document.getElementById('tradeModal');
  if (modal) modal.classList.add('open');
};

function updateAllStats() {
  const trades = getTrades();
  let totalPnl = 0;
  let totalBuyMoney = 0;
  let winCount = 0;
  let lossCount = 0;
  let impulseCount = 0;
  let totalGrossProfit = 0;
  let totalGrossLoss = 0;

  trades.forEach(t => {
    const buyTotal = t.buyPrice * t.qty;
    const pnl = (t.sellPrice - t.buyPrice) * t.qty;
    totalPnl += pnl;
    totalBuyMoney += buyTotal;

    if (pnl > 0) {
      winCount++;
      totalGrossProfit += pnl;
    } else if (pnl < 0) {
      lossCount++;
      totalGrossLoss += Math.abs(pnl);
    }

    if (t.discipline === '뇌동매매' || t.discipline === '손절지연') {
      impulseCount++;
    }
  });

  const totalCount = trades.length;
  const winRate = totalCount > 0 ? ((winCount / totalCount) * 100).toFixed(1) : '0.0';
  const totalReturn = totalBuyMoney > 0 ? ((totalPnl / totalBuyMoney) * 100).toFixed(2) : '0.0';
  const disciplineRate = totalCount > 0 ? (((totalCount - impulseCount) / totalCount) * 100).toFixed(0) : '100';
  const profitFactor = totalGrossLoss > 0 ? (totalGrossProfit / totalGrossLoss).toFixed(2) : (totalGrossProfit > 0 ? '99.9' : '0.00');

  const pnlEl = document.getElementById('statTotalPnl');
  if (pnlEl) {
    pnlEl.textContent = `${totalPnl >= 0 ? '+' : ''}${formatCurrency(totalPnl)}`;
    pnlEl.className = `kpi-value ${totalPnl >= 0 ? 'text-profit' : 'text-danger'}`;
  }

  const retEl = document.getElementById('statTotalReturn');
  if (retEl) retEl.textContent = `누적 수익률: ${totalReturn >= 0 ? '+' : ''}${totalReturn}%`;

  const winEl = document.getElementById('statWinRate');
  if (winEl) winEl.textContent = `${winRate}%`;

  const cntEl = document.getElementById('statTradeCounts');
  if (cntEl) cntEl.textContent = `${winCount}승 ${lossCount}패 (총 ${totalCount}건)`;

  const discEl = document.getElementById('statDisciplineRate');
  if (discEl) discEl.textContent = `${disciplineRate}%`;

  const impEl = document.getElementById('statImpulseCount');
  if (impEl) impEl.textContent = `뇌동/원칙위반: ${impulseCount}건`;

  const pfEl = document.getElementById('statProfitFactor');
  if (pfEl) pfEl.textContent = profitFactor;
}

// Risk Calculator
function initRiskCalculator() {
  const btn = document.getElementById('btnRunCalc');
  if (btn) {
    btn.addEventListener('click', runRiskCalculation);
    runRiskCalculation();
  }
}

function runRiskCalculation() {
  const seedEl = document.getElementById('calcTotalSeed');
  const riskPctEl = document.getElementById('calcRiskPercent');
  const entryEl = document.getElementById('calcEntryPrice');
  const stopEl = document.getElementById('calcStopPrice');

  if (!seedEl || !riskPctEl || !entryEl || !stopEl) return;

  const seed = parseFloat(seedEl.value) || 0;
  const riskPct = parseFloat(riskPctEl.value) || 1;
  const entryPrice = parseFloat(entryEl.value) || 0;
  const stopPrice = parseFloat(stopEl.value) || 0;

  if (seed <= 0 || entryPrice <= 0 || stopPrice <= 0) return;

  const maxLossMoney = seed * (riskPct / 100);
  const perShareRisk = Math.abs(entryPrice - stopPrice);
  const lossRate = entryPrice > 0 ? (perShareRisk / entryPrice) * 100 : 0;

  let maxShares = 0;
  if (perShareRisk > 0) {
    maxShares = Math.floor(maxLossMoney / perShareRisk);
  }

  const totalPositionMoney = maxShares * entryPrice;
  const positionPctOfSeed = seed > 0 ? ((totalPositionMoney / seed) * 100).toFixed(1) : 0;

  const resLoss = document.getElementById('resMaxLossMoney');
  const resPerShare = document.getElementById('resPerShareRisk');
  const resShares = document.getElementById('resMaxShares');
  const resPos = document.getElementById('resTotalPosition');

  if (resLoss) resLoss.textContent = `${formatCurrency(maxLossMoney)} (${riskPct}%)`;
  if (resPerShare) resPerShare.textContent = `${formatCurrency(perShareRisk)} (-${lossRate.toFixed(2)}%)`;
  if (resShares) resShares.textContent = `${maxShares.toLocaleString()} 주`;
  if (resPos) resPos.textContent = `${formatCurrency(totalPositionMoney)} (전체 시드의 ${positionPctOfSeed}%)`;
}

// Helpers
function exportToCsv() {
  const trades = getTrades();
  if (trades.length === 0) {
    alert('내보낼 매매 데이터가 없습니다.');
    return;
  }
  const headers = ['매매일자', '청산일자', '종목명', '유형', '전략', '매수가', '수량', '목표가', '손절가', '매도가', '실현손익', '수익률(%)', '원칙준수여부', '복기메모'];
  const rows = trades.map(t => {
    const pnl = (t.sellPrice - t.buyPrice) * t.qty;
    const rate = t.buyPrice > 0 ? (((t.sellPrice - t.buyPrice) / t.buyPrice) * 100).toFixed(2) : '0';
    return [
      t.date, t.exitDate || t.date, `"${(t.stock || '').replace(/"/g, '""')}"`,
      t.type, t.strategy, t.buyPrice, t.qty, t.targetPrice || '', t.stopPrice || '',
      t.sellPrice, pnl, rate, t.discipline, `"${(t.notes || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
    ].join(',');
  });
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  downloadBlob(csvContent, `StockVentura_매매일지_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
}

function exportToJson() {
  const backupData = {
    version: '3.0',
    exportDate: new Date().toISOString(),
    trades: getTrades()
  };
  const jsonString = JSON.stringify(backupData, null, 2);
  downloadBlob(jsonString, `StockVentura_백업_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
}

function downloadBlob(content, filename, contentType) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatCurrency(val) {
  if (isNaN(val)) return '0원';
  return Math.round(val).toLocaleString('ko-KR') + '원';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
