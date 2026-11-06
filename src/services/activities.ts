import type { App } from 'obsidian';
import { ACTIVITIES_FOLDER } from '../constants';
import type { ActivityFrontmatter, OrbitActivity } from '../types';

export class ActivityService {
	constructor(private app: App) {}

	// Every activity note in the activities folder
	getAll(): OrbitActivity[] {
		const activities: OrbitActivity[] = [];

		for (const file of this.app.vault.getMarkdownFiles()) {
			if (file.parent?.path !== ACTIVITIES_FOLDER) continue;

			const frontmatter = this.app.metadataCache.getFileCache(file)
				?.frontmatter as ActivityFrontmatter | undefined;

			if (!frontmatter?.orbit_id) continue;

			const type = frontmatter.tracking?.type;
			if (type !== 'time' && type !== 'sessions') continue;

			activities.push({
				id: String(frontmatter.orbit_id),
				file,
				name: String(frontmatter.title ?? file.basename),
				tags: Array.isArray(frontmatter.tags)
					? frontmatter.tags.map(String)
					: [],
				status: String(frontmatter.status ?? 'active'),

				trackingType: type === 'sessions' ? 'session' : 'time',
				weeklyTimeGoal: toNumberOrNull(frontmatter.goals?.weekly_time),
				weeklySessionsGoal: toNumberOrNull(
					frontmatter.goals?.weekly_sessions,
				),
				sessionLength: toNumberOrNull(
					frontmatter.defaults?.session_length,
				),

				lastDone: frontmatter.last_done
					? String(frontmatter.last_done)
					: null,
			});
		}

		return activities;
	}

	getById(id: string): OrbitActivity | undefined {
		return this.getAll().find((activity) => activity.id === id);
	}

	getActive(): OrbitActivity[] {
		return this.getAll().filter((activity) => activity.status === 'active');
	}

	// Writes the weekly goal for the activity's tracking type
	async setWeeklyGoal(activity: OrbitActivity, value: number): Promise<void> {
		const key =
			activity.trackingType === 'time' ? 'weekly_time' : 'weekly_sessions';

		await this.app.fileManager.processFrontMatter(
			activity.file,
			(frontmatter: ActivityFrontmatter) => {
				frontmatter.goals = { ...frontmatter.goals, [key]: value };
			},
		);
	}
}

function toNumberOrNull(value: unknown): number | null {
	return value != null ? Number(value) : null;
}
