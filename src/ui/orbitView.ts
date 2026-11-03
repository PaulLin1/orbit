import { ItemView, TFile, WorkspaceLeaf, debounce, setIcon } from 'obsidian';
import type { App } from 'obsidian';
import {
	ACTIVITIES_FOLDER,
	ORBIT_FOLDER,
	VIEW_TYPE_SIDEBAR,
} from '../constants';
import { DailyLogService } from '../services/dailyLogService';
import { getTiers } from '../services/tiers';
import type { OrbitActivity as CardActivity, OrbitTier } from '../types';
import { renderActivityCard } from './sidebar/activityCard';
import { renderStats, type StatsState } from './sidebar/stats';

export class OrbitView extends ItemView {
	private dailyLogService: DailyLogService;
	private statsState: StatsState = { expanded: false };
	private activities: OrbitActivity[] = [];

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
		this.dailyLogService = new DailyLogService(this.app);
	}

	getViewType(): string {
		return VIEW_TYPE_SIDEBAR;
	}

	getDisplayText(): string {
		return 'Orbit';
	}

	getIcon(): string {
		return 'orbit';
	}

	async onOpen(): Promise<void> {
		const requestRender = debounce(() => void this.render(), 100, true);

		this.registerEvent(
			this.app.metadataCache.on('changed', (file) => {
				if (file.path.startsWith(`${ORBIT_FOLDER}/`)) requestRender();
			}),
		);

		await this.render();
	}

	private async render(): Promise<void> {
		const root = this.contentEl;

		root.empty();
		root.addClass('orbit-sidebar');

		// Header
		this.renderHeader(root);

		// Stats
		await renderStats(
			root,
			this.app,
			this.dailyLogService,
			this.statsState,
		);

		// Tiers
		this.activities = loadActivities(this.app);
		const tiers = await getTiers(
			this.activities.map(toCardActivity),
			this.dailyLogService,
		);
		await this.renderTiers(root, tiers);

		// Edit section
		// await this.renderEdit(root);
	}

	private renderHeader(root: HTMLElement): void {
		const header = root.createDiv({ cls: 'orbit-header' });

		setIcon(header.createDiv(), 'orbit');

		const title = header.createDiv();
		title.createEl('h2', { text: 'Orbit' });
		title.createEl('p', { text: 'Bring them back into orbit.' });
	}

	private async renderTiers(
		root: HTMLElement,
		tiers: OrbitTier[],
	): Promise<void> {
		for (const [index, tier] of tiers.entries()) {
			if (index > 0) root.createEl('hr', { cls: 'orbit-divider' });

			await this.renderTier(root, tier);
		}
	}

	private async renderTier(root: HTMLElement, tier: OrbitTier): Promise<void> {
		const section = root.createDiv({ cls: 'orbit-tier' });

		const heading = section.createDiv({ cls: 'orbit-tier-header' });
		setIcon(heading.createSpan({ cls: 'orbit-tier-icon' }), tier.icon);

		const labels = heading.createDiv();
		labels.createEl('h3', { text: tier.name });
		labels.createEl('p', { text: tier.description });

		const list = section.createDiv({ cls: 'orbit-list' });

		for (const activity of tier.activities) {
			await renderActivityCard(list, activity, this.dailyLogService);
		}
	}

	// private async renderEdit(root: HTMLElement): Promise<void> {
	// 	const section = root.createDiv({ cls: 'orbit-tier' });

	// 	const heading = section.createDiv({ cls: 'orbit-tier-header' });

	// 	const labels = heading.createDiv();
	// 	labels.createEl('h3', { text: 'edit' });
	// 	labels.createEl('p', { text: 'edit description' });

	// 	const list = section.createDiv({ cls: 'orbit-list' });

	// 	const activities = loadActivities(this.app);

	// 	for (const activity of activities) {
	// 		await renderEditCard(list, activity, this.dailyLogService);
	// 	}
	// }
}

export type TrackingType = 'time' | 'sessions';

// Frontmatter of a note in Orbit/Activities, e.g.
//   orbit_id: boxing
//   tracking: { type: sessions }
//   goals: { weekly_sessions: 12 }
//   defaults: { session_length: 30 }
//   last_done: 2026-11-02
export type OrbitActivity = {
	orbit_id: string;
	title: string;
	tags: string[];
	status: string;

	tracking: {
		type: TrackingType;
	};
	goals: {
		weekly_time?: number;
		weekly_sessions?: number;
	};
	defaults: {
		session_length?: number;
	};

	last_done?: string;

	file: TFile;
};

type ActivityFrontmatter = Partial<Omit<OrbitActivity, 'file' | 'tags'>> & {
	tags?: unknown;
};

// Adapts an activity to the shape the sidebar components
// (cards, progress, tiers) expect.
function toCardActivity(activity: OrbitActivity): CardActivity {
	return {
		id: activity.orbit_id,
		file: activity.file,
		name: activity.title,
		tags: activity.tags,
		status: activity.status,
		trackingType:
			activity.tracking.type === 'sessions' ? 'session' : 'time',
		weeklyTimeGoal: toNumberOrNull(activity.goals.weekly_time),
		weeklySessionsGoal: toNumberOrNull(activity.goals.weekly_sessions),
		sessionLength: toNumberOrNull(activity.defaults.session_length),
		lastDone: activity.last_done ?? null,
	};
}

function toNumberOrNull(value: unknown): number | null {
	return value != null ? Number(value) : null;
}

export function loadActivities(app: App): OrbitActivity[] {
	const activities: OrbitActivity[] = [];

	for (const file of app.vault.getMarkdownFiles()) {
		if (file.parent?.path !== ACTIVITIES_FOLDER) continue;

		const frontmatter = app.metadataCache.getFileCache(file)
			?.frontmatter as ActivityFrontmatter | undefined;

		if (!frontmatter?.orbit_id) continue;

		const type = frontmatter.tracking?.type;
		if (type !== 'time' && type !== 'sessions') continue;

		activities.push({
			orbit_id: String(frontmatter.orbit_id),
			file,
			title: String(frontmatter.title ?? file.basename),
			tags: Array.isArray(frontmatter.tags)
				? frontmatter.tags.map(String)
				: [],
			status: String(frontmatter.status ?? 'active'),
			tracking: { type },
			goals: frontmatter.goals ?? {},
			defaults: frontmatter.defaults ?? {},
			last_done: frontmatter.last_done
				? String(frontmatter.last_done)
				: undefined,
		});
	}

	return activities;
}
