import { Plugin } from 'obsidian';
import { VIEW_TYPE_DASHBOARD, VIEW_TYPE_SIDEBAR } from './constants';
import { DashboardView } from './ui/dashboard/dashboardView';
import { SidebarView } from './ui/sidebar/sidebarView';

export default class Orbit extends Plugin {
	async onload() {
		this.registerView(VIEW_TYPE_SIDEBAR, (leaf) => new SidebarView(leaf));

		this.registerView(
			VIEW_TYPE_DASHBOARD,
			(leaf) => new DashboardView(leaf),
		);

		this.addRibbonIcon('orbit', 'Open Orbit', () => {
			void this.activateView(VIEW_TYPE_SIDEBAR);
		});

		this.addRibbonIcon(
			'layout-dashboard',
			'Open Orbit Dashboard',
			() => {
				void this.activateView(VIEW_TYPE_DASHBOARD);
			},
		);

		this.addCommand({
			id: 'open-orbit',
			name: 'Open Orbit view',
			callback: () => void this.activateView(VIEW_TYPE_SIDEBAR),
		});

		this.addCommand({
			id: 'open-orbit-dashboard',
			name: 'Open Orbit Dashboard',
			callback: () => void this.activateView(VIEW_TYPE_DASHBOARD),
		});
	}

	async activateView(type: string) {
		const { workspace } = this.app;

		let leaf = workspace.getLeavesOfType(type)[0];

		if (!leaf) {
			leaf = workspace.getRightLeaf(false)!;
			await leaf.setViewState({
				type,
				active: true,
			});
		}

		await workspace.revealLeaf(leaf);
	}
}
