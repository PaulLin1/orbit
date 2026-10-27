import { ItemView, WorkspaceLeaf, debounce, setIcon } from 'obsidian';
import { ORBIT_FOLDER, VIEW_TYPE_SIDEBAR } from '../../constants';
import { loadActivities } from '../../services/activities';
import { DailyLogService } from '../../services/dailyLogService';
import { getTiers } from '../../services/tiers';
import type { OrbitTier } from '../../types';
import { renderActivityCard } from './activityCard';
import { renderStats } from './stats';

export class SidebarView extends ItemView {
	private dailyLogService: DailyLogService;

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

		this.renderHeader(root);
		await renderStats(root, this.dailyLogService);

		const activities = loadActivities(this.app);
		const tiers = await getTiers(activities, this.dailyLogService);

		for (const [index, tier] of tiers.entries()) {
			if (index > 0) root.createEl('hr', { cls: 'orbit-divider' });

			await this.renderTier(root, tier);
		}
	}

	private renderHeader(root: HTMLElement): void {
		const header = root.createDiv({ cls: 'orbit-header' });

		setIcon(header.createDiv(), 'orbit');

		const title = header.createDiv();
		title.createEl('h2', { text: 'Orbit' });
		title.createEl('p', { text: 'Bring them back into orbit.' });

		setIcon(header.createDiv({ cls: 'orbit-settings' }), 'settings');
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
}
