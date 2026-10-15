// === StockVentura High-Precision Trading Engine (app.js) ===

const STORAGE_KEYS = {
  TRADES: 'stockventura_trades_v4'
};

const DEFAULT_TRADES = [
  {
    id: 'trade_sample_1',
    date: '2026-10-12',
    exitDate: '2026-10-15',
    stock: '대한전선 (001440)',
    type: '스윙',
    strategy: '20일선 눌림목 반등',
    buyPrice: 22800,
    qty: 100,
    targetPrice: 28000,
    stopPrice: 21450,
    sellPrice: 26500,
    discipline: '원칙준수',
    notes: '영국 런던 400kV 프로젝트 수주 및 20일선 지지 확인 후 진입. 단기 저항대 도달 시 분할 익절 완료 (+16.23%).'
  },
  {
    id: 'trade_sample_2',
    date: '2026-10-06',
    exitDate: '2026-10-07',
    stock: '삼천당제약 (000250)',
    type: '단타',
    strategy: '신고가 돌파',
    buyPrice: 142000,
    qty: 25,
    targetPrice: 155000,
    stopPrice: 138000,
    sellPrice: 137800,
    discipline: '원칙준수',
    notes: '돌파 실패 후 직전 지지선(138,000원) 이탈 즉시 칼손절 처리. 손실을 10만원대로 통제하여 계좌 보호 성공.'
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
    notes: '뉴스 보고 장중 +18% 급등 시 추격매수 후 물타기하다가 -10.0% 손실에 투매함. 교훈: 장중 급등주 추격매수는 절대 금지.'
  }
];

document.addEventListener('DOMContentLoaded', () => {
  initStorage();
  initNavigation();
  initTradeJournal();
  runFastCalc();
});

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
  renderTradeList();
}

// Global Tab Switcher
window.switchTab = function(tabId) {
  const navBtns = document.querySelectorAll('.nav-btn');
  const mobBtns = document.querySelectorAll('.m-btn');
  const panels = document.querySelectorAll('.view-panel');

  navBtns.forEach(btn => btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId));
  mobBtns.forEach(btn => btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId));
  panels.forEach(panel => panel.classList.toggle('active', panel.id === tabId));

  window.scrollTo({ top: 0, behavior: 'smooth' });
};

function initNavigation() {
  document.querySelectorAll('.nav-btn, .m-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-tab');
      if (target) window.switchTab(target);
    });
  });
}

// 2% Risk Fast Calculator
window.runFastCalc = function() {
  const seedEl = document.getElementById('calcSeed');
  const entryEl = document.getElementById('calcEntry');
  const stopEl = document.getElementById('calcStop');

  if (!seedEl || !entryEl || !stopEl) return;

  const seed = parseFloat(seedEl.value) || 0;
  const entryPrice = parseFloat(entryEl.value) || 0;
  const stopPrice = parseFloat(stopEl.value) || 0;

  if (seed <= 0 || entryPrice <= 0 || stopPrice <= 0) return;

  const maxLoss = seed * 0.02; // 2% 룰 고정
  const riskPerShare = Math.abs(entryPrice - stopPrice);
  const lossRate = ((riskPerShare / entryPrice) * 100).toFixed(2);

  let shares = 0;
  if (riskPerShare > 0) {
    shares = Math.floor(maxLoss / riskPerShare);
  }

  const totalPos = shares * entryPrice;
  const posPct = ((totalPos / seed) * 100).toFixed(1);

  document.getElementById('fastMaxLoss').textContent = formatCurrency(maxLoss);
  document.getElementById('fastShares').textContent = `${shares.toLocaleString()}주 (-${lossRate}%)`;
  document.getElementById('fastPosition').textContent = `${formatCurrency(totalPos)} (${posPct}%)`;
};

// Trade Journal Functionality
let currentFilter = 'all';

function initTradeJournal() {
  const modal = document.getElementById('tradeModal');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const btnCancelModal = document.getElementById('btnCancelModal');
  const form = document.getElementById('tradeForm');
  const btnDeleteTrade = document.getElementById('btnDeleteTrade');

  window.openNewTradeModal = function() {
    if (form) form.reset();
    document.getElementById('tradeId').value = '';
    document.getElementById('modalTitle').innerHTML = '<i class="fa-solid fa-pen-nib text-primary"></i> 새로운 매매 기록 작성';
    if (btnDeleteTrade) btnDeleteTrade.style.display = 'none';

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('tradeDate').value = today;
    document.getElementById('tradeExitDate').value = today;

    updateFormPreview();
    if (modal) modal.classList.add('open');
  };

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
      const disc = document.getElementById('tradeDiscipline').value;

      const tradeData = {
        id: tradeId,
        date: document.getElementById('tradeDate').value,
        exitDate: document.getElementById('tradeExitDate').value || document.getElementById('tradeDate').value,
        stock: document.getElementById('tradeStock').value.trim(),
        type: '스윙',
        strategy: '원칙 진입',
        buyPrice,
        qty,
        targetPrice,
        stopPrice,
        sellPrice,
        discipline: disc,
        notes: document.getElementById('tradeNotes').value.trim()
      };

      let trades = getTrades();
      const existingIdx = trades.findIndex(t => t.id === tradeId);
      if (existingIdx >= 0) {
        trades[existingIdx] = tradeData;
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
      if (confirm('이 매매 기록을 삭제하시겠습니까?')) {
        let trades = getTrades().filter(t => t.id !== tradeId);
        saveTrades(trades);
        closeModal();
      }
    });
  }

  // Filter Pills (Clean format fix)
  document.querySelectorAll('.filter-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.getAttribute('data-filter');
      renderTradeList();
    });
  });

  renderTradeList();
}

