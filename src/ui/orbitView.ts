import { ItemView, WorkspaceLeaf, debounce, setIcon } from 'obsidian';
import { ORBIT_FOLDER, VIEW_TYPE_SIDEBAR } from '../constants';
import type { OrbitServices } from '../services';
import { getTiers } from '../services/tiers';
import type { OrbitTier } from '../types';
import { renderActivityCard } from './sidebar/activityCard';
import { renderStats, type StatsState } from './sidebar/stats';

export class OrbitView extends ItemView {
	private statsState: StatsState = { expanded: false };

	constructor(
		leaf: WorkspaceLeaf,
		private services: OrbitServices,
	) {
		super(leaf);
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

		await renderStats(root, this.services, this.statsState);

		const tiers = await getTiers(
			this.services.activities.getAll(),
			this.services.logs,
		);
		await this.renderTiers(root, tiers);
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
			await renderActivityCard(list, activity, this.services);
		}
	}
}
