import { App, TFile } from 'obsidian';
import { DAILY_LOGS_FOLDER, DATE_FORMAT, ORBIT_FOLDER } from '../constants';
import type { LogSession } from '../types';

export type LogStats = {
	uniqueActivities: number;
	totalMinutes: number;
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

type ActivityFrontmatter = {
	orbit_id?: string;
	last_done?: string;
};

export class DailyLogService {
	constructor(private app: App) {}

	async getLog(date: string): Promise<TFile> {
		const filePath = `${DAILY_LOGS_FOLDER}/${date}.md`;

		for (const folder of [ORBIT_FOLDER, DAILY_LOGS_FOLDER]) {
			if (!this.app.vault.getAbstractFileByPath(folder)) {
				await this.app.vault.createFolder(folder);
			}
		}

		const existing = this.app.vault.getAbstractFileByPath(filePath);

		if (existing instanceof TFile) return existing;

		if (existing) {
			throw new Error(`Path exists but is not a file: ${filePath}`);
		}

		return this.app.vault.create(
			filePath,
			[
				'---',
				'type: orbit-daily-log',
				`date: ${date}`,
				'sessions: []',
				'---',
				'',
			].join('\n'),
		);
	}

	async getDailyStats(): Promise<LogStats> {
		return summarize(await this.getSessions(today()));
	}

	async getWeeklyStats(): Promise<LogStats> {
		return summarize(await this.getWeekSessions());
	}

	async getActivityWeeklyStats(
		activityId: string,
	): Promise<ActivityWeeklyStats> {
		const sessions = (await this.getWeekSessions()).filter(
			(session) => session.activity_id === activityId,
		);

		return {
			totalMinutes: sumMinutes(sessions),
			sessions: sessions.length,
		};
	}

	async recordSession(activityId: string, minutes: number): Promise<void> {
		const date = today();
		const logFile = await this.getLog(date);

		await this.app.fileManager.processFrontMatter(
			logFile,
			(frontmatter: LogFrontmatter) => {
				const sessions = Array.isArray(frontmatter.sessions)
					? frontmatter.sessions
					: [];

				sessions.push({
					id: crypto.randomUUID(),
					activity_id: activityId,
					minutes,
				});

				frontmatter.type = 'orbit-daily-log';
				frontmatter.date = date;
				frontmatter.sessions = sessions;
			},
		);

		await this.updateLastDone(activityId, date);
	}

	private async updateLastDone(
		activityId: string,
		date: string,
	): Promise<void> {
		const activityFile = this.app.vault.getMarkdownFiles().find((file) => {
			const frontmatter = this.app.metadataCache.getFileCache(file)
				?.frontmatter as ActivityFrontmatter | undefined;

			return frontmatter?.orbit_id === activityId;
		});

		if (!activityFile) return;

		await this.app.fileManager.processFrontMatter(
			activityFile,
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

	private async getSessions(date: string): Promise<LogSession[]> {
		const logFile = await this.getLog(date);
		const frontmatter = this.app.metadataCache.getFileCache(logFile)
			?.frontmatter as LogFrontmatter | undefined;

		return Array.isArray(frontmatter?.sessions) ? frontmatter.sessions : [];
	}

	private async getWeekSessions(): Promise<LogSession[]> {
		const now = window.moment();
		const sessions: LogSession[] = [];

		for (
			let day = now.clone().startOf('week');
			day.isSameOrBefore(now, 'day');
			day.add(1, 'day')
		) {
			sessions.push(...(await this.getSessions(day.format(DATE_FORMAT))));
		}

		return sessions;
	}
}

function today(): string {
	return window.moment().format(DATE_FORMAT);
}

function sumMinutes(sessions: LogSession[]): number {
	return sessions.reduce(
		(total, session) => total + (Number(session.minutes) || 0),
		0,
	);
}

function summarize(sessions: LogSession[]): LogStats {
	const activityIds = new Set(
		sessions
			.map((session) => session.activity_id)
			.filter((id) => typeof id === 'string'),
	);

	return {
		uniqueActivities: activityIds.size,
		totalMinutes: sumMinutes(sessions),
	};
}
