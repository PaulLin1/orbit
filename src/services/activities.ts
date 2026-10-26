import { App } from 'obsidian';
import { ACTIVITIES_FOLDER } from '../constants';
import type { OrbitActivity } from '../types';

type ActivityFrontmatter = {
	orbit_id?: string;
	title?: string;
	tags?: unknown;
	status?: string;
	tracking?: { type?: string };
	goals?: { weekly_time?: number; weekly_sessions?: number };
	defaults?: { session_length?: number };
	last_done?: string;
};

export function loadActivities(app: App): OrbitActivity[] {
	const activities: OrbitActivity[] = [];

	for (const file of app.vault.getMarkdownFiles()) {
		if (file.parent?.path !== ACTIVITIES_FOLDER) continue;

		const frontmatter = app.metadataCache.getFileCache(file)
			?.frontmatter as ActivityFrontmatter | undefined;

		if (!frontmatter) continue;

		activities.push({
			id: String(frontmatter.orbit_id),
			file,
			name: String(frontmatter.title ?? file.basename),
			tags: Array.isArray(frontmatter.tags)
				? frontmatter.tags.map(String)
				: [],
			status: String(frontmatter.status ?? 'active'),

			trackingType:
				frontmatter.tracking?.type === 'sessions' ? 'session' : 'time',
			weeklyTimeGoal: toNumberOrNull(frontmatter.goals?.weekly_time),
			weeklySessionsGoal: toNumberOrNull(
				frontmatter.goals?.weekly_sessions,
			),
			sessionLength: toNumberOrNull(frontmatter.defaults?.session_length),

			lastDone: frontmatter.last_done
				? String(frontmatter.last_done)
				: null,
		});
	}

	return activities;
}

function toNumberOrNull(value: unknown): number | null {
	return value != null ? Number(value) : null;
}