function updateFormPreview() {
  const buyEl = document.getElementById('tradeBuyPrice');
  const qtyEl = document.getElementById('tradeQty');
  const sellEl = document.getElementById('tradeSellPrice');
  const targetEl = document.getElementById('tradeTargetPrice');
  const stopEl = document.getElementById('tradeStopPrice');

  if (!buyEl || !qtyEl || !sellEl) return;

  const buy = parseFloat(buyEl.value) || 0;
  const qty = parseFloat(qtyEl.value) || 0;
  const sell = parseFloat(sellEl.value) || 0;
  const target = parseFloat(targetEl?.value) || 0;
  const stop = parseFloat(stopEl?.value) || 0;

  const totalBuy = buy * qty;
  const pnl = (sell - buy) * qty;
  const rate = buy > 0 ? ((sell - buy) / buy) * 100 : 0;

  let rrRatio = '0.0 : 1';
  if (buy > 0 && stop > 0 && buy > stop && target > buy) {
    const risk = buy - stop;
    const reward = target - buy;
    rrRatio = `${(reward / risk).toFixed(1)} : 1`;
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
      <div style="padding:40px; text-align:center; color:#64748b; background:var(--bg-card); border-radius:16px; border:1px dashed var(--border-subtle);">
        <i class="fa-solid fa-folder-open" style="font-size:2rem; margin-bottom:10px; display:block;"></i>
        <p>해당하는 매매 기록이 없습니다.</p>
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
      <div class="stock-item-row" style="border-left: 4px solid ${isWin ? 'var(--profit)' : 'var(--loss)'}; padding: 14px 18px;">
        <div class="sir-logo" style="background:${isWin ? 'var(--profit-light)' : 'var(--loss-light)'}; color:${isWin ? 'var(--profit)' : 'var(--loss)'};">
          <i class="fa-solid ${isWin ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}"></i>
        </div>
        <div class="sir-info">
          <div class="sir-name">${escapeHtml(t.stock)} <span style="font-size:0.75rem; color:${t.discipline === '원칙준수' ? 'var(--profit)' : 'var(--loss)'};">[${escapeHtml(t.discipline)}]</span></div>
          <div class="sir-desc">${escapeHtml(t.notes || '메모 없음')}</div>
          <span style="font-size:0.72rem; color:var(--text-sub);">${t.date} · 매수가 ${formatCurrency(t.buyPrice)} (${t.qty}주)</span>
        </div>
        <div class="sir-prices">
          <span class="sir-curr ${isWin ? 'text-profit' : 'text-loss'}">
            ${isWin ? '+' : ''}${formatCurrency(pnl)}
          </span>
          <span class="sir-target ${isWin ? 'text-profit' : 'text-loss'}">
            ${isWin ? '+' : ''}${rate.toFixed(2)}%
          </span>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="editTrade('${t.id}')">수정</button>
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
  document.getElementById('tradeBuyPrice').value = t.buyPrice;
  document.getElementById('tradeQty').value = t.qty;
  document.getElementById('tradeTargetPrice').value = t.targetPrice || '';
  document.getElementById('tradeStopPrice').value = t.stopPrice || '';
  document.getElementById('tradeSellPrice').value = t.sellPrice;
  document.getElementById('tradeDiscipline').value = t.discipline || '원칙준수';
  document.getElementById('tradeNotes').value = t.notes || '';

  const titleEl = document.getElementById('modalTitle');
  if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-pen-to-square text-primary"></i> 매매 기록 수정';
  const delBtn = document.getElementById('btnDeleteTrade');
  if (delBtn) delBtn.style.display = 'inline-flex';

  updateFormPreview();
  const modal = document.getElementById('tradeModal');
  if (modal) modal.classList.add('open');
};

window.exportToCsv = function() {
  const trades = getTrades();
  if (trades.length === 0) {
    alert('내보낼 매매 데이터가 없습니다.');
    return;
  }
  const headers = ['매매일자', '종목명', '매수가', '수량', '목표가', '손절가', '매도가', '실현손익', '수익률(%)', '원칙준수여부', '복기메모'];
  const rows = trades.map(t => {
    const pnl = (t.sellPrice - t.buyPrice) * t.qty;
    const rate = t.buyPrice > 0 ? (((t.sellPrice - t.buyPrice) / t.buyPrice) * 100).toFixed(2) : '0';
    return [
      t.date, `"${(t.stock || '').replace(/"/g, '""')}"`,
      t.buyPrice, t.qty, t.targetPrice || '', t.stopPrice || '',
      t.sellPrice, pnl, rate, t.discipline, `"${(t.notes || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
    ].join(',');
  });
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `StockVentura_매매일지_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

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
