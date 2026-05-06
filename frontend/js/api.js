const API_BASE = 'http://localhost:8000';

async function fetchAPI(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
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
  const recs = mockRecommendations(120);
  const avgScore = recs.reduce((sum, rec) => sum + rec.score, 0) / recs.length;
  return {
    total_content: 1200,
    total_recs: recs.length,
    active_creators: 50,
    avg_score: Number(avgScore.toFixed(2)),
  };
}

const CONTENT_CATEGORIES = [
  'Gaming',
  'Cooking',
  'Dancing',
  'Education',
  'Tech',
  'Finance',
  'Fitness',
  'Comedy',
  'Music',
  'Travel',
  'Fashion',
  'Motivation',
];

const CATEGORY_PROFILES = {
  Gaming: { hours: [20, 21, 22, 23, 0], instagram: 0.92, youtube: 1.08, typeShort: 0.96, typeLong: 1.06 },
  Cooking: { hours: [10, 11, 12, 17, 18, 19], instagram: 1.06, youtube: 0.98, typeShort: 1.03, typeLong: 0.98 },
  Dancing: { hours: [17, 18, 19, 20, 21], instagram: 1.14, youtube: 0.88, typeShort: 1.12, typeLong: 0.84 },
  Education: { hours: [11, 12, 13, 14, 15, 19], instagram: 0.93, youtube: 1.1, typeShort: 0.98, typeLong: 1.08 },
  Tech: { hours: [12, 13, 14, 18, 19, 20], instagram: 0.95, youtube: 1.09, typeShort: 0.98, typeLong: 1.07 },
  Finance: { hours: [7, 8, 9, 12, 13, 18], instagram: 0.91, youtube: 1.08, typeShort: 0.96, typeLong: 1.09 },
  Fitness: { hours: [5, 6, 7, 8, 17, 18], instagram: 1.08, youtube: 0.95, typeShort: 1.08, typeLong: 0.92 },
  Comedy: { hours: [18, 19, 20, 21, 22], instagram: 1.12, youtube: 0.94, typeShort: 1.1, typeLong: 0.9 },
  Music: { hours: [16, 17, 18, 19, 20, 21], instagram: 1.04, youtube: 1.02, typeShort: 1.04, typeLong: 0.99 },
  Travel: { hours: [9, 10, 11, 18, 19, 20], instagram: 1.09, youtube: 1.0, typeShort: 1.04, typeLong: 1.01 },
  Fashion: { hours: [11, 12, 17, 18, 19, 20], instagram: 1.13, youtube: 0.9, typeShort: 1.09, typeLong: 0.88 },
  Motivation: { hours: [6, 7, 8, 12, 20, 21], instagram: 1.03, youtube: 1.02, typeShort: 1.04, typeLong: 1.01 },
};

const SCORE_WEIGHTS = {
  engagement: 0.4,
  activity: 0.2,
  creatorAffinity: 0.15,
  category: 0.15,
  timingQuality: 0.1,
};

function mockRecommendations(count = 50) {
  const recs = [];
  for (let i = 1; i <= count; i += 1) {
    const contentId = 1000 + i;
    const creatorId = (i % 50) + 1;
    const contentType = deterministicChoice(['SHORT', 'LONG'], `${contentId}:type`, i % 3 === 0 ? 1 : 0);
    const contentCategory = CONTENT_CATEGORIES[stableHash(`${contentId}:category:${creatorId}`) % CONTENT_CATEGORIES.length];
    const createdTimestamp = stableHash(`${contentId}:submitted`) % 24;
    const rec = generateRecommendation({
      content_id: contentId,
      creator_id: (i % 50) + 1,
      content_type: contentType,
      content_category: contentCategory,
      created_timestamp: createdTimestamp,
    });
    recs.push(rec);
  }
  return recs;
}

function mockScores() {
  const recs = mockRecommendations(120);
  const avg = key => recs.reduce((sum, rec) => sum + (rec.components?.[key] || 0), 0) / recs.length;
  return {
    engagement: Number(avg('engagement').toFixed(2)),
    activity: Number(avg('activity').toFixed(2)),
    creator_affinity: Number(avg('creatorAffinity').toFixed(2)),
    category: Number(avg('category').toFixed(2)),
    timing: Number(avg('timingQuality').toFixed(2)),
    platform_quality: Number(avg('platformSelection').toFixed(2)),
    final: Number((recs.reduce((sum, rec) => sum + rec.score, 0) / recs.length).toFixed(2)),
  };
}

