document.addEventListener('DOMContentLoaded', () => {
  loadScores();
  renderActivityBars();
  renderPlatformDistribution();
  renderFormulaBreakdown();
  renderInterpretation();
  bindRunScoring();
});

async function loadScores() {
  let scores;
  try {
    scores = await getScores();
  } catch {
    scores = mockScores();
  }

  updateHeroScore(scores);
  updateMetricCards(scores);
}

function updateHeroScore(scores) {
  const finalEl = document.getElementById('hero-final-score');
  if (finalEl) animateScoreValue(finalEl, scores.final);

  [
    { id: 'hero-bar-engagement', value: scores.engagement, color: '#93c5fd' },
    { id: 'hero-bar-timing', value: scores.timing, color: '#67e8f9' },
    { id: 'hero-bar-platform', value: scores.platform_quality, color: '#86efac' },
    { id: 'hero-bar-efficiency', value: scores.efficiency, color: '#fcd34d' },
  ].forEach((metric) => {
    const bar = document.getElementById(metric.id);
    const value = document.getElementById(metric.id.replace('bar', 'val'));
    if (bar) {
      bar.style.background = metric.color;
      bar.style.transition = 'width 1s ease';
      requestAnimationFrame(() => { bar.style.width = `${metric.value * 100}%`; });
    }
    if (value) value.textContent = `${Math.round(metric.value * 100)}%`;
  });
}

function updateMetricCards(scores) {
  [
    { scoreId: 'card-engagement', barId: 'bar-engagement', value: scores.engagement },
    { scoreId: 'card-timing', barId: 'bar-timing', value: scores.timing },
    { scoreId: 'card-platform', barId: 'bar-platform', value: scores.platform_quality },
    { scoreId: 'card-efficiency', barId: 'bar-efficiency', value: scores.efficiency },
  ].forEach((metric) => {
    const scoreEl = document.getElementById(metric.scoreId);
    const barEl = document.getElementById(metric.barId);
    if (scoreEl) animateScoreValue(scoreEl, metric.value);
    if (barEl) {
      barEl.style.transition = 'width 1s ease';
      setTimeout(() => { barEl.style.width = `${metric.value * 100}%`; }, 140);
    }
  });
}

function animateScoreValue(el, target) {
  const duration = 900;
  const start = performance.now();

  const update = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
    el.textContent = (target * eased).toFixed(2);
    if (progress < 1) requestAnimationFrame(update);
  };

  requestAnimationFrame(update);
}

function renderActivityBars() {
  const activity = getPlatformActivity();
  renderActivityChart('ig-activity-bars', activity.Instagram, 'ig');
  renderActivityChart('yt-activity-bars', activity.YouTube, 'yt');
}

function renderActivityChart(containerId, data, cls) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const peakWindow = cls === 'ig' ? '18-22h peak' : '20-23h peak';
  const chart = document.createElement('div');
  chart.className = 'bar-chart-custom';

  data.forEach(({ slot, score }) => {
    const col = document.createElement('div');
    col.className = 'bar-col';

    const bar = document.createElement('div');
    bar.className = `bar-fill ${cls}`;
    bar.style.height = '0px';
    bar.title = `${formatHour(slot)}: ${score.toFixed(2)}`;

    const label = document.createElement('div');
    label.className = 'bar-hour-label';
    label.textContent = slot % 6 === 0 ? `${slot}h` : '';

    col.appendChild(bar);
    col.appendChild(label);
    chart.appendChild(col);

    setTimeout(() => {
      bar.style.transition = `height ${0.35 + slot * 0.02}s ease`;
      bar.style.height = `${Math.round(score * 124)}px`;
    }, 80);
  });

  container.innerHTML = '';
  container.appendChild(chart);
  container.insertAdjacentHTML('beforeend', `
    <div class="chart-legend">
      <span><i class="legend-swatch ${cls}"></i> Activity score</span>
      <span>${peakWindow}</span>
    </div>
  `);
}

