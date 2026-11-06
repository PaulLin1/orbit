import type { OrbitActivity } from '../types';
import type { WeekTotals } from './dailyLogService';

// How goal tuning works
//
// 1. Per activity, look at every completed week since you first logged it
//    (up to LOOKBACK_WEEKS). Recent weeks count more (exponential decay).
// 2. Aim a little beyond your real pace: target = weighted average × STRETCH.
//    If you hit the goal most weeks, push it up instead.
// 3. Never move too far in one step (MAX_CUT..MAX_RAISE of the current goal),
//    and scale the change by confidence — a couple of weeks of data only
//    nudges the goal, six or more weeks moves it fully.
// 4. Capacity: your total weekly time (all activities) caps the sum of goals.
//    If the goals don't fit, only the part of each goal above its floor is
//    trimmed. Floors protect small goals, goals you already beat, and goals
//    without history, and no goal is cut by more than half in one step.

const LOOKBACK_WEEKS = 12;
const HALF_LIFE_WEEKS = 4;
const MIN_WEEKS = 2;
const FULL_CONFIDENCE_WEEKS = 6;

const STRETCH = 1.15;
const HIT_RATE_TO_RAISE = 0.75;
const RAISE_STEP = 1.1;
const MAX_RAISE = 1.25;
const MAX_CUT = 0.7;
const DEAD_ZONE = 0.08;

const PROTECTED_MINUTES = 90;
const MAX_CAPACITY_CUT = 0.5;
const DEFAULT_SESSION_MINUTES = 30;
const TIME_ROUNDING = 15;

export type TuningReason =
	| 'raise'
	| 'lower'
	| 'capacity'
	| 'on-target'
	| 'no-history';

export type GoalTuning = {
	activity: OrbitActivity;
	// Minutes for time goals, sessions for session goals
	goal: number;
	tuned: number;
	average: number;
	reach: number;
	hitRate: number;
	weeks: number;
	reason: TuningReason;
};

export type TuningResult = {
	tunings: GoalTuning[];
	// Weekly minutes the goals were fitted into, if known
	capacityMinutes: number | null;
};

export function tuneGoals(
	activities: OrbitActivity[],
	history: WeekTotals[],
): TuningResult {
	const tunings = activities
		.filter((activity) => goalOf(activity) > 0)
		.map((activity) => tuneActivity(activity, history));

	const capacityMinutes = weeklyCapacity(activities, history);
	if (capacityMinutes != null) fitToCapacity(tunings, capacityMinutes);

	for (const tuning of tunings) {
		tuning.tuned = roundGoal(tuning.activity, tuning.tuned);
		if (tuning.tuned === tuning.goal && tuning.reason !== 'no-history') {
			tuning.reason = 'on-target';
		}
	}

	return { tunings, capacityMinutes };
}

function tuneActivity(
	activity: OrbitActivity,
	history: WeekTotals[],
): GoalTuning {
	const goal = goalOf(activity);
	const values = activityWeeks(activity, history);
	const weights = decayWeights(values.length);

	const average = weightedMean(values, weights);
	const hitRate = weightedMean(
		values.map((value) => (value >= goal ? 1 : 0)),
		weights,
	);

	const base = {
		activity,
		goal,
		average,
		reach: goal > 0 ? average / goal : 0,
		hitRate,
		weeks: values.length,
	};

	if (values.length < MIN_WEEKS) {
		return { ...base, tuned: goal, reason: 'no-history' };
	}

	let target = average * STRETCH;
	if (hitRate >= HIT_RATE_TO_RAISE) {
		target = Math.max(target, goal * RAISE_STEP);
	}

	target = clamp(target, goal * MAX_CUT, goal * MAX_RAISE);

	const confidence = Math.min(1, values.length / FULL_CONFIDENCE_WEEKS);
	const tuned = goal + confidence * (target - goal);

	if (Math.abs(tuned - goal) / goal < DEAD_ZONE) {
		return { ...base, tuned: goal, reason: 'on-target' };
	}

	return { ...base, tuned, reason: tuned > goal ? 'raise' : 'lower' };
}

