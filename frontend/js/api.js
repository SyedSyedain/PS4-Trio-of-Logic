const API_BASE = 'http://localhost:8000';

async function fetchAPI(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };

  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`${API_BASE}${endpoint}`, options);
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

function submitContent(payload) {
  return fetchAPI('/submit_content', 'POST', payload);
}

function getRecommendation(contentId) {
  return fetchAPI(`/get_recommendation?content_id=${encodeURIComponent(contentId)}`);
}

function getAllRecommendations() {
  return fetchAPI('/recommendations');
}

function getStats() {
  return fetchAPI('/stats');
}

function getScores() {
  return fetchAPI('/scores');
}

function mockStats() {
  return {
    total_content: 1200,
    total_recs: 986,
    active_creators: 50,
    avg_score: 0.82,
  };
}

function mockRecommendations(count = 50) {
  const recs = [];
  for (let i = 1; i <= count; i += 1) {
    const contentType = i % 3 === 0 ? 'LONG' : 'SHORT';
    const preferredPlatform = contentType === 'SHORT' ? 'Instagram' : 'YouTube';
    const platform = i % 7 === 0 ? (preferredPlatform === 'Instagram' ? 'YouTube' : 'Instagram') : preferredPlatform;
    const peaks = platform === 'Instagram' ? [18, 19, 20, 21, 22] : [20, 21, 22, 23];
    const timeSlot = i % 5 === 0 ? (12 + i) % 24 : peaks[i % peaks.length];
    const isPeak = platform === 'Instagram'
      ? timeSlot >= 18 && timeSlot <= 22
      : timeSlot >= 20 && timeSlot <= 23;

    recs.push({
      content_id: 1000 + i,
      creator_id: (i % 50) + 1,
      content_type: contentType,
      platform,
      time_slot: timeSlot,
      decision: isPeak ? 'POST_NOW' : 'SCHEDULE',
      score: Number((0.58 + ((i * 37) % 38) / 100).toFixed(2)),
    });
  }
  return recs;
}

function mockScores() {
  return {
    engagement: 0.78,
    timing: 0.85,
    platform_quality: 0.91,
    efficiency: 0.96,
    final: 0.84,
  };
}

function getPlatformActivity() {
  const slots = Array.from({ length: 24 }, (_, slot) => slot);
  return {
    Instagram: slots.map(slot => ({
      slot,
      score: slot >= 18 && slot <= 22 ? 1 : slot >= 15 && slot <= 23 ? 0.68 : 0.42,
    })),
    YouTube: slots.map(slot => ({
      slot,
      score: slot >= 20 && slot <= 23 ? 1 : slot >= 18 && slot <= 23 ? 0.7 : 0.42,
    })),
  };
}

function formatHour(hour) {
  const h = Number(hour);
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

function platformBadgeClass(platform) {
  if (platform === 'Instagram') return 'badge-instagram';
  if (platform === 'YouTube') return 'badge-youtube';
  return 'badge-both';
}

function platformLabel(platform) {
  if (platform === 'Instagram') return 'Instagram';
  if (platform === 'YouTube') return 'YouTube';
  return platform || 'Both';
}

function decisionBadge(decision) {
  if (decision === 'POST_NOW') return '<span class="badge badge-post-now"><span class="badge-dot"></span>POST NOW</span>';
  return '<span class="badge badge-schedule"><span class="badge-dot"></span>SCHEDULE</span>';
}

function creatorColor(id) {
  const colors = ['#2563eb', '#0f766e', '#be185d', '#b45309', '#7c3aed', '#0891b2', '#16a34a', '#dc2626'];
  return colors[Number(id) % colors.length];
}