function renderPlatformDistribution() {
  const recs = mockRecommendations(120);
  const total = recs.length || 1;
  const instagram = recs.filter(rec => rec.platform === 'Instagram').length;
  const youtube = recs.filter(rec => rec.platform === 'YouTube').length;
  const short = recs.filter(rec => rec.content_type === 'SHORT').length;
  const long = recs.filter(rec => rec.content_type === 'LONG').length;
  const now = recs.filter(rec => rec.decision === 'POST_NOW').length;
  const schedule = recs.filter(rec => rec.decision === 'SCHEDULE').length;

  setText('dist-ig', percent(instagram, total));
  setText('dist-yt', percent(youtube, total));
  setText('dist-short', percent(short, total));
  setText('dist-long', percent(long, total));
  setText('dist-now', percent(now, total));
  setText('dist-sched', percent(schedule, total));

  const donut = document.getElementById('donut-chart');
  if (donut) {
    const instagramDegrees = (instagram / total) * 360;
    donut.style.background = `conic-gradient(#8c69d9 0deg ${instagramDegrees}deg, #ea8a76 ${instagramDegrees}deg 360deg)`;
  }
}

function renderFormulaBreakdown() {
  const el = document.getElementById('formula-display');
  if (!el) return;

  el.innerHTML = `
    <div class="formula-display">
      <div class="formula-equation">
        <div class="formula-title">Weighted recommendation score</div>
        <div class="formula-main">
          <span>Final Score</span>
          <span class="formula-equals">=</span>
          <span class="formula-term"><span class="formula-weight">50%</span><span class="formula-variable">Engagement</span></span>
          <span class="formula-plus">+</span>
          <span class="formula-term"><span class="formula-weight">20%</span><span class="formula-variable">Timing</span></span>
          <span class="formula-plus">+</span>
          <span class="formula-term"><span class="formula-weight">15%</span><span class="formula-variable">Platform</span></span>
          <span class="formula-plus">+</span>
          <span class="formula-term"><span class="formula-weight">15%</span><span class="formula-variable">Efficiency</span></span>
        </div>
      </div>
      <div class="formula-breakdown">
        <div class="formula-chip"><strong>Engagement</strong><span>Creator history + activity</span></div>
        <div class="formula-chip"><strong>Timing</strong><span>Peak-window fit</span></div>
        <div class="formula-chip"><strong>Platform</strong><span>Format alignment</span></div>
        <div class="formula-chip"><strong>Efficiency</strong><span>Generation speed</span></div>
      </div>
    </div>
  `;
}

function bindRunScoring() {
  const btn = document.getElementById('run-scoring-btn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> Computing...';
    await new Promise(resolve => setTimeout(resolve, 900));
    const scores = mockScores();
    updateHeroScore(scores);
    updateMetricCards(scores);
    btn.disabled = false;
    btn.textContent = 'Refresh Scores';
  });
}

function renderInterpretation() {
  const container = document.getElementById('interpretation-grid');
  if (!container) return;

  const items = [
    { range: '0.85-1.00', label: 'Excellent', color: '#059669', note: 'Peak timing and strong platform fit' },
    { range: '0.70-0.84', label: 'Good', color: '#2563eb', note: 'Near optimal recommendations' },
    { range: '0.55-0.69', label: 'Average', color: '#d97706', note: 'Some timing or fit tradeoffs' },
    { range: '0.00-0.54', label: 'Needs Work', color: '#dc2626', note: 'Weak platform or timing match' },
  ];

  container.innerHTML = items.map(item => `
    <div class="interp-item">
      <span class="interp-dot" style="background:${item.color}"></span>
      <div>
        <div class="interp-range">${item.range}</div>
        <div class="interp-text">${item.label}: ${item.note}</div>
      </div>
    </div>
  `).join('');
}

function percent(value, total) {
  return `${((value / total) * 100).toFixed(1)}%`;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}