// Trim the part of each goal above its floor, proportionally, until the
// total fits. A goal's floor is the largest of: the protected minimum, what
// you already do on average, and half the current goal. So small goals,
// goals you're beating, and goals without history are never squashed.
function fitToCapacity(tunings: GoalTuning[], capacityMinutes: number): void {
	const minutes = tunings.map((t) => toMinutes(t.activity, t.tuned));
	const total = sum(minutes);
	if (total <= capacityMinutes) return;

	const floors = tunings.map((t, i) =>
		t.reason === 'no-history'
			? minutes[i]!
			: Math.min(
					minutes[i]!,
					Math.max(
						PROTECTED_MINUTES,
						toMinutes(t.activity, t.average),
						toMinutes(t.activity, t.goal) * MAX_CAPACITY_CUT,
					),
				),
	);
	const flexible = total - sum(floors);
	if (flexible <= 0) return;

	const keep = clamp((capacityMinutes - sum(floors)) / flexible, 0, 1);

	tunings.forEach((tuning, i) => {
		const floor = floors[i]!;
		const fitted = floor + (minutes[i]! - floor) * keep;
		if (fitted >= minutes[i]!) return;

		tuning.tuned = fromMinutes(tuning.activity, fitted);
		tuning.reason = 'capacity';
	});
}

// Weighted average of total weekly minutes across all activities, stretched
function weeklyCapacity(
	activities: OrbitActivity[],
	history: WeekTotals[],
): number | null {
	const weeks = history.slice(-LOOKBACK_WEEKS);
	if (weeks.length < MIN_WEEKS) return null;

	const totals = weeks.map((week) =>
		activities.reduce(
			(total, activity) =>
				total + toMinutes(activity, weekValue(activity, week)),
			0,
		),
	);

	const capacity = weightedMean(totals, decayWeights(totals.length));

	return capacity > 0 ? capacity * STRETCH : null;
}

// Weekly values starting from the first week the activity was logged
function activityWeeks(
	activity: OrbitActivity,
	history: WeekTotals[],
): number[] {
	const values = history.map((week) => weekValue(activity, week));
	const first = values.findIndex((value) => value > 0);

	return first === -1 ? [] : values.slice(first).slice(-LOOKBACK_WEEKS);
}

function weekValue(activity: OrbitActivity, week: WeekTotals): number {
	return activity.trackingType === 'time'
		? (week.minutes[activity.id] ?? 0)
		: (week.sessions[activity.id] ?? 0);
}

function goalOf(activity: OrbitActivity): number {
	return (
		(activity.trackingType === 'time'
			? activity.weeklyTimeGoal
			: activity.weeklySessionsGoal) ?? 0
	);
}

function sessionMinutes(activity: OrbitActivity): number {
	return activity.sessionLength ?? DEFAULT_SESSION_MINUTES;
}

function toMinutes(activity: OrbitActivity, value: number): number {
	return activity.trackingType === 'time'
		? value
		: value * sessionMinutes(activity);
}

function fromMinutes(activity: OrbitActivity, minutes: number): number {
	return activity.trackingType === 'time'
		? minutes
		: minutes / sessionMinutes(activity);
}

function roundGoal(activity: OrbitActivity, value: number): number {
	return activity.trackingType === 'time'
		? Math.max(TIME_ROUNDING, Math.round(value / TIME_ROUNDING) * TIME_ROUNDING)
		: Math.max(1, Math.round(value));
}

// Oldest → newest; the newest week has weight 1
function decayWeights(count: number): number[] {
	return Array.from({ length: count }, (_, i) =>
		Math.pow(0.5, (count - 1 - i) / HALF_LIFE_WEEKS),
	);
}

function weightedMean(values: number[], weights: number[]): number {
	const totalWeight = sum(weights);
	if (totalWeight === 0) return 0;

	return values.reduce((total, v, i) => total + v * weights[i]!, 0) / totalWeight;
}

function sum(values: number[]): number {
	return values.reduce((total, value) => total + value, 0);
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}
