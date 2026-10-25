import { App, TFile } from 'obsidian';

export type OrbitActivity = {
	file: TFile;
	name: string;
	tags: string[];
	lastDone: Date | null;
	status: string;
	daysAgo: number | null;
	weeklyTime: number | null;
	weeklyGoal: number | null;
};

export class ActivityCard {
	constructor(private app: App) {}

	renderActivityCard(
		list: HTMLElement,
		activity: OrbitActivity,
	): void {
		const card = list.createDiv({
			cls: 'orbit-card',
		});

		const row = card.createDiv({
			cls: 'orbit-card-row',
		});

		const info = row.createDiv({
			cls: 'orbit-info',
		});

		info.createEl('div', { text: activity.name });
		info.createEl('p', { text: activity.tags.join(' · ') });

		row.createEl('span', {
			text: this.formatLastDone(activity.daysAgo),
			cls: 'orbit-time',
		});

		const progress = card.createDiv({
			cls: 'orbit-card-row orbit-progress',
		});

		const progressBar = progress.createDiv({
			cls: 'orbit-progress-bar',
		});

		const progressFill = progressBar.createDiv({
			cls: 'orbit-progress-fill',
		});

		const goal = activity.weeklyGoal ?? 0;
		const spent = activity.weeklyTime ?? 0;
		const percent = goal > 0 ? Math.round((spent / goal) * 100) : 0;

		progressFill.style.width = `${Math.min(percent, 100)}%`;

		progress.createDiv({
			cls: 'orbit-progress-percent',
			text: `${percent}%`,
		});

		const expanded = card.createDiv({
			cls: 'orbit-expanded',
		});
		expanded.style.display = 'none';

		const timeHeader = expanded.createDiv({
			cls: 'orbit-time-header',
		});

		const timeValue = timeHeader.createEl('span', {
			text: '30 min',
			cls: 'orbit-time-value',
		});

		const controls = expanded.createDiv({
			cls: 'orbit-time-controls',
		});

		const slider = controls.createEl('input', {
			type: 'range',
			cls: 'orbit-time-slider',
			attr: {
				min: '30',
				max: '240',
				step: '30',
				value: '30',
			},
		});

		slider.addEventListener('input', () => {
			const minutes = Number(slider.value);

			timeValue.setText(
				minutes >= 60
					? `${minutes / 60} hr${minutes > 60 ? 's' : ''}`
					: `${minutes} min`,
			);
		});

		const confirmButton = controls.createEl('button', {
			text: 'Add',
			cls: 'orbit-confirm-button',
		});

		confirmButton.addEventListener('click', async (event) => {
			event.stopPropagation();

			const minutes = Number(slider.value);

			try {
				await this.app.fileManager.processFrontMatter(
					activity.file,
					(frontmatter) => {
						frontmatter.weekly_time =
							(Number(frontmatter.weekly_time) || 0) + minutes;

						frontmatter.last_done =
							window.moment().format('YYYY-MM-DD');
					},
				);
			} catch (error) {
				console.error('Failed to update weekly time:', error);
			}
		});

		card.addEventListener('click', () => {
			const isExpanded = expanded.style.display !== 'none';

			expanded.style.display = isExpanded ? 'none' : 'block';
			card.classList.toggle('is-expanded', !isExpanded);
		});

		expanded.addEventListener('click', (event) => {
			event.stopPropagation();
		});
	}

	private formatLastDone(daysAgo: number | null): string {
		if (daysAgo === null) return 'Never';
		if (daysAgo === 0) return 'Today';
		if (daysAgo === 1) return 'Yesterday';

		return `${daysAgo} days ago`;
	}
}