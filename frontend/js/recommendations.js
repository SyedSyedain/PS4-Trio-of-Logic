const PAGE_SIZE = 15;
let allRecs = [];
let filtered = [];
let currentPage = 1;
let sortCol = 'content_id';
let sortDir = 'asc';

document.addEventListener('DOMContentLoaded', () => {
  loadRecommendations();
  bindFilters();
  bindExport();
});

async function loadRecommendations() {
  setTableLoading(true);
  try {
    allRecs = await getAllRecommendations();
  } catch {
    allRecs = mockRecommendations(120);
  }

  filtered = [...allRecs];
  sortData();
  updateSummaryCards();
  renderTable();
}

function updateSummaryCards() {
  setText('sum-total', allRecs.length.toLocaleString());
  setText('sum-ig', allRecs.filter(rec => rec.platform === 'Instagram').length.toLocaleString());
  setText('sum-yt', allRecs.filter(rec => rec.platform === 'YouTube').length.toLocaleString());
}

function bindFilters() {
  ['filter-platform', 'filter-type', 'filter-decision'].forEach((id) => {
    document.getElementById(id)?.addEventListener('change', applyFilters);
  });

  const search = document.getElementById('search-input');
  if (!search) return;

  let debounceTimer;
  search.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(applyFilters, 180);
  });
}

function applyFilters() {
  const platform = document.getElementById('filter-platform')?.value || '';
  const type = document.getElementById('filter-type')?.value || '';
  const decision = document.getElementById('filter-decision')?.value || '';
  const query = (document.getElementById('search-input')?.value || '').trim().toLowerCase();

  filtered = allRecs.filter((rec) => {
    if (platform && rec.platform !== platform) return false;
    if (type && rec.content_type !== type) return false;
    if (decision && rec.decision !== decision) return false;
    if (!query) return true;

    const searchable = `${rec.content_id} ${rec.creator_id} ${rec.platform} ${rec.content_type} ${rec.decision}`.toLowerCase();
    return searchable.includes(query);
  });

  currentPage = 1;
  sortData();
  renderTable();
}

function bindSortHeaders() {
  document.querySelectorAll('.rec-table th[data-sort]').forEach((th) => {
    th.onclick = () => {
      const col = th.dataset.sort;
      if (sortCol === col) {
        sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        sortCol = col;
        sortDir = 'asc';
      }

      document.querySelectorAll('.rec-table th[data-sort]').forEach(header => header.classList.remove('sorted-asc', 'sorted-desc'));
      th.classList.add(`sorted-${sortDir}`);
      sortData();
      renderTable();
    };
  });
}

function sortData() {
  filtered.sort((a, b) => {
    let first = a[sortCol];
    let second = b[sortCol];

    if (typeof first === 'string') first = first.toLowerCase();
    if (typeof second === 'string') second = second.toLowerCase();

    if (first < second) return sortDir === 'asc' ? -1 : 1;
    if (first > second) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });
}

function renderTable() {
  const tbody = document.getElementById('rec-table-body');
  if (!tbody) return;

  const start = (currentPage - 1) * PAGE_SIZE;
  const page = filtered.slice(start, start + PAGE_SIZE);

  if (page.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">No matches</div><p>No recommendations match your filters.</p></div></td></tr>';
    renderPagination();
    updateResultCount();
    bindSortHeaders();
    return;
  }

  tbody.innerHTML = page.map((rec) => {
    const scoreValue = Number(rec.score ?? 0);
    return `
      <tr>
        <td class="cell-id">#${rec.content_id}</td>
        <td class="cell-creator"><span class="creator-avatar" style="background:${creatorColor(rec.creator_id)}">${rec.creator_id}</span><span>Creator ${rec.creator_id}</span></td>
        <td><span class="badge ${rec.content_type === 'SHORT' ? 'badge-short' : 'badge-long'}">${rec.content_type}</span></td>
        <td><span class="badge ${platformBadgeClass(rec.platform)}">${platformLabel(rec.platform)}</span></td>
        <td class="cell-timeslot"><span class="time-badge">${String(rec.time_slot).padStart(2, '0')}:00</span><span class="time-label">${formatHour(rec.time_slot)}</span></td>
        <td>${decisionBadge(rec.decision)}</td>
        <td class="cell-score"><span class="score-bar-wrap"><span class="score-bar-fill" style="width:${Math.max(0, Math.min(100, scoreValue * 100))}%"></span></span><span class="score-value">${scoreValue.toFixed(2)}</span></td>
      </tr>
    `;
  }).join('');

  renderPagination();
  updateResultCount();
  bindSortHeaders();
}

function renderPagination() {
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const info = document.getElementById('pagination-info');
  const controls = document.getElementById('pagination-controls');
  if (!info || !controls) return;

  currentPage = Math.min(currentPage, totalPages);
  const start = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const end = Math.min(currentPage * PAGE_SIZE, filtered.length);
  info.textContent = `Showing ${start}-${end} of ${filtered.length}`;
  controls.innerHTML = '';

  controls.appendChild(makePageBtn('Prev', currentPage === 1, () => {
    currentPage -= 1;
    renderTable();
  }));

  visiblePages(currentPage, totalPages).forEach((page) => {
    if (page === '...') {
      const spacer = document.createElement('span');
      spacer.textContent = '...';
      spacer.className = 'text-muted';
      controls.appendChild(spacer);
      return;
    }

    const btn = makePageBtn(page, false, () => {
      currentPage = page;
      renderTable();
    });
    if (page === currentPage) btn.classList.add('active');
    controls.appendChild(btn);
  });

  controls.appendChild(makePageBtn('Next', currentPage === totalPages, () => {
    currentPage += 1;
    renderTable();
  }));
}

function makePageBtn(label, disabled, onClick) {
  const btn = document.createElement('button');
  btn.className = 'page-btn';
  btn.textContent = label;
  btn.disabled = disabled;
  if (!disabled) btn.addEventListener('click', onClick);
  return btn;
}

function visiblePages(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
}

function updateResultCount() {
  const count = filtered.length;
  setText('result-count', `${count} result${count === 1 ? '' : 's'}`);
}

function setTableLoading(loading) {
  const tbody = document.getElementById('rec-table-body');
  if (loading && tbody) {
    tbody.innerHTML = '<tr><td colspan="7"><div class="loading-overlay"><div class="spinner"></div> Fetching recommendations...</div></td></tr>';
  }
}

function bindExport() {
  document.getElementById('export-btn')?.addEventListener('click', () => exportCSV(filtered));
}

function exportCSV(data) {
  const headers = ['content_id', 'creator_id', 'content_type', 'platform', 'time_slot', 'decision', 'score'];
  const rows = data.map(rec => headers.map(header => JSON.stringify(rec[header] ?? '')).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `recommendations_${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}
