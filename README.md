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

