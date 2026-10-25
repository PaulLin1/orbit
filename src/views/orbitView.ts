import { ItemView, WorkspaceLeaf, TFile, setIcon } from 'obsidian';

// ─── Types ──────────────────────────────────────────────

type OrbitActivity = {
	file: TFile;
	name: string;
	tags: string[];
	lastDone: Date | null;
	status: string;
	daysAgo: number | null;
};

type OrbitTier = {
	name: string;
	description: string;
	icon: string;
	activities: OrbitActivity[];
};

// ─── Constants ──────────────────────────────────────────

export const VIEW_TYPE_FEED = 'orbit-view';

const TIER_CONFIG = {
	outer: {
		name: 'Outer Orbit',
		description: 'Interests to return to',
		icon: 'orbit',
	},
	mid: {
		name: 'Mid Orbit',
		description: 'Losing momentum',
		icon: 'circle',
	},
	inner: {
		name: 'Inner Orbit',
		description: 'Recently active',
		icon: 'circle-dot',
	},
	onHold: {
		name: 'On Hold',
		description: 'Saved for another time',
		icon: 'bookmark',
	},
};

// ─── Feed View ──────────────────────────────────────────

export class FeedView extends ItemView {
	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType(): string {
		return VIEW_TYPE_FEED;
	}

	getDisplayText(): string {
		return 'Orbit';
	}

	// ─── Lifecycle ──────────────────────────────────────

	async onOpen(): Promise<void> {
		this.renderFeed();
	}

	async onClose(): Promise<void> {}

	// ─── Main Rendering ─────────────────────────────────

	private renderFeed(): void {
		const root = this.contentEl;

		root.empty();
		root.addClass('orbit');

		this.renderHeader(root);

		const activities = this.getActivities();

		const stats = this.getStats(activities);
		this.renderStats(root, stats);

		const tiers = this.getTiers(activities);
		this.renderTiers(root, tiers);
	}

	private renderHeader(root: HTMLElement): void {
		const header = root.createDiv({ cls: 'orbit-header' });

		const logo = header.createDiv();
		setIcon(logo, 'orbit');

		const title = header.createDiv();
		title.createEl('h2', { text: 'Orbit' });
		title.createEl('p', {
			text: 'Bring them back into orbit.',
		});

		const settings = header.createDiv({
			cls: 'orbit-settings',
		});
		setIcon(settings, 'settings');
	}

	private getStats(activities: OrbitActivity[]): [Number, Number] {
		const activitiesExplored = activities.filter(
			(activity) => activity.daysAgo === 0,
		).length;

		return [activitiesExplored, 0];
	}
	private renderStats(root: HTMLElement, stats: [Number, Number]): void {
		const statsDiv = root.createDiv({ cls: 'orbit-stats' });

		const items = [
			['TODAY', String(stats[0]), 'Activities explored'],
			['THIS WEEK', String(stats[1]) + 'h', 'Time invested'],
		];

		for (const [label, value, description] of items) {
			const stat = statsDiv.createDiv();

			stat.createEl('p', { text: label });
			stat.createEl('h1', { text: value });
			stat.createEl('p', { text: description });
		}
	}

	private renderTiers(root: HTMLElement, tiers: OrbitTier[]): void {
		tiers.forEach((tier, index) => {
			if (index > 0) {
				root.createEl('hr', { cls: 'orbit-divider' });
			}

			this.renderTier(root, tier);
		});
	}

	private renderTier(root: HTMLElement, tier: OrbitTier): void {
		const section = root.createDiv({
			cls: 'orbit-tier',
		});

		this.renderTierHeader(section, tier);
		this.renderActivityList(section, tier.activities);
	}

	private renderTierHeader(section: HTMLElement, tier: OrbitTier): void {
		const heading = section.createDiv({
			cls: 'orbit-tier-header',
		});

		const icon = heading.createSpan({
			cls: 'orbit-tier-icon',
		});
		setIcon(icon, tier.icon);

		const labels = heading.createDiv();
		labels.createEl('h3', { text: tier.name });
		labels.createEl('p', { text: tier.description });
	}

	private renderActivityList(
		section: HTMLElement,
		activities: OrbitActivity[],
	): void {
		const list = section.createDiv({
			cls: 'orbit-list',
		});

		for (const activity of activities) {
			this.renderActivityCard(list, activity);
		}
	}

