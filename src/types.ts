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

// Frontmatter shape of an activity note
export type ActivityFrontmatter = {
	orbit_id?: string;
	title?: string;
	tags?: unknown;
	status?: string;
	tracking?: { type?: string };
	goals?: { weekly_time?: number; weekly_sessions?: number };
	defaults?: { session_length?: number };
	last_done?: string;
};

// One entry in a daily log's `sessions` frontmatter list
export type LogSession = {
	id: string;
	activity_id: string;
	minutes: number;
};
