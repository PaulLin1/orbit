import { ItemView, WorkspaceLeaf, debounce, setIcon } from 'obsidian';
import { ORBIT_FOLDER, VIEW_TYPE_DASHBOARD } from '../../constants';
import { DailyLogService } from '../../services/dailyLogService';
import { renderStats } from './stats';
import { renderGraph } from './graph';

export class DashboardView extends ItemView {
	private dailyLogService: DailyLogService;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
		this.dailyLogService = new DailyLogService(this.app);
	}

	getViewType(): string {
		return VIEW_TYPE_DASHBOARD;
	}

	getDisplayText(): string {
		return 'Orbit Dashboard';
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
		root.addClass('orbit-dashboard');

		this.renderHeader(root);
		await renderStats(root, this.dailyLogService);
		await renderGraph(root, this.dailyLogService);

	}

	private renderHeader(root: HTMLElement): void {
		const header = root.createDiv({ cls: 'orbit-header' });

		setIcon(header.createDiv(), 'orbit');

		const title = header.createDiv();
		title.createEl('h2', { text: 'Orbit Dashboard' });
		title.createEl('p', { text: 'Your progress, consistency, and priorities' });

		setIcon(header.createDiv({ cls: 'orbit-settings' }), 'settings');
	}
}
