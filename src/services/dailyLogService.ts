import { TFile, type App } from 'obsidian';
import {
	DAILY_LOGS_FOLDER,
	DATE_FORMAT,
	LOG_TYPE,
	ORBIT_FOLDER,
} from '../constants';
import type { ActivityFrontmatter, LogSession } from '../types';
import { loadActivities } from './activities';

export type LogStats = {
	uniqueActivities: number;
	totalMinutes: number;
};

export type DayStats = LogStats & {
	date: string;
	activityIds: string[];
};

export type ActivityWeeklyStats = {
	totalMinutes: number;
	sessions: number;
};

type LogFrontmatter = {
	type?: string;
	date?: string;
	sessions?: LogSession[];
};

export class DailyLogService {
	constructor(private app: App) {}

	// Reads

	async getDailyStats(): Promise<LogStats> {
		return summarize(this.getSessions(today()));
	}

	async getWeeklyStats(): Promise<LogStats> {
		return summarize(this.getWeekSessions());
	}

	// One entry per day of the current week, including days with no sessions
	async getWeekDays(): Promise<DayStats[]> {
		return weekDates().map((date) => {
			const sessions = this.getSessions(date);

			return {
				date,
				activityIds: uniqueActivityIds(sessions),
				...summarize(sessions),
			};
		});
	}

	async getActivityWeeklyStats(
		activityId: string,
	): Promise<ActivityWeeklyStats> {
		const sessions = this.getWeekSessions().filter(
			(session) => session.activity_id === activityId,
		);

		return {
			totalMinutes: sumMinutes(sessions),
			sessions: sessions.length,
		};
	}

	// Writes

	async recordSession(activityId: string, minutes: number): Promise<void> {
		const date = today();
		const logFile = await this.getOrCreateLog(date);

		await this.app.fileManager.processFrontMatter(
			logFile,
			(frontmatter: LogFrontmatter) => {
				frontmatter.type = LOG_TYPE;
				frontmatter.date = date;
				frontmatter.sessions = [
					...readSessions(frontmatter),
					{
						id: crypto.randomUUID(),
						activity_id: activityId,
						minutes,
					},
				];
			},
		);

		await this.updateLastDone(activityId, date);
	}

	private async updateLastDone(
		activityId: string,
		date: string,
	): Promise<void> {
		const activity = loadActivities(this.app).find(
			(activity) => activity.id === activityId,
		);

		if (!activity) return;

		await this.app.fileManager.processFrontMatter(
			activity.file,
			(frontmatter: ActivityFrontmatter) => {
				const lastDone = frontmatter.last_done;

				if (
					!lastDone ||
					window.moment(date).isAfter(window.moment(lastDone), 'day')
				) {
					frontmatter.last_done = date;
				}
			},
		);
	}

	// Log files

	private getSessions(date: string): LogSession[] {
		const logFile = this.findLog(date);
		if (!logFile) return [];

		const frontmatter = this.app.metadataCache.getFileCache(logFile)
			?.frontmatter as LogFrontmatter | undefined;

		return readSessions(frontmatter);
	}

	private getWeekSessions(): LogSession[] {
		return weekDates().flatMap((date) => this.getSessions(date));
	}

	private findLog(date: string): TFile | null {
		const file = this.app.vault.getAbstractFileByPath(logPath(date));

		return file instanceof TFile ? file : null;
	}

	private async getOrCreateLog(date: string): Promise<TFile> {
		const existing = this.findLog(date);
		if (existing) return existing;

		await this.ensureFolders();

		return this.app.vault.create(
			logPath(date),
			[
				'---',
				`type: ${LOG_TYPE}`,
				`date: ${date}`,
				'sessions: []',
				'---',
				'',
			].join('\n'),
		);
	}

	private async ensureFolders(): Promise<void> {
		for (const folder of [ORBIT_FOLDER, DAILY_LOGS_FOLDER]) {
			if (!this.app.vault.getAbstractFileByPath(folder)) {
				await this.app.vault.createFolder(folder);
			}
		}
	}
}

function logPath(date: string): string {
	return `${DAILY_LOGS_FOLDER}/${date}.md`;
}

function today(): string {
	return window.moment().format(DATE_FORMAT);
}

function weekDates(): string[] {
	const start = window.moment().startOf('week');

	return Array.from({ length: 7 }, (_, i) =>
		start.clone().add(i, 'days').format(DATE_FORMAT),
	);
}

function readSessions(frontmatter: LogFrontmatter | undefined): LogSession[] {
	return Array.isArray(frontmatter?.sessions) ? frontmatter.sessions : [];
}

function sumMinutes(sessions: LogSession[]): number {
	return sessions.reduce(
		(total, session) => total + (Number(session.minutes) || 0),
		0,
	);
}

function uniqueActivityIds(sessions: LogSession[]): string[] {
	return [
		...new Set(
			sessions
				.map((session) => session.activity_id)
				.filter((id) => typeof id === 'string'),
		),
	];
}

function summarize(sessions: LogSession[]): LogStats {
	return {
		uniqueActivities: uniqueActivityIds(sessions).length,
		totalMinutes: sumMinutes(sessions),
	};
}
