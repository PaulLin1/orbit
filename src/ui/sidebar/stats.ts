import { setIcon, type App } from 'obsidian';
import { loadActivities } from '../../services/activities';
import type { DailyLogService } from '../../services/dailyLogService';
import { formatHours } from '../../utils/format';
import { renderGraph } from './graph';

type StatItem = {
	label: string;
	time: string;
	activities: string;
	sessions: string;
};

type StatView = {
	key: 'time' | 'activities' | 'sessions';
	description: string;
};

// Owned by the view so the expanded state survives re-renders
export type StatsState = {
	expanded: boolean;
};

// Clicking a stat cycles through these views in order
const VIEWS: StatView[] = [
	{ key: 'time', description: 'Time invested' },
	{ key: 'activities', description: 'Activities completed' },
	{ key: 'sessions', description: 'Total sessions' },
];

export async function renderStats(
	root: HTMLElement,
	app: App,
	dailyLogService: DailyLogService,
	state: StatsState,
): Promise<void> {
	const section = root.createDiv({ cls: 'orbit-stats-section' });
	section.toggleClass('is-expanded', state.expanded);

	renderHeader(section);

	const statsDiv = section.createDiv({ cls: 'orbit-stats' });

	const dailyStats = await dailyLogService.getDailyStats();
	const weeklyStats = await dailyLogService.getWeeklyStats();
	const activeCount = loadActivities(app).filter(
		(activity) => activity.status === 'active',
	).length;

	const items: StatItem[] = [
		{
			label: 'TODAY',
			time: `${formatHours(dailyStats.totalMinutes)}h`,
			activities: `${dailyStats.uniqueActivities}`,
			sessions: `${dailyStats.totalSessions}`,
		},
		{
			label: 'THIS WEEK',
			time: `${formatHours(weeklyStats.totalMinutes)}h`,
			activities: `${weeklyStats.uniqueActivities}`,
			sessions: `${weeklyStats.totalSessions}`,
		},
		// {
		// 	label: 'TBD',
		// 	time: `${formatHours(weeklyStats.totalMinutes)}h`,
		// 	sessions: `${weeklyStats.uniqueActivities}`,
		// },
	];

	for (const item of items) {
		renderStat(statsDiv, item);
	}

	const moreDiv = section.createDiv({ cls: 'orbit-stats orbit-stats-more' });

	renderStaticStat(
		moreDiv,
		'ACTIVE ACTIVITIES',
		`${activeCount}`,
		'In rotation',
	);
	await renderGraph(moreDiv, dailyLogService);

	renderToggle(section, state);
}

function renderHeader(section: HTMLElement): void {
	const heading = section.createDiv({ cls: 'orbit-tier-header' });
	setIcon(heading.createSpan({ cls: 'orbit-tier-icon' }), 'bar-chart-2');

	const labels = heading.createDiv();
	labels.createEl('h3', { text: 'Stats' });
	labels.createEl('p', { text: 'Your progress at a glance' });
}

function renderToggle(section: HTMLElement, state: StatsState): void {
	const toggle = section.createDiv({ cls: 'orbit-stats-toggle' });
	const label = toggle.createSpan();
	const icon = toggle.createSpan();

	const render = () => {
		label.setText(state.expanded ? 'Show less' : 'Show more');
		setIcon(icon, state.expanded ? 'chevron-up' : 'chevron-down');
	};

	render();

	toggle.addEventListener('click', () => {
		state.expanded = !state.expanded;
		section.toggleClass('is-expanded', state.expanded);
		render();
	});
}

function renderStat(statsDiv: HTMLElement, item: StatItem): void {
	const stat = statsDiv.createDiv({ cls: 'orbit-stat' });

	let viewIndex = 0;

	stat.createEl('p', { text: item.label });
	const value = stat.createEl('h1');
	const description = stat.createEl('p');

	const render = () => {
		const view = VIEWS[viewIndex]!;

		value.setText(item[view.key]);
		description.setText(view.description);
	};

	render();

	stat.addEventListener('click', () => {
		viewIndex = (viewIndex + 1) % VIEWS.length;
		render();
	});
}

function renderStaticStat(
	statsDiv: HTMLElement,
	label: string,
	value: string,
	description: string,
): void {
	const stat = statsDiv.createDiv({ cls: 'orbit-stat' });

	stat.createEl('p', { text: label });
	stat.createEl('h1', { text: value });
	stat.createEl('p', { text: description });
}