function getPlatformActivity() {
  const slots = Array.from({ length: 24 }, (_, slot) => slot);
  return {
    Instagram: slots.map(slot => ({ slot, score: platformActivityScore('Instagram', slot) })),
    YouTube: slots.map(slot => ({ slot, score: platformActivityScore('YouTube', slot) })),
  };
}

function generateRecommendation(payload) {
  const normalized = normalizePayload(payload);
  const candidates = rankRecommendationCandidates(normalized);
  const scheduledBest = candidates[0];
  const currentHour = normalized.created_timestamp;
  const currentBest = candidates
    .filter(candidate => candidate.time_slot === currentHour)
    .sort(compareCandidates)[0] || scheduledBest;

  const nowRatio = currentBest.final_score / scheduledBest.final_score;
  const nowIsContextual = currentBest.components.timingQuality >= 0.66
    && currentBest.components.activity >= 0.62
    && nowRatio >= 0.91;
  const decisionCandidate = nowIsContextual ? currentBest : scheduledBest;
  const decision = nowIsContextual ? 'POST_NOW' : 'SCHEDULE';

  return {
    content_id: normalized.content_id,
    creator_id: normalized.creator_id,
    content_type: normalized.content_type,
    content_category: normalized.content_category,
    platform: decisionCandidate.platform,
    time_slot: decisionCandidate.time_slot,
    decision,
    score: Number(decisionCandidate.final_score.toFixed(2)),
    confidence: Number(confidenceScore(decisionCandidate, candidates).toFixed(2)),
    components: roundComponents(decisionCandidate.components),
    explanation: buildRecommendationExplanation(decisionCandidate, scheduledBest, currentBest, normalized, decision),
    alternatives: candidates.slice(0, 3).map(candidate => ({
      platform: candidate.platform,
      time_slot: candidate.time_slot,
      score: Number(candidate.final_score.toFixed(2)),
    })),
  };
}

function normalizePayload(payload) {
  const category = CONTENT_CATEGORIES.includes(payload.content_category)
    ? payload.content_category
    : CONTENT_CATEGORIES[stableHash(`${payload.creator_id}:${payload.content_type}:category`) % CONTENT_CATEGORIES.length];

  return {
    content_id: Number.parseInt(payload.content_id, 10),
    creator_id: Number.parseInt(payload.creator_id, 10),
    content_type: payload.content_type === 'LONG' ? 'LONG' : 'SHORT',
    content_category: category,
    created_timestamp: clampHour(Number.parseInt(payload.created_timestamp, 10)),
  };
}

function rankRecommendationCandidates(payload) {
  const candidates = [];
  ['Instagram', 'YouTube'].forEach((platform) => {
    for (let hour = 0; hour < 24; hour += 1) {
      candidates.push(scoreCandidate(payload, platform, hour));
    }
  });
  return candidates.sort(compareCandidates);
}

function scoreCandidate(payload, platform, hour) {
  const activity = nearbyActivityScore(platform, hour);
  const creatorAffinity = creatorAffinityScore(payload, platform, hour);
  const category = categoryScore(payload.content_category, payload.content_type, platform, hour);
  const engagement = engagementScore(payload, platform, hour, activity, creatorAffinity, category);
  const timingQuality = timingQualityScore(payload, platform, hour, activity, category);
  const finalScore =
    engagement * SCORE_WEIGHTS.engagement
    + activity * SCORE_WEIGHTS.activity
    + creatorAffinity * SCORE_WEIGHTS.creatorAffinity
    + category * SCORE_WEIGHTS.category
    + timingQuality * SCORE_WEIGHTS.timingQuality
    + deterministicNudge(payload, platform, hour);

  return {
    platform,
    time_slot: hour,
    final_score: clamp01(finalScore),
    components: {
      engagement,
      activity,
      creatorAffinity,
      category,
      timingQuality,
      platformSelection: platformSelectionScore(payload, platform),
    },
  };
}

