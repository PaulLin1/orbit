import type { DailyLogService } from '../../services/dailyLogService';
import { getActivityProgress } from '../../services/progress';
import type { OrbitActivity } from '../../types';
import {
	formatDuration,
	formatHours,
	formatLastDone,
} from '../../utils/format';

const SLIDER_MIN = 15;
const SLIDER_MAX = 120;
const SLIDER_STEP = 15;

export async function renderActivityCard(
	list: HTMLElement,
	activity: OrbitActivity,
	dailyLogService: DailyLogService,
): Promise<void> {
	const card = list.createDiv({ cls: 'orbit-card' });

	renderHeader(card, activity);
	await renderProgress(card, activity, dailyLogService);
	renderExpanded(card, activity, dailyLogService);
}

function renderHeader(card: HTMLElement, activity: OrbitActivity): void {
	const row = card.createDiv({ cls: 'orbit-card-row' });

	const info = row.createDiv({ cls: 'orbit-info' });
	info.createDiv({ text: activity.name });

	row.createSpan({
		text: formatLastDone(activity.lastDone),
		cls: 'orbit-time',
	});
}

async function renderProgress(
	card: HTMLElement,
	activity: OrbitActivity,
	dailyLogService: DailyLogService,
): Promise<void> {
	const progress = card.createDiv({
		cls: 'orbit-card-row orbit-progress',
	});

	const progressBar = progress.createDiv({ cls: 'orbit-progress-bar' });
	const progressFill = progressBar.createDiv({ cls: 'orbit-progress-fill' });

	const { percent, level, actual, goal } = await getActivityProgress(
		activity,
		dailyLogService,
	);

	progressFill.setCssProps({
		width: `${Math.min(100, percent)}%`,
	});
	progressFill.addClass(level);

	progress.createDiv({
		cls: `orbit-progress-percent ${level}`,
		text: `${Math.round(percent)}%`,
	});
	if (activity.trackingType === 'time') {
		progress.createDiv({
			cls: 'orbit-progress-detail',
			text: `${formatHours(actual)} of ${formatHours(goal)} hours`,
		});
	} else {
		progress.createDiv({
			cls: 'orbit-progress-detail',
			text: `${actual} of ${goal} sessions`,
		});
	}
}

function renderExpanded(
	card: HTMLElement,
	activity: OrbitActivity,
	dailyLogService: DailyLogService,
): void {
	const expanded = card.createDiv({ cls: 'orbit-expanded' });

	card.addEventListener('click', (event) => {
		if (expanded.contains(event.target as Node)) return;

		card.toggleClass('is-expanded', !card.hasClass('is-expanded'));
	});

	const controls = expanded.createDiv({ cls: 'orbit-time-controls' });

	if (activity.sessionLength != null) {
		renderSessionControls(
			controls,
			activity.id,
			activity.sessionLength,
			dailyLogService,
		);
	} else {
		renderTimeControls(controls, activity.id, dailyLogService);
	}
}

function renderSessionControls(
	controls: HTMLElement,
	activityId: string,
	sessionLength: number,
	dailyLogService: DailyLogService,
): void {
	const button = controls.createEl('button', {
		text: 'Add session',
		cls: 'orbit-confirm-button',
	});

	button.addEventListener('click', (event) => {
		event.stopPropagation();
		void recordSession(dailyLogService, activityId, sessionLength);
	});
}

function renderTimeControls(
	controls: HTMLElement,
	activityId: string,
	dailyLogService: DailyLogService,
): void {
	const timeValue = controls.createDiv({
		cls: 'orbit-time-value',
		text: formatDuration(SLIDER_MIN),
	});

	const slider = controls.createEl('input', {
		type: 'range',
		cls: 'orbit-time-slider',
		attr: {
			min: String(SLIDER_MIN),
			max: String(SLIDER_MAX),
			step: String(SLIDER_STEP),
			value: String(SLIDER_MIN),
		},
	});

	slider.addEventListener('input', () => {
		timeValue.setText(formatDuration(Number(slider.value)));
	});

	const button = controls.createEl('button', {
		text: 'Add',
		cls: 'orbit-confirm-button',
	});

	button.addEventListener('click', (event) => {
		event.stopPropagation();
		void recordSession(dailyLogService, activityId, Number(slider.value));
	});
}

async function recordSession(
	dailyLogService: DailyLogService,
	activityId: string,
	minutes: number,
): Promise<void> {
	try {
		await dailyLogService.recordSession(activityId, minutes);
	} catch (error) {
		console.error('Failed to record session:', error);
	}
}