	private renderActivityCard(
		list: HTMLElement,
		activity: OrbitActivity,
	): void {
		const card = list.createDiv({
			cls: 'orbit-card',
		});

		const icon = card.createDiv({
			cls: 'orbit-card-icon',
		});
		setIcon(icon, 'file-text');

		const info = card.createDiv({
			cls: 'orbit-info',
		});

		info.createEl('div', {
			text: activity.name,
		});

		info.createEl('p', {
			text: activity.tags.join(' · '),
		});

		card.createEl('span', {
			text: this.formatLastDone(activity.daysAgo),
			cls: 'orbit-time',
		});

		card.createDiv({ cls: 'orbit-dot' });

		card.addEventListener('click', () => {
			void this.app.workspace.getLeaf(false).openFile(activity.file);
		});
	}

	private formatLastDone(daysAgo: number | null): string {
		if (daysAgo === null) return 'Never';
		if (daysAgo === 0) return 'Today';
		if (daysAgo === 1) return 'Yesterday';

		return `${daysAgo} days ago`;
	}

	// ─── Data Loading ───────────────────────────────────

	private getActivities(): OrbitActivity[] {
		const files = this.app.vault.getMarkdownFiles();
		const activities: OrbitActivity[] = [];

		for (const file of files) {
			const frontmatter =
				this.app.metadataCache.getFileCache(file)?.frontmatter;

			if (!frontmatter) continue;

			const rawTags = frontmatter.tags;
			const tags: string[] = Array.isArray(rawTags)
				? rawTags.map(String)
				: typeof rawTags === 'string'
					? [rawTags]
					: [];

			if (!tags.some((tag) => tag.replace(/^#/, '') === 'orbit')) {
				continue;
			}

			const lastDone = this.parseDate(frontmatter.last_done);

			const daysAgo = lastDone
				? (() => {
						const today = new Date();
						const done = new Date(lastDone);

						const todayUTC = Date.UTC(
							today.getFullYear(),
							today.getMonth(),
							today.getDate(),
						);

						const doneUTC = Date.UTC(
							done.getFullYear(),
							done.getMonth(),
							done.getDate(),
						);

						return Math.round((todayUTC - doneUTC) / 86_400_000);
					})()
				: null;

			activities.push({
				file,
				name: frontmatter.title ?? file.basename,
				tags: tags.filter((tag) => tag.replace(/^#/, '') !== 'orbit'),
				lastDone,
				daysAgo,
				status: frontmatter.status ?? 'active',
			});
		}

		return activities;
	}

	private parseDate(value: unknown): Date | null {
		if (value instanceof Date) {
			return Number.isNaN(value.getTime()) ? null : value;
		}

		if (typeof value === 'string') {
			// Parse YYYY-MM-DD as a local date, not UTC.
			const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

			if (match) {
				const [, year, month, day] = match;

				return new Date(Number(year), Number(month) - 1, Number(day));
			}

			const date = new Date(value);
			return Number.isNaN(date.getTime()) ? null : date;
		}

		if (typeof value === 'number') {
			// Handle numeric timestamps.
			const date = new Date(value);
			return Number.isNaN(date.getTime()) ? null : date;
		}

		return null;
	}

	private getTiers(activities: OrbitActivity[]): OrbitTier[] {
		const active = activities.filter(
			(activity) => activity.status !== 'on-hold',
		);

		const onHold = activities.filter(
			(activity) => activity.status === 'on-hold',
		);

		const outer = active.filter(
			(activity) => activity.daysAgo === null || activity.daysAgo >= 21,
		);

		const mid = active.filter(
			(activity) =>
				activity.daysAgo !== null &&
				activity.daysAgo >= 7 &&
				activity.daysAgo < 21,
		);

		const inner = active.filter(
			(activity) => activity.daysAgo !== null && activity.daysAgo < 7,
		);

		outer.sort((a, b) => (b.daysAgo ?? Infinity) - (a.daysAgo ?? Infinity));

		return [
			{
				...TIER_CONFIG.outer,
				activities: outer,
			},
			{
				...TIER_CONFIG.mid,
				activities: mid,
			},
			{
				...TIER_CONFIG.inner,
				activities: inner,
			},
			{
				...TIER_CONFIG.onHold,
				activities: onHold,
			},
		];
	}
}
