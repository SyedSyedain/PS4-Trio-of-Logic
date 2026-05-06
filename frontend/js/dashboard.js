document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  renderActivityHeatmap();
  loadRecentRecommendations();
  renderScoreSummary();
  startLiveClock();
});

async function loadStats() {
  let stats;
  try {
    stats = await getStats();
  } catch {
    stats = mockStats();
  }

  animateCounter('stat-total-content', stats.total_content);
  animateCounter('stat-total-recs', stats.total_recs);
  animateCounter('stat-creators', stats.active_creators);
  animateCounter('stat-avg-score', stats.avg_score, 2);
}

function animateCounter(id, target, decimals = 0) {
  const el = document.getElementById(id);
  if (!el) return;

  const duration = 800;
  const startTime = performance.now();

  const update = (now) => {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
    const value = target * eased;
    el.textContent = decimals ? value.toFixed(decimals) : Math.round(value).toLocaleString();
    if (progress < 1) requestAnimationFrame(update);
  };

  requestAnimationFrame(update);
}

function renderActivityHeatmap() {
  const activity = getPlatformActivity();
  const container = document.getElementById('heatmap-container');
  if (!container) return;

  container.innerHTML = '';

  const headerRow = document.createElement('div');
  headerRow.className = 'activity-header-row';
  headerRow.appendChild(Object.assign(document.createElement('div'), { className: 'activity-label' }));

  for (let hour = 0; hour < 24; hour += 1) {
    const label = document.createElement('div');
    label.className = 'activity-hour-label';
    label.textContent = hour % 6 === 0 ? `${hour}h` : '';
    headerRow.appendChild(label);
  }
  container.appendChild(headerRow);

  ['Instagram', 'YouTube'].forEach((platform) => {
    const row = document.createElement('div');
    row.className = 'activity-grid';

    const platformLabelEl = document.createElement('div');
    platformLabelEl.className = 'activity-label';
    platformLabelEl.textContent = platform === 'Instagram' ? 'Instagram' : 'YouTube';
    row.appendChild(platformLabelEl);

    activity[platform].forEach(({ slot, score }) => {
      const cell = document.createElement('div');
      cell.className = `heat-cell ${platform.toLowerCase()}`;
      cell.dataset.level = score >= 0.9 ? 'high' : score >= 0.6 ? 'medium' : 'low';
      cell.title = `${platform} at ${formatHour(slot)}: activity ${score.toFixed(2)}`;
      row.appendChild(cell);
    });

    container.appendChild(row);
  });

  renderHeatmapLegend();
}

function renderHeatmapLegend() {
  const legend = document.getElementById('heatmap-legend');
  if (!legend) return;
  legend.innerHTML = `
    <div class="heatmap-legend">
      <span class="legend-dot" style="background:#8c69d9"></span><span>Instagram peak</span>
      <span class="legend-dot" style="background:#ea8a76"></span><span>YouTube peak</span>
      <span class="legend-dot" style="background:#eee9ff"></span><span>Low activity</span>
      <span>Activity is smoothed across nearby hours</span>
    </div>
  `;
}

async function loadRecentRecommendations() {
  const tbody = document.getElementById('recent-recs-body');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6"><div class="loading-overlay"><div class="spinner"></div> Loading recommendations...</div></td></tr>';

  let recs;
  try {
    recs = await getAllRecommendations();
  } catch {
    recs = mockRecommendations(10);
  }

  if (!recs || recs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">No data</div><p>No recommendations yet. Submit content to get started.</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = recs.slice(0, 10).map(rec => `
    <tr>
      <td class="content-id-cell">#${rec.content_id}</td>
      <td><span class="badge ${rec.content_type === 'SHORT' ? 'badge-short' : 'badge-long'}">${rec.content_type}</span></td>
      <td><span class="badge ${platformBadgeClass(rec.platform)}">${platformLabel(rec.platform)}</span></td>
      <td><span class="time-slot-badge">${formatHour(rec.time_slot)}</span></td>
      <td>${decisionBadge(rec.decision)}</td>
      <td><span class="text-muted">Creator ${rec.creator_id}</span></td>
    </tr>
  `).join('');
}

function renderScoreSummary() {
  const wrap = document.getElementById('score-summary-wrap');
  if (!wrap) return;

  const metrics = [
    { label: 'Engagement', value: 0.81, color: '#2563eb' },
    { label: 'Activity', value: 0.78, color: '#0891b2' },
    { label: 'Creator', value: 0.74, color: '#059669' },
    { label: 'Category', value: 0.76, color: '#d97706' },
  ];

  wrap.innerHTML = metrics.map(metric => `
    <div class="score-mini-row">
      <div class="score-mini-label">${metric.label}</div>
      <div class="score-mini-bar-wrap">
        <div class="score-mini-bar" style="width:0;background:${metric.color}" data-target="${metric.value * 100}"></div>
      </div>
      <div class="score-mini-value">${Math.round(metric.value * 100)}%</div>
    </div>
  `).join('');

  setTimeout(() => {
    wrap.querySelectorAll('.score-mini-bar').forEach((bar) => {
      bar.style.transition = 'width 0.9s ease';
      bar.style.width = `${bar.dataset.target}%`;
    });
  }, 120);
}

function startLiveClock() {
  const el = document.getElementById('live-clock');
  if (!el) return;

  const update = () => {
    el.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  update();
  setInterval(update, 1000);
}
