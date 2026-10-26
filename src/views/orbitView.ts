import { ItemView, WorkspaceLeaf, TFile, setIcon } from 'obsidian';
import { ActivityCard, OrbitActivity } from '../components/card';
import { DailyLogService } from '../dailyLogService';
import { parseDate } from '../dateHelpers';

// ─── Types ──────────────────────────────────────────────

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
	private activityCard: ActivityCard;
	private dailyLogService: DailyLogService;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
		this.activityCard = new ActivityCard(this.app);
		this.dailyLogService = new DailyLogService(this.app);
	}

	getViewType(): string {
		return VIEW_TYPE_FEED;
	}

	getDisplayText(): string {
		return 'Orbit';
	}

	// ─── Lifecycle ──────────────────────────────────────

	async onOpen(): Promise<void> {
		this.renderAll();
	}

	async onClose(): Promise<void> {}

	// ─── Main Rendering ─────────────────────────────────

	private async renderAll(): Promise<void> {
		const root = this.contentEl;

		root.empty();
		root.addClass('orbit');

		this.renderHeader(root);

		const activities = await this.getActivities();

		this.renderStats(root);

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

	private async renderStats(root: HTMLElement): Promise<void> {
		const statsDiv = root.createDiv({ cls: 'orbit-stats' });

		const dailyStats = await this.dailyLogService.getDailyStats();
		const weeklyStats = await this.dailyLogService.getWeeklyStats();

		const items = [
			{
				label: 'TODAY',
				time: `${(dailyStats.totalMinutes / 60).toFixed(1)}h`,
				sessions: `${dailyStats.uniqueActivities}`,
				timeDescription: 'Time invested',
				sessionsDescription: 'Activities completed',
			},
			{
				label: 'THIS WEEK',
				time: `${(weeklyStats.totalMinutes / 60).toFixed(1)}h`,
				sessions: `${weeklyStats.uniqueActivities}`,
				timeDescription: 'Time invested',
				sessionsDescription: 'Activities completed',
			},
		];

		for (const item of items) {
			const stat = statsDiv.createDiv({ cls: 'orbit-stat' });

			let showTime = true;

			const label = stat.createEl('p', { text: item.label });
			const value = stat.createEl('h1', { text: item.time });
			const description = stat.createEl('p', {
				text: item.timeDescription,
			});

			stat.addEventListener('click', () => {
				showTime = !showTime;

				value.setText(showTime ? item.time : item.sessions);
				description.setText(
					showTime ? item.timeDescription : item.sessionsDescription,
				);
			});
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
			await this.activityCard.renderActivityCard(
				list,
				activity,
				this.dailyLogService,
			);
		}
	}

	// ─── Data Loading ───────────────────────────────────

	private async getActivities(): Promise<OrbitActivity[]> {
		const activitiesFolderPath = 'Orbit/Activities';

		const activitiesFiles = this.app.vault
			.getMarkdownFiles()
			.filter((file) => file.parent?.path === activitiesFolderPath);

		const activities: OrbitActivity[] = [];

		for (const file of activitiesFiles) {
			const frontmatter =
				this.app.metadataCache.getFileCache(file)?.frontmatter;

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
					frontmatter.tracking?.type === 'sessions'
						? 'session'
						: 'time',

				weeklyTimeGoal:
					frontmatter.goals?.weekly_time != null
						? Number(frontmatter.goals.weekly_time)
						: null,

				weeklySessionsGoal:
					frontmatter.goals?.weekly_sessions != null
						? Number(frontmatter.goals.weekly_sessions)
						: null,

				sessionLength:
					frontmatter.defaults?.session_length != null
						? Number(frontmatter.defaults.session_length)
						: null,

				lastDone: frontmatter.last_done,
			});
		}

		return activities;
	}

	private getTiers(activities: OrbitActivity[]): OrbitTier[] {
		const active = activities.filter(
			(activity) => activity.status !== 'on-hold',
		);

		const onHold = activities.filter(
			(activity) => activity.status === 'on-hold',
		);

		const daysAgo = (activity: OrbitActivity): number | null =>
			activity.lastDone
				? window
						.moment()
						.startOf('day')
						.diff(
							window.moment(activity.lastDone).startOf('day'),
							'days',
						)
				: null;

		const outer = active.filter((activity) => {
			const days = daysAgo(activity);
			return days === null || days >= 3;
		});


		const mid = active.filter((activity) => {
			const days = daysAgo(activity);
			return days !== null && days >= 1 && days < 3;
		});

		const inner = active.filter((activity) => {
			const days = daysAgo(activity);
			return days !== null && days < 1;
		});

		outer.sort((a, b) => {
			const aDays = daysAgo(a);
			const bDays = daysAgo(b);

			if (aDays === null) return bDays === null ? 0 : -1;
			if (bDays === null) return 1;

			return bDays - aDays;
		});
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
