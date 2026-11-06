import { setIcon } from 'obsidian';
import type { OrbitServices } from '../../services';
import {
	type GoalTuning,
	type TuningReason,
	tuneGoals,
} from '../../services/goalTuning';
import type { OrbitActivity } from '../../types';
import { formatHours } from '../../utils/format';

const REASONS: Record<TuningReason, string> = {
	raise: 'You hit this most weeks',
	lower: 'Matched to your real pace',
	capacity: 'Trimmed to fit your weekly hours',
	'on-target': 'On target',
	'no-history': 'Needs 2+ weeks of history',
};

export function renderGoals(root: HTMLElement, services: OrbitServices): void {
	const { tunings, capacityMinutes } = tuneGoals(
		services.activities.getActive(),
		services.logs.getCompletedWeeks(),
	);

	// Biggest suggested changes first
	tunings.sort((a, b) => change(b) - change(a));

	const card = root.createDiv({ cls: 'orbit-stat orbit-goals-card' });

	const header = card.createDiv({ cls: 'orbit-goals-header' });
	header.createEl('h3', { text: 'Tuned goals' });
	if (capacityMinutes != null) {
		header.createSpan({
			text: `~${formatHours(capacityMinutes)}h / week capacity`,
		});
	}

	if (tunings.length === 0) {
		card.createDiv({
			cls: 'orbit-goals-empty',
			text: 'No weekly goals set',
		});
		return;
	}

	const list = card.createDiv({ cls: 'orbit-goals' });

	for (const tuning of tunings) {
		renderGoalRow(list, tuning, services);
	}
}

function renderGoalRow(
	list: HTMLElement,
	tuning: GoalTuning,
	services: OrbitServices,
): void {
	const { activity, goal, tuned } = tuning;
	const direction = tuned > goal ? 'is-up' : tuned < goal ? 'is-down' : '';

	const row = list.createDiv({ cls: 'orbit-goals-row' });

	const top = row.createDiv({ cls: 'orbit-goals-labels' });
	top.createSpan({ cls: 'orbit-goals-name', text: activity.name });

	const values = top.createSpan({ cls: `orbit-goals-value ${direction}` });
	if (tuned === goal) {
		values.setText(formatGoal(activity, goal));
	} else {
		values.createSpan({
			cls: 'orbit-goals-old',
			text: formatGoal(activity, goal),
		});
		setIcon(values.createSpan({ cls: 'orbit-goals-arrow' }), 'arrow-right');
		values.createSpan({ text: formatGoal(activity, tuned) });
	}

	const bottom = row.createDiv({ cls: 'orbit-goals-labels' });
	bottom.createSpan({ cls: 'orbit-goals-detail', text: describe(tuning) });

	if (tuned !== goal) {
		const apply = bottom.createEl('button', {
			cls: 'orbit-goals-apply',
			text: 'Apply',
		});

		apply.addEventListener('click', (event) => {
			event.stopPropagation();
			apply.disabled = true;
			void applyGoal(services, activity, tuned);
		});
	}
}

function describe(tuning: GoalTuning): string {
	if (tuning.reason === 'no-history') return REASONS['no-history'];

	const parts = [
		`Avg ${formatGoal(tuning.activity, tuning.average)}`,
		`${Math.round(tuning.reach * 100)}% reach`,
		`${tuning.weeks} wk${tuning.weeks === 1 ? '' : 's'}`,
	];

	return `${parts.join(' · ')} — ${REASONS[tuning.reason]}`;
}

function formatGoal(activity: OrbitActivity, value: number): string {
	return activity.trackingType === 'time'
		? `${formatHours(value)}h`
		: `${Number(value.toFixed(1))} sessions`;
}

function change(tuning: GoalTuning): number {
	return tuning.goal > 0
		? Math.abs(tuning.tuned - tuning.goal) / tuning.goal
		: 0;
}

async function applyGoal(
	services: OrbitServices,
	activity: OrbitActivity,
	value: number,
): Promise<void> {
	try {
		await services.activities.setWeeklyGoal(activity, value);
	} catch (error) {
		console.error('Failed to apply tuned goal:', error);
	}
}
