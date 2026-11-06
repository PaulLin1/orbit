import { Plugin } from 'obsidian';
import { VIEW_TYPE_SIDEBAR } from './constants';
import { createServices, type OrbitServices } from './services';
import { OrbitView } from './ui/orbitView';

export default class Orbit extends Plugin {
	services!: OrbitServices;

	async onload() {
		this.services = createServices(this.app);

		this.registerView(
			VIEW_TYPE_SIDEBAR,
			(leaf) => new OrbitView(leaf, this.services),
		);

		this.addRibbonIcon('orbit', 'Open Orbit', () => {
			void this.activateView(VIEW_TYPE_SIDEBAR);
		});

		this.addCommand({
			id: 'open-orbit',
			name: 'Open Orbit view',
			callback: () => void this.activateView(VIEW_TYPE_SIDEBAR),
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
