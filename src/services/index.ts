import type { App } from 'obsidian';
import { ActivityService } from './activities';
import { DailyLogService } from './dailyLogService';

// The only things that touch `app`. UI code receives this object
// and never needs `app` directly.
export type OrbitServices = {
	activities: ActivityService;
	logs: DailyLogService;
};

export function createServices(app: App): OrbitServices {
	const activities = new ActivityService(app);
	const logs = new DailyLogService(app, activities);

	return { activities, logs };
}
