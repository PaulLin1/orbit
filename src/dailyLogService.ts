import { App, TFile } from 'obsidian';

export class DailyLogService {
	private todayDate: string;

	constructor(private app: App) {
		this.todayDate = window.moment().format('YYYY-MM-DD');
	}

	async getLog(date: string): Promise<TFile> {
		const folderPath = 'Orbit/Daily Logs';
		const filePath = `${folderPath}/${date}.md`;

		// Ensure folders exist
		for (const folder of ['Orbit', folderPath]) {
			if (!this.app.vault.getAbstractFileByPath(folder)) {
				await this.app.vault.createFolder(folder);
			}
		}

		// Find or create today's log
		const existing = this.app.vault.getAbstractFileByPath(filePath);

		let logFile: TFile;

		if (existing instanceof TFile) {
			logFile = existing;
		} else if (existing) {
			throw new Error(`Path exists but is not a file: ${filePath}`);
		} else {
			logFile = await this.app.vault.create(
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

		return logFile;
	}

	async getDailyStats(): Promise<{
		uniqueActivities: number;
		totalMinutes: number;
	}> {
		const logFile = await this.getLog(this.todayDate);
		const frontmatter =
			this.app.metadataCache.getFileCache(logFile)?.frontmatter;

		const sessions = Array.isArray(frontmatter?.sessions)
			? frontmatter.sessions
			: [];

		return {
			uniqueActivities: new Set(
				sessions.map(
					(session: { activity_id: string }) => session.activity_id,
				),
			).size,
			totalMinutes: sessions.reduce(
				(total: number, session: { minutes: number }) =>
					total + (Number(session.minutes) || 0),
				0,
			),
		};
	}

	async getWeeklyStats(): Promise<{
		uniqueActivities: number;
		totalMinutes: number;
	}> {
		const today = window.moment();
		const weekStart = today.clone().startOf('week'); // Sunday
		const activityIds = new Set<string>();
		let totalMinutes = 0;

		for (
			let day = weekStart.clone();
			day.isSameOrBefore(today, 'day');
			day.add(1, 'day')
		) {
			const date = day.format('YYYY-MM-DD');
			const logFile = await this.getLog(date);

			const frontmatter =
				this.app.metadataCache.getFileCache(logFile)?.frontmatter;

			const sessions = Array.isArray(frontmatter?.sessions)
				? frontmatter.sessions
				: [];

			for (const session of sessions) {
				if (typeof session.activity_id === 'string') {
					activityIds.add(session.activity_id);
				}

				totalMinutes += Number(session.minutes) || 0;
			}
		}

		return {
			uniqueActivities: activityIds.size,
			totalMinutes,
		};
	}

	async recordSession(activityId: string, minutes: number): Promise<void> {
		const logFile = await this.getLog(this.todayDate);

		// Append the session
		await this.app.fileManager.processFrontMatter(
			logFile,
			(frontmatter) => {
				const sessions = Array.isArray(frontmatter.sessions)
					? frontmatter.sessions
					: [];

				sessions.push({
					id: crypto.randomUUID(),
					activity_id: activityId,
					minutes,
				});

				frontmatter.type = 'orbit-daily-log';
				frontmatter.date = this.todayDate;
				frontmatter.sessions = sessions;
			},
		);
	}
}
