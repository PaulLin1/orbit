import type { DailyLogService } from '../../services/dailyLogService';
import { formatHours } from '../../utils/format';

type StatItem = {
	label: string;
	time: string;
	sessions: string;
};

const TIME_DESCRIPTION = 'Time invested';
const SESSIONS_DESCRIPTION = 'Activities completed';

export async function renderStats(
	root: HTMLElement,
	dailyLogService: DailyLogService,
): Promise<void> {
	const statsDiv = root.createDiv({ cls: 'orbit-stats' });

	const dailyStats = await dailyLogService.getDailyStats();
	const weeklyStats = await dailyLogService.getWeeklyStats();

	const items: StatItem[] = [
		{
			label: 'TODAY',
			time: `${formatHours(dailyStats.totalMinutes)}h`,
			sessions: `${dailyStats.uniqueActivities}`,
		},
		{
			label: 'THIS WEEK',
			time: `${formatHours(weeklyStats.totalMinutes)}h`,
			sessions: `${weeklyStats.uniqueActivities}`,
		},
	];

	for (const item of items) {
		renderStat(statsDiv, item);
	}
}

function renderStat(statsDiv: HTMLElement, item: StatItem): void {
	const stat = statsDiv.createDiv({ cls: 'orbit-stat' });

	let showTime = true;

	stat.createEl('p', { text: item.label });
	const value = stat.createEl('h1', { text: item.time });
	const description = stat.createEl('p', { text: TIME_DESCRIPTION });

	stat.addEventListener('click', () => {
		showTime = !showTime;

		value.setText(showTime ? item.time : item.sessions);
		description.setText(showTime ? TIME_DESCRIPTION : SESSIONS_DESCRIPTION);
	});
}