function platformActivityScore(platform, hour) {
  const h = clampHour(hour);
  const instagram = [0.48, 0.42, 0.38, 0.35, 0.34, 0.4, 0.52, 0.58, 0.61, 0.65, 0.69, 0.73, 0.76, 0.72, 0.7, 0.74, 0.8, 0.86, 0.92, 0.96, 0.94, 0.9, 0.82, 0.64];
  const youtube = [0.56, 0.48, 0.42, 0.38, 0.36, 0.4, 0.5, 0.56, 0.61, 0.65, 0.68, 0.72, 0.75, 0.78, 0.76, 0.74, 0.77, 0.82, 0.87, 0.9, 0.95, 0.98, 0.94, 0.86];
  return platform === 'Instagram' ? instagram[h] : youtube[h];
}

function nearbyActivityScore(platform, hour) {
  const weights = [
    { offset: -2, weight: 0.1 },
    { offset: -1, weight: 0.2 },
    { offset: 0, weight: 0.4 },
    { offset: 1, weight: 0.2 },
    { offset: 2, weight: 0.1 },
  ];
  return weights.reduce((sum, item) => sum + platformActivityScore(platform, hour + item.offset) * item.weight, 0);
}

function categoryScore(categoryName, contentType, platform, hour) {
  const profile = CATEGORY_PROFILES[categoryName] || CATEGORY_PROFILES.Motivation;
  const proximity = profile.hours.reduce((best, peakHour) => {
    const distance = circularDistance(hour, peakHour);
    return Math.max(best, Math.exp(-(distance * distance) / 8));
  }, 0);
  const platformFit = platform === 'Instagram' ? profile.instagram : profile.youtube;
  const typeFit = contentType === 'SHORT' ? profile.typeShort : profile.typeLong;
  return clamp01(0.42 + proximity * 0.38 + (platformFit - 0.9) * 0.42 + (typeFit - 0.88) * 0.32);
}

function creatorAffinityScore(payload, platform, hour) {
  const creatorSeed = stableHash(`${payload.creator_id}:${platform}:${payload.content_type}:${payload.content_category}`);
  const primaryHour = creatorSeed % 24;
  const secondaryHour = (primaryHour + 7 + (payload.creator_id % 5)) % 24;
  const platformTilt = ((stableHash(`${payload.creator_id}:${platform}:success`) % 21) - 10) / 100;
  const categoryTilt = ((stableHash(`${payload.creator_id}:${payload.content_category}:fit`) % 17) - 8) / 100;
  const closeness = Math.max(
    Math.exp(-(circularDistance(hour, primaryHour) ** 2) / 18),
    0.75 * Math.exp(-(circularDistance(hour, secondaryHour) ** 2) / 24),
  );
  return clamp01(0.46 + closeness * 0.34 + platformTilt + categoryTilt);
}

function engagementScore(payload, platform, hour, activity, creatorAffinity, category) {
  const baseline = 0.52 + ((stableHash(`${payload.creator_id}:base`) % 18) / 100);
  const historyTexture = ((stableHash(`${payload.creator_id}:${platform}:${payload.content_type}:${payload.content_category}:${hour}`) % 25) - 12) / 200;
  const formatFit = platformSelectionScore(payload, platform);
  return clamp01(baseline * 0.22 + activity * 0.2 + creatorAffinity * 0.28 + category * 0.2 + formatFit * 0.1 + historyTexture);
}

function timingQualityScore(payload, platform, hour, activity, category) {
  const currentDistance = circularDistance(hour, payload.created_timestamp);
  const waitPenalty = Math.min(currentDistance, 8) * 0.018;
  const competition = competitionScore(platform, hour);
  return clamp01(activity * 0.42 + category * 0.34 + (1 - competition) * 0.24 - waitPenalty);
}

function platformSelectionScore(payload, platform) {
  const profile = CATEGORY_PROFILES[payload.content_category] || CATEGORY_PROFILES.Motivation;
  const categoryPlatform = platform === 'Instagram' ? profile.instagram : profile.youtube;
  const typePreference = payload.content_type === 'SHORT'
    ? (platform === 'Instagram' ? 0.68 : 0.56)
    : (platform === 'YouTube' ? 0.68 : 0.56);
  const creatorPlatform = 0.56 + (stableHash(`${payload.creator_id}:${platform}:platform`) % 24) / 100;
  return clamp01(typePreference * 0.36 + creatorPlatform * 0.34 + categoryPlatform * 0.3);
}

