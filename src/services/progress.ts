import type { OrbitActivity } from '../types';
import { DailyLogService } from './dailyLogService';

export type ProgressLevel = 'is-high' | 'is-medium' | 'is-low';

export type ActivityProgress = {
	percent: number;
	ratio: number;
	level: ProgressLevel;
};

export async function getActivityProgress(
	activity: OrbitActivity,
	dailyLogService: DailyLogService,
): Promise<ActivityProgress> {
	const stats = await dailyLogService.getActivityWeeklyStats(activity.id);

	const actual =
		activity.trackingType === 'time' ? stats.totalMinutes : stats.sessions;

	const goal =
		activity.trackingType === 'time'
			? activity.weeklyTimeGoal
			: activity.weeklySessionsGoal;

	const safeGoal = goal ?? 0;

	// Uncapped, so overfilled goals show their real percent
	const percent = safeGoal > 0 ? (actual / safeGoal) * 100 : 0;

	const dayOfWeek = window.moment().day();
	const weekProgress = (dayOfWeek + 1) / 7;
	const expected = safeGoal * weekProgress;
	const ratio = expected > 0 ? actual / expected : 0;

	const level: ProgressLevel =
		percent >= 100 || ratio >= 1
			? 'is-high'
			: ratio >= 0.5
				? 'is-medium'
				: 'is-low';

	return { percent, ratio, level };
}
