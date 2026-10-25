import { App, TFile } from 'obsidian';
import { DailyLogService } from '../dailyLogService';

export type TrackingType = 'time' | 'session';

import { formatLastDone } from '../dateHelpers';
export type OrbitActivity = {
	id: string;
	file: TFile;
	name: string;
	tags: string[];
	status: string;

	// Derived from daily logs
	lastDone: Date | null;
	daysAgo: number | null;
	dailyTime: number;
    // dailySessions is just count in daily log
	weeklyTime: number;
	weeklySessions: number;

	// Activity configuration
	trackingType: TrackingType;
	weeklyTimeGoal: number | null;
	weeklySessionsGoal: number | null;
	sessionLength: number | null;
};

export class ActivityCard {
	constructor(private app: App) {}

	renderActivityCard(list: HTMLElement, activity: OrbitActivity, dailyLogService: DailyLogService): void {
		const card = list.createDiv({
			cls: 'orbit-card',
		});

        // Header

		const row = card.createDiv({
			cls: 'orbit-card-row',
		});

		const info = row.createDiv({
			cls: 'orbit-info',
		});

		info.createEl('div', { text: activity.name });
		info.createEl('p', { text: activity.tags.join(' · ') });

		row.createEl('span', {
			text: formatLastDone(activity.daysAgo),
			cls: 'orbit-time',
		});

        // Progress bar
    
		// const progress = card.createDiv({
		// 	cls: 'orbit-card-row orbit-progress',
		// });

		// const progressBar = progress.createDiv({
		// 	cls: 'orbit-progress-bar',
		// });

		// const progressFill = progressBar.createDiv({
		// 	cls: 'orbit-progress-fill',
		// });

		// const dayOfWeek = new Date().getDay();

		// const weekProgress = (dayOfWeek + 1) / 7;

		// const actual =
		// 	activity.trackingType === 'time'
		// 		? activity.weeklyTime
		// 		: activity.weeklySessions;

		// const goal =
		// 	activity.trackingType === 'time'
		// 		? activity.weeklyTimeGoal
		// 		: activity.weeklySessionsGoal;

		// const percent = goal > 0 ? Math.min(100, (actual / goal) * 100) : 0;

		// const expected = goal * weekProgress;
		// const ratio = expected > 0 ? actual / expected : 0;
		// const colorClass =
		// 	ratio >= 1 ? 'is-high' : ratio >= 0.75 ? 'is-medium' : 'is-low';

		// progressFill.style.width = `${percent}%`;
		// progressFill.classList.remove('is-high', 'is-medium', 'is-low');
		// progressFill.classList.add(colorClass);

		// progress.createDiv({
		// 	cls: `orbit-progress-percent ${colorClass}`,
		// 	text: `${Math.round(percent)}%`,
		// });

        // Adding time

		// const expanded = card.createDiv({
		// 	cls: 'orbit-expanded',
		// });
		// expanded.style.display = 'none';

		// const controls = expanded.createDiv({
		// 	cls: 'orbit-time-controls',
		// });

		// if (activity.sessionLength != null) {
		// 	const sessionButton = controls.createEl('button', {
		// 		text: 'Add Session',
		// 		cls: 'orbit-confirm-button',
		// 	});

		// 	sessionButton.addEventListener('click', async (event) => {
		// 		event.stopPropagation();

		// 		try {
		// 			await this.app.fileManager.processFrontMatter(
		// 				activity.file,
		// 				(frontmatter) => {
		// 					frontmatter.weekly_time =
		// 						(Number(frontmatter.weekly_time) || 0) +
		// 						frontmatter.session_length;

		// 					frontmatter.daily_time =
		// 						(Number(frontmatter.daily_time) || 0) +
		// 						frontmatter.session_length;

		// 					frontmatter.weekly_sessions =
		// 						(Number(frontmatter.weekly_sessions) || 0) + 1;

		// 					frontmatter.last_done = window
		// 						.moment()
		// 						.format('YYYY-MM-DD');
		// 				},
		// 			);
		// 		} catch (error) {
		// 			console.error('Failed to add session:', error);
		// 		}
		// 	});
		// } else {
		// 	const timeValue = controls.createDiv({
		// 		cls: 'orbit-time-value',
		// 		text: '15 min',
		// 	});

		// 	const slider = controls.createEl('input', {
		// 		type: 'range',
		// 		cls: 'orbit-time-slider',
		// 		attr: {
		// 			min: '15',
		// 			max: '120',
		// 			step: '15',
		// 			value: '15',
		// 		},
		// 	});

		// 	slider.addEventListener('input', () => {
		// 		const minutes = Number(slider.value);

		// 		timeValue.setText(
		// 			minutes >= 60
		// 				? `${minutes / 60} hr${minutes > 60 ? 's' : ''}`
		// 				: `${minutes} min`,
		// 		);
		// 	});

		// 	const confirmButton = controls.createEl('button', {
		// 		text: 'Add',
		// 		cls: 'orbit-confirm-button',
		// 	});

		// 	confirmButton.addEventListener('click', async (event) => {
		// 		event.stopPropagation();

		// 		const minutes = Number(slider.value);

		// 		try {
		// 			await this.app.fileManager.processFrontMatter(
		// 				activity.file,
		// 				(frontmatter) => {
		// 					frontmatter.weekly_time =
		// 						(Number(frontmatter.weekly_time) || 0) +
		// 						minutes;

		// 					frontmatter.daily_time =
		// 						(Number(frontmatter.daily_time) || 0) + minutes;

		// 					frontmatter.last_done = window
		// 						.moment()
		// 						.format('YYYY-MM-DD');
		// 				},
		// 			);
		// 		} catch (error) {
		// 			console.error('Failed to update weekly time:', error);
		// 		}
		// 	});
		// }

		// card.addEventListener('click', () => {
		// 	const isExpanded = expanded.style.display !== 'none';

		// 	expanded.style.display = isExpanded ? 'none' : 'block';
		// 	card.classList.toggle('is-expanded', !isExpanded);
		// });

		// expanded.addEventListener('click', (event) => {
		// 	event.stopPropagation();
		// });
	}
}
