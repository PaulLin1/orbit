import { Plugin } from 'obsidian';

import { FeedView, VIEW_TYPE_FEED } from './views/orbitView';

export default class Orbit extends Plugin {
	async onload() {
		this.registerView(VIEW_TYPE_FEED, (leaf) => new FeedView(leaf));

		this.addRibbonIcon('orbit', 'Open Orbit', () => {
			this.activateFeed();
		});

		this.addCommand({
			id: 'open-orbit',
			name: 'Open Orbit',
			callback: () => this.activateFeed(),
		});
	}

	async activateFeed() {
		const { workspace } = this.app;

		let leaf = workspace.getLeavesOfType(VIEW_TYPE_FEED)[0];

		if (!leaf) {
			leaf = workspace.getRightLeaf(false)!;
			await leaf.setViewState({
				type: VIEW_TYPE_FEED,
				active: true,
			});
		}

		workspace.revealLeaf(leaf);
	}

	onunload() {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_FEED);
	}
}
