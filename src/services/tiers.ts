import type { OrbitActivity, OrbitTier } from '../types';
import { DailyLogService } from './dailyLogService';
import {
	ActivityProgress,
	ProgressLevel,
	getActivityProgress,
} from './progress';

const TIER_CONFIG = {
	outer: {
		name: 'Outer Orbit',
		description: 'Interests to return to',
		icon: 'orbit',
	},
	mid: {
		name: 'Mid Orbit',
		description: 'Losing momentum',
		icon: 'circle',
	},
	inner: {
		name: 'Inner Orbit',
		description: 'Recently active',
		icon: 'circle-dot',
	},
	onHold: {
		name: 'On Hold',
		description: 'Saved for another time',
		icon: 'bookmark',
	},
};

export async function getTiers(
	activities: OrbitActivity[],
	dailyLogService: DailyLogService,
): Promise<OrbitTier[]> {
	const active = activities.filter(
		(activity) => activity.status !== 'on-hold',
	);

	const onHold = activities.filter(
		(activity) => activity.status === 'on-hold',
	);

	const progress = new Map<OrbitActivity, ActivityProgress>();

	for (const activity of active) {
		progress.set(
			activity,
			await getActivityProgress(activity, dailyLogService),
		);
	}

	const byLevel = (level: ProgressLevel) =>
		active
			.filter((activity) => progress.get(activity)?.level === level)
			.sort(
				(a, b) =>
					(progress.get(a)?.ratio ?? 0) -
					(progress.get(b)?.ratio ?? 0),
			);

	return [
		{ ...TIER_CONFIG.outer, activities: byLevel('is-low') },
		{ ...TIER_CONFIG.mid, activities: byLevel('is-medium') },
		{ ...TIER_CONFIG.inner, activities: byLevel('is-high') },
		{ ...TIER_CONFIG.onHold, activities: onHold },
	];
}
