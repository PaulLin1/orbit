
import { App, TFile } from 'obsidian';

export class DailyLogService {
	constructor(private app: App) {}

    async getLog(): Promise<TFile> {
		const folderPath = 'Orbit/Daily Logs';
		const date = window.moment().format('YYYY-MM-DD');
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

	async recordSession(
		activityId: string,
		minutes: number,
	): Promise<void> {
        const logFile = await this.getLog();
		const date = window.moment().format('YYYY-MM-DD');

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
				frontmatter.date = date;
				frontmatter.sessions = sessions;
			},
		);
	}
}
