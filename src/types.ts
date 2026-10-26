import type { TFile } from 'obsidian';

export type TrackingType = 'time' | 'session';

export type OrbitActivity = {
	id: string;
	file: TFile;
	name: string;
	tags: string[];
	status: string;

	trackingType: TrackingType;
	weeklyTimeGoal: number | null;
	weeklySessionsGoal: number | null;
	sessionLength: number | null;

	lastDone: string | null;
};

export type OrbitTier = {
	name: string;
	description: string;
	icon: string;
	activities: OrbitActivity[];
};

// One entry in a daily log's `sessions` frontmatter list
export type LogSession = {
	id: string;
	activity_id: string;
	minutes: number;
};
