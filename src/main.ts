import { Plugin } from 'obsidian';
import { VIEW_TYPE_ORBIT } from './constants';
import { OrbitView } from './ui/orbitView';

export default class Orbit extends Plugin {
	async onload() {
		this.registerView(VIEW_TYPE_ORBIT, (leaf) => new OrbitView(leaf));

		this.addRibbonIcon('orbit', 'Open Orbit', () => {
			void this.activateView();
		});

		this.addCommand({
			id: 'open-orbit',
			name: 'Open view',
			callback: () => void this.activateView(),
		});
	}

	async activateView() {
		const { workspace } = this.app;

		let leaf = workspace.getLeavesOfType(VIEW_TYPE_ORBIT)[0];

		if (!leaf) {
			leaf = workspace.getRightLeaf(false)!;
			await leaf.setViewState({
				type: VIEW_TYPE_ORBIT,
				active: true,
			});
		}

		await workspace.revealLeaf(leaf);
	}
}
