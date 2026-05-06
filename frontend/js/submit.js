document.addEventListener('DOMContentLoaded', () => {
  initForm();
  initCreatorSlider();
  initTimestampNow();
  initSubmitAnother();
  renderPeakBars();
  autoContentId();
});

function initForm() {
  const form = document.getElementById('submit-form');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!validateForm()) return;
    await sendSubmission(buildPayload());
  });
}

function buildPayload() {
  return {
    content_id: Number.parseInt(document.getElementById('content-id').value, 10),
    creator_id: Number.parseInt(document.getElementById('creator-id').value, 10),
    content_type: document.querySelector('input[name="content_type"]:checked')?.value,
    content_category: document.getElementById('content-category')?.value,
    created_timestamp: Number.parseInt(document.getElementById('created-timestamp').value, 10),
  };
}

async function sendSubmission(payload) {
  const btn = document.getElementById('submit-btn');
  const panel = document.getElementById('result-panel');
  const errBox = document.getElementById('submit-error');

  setButtonLoading(btn, true);
  clearError(errBox);

  try {
    let result;
    try {
      result = await submitContent(payload);
    } catch {
      result = generateRecommendation(payload);
    }

    showResult(result, payload);
    panel?.classList.add('visible');
    panel?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (error) {
    showError(errBox, `Submission failed: ${error.message}`);
  } finally {
    setButtonLoading(btn, false);
  }
}

function showResult(result, payload) {
  const panel = document.getElementById('result-panel');
  if (panel) panel.dataset.platform = result.platform.toLowerCase();

  setText('res-content-id', `#${result.content_id}`);
  setText('res-content-type', payload.content_type);
  setText('res-category', result.content_category || payload.content_category);
  setText('res-time-slot', formatHour(result.time_slot));
  setText('res-confidence', `${Math.round((result.confidence || result.score || 0.7) * 100)}%`);
  setText('res-engagement', engagementLabel(result));

  const platformEl = document.getElementById('res-platform');
  if (platformEl) platformEl.textContent = platformLabel(result.platform);

  const decisionEl = document.getElementById('res-decision');
  if (decisionEl) decisionEl.innerHTML = decisionBadge(result.decision);

  renderReason(result);
}

function engagementLabel(result) {
  const score = result.score || 0;
  if (score >= 0.82) return 'Very strong';
  if (score >= 0.72) return 'Strong';
  if (score >= 0.62) return 'Promising';
  return 'Moderate';
}

function renderReason(result) {
  const reason = result.explanation || {};
  setText('res-reason', reason.summary || 'Recommendation generated from creator, category, platform, and time-window signals.');
  setText('why-timing', reason.timing || 'The selected hour has a strong nearby activity window and balanced competition.');
  setText('why-platform', reason.platform || 'The platform was selected from weighted creator and content-fit signals.');
  setText('why-decision', reason.decision || 'The publish status compares the current hour with the best available slot.');
  setText('why-score', reason.weights || 'Score = engagement, activity, creator affinity, category fit, and timing quality.');

  const components = result.components || {};
  [
    { id: 'component-engagement', value: components.engagement },
    { id: 'component-activity', value: components.activity },
    { id: 'component-creator', value: components.creatorAffinity },
    { id: 'component-category', value: components.category },
    { id: 'component-timing', value: components.timingQuality },
  ].forEach(({ id, value }) => {
    const el = document.getElementById(id);
    if (el) el.style.width = `${Math.round((value || 0) * 100)}%`;
  });
}

function validateForm() {
  let valid = true;
  const contentId = document.getElementById('content-id');
  const creatorId = document.getElementById('creator-id');
  const category = document.getElementById('content-category');
  const timestamp = document.getElementById('created-timestamp');
  const typeChecked = document.querySelector('input[name="content_type"]:checked');

  ['content-id', 'creator-id', 'content-category', 'created-timestamp'].forEach(clearValidation);

  const cid = Number.parseInt(contentId.value, 10);
  if (!contentId.value || Number.isNaN(cid) || cid < 1) {
    setFieldError('content-id', 'Enter a valid Content ID greater than or equal to 1.');
    valid = false;
  }

  const crid = Number.parseInt(creatorId.value, 10);
  if (!creatorId.value || Number.isNaN(crid) || crid < 1 || crid > 50) {
    setFieldError('creator-id', 'Creator ID must be between 1 and 50.');
    valid = false;
  }

  const typeError = document.getElementById('type-error');
  if (!typeChecked) {
    if (typeError) typeError.style.display = 'block';
    valid = false;
  } else if (typeError) {
    typeError.style.display = 'none';
  }

  if (!category.value || !CONTENT_CATEGORIES.includes(category.value)) {
    setFieldError('content-category', 'Choose a valid content category.');
    valid = false;
  }

  const ts = Number.parseInt(timestamp.value, 10);
  if (!timestamp.value || Number.isNaN(ts) || ts < 0 || ts > 23) {
    setFieldError('created-timestamp', 'Time slot must be between 0 and 23.');
    valid = false;
  }

  return valid;
}

function setFieldError(id, message) {
  const input = document.getElementById(id);
  const group = input?.closest('.form-group');
  if (!group || !input) return;

  group.classList.add('has-error');
  input.classList.add('error');
  const errEl = group.querySelector('.form-error-msg');
  if (errEl) errEl.textContent = message;
}

function clearValidation(id) {
  const input = document.getElementById(id);
  const group = input?.closest('.form-group');
  if (!group || !input) return;
  group.classList.remove('has-error');
  input.classList.remove('error');
}

function initCreatorSlider() {
  const slider = document.getElementById('creator-slider');
  const input = document.getElementById('creator-id');
  if (!slider || !input) return;

  slider.addEventListener('input', () => {
    input.value = slider.value;
  });

  input.addEventListener('input', () => {
    const value = Number.parseInt(input.value, 10);
    if (value >= 1 && value <= 50) slider.value = value;
  });
}

function initTimestampNow() {
  const btn = document.getElementById('now-btn');
  const input = document.getElementById('created-timestamp');
  if (!btn || !input) return;

  btn.addEventListener('click', () => {
    input.value = new Date().getHours();
    input.classList.add('success');
    clearValidation('created-timestamp');
    setTimeout(() => input.classList.remove('success'), 1000);
  });
}

function initSubmitAnother() {
  const btn = document.getElementById('submit-another-btn');
  const form = document.getElementById('submit-form');
  const panel = document.getElementById('result-panel');
  if (!btn || !form || !panel) return;

  btn.addEventListener('click', () => {
    panel.classList.remove('visible');
    form.reset();
    document.getElementById('creator-slider').value = 1;
    autoContentId();
  });
}

function renderPeakBars() {
  renderPlatformPeakBar('ig-bar', 'Instagram');
  renderPlatformPeakBar('yt-bar', 'YouTube');
}

function renderPlatformPeakBar(containerId, platform) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const activity = getPlatformActivity()[platform];
  const max = Math.max(...activity.map(item => item.score));

  container.innerHTML = activity.map(({ slot, score }) => {
    const isPeak = score >= 0.88;
    const isActive = score >= 0.72;
    const suffix = platform === 'Instagram' ? 'ig' : 'yt';
    const cls = isPeak ? `peak-bar-hour peak-${suffix}` : isActive ? `peak-bar-hour active-${suffix}` : 'peak-bar-hour';
    const height = Math.round((score / max) * 26);
    return `<span class="${cls}" style="height:${height}px" title="${formatHour(slot)}: ${score.toFixed(2)}"></span>`;
  }).join('');
}

function setButtonLoading(btn, loading) {
  if (!btn) return;
  btn.disabled = loading;
  btn.innerHTML = loading ? '<div class="spinner"></div> Generating...' : 'Get Recommendation';
}

function showError(el, message) {
  if (!el) return;
  el.textContent = message;
  el.className = 'alert alert-error';
  el.style.display = 'flex';
}

function clearError(el) {
  if (!el) return;
  el.textContent = '';
  el.style.display = 'none';
}

function autoContentId() {
  const el = document.getElementById('content-id');
  if (el && !el.value) el.value = Math.floor(Math.random() * 9000) + 1000;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}
