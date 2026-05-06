# Creator Content Posting Optimization System

## Team Information
- **Team Name**: Trio of Logic
- **Year**: 1st Year
- **All-Female Team**: No

## Architecture Overview


Our system recommends posting decisions by scoring every Instagram and YouTube hour as a combined platform-time option rather than using fixed peak hours. Each candidate receives a weighted score from expected engagement, platform activity, creator affinity, content category fit, and timing quality. Activity is smoothed across nearby hours, so recommendations can naturally shift between morning, afternoon, evening, and night depending on the content and creator.

Platform selection is handled through joint optimization. Short content is not automatically sent to Instagram and long content is not automatically sent to YouTube. Instead, the system compares both platforms using creator history, category behavior, format fit, and current platform demand.

Creator personalization is built into the scoring model. Historical creator tendencies influence which hours and platforms are favored, while category profiles add realistic behavior such as fitness performing better in mornings, education in afternoons, and gaming or entertainment later in the day.

For POST_NOW versus SCHEDULE, the system compares the current hour with the best available scheduled slot. If the current time is close enough to optimal and competition is reasonable, it recommends POST_NOW; otherwise, it schedules the content for the stronger window.

## Technical Implementation

The project is built as a lightweight frontend website using HTML, CSS, and JavaScript. The interface is divided into four main pages:

- **Dashboard**: Shows a quick overview of total content, recommendations, active creators, average score, activity heatmaps, and recent posting decisions.
- **Submit Content**: Allows users to enter content ID, creator ID, content type, content category, and current time slot. The system then generates a recommended platform, posting time, confidence score, and POST_NOW or SCHEDULE decision.
- **Recommendations**: Displays all generated recommendations in a searchable, sortable, filterable table with platform, category, timing, confidence, score, and explanation details.
- **Analytics**: Explains the scoring formula and visualizes how engagement, activity, creator affinity, category fit, and timing quality affect the final score.

The recommendation engine is implemented in JavaScript as a modular scoring layer. It evaluates Instagram and YouTube across all 24 hourly time slots, normalizes component scores, applies weighted ranking, and uses deterministic tie-breaking so the same input always produces the same output. The model also includes category-specific timing behavior, creator-specific posting tendencies, competition balancing, and real-time current-hour comparison.

Data is stored in CSV files inside the `data/raw` folder. These datasets include content submissions, creator information, historical engagement, and platform activity. The frontend uses this structure to simulate how a production analytics system would combine user input, historical data, and platform behavior into an explainable posting recommendation.
