import { Plugin } from 'obsidian';
import { VIEW_TYPE_SIDEBAR } from './constants';
import { OrbitView } from './ui/orbitView';

export default class Orbit extends Plugin {
	async onload() {
		this.registerView(VIEW_TYPE_SIDEBAR, (leaf) => new OrbitView(leaf));

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
