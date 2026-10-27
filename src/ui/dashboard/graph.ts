import type { DailyLogService } from '../../services/dailyLogService';
import { DayStats } from '../../services/dailyLogService';

export async function renderGraph(
	root: HTMLElement,
	dailyLogService: DailyLogService,
): Promise<void> {
	const weekSessions: DayStats[] = await dailyLogService.getWeekDays();

	const card = root.createDiv({ cls: 'orbit-stat orbit-graph-card' });

	const header = card.createDiv({ cls: 'orbit-graph-header' });
	header.createEl('h3', { text: 'Activity' });
	header.createEl('span', { text: 'Last 7 days' });

	const graph = card.createDiv({ cls: 'orbit-graph' });

	const timeValues = weekSessions.map((day) => day.totalMinutes);
	const sessionValues = weekSessions.map((day) => day.uniqueActivities);

	const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

	timeValues.forEach((value, i) => {
		const column = graph.createDiv({ cls: 'orbit-graph-column' });
	column.createEl('span', {
		cls: 'orbit-graph-value',
		text: String(value),
	});
		const bar = column.createDiv({ cls: 'orbit-graph-bar' });
		bar.style.height = `${value}%`;

		column.createEl('span', { text: days[i] });
	});
}