function competitionScore(platform, hour) {
  const base = platform === 'Instagram'
    ? [0.38, 0.3, 0.24, 0.2, 0.18, 0.21, 0.29, 0.34, 0.4, 0.45, 0.49, 0.52, 0.56, 0.55, 0.52, 0.54, 0.6, 0.66, 0.78, 0.84, 0.88, 0.83, 0.74, 0.55]
    : [0.44, 0.36, 0.29, 0.24, 0.21, 0.23, 0.3, 0.35, 0.42, 0.48, 0.51, 0.55, 0.58, 0.6, 0.57, 0.55, 0.58, 0.62, 0.68, 0.76, 0.86, 0.9, 0.84, 0.7];
  return base[clampHour(hour)];
}

function confidenceScore(best, candidates) {
  const runnerUp = candidates.find(candidate => candidate.platform !== best.platform || candidate.time_slot !== best.time_slot) || best;
  const margin = Math.max(0, best.final_score - runnerUp.final_score);
  return clamp01(0.58 + best.final_score * 0.28 + margin * 2.1);
}

function buildRecommendationExplanation(best, scheduledBest, currentBest, payload, decision) {
  const categoryProfile = CATEGORY_PROFILES[payload.content_category] || CATEGORY_PROFILES.Motivation;
  const bestCategoryHour = categoryProfile.hours[0];
  const postNowNote = decision === 'POST_NOW'
    ? `${formatHour(payload.created_timestamp)} is already within ${Math.round((currentBest.final_score / scheduledBest.final_score) * 100)}% of the best scheduled score, so posting now is justified.`
    : `${formatHour(scheduledBest.time_slot)} outperforms the current ${formatHour(payload.created_timestamp)} window, so scheduling protects expected engagement.`;

  return {
    summary: `${best.platform} at ${formatHour(best.time_slot)} scored highest after balancing creator history, ${payload.content_category} behavior, platform activity, and competition.`,
    timing: `${payload.content_category} content often performs around ${formatHour(bestCategoryHour)} and nearby windows; this slot also has a strong activity-to-competition balance.`,
    platform: `${best.platform} was selected because creator affinity and category fit outweighed simple ${payload.content_type.toLowerCase()}-format defaults.`,
    decision: postNowNote,
    weights: 'Score = engagement 40%, activity 20%, creator affinity 15%, category fit 15%, timing quality 10%.',
  };
}

function compareCandidates(a, b) {
  if (b.final_score !== a.final_score) return b.final_score - a.final_score;
  if (b.components.creatorAffinity !== a.components.creatorAffinity) return b.components.creatorAffinity - a.components.creatorAffinity;
  if (b.components.timingQuality !== a.components.timingQuality) return b.components.timingQuality - a.components.timingQuality;
  if (a.time_slot !== b.time_slot) return a.time_slot - b.time_slot;
  return a.platform.localeCompare(b.platform);
}

function deterministicNudge(payload, platform, hour) {
  const raw = stableHash(`${payload.content_id}:${payload.creator_id}:${payload.content_category}:${platform}:${hour}`) % 100;
  return (raw / 100 - 0.5) * 0.014;
}

function roundComponents(components) {
  return Object.fromEntries(Object.entries(components).map(([key, value]) => [key, Number(value.toFixed(2))]));
}

function clampHour(hour) {
  const parsed = Number.isFinite(hour) ? hour : 0;
  return ((parsed % 24) + 24) % 24;
}

function circularDistance(a, b) {
  const diff = Math.abs(clampHour(a) - clampHour(b));
  return Math.min(diff, 24 - diff);
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function stableHash(value) {
  const str = String(value);
  let hash = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function deterministicChoice(items, seed, fallbackIndex = 0) {
  if (!items.length) return undefined;
  const index = seed ? stableHash(seed) % items.length : fallbackIndex % items.length;
  return items[index];
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
